const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function isoTime(value) {
  return new Date(value).getTime();
}

function hasValidTime(value) {
  return Number.isFinite(isoTime(value));
}

function normalizeReviewMode(mode) {
  return String(mode || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
}

function isBlindOrAnonymous(mode) {
  return ['anonymous', 'blind', 'double-blind', 'fully-anonymous'].includes(normalizeReviewMode(mode));
}

function reviewerDisplay(item) {
  if (isBlindOrAnonymous(item.mode)) {
    return item.anonymousLabel || 'anonymous-reviewer';
  }

  return `reviewer:${item.reviewerId}`;
}

function findArtifact(project, artifactId) {
  return project.artifacts.find((artifact) => artifact.id === artifactId);
}

function evaluateReview(project, review) {
  const artifact = findArtifact(project, review.artifactId);
  const reasons = [];
  const reviewedAt = isoTime(review.recertifiedAt || review.submittedAt);

  if (!hasValidTime(review.recertifiedAt || review.submittedAt)) {
    reasons.push('invalid-review-timestamp');
  }

  if (!artifact) {
    reasons.push('artifact-missing');
  } else {
    if (!hasValidTime(artifact.changedAt)) {
      reasons.push('invalid-artifact-timestamp');
    }

    if (artifact.currentDigest !== review.evidenceDigest) {
      reasons.push('artifact-digest-changed');
    }

    if (hasValidTime(artifact.changedAt) && isoTime(artifact.changedAt) > reviewedAt) {
      reasons.push('artifact-updated-after-review');
    }
  }

  const status = reasons.length > 0 ? 'recertification-required' : 'current';
  const displayReviewer = reviewerDisplay(review);

  return {
    id: review.id,
    artifactId: review.artifactId,
    mode: review.mode,
    reviewer: displayReviewer,
    status,
    reasons,
    submittedAt: review.submittedAt,
    recertifiedAt: review.recertifiedAt || null,
    evidenceDigest: review.evidenceDigest,
    currentArtifactDigest: artifact ? artifact.currentDigest : null
  };
}

function reputationActionForReview(review, decision) {
  const base = {
    id: review.id,
    appliesTo: reviewerDisplay(review),
    originalDelta: review.reputationDelta,
    reasonDigest: digest({
      reviewId: review.id,
      reasons: decision.reasons,
      evidenceDigest: review.evidenceDigest,
      currentArtifactDigest: decision.currentArtifactDigest
    })
  };

  if (decision.status === 'current') {
    return {
      ...base,
      action: 'apply-current-delta',
      effectiveDelta: review.reputationDelta
    };
  }

  return {
    ...base,
    action: 'freeze-until-recertified',
    effectiveDelta: 0
  };
}

function taskForReview(review, decision) {
  if (decision.status === 'current') {
    return null;
  }

  return {
    id: `recertify-${review.id}`,
    kind: 'peer-review',
    reviewId: review.id,
    artifactId: review.artifactId,
    reviewer: decision.reviewer,
    priority: Math.abs(review.reputationDelta) >= 15 ? 'high' : 'normal',
    requiredAction: 'confirm-review-still-applies-to-current-artifact',
    blockedProfileUpdates: ['reputation-score', 'leaderboards', 'badges'],
    reasons: decision.reasons
  };
}

function evaluateComment(project, comment) {
  const artifact = findArtifact(project, comment.artifactId);
  const reasons = [];
  let anchorStatus = 'current';
  const hasUsableAnchor = comment.anchor
    && typeof comment.anchor.selector === 'string'
    && typeof comment.anchor.line === 'number';

  if (!hasValidTime(comment.submittedAt)) {
    reasons.push('invalid-comment-timestamp');
    anchorStatus = 'stale';
  }

  if (!hasUsableAnchor) {
    reasons.push('comment-anchor-metadata-missing');
    anchorStatus = 'missing';
  }

  if (!artifact) {
    reasons.push('artifact-missing');
    anchorStatus = 'missing';
  } else {
    if (artifact.currentDigest !== comment.anchorDigest) {
      reasons.push('artifact-digest-changed');
      anchorStatus = 'stale';
    }

    if (hasUsableAnchor) {
      const currentAnchor = (artifact.currentAnchors || {})[comment.anchor.selector];
      if (!currentAnchor) {
        reasons.push('anchor-missing-after-comment');
        anchorStatus = 'missing';
      } else if (currentAnchor.line !== comment.anchor.line) {
        reasons.push('anchor-line-shifted-after-comment');
        anchorStatus = 'stale';
      }
    }
  }

  const status = reasons.length > 0 ? 'recertification-required' : 'current';

  return {
    id: comment.id,
    artifactId: comment.artifactId,
    status,
    anchorStatus,
    reviewer: reviewerDisplay(comment),
    reasons,
    anchor: comment.anchor || null
  };
}

function taskForComment(comment, decision) {
  if (decision.status === 'current') {
    return null;
  }

  return {
    id: `recertify-${comment.id}`,
    kind: 'inline-comment',
    commentId: comment.id,
    artifactId: comment.artifactId,
    reviewer: decision.reviewer,
    priority: 'normal',
    requiredAction: 'confirm-comment-anchor-still-matches-current-artifact',
    reasons: decision.reasons
  };
}

function buildTimelinePacket(project, reviewDecisions, commentDecisions) {
  const reviewEvents = reviewDecisions.map((decision) => ({
    type: decision.status === 'current' ? 'review-evidence-current' : 'review-recertification-required',
    reviewId: decision.id,
    artifactId: decision.artifactId,
    reviewer: decision.reviewer,
    status: decision.status,
    reasons: decision.reasons
  }));

  const commentEvents = commentDecisions
    .filter((decision) => decision.status !== 'current')
    .map((decision) => ({
      type: 'inline-comment-recertification-required',
      commentId: decision.id,
      artifactId: decision.artifactId,
      reviewer: decision.reviewer,
      status: decision.status,
      reasons: decision.reasons
    }));

  const events = [...reviewEvents, ...commentEvents];

  return {
    projectId: project.projectId,
    generatedAt: project.asOf,
    events,
    auditDigest: digest({
      projectId: project.projectId,
      generatedAt: project.asOf,
      events
    })
  };
}

function evaluateRecertification(project) {
  const reviewDecisions = project.reviews.map((review) => evaluateReview(project, review));
  const reputationActions = project.reviews.map((review, index) =>
    reputationActionForReview(review, reviewDecisions[index])
  );
  const commentDecisions = project.inlineComments.map((comment) => evaluateComment(project, comment));
  const recertificationTasks = [
    ...project.reviews.map((review, index) => taskForReview(review, reviewDecisions[index])),
    ...project.inlineComments.map((comment, index) => taskForComment(comment, commentDecisions[index]))
  ].filter(Boolean);
  const staleReviews = reviewDecisions.filter((decision) => decision.status !== 'current').length;
  const staleComments = commentDecisions.filter((decision) => decision.status !== 'current').length;
  const timelinePacket = buildTimelinePacket(project, reviewDecisions, commentDecisions);

  return {
    projectId: project.projectId,
    generatedAt: project.asOf,
    reviewDecisions,
    commentDecisions,
    reputationActions,
    recertificationTasks,
    timelinePacket,
    summary: {
      totalReviews: reviewDecisions.length,
      staleReviews,
      staleComments,
      frozenReputationDelta: reputationActions
        .filter((action) => action.action === 'freeze-until-recertified')
        .reduce((sum, action) => sum + action.originalDelta, 0),
      recommendedAction: (staleReviews > 0 || staleComments > 0)
        ? 'block-reputation-update'
        : 'allow-reputation-update'
    }
  };
}

function buildSampleProject() {
  return {
    projectId: 'project-alpha-replication',
    asOf: '2026-05-28T06:00:00Z',
    artifacts: [
      {
        id: 'dataset-cohort-table',
        type: 'dataset',
        currentDigest: 'sha256:dataset-v2',
        changedAt: '2026-05-24T12:00:00Z',
        currentAnchors: {}
      },
      {
        id: 'notebook-methods',
        type: 'notebook',
        currentDigest: 'sha256:notebook-v1',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      },
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-19T09:30:00Z',
        currentAnchors: {
          'src/analyze.py#L41': { line: 47 }
        }
      }
    ],
    reviews: [
      {
        id: 'review-dataset-methods',
        reviewerId: 'orcid:0000-0002-reviewer-a',
        mode: 'public',
        artifactId: 'dataset-cohort-table',
        evidenceDigest: 'sha256:dataset-v1',
        submittedAt: '2026-05-18T09:00:00Z',
        reputationDelta: 18
      },
      {
        id: 'review-notebook-methods',
        reviewerId: 'orcid:0000-0002-reviewer-b',
        mode: 'semi-private',
        artifactId: 'notebook-methods',
        evidenceDigest: 'sha256:notebook-v1',
        submittedAt: '2026-05-12T10:00:00Z',
        reputationDelta: 9
      },
      {
        id: 'review-code-recertified',
        reviewerId: 'orcid:0000-0002-reviewer-c',
        mode: 'public',
        artifactId: 'analysis-code',
        evidenceDigest: 'sha256:code-v3',
        submittedAt: '2026-05-16T11:00:00Z',
        recertifiedAt: '2026-05-21T13:00:00Z',
        reputationDelta: 14
      },
      {
        id: 'review-blind-data',
        reviewerId: 'orcid:0000-0002-private',
        anonymousLabel: 'anonymous-reviewer-7',
        mode: 'double-blind',
        artifactId: 'dataset-cohort-table',
        evidenceDigest: 'sha256:dataset-v1',
        submittedAt: '2026-05-17T10:30:00Z',
        reputationDelta: 11
      }
    ],
    inlineComments: [
      {
        id: 'comment-code-line-41',
        reviewerId: 'orcid:0000-0002-reviewer-b',
        mode: 'public',
        artifactId: 'analysis-code',
        anchorDigest: 'sha256:code-v2',
        anchor: {
          selector: 'src/analyze.py#L41',
          line: 41
        },
        submittedAt: '2026-05-18T14:30:00Z'
      }
    ]
  };
}

module.exports = {
  evaluateRecertification,
  buildSampleProject,
  digest
};
