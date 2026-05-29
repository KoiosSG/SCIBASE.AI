const assert = require('assert');
const {
  evaluateRecertification,
  buildSampleProject
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testStaleReviewsFreezeReputationUntilRecertified() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const review = byId(result.reviewDecisions, 'review-dataset-methods');

  assert.equal(review.status, 'recertification-required');
  assert.deepEqual(review.reasons, [
    'artifact-digest-changed',
    'artifact-updated-after-review'
  ]);

  const action = byId(result.reputationActions, 'review-dataset-methods');
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.originalDelta, 18);
  assert.equal(action.effectiveDelta, 0);
  assert.equal(action.appliesTo, 'reviewer:orcid:0000-0002-reviewer-a');

  assert.equal(result.summary.staleReviews, 2);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testCurrentOrRecertifiedReviewsKeepReputationCredit() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const methods = byId(result.reviewDecisions, 'review-notebook-methods');
  const code = byId(result.reviewDecisions, 'review-code-recertified');

  assert.equal(methods.status, 'current');
  assert.equal(code.status, 'current');

  const codeAction = byId(result.reputationActions, 'review-code-recertified');
  assert.equal(codeAction.action, 'apply-current-delta');
  assert.equal(codeAction.effectiveDelta, 14);
}

function testAnonymousReviewerIdentityIsRedacted() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const task = byId(result.recertificationTasks, 'recertify-review-blind-data');
  const timelineEvent = result.timelinePacket.events.find((event) => event.reviewId === 'review-blind-data');

  assert.equal(task.reviewer, 'anonymous-reviewer-7');
  assert.ok(!JSON.stringify(task).includes('orcid:0000-0002-private'));
  assert.equal(timelineEvent.reviewer, 'anonymous-reviewer-7');
  assert.ok(!JSON.stringify(timelineEvent).includes('orcid:0000-0002-private'));
}

function testBlindModeRedactionAcceptsCaseAndSeparatorVariants() {
  const project = buildSampleProject();
  project.reviews = [
    {
      id: 'review-blind-variant',
      reviewerId: 'orcid:0000-0002-variant-private',
      anonymousLabel: 'anonymous-reviewer-variant',
      mode: 'Double_Blind',
      artifactId: 'dataset-cohort-table',
      evidenceDigest: 'sha256:dataset-v1',
      submittedAt: '2026-05-18T09:00:00Z',
      reputationDelta: 18
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const task = byId(result.recertificationTasks, 'recertify-review-blind-variant');
  const timelineEvent = result.timelinePacket.events.find(
    (event) => event.reviewId === 'review-blind-variant'
  );

  assert.equal(task.reviewer, 'anonymous-reviewer-variant');
  assert.equal(timelineEvent.reviewer, 'anonymous-reviewer-variant');
  assert.ok(!JSON.stringify(result).includes('orcid:0000-0002-variant-private'));
}

function testInlineCommentsUseArtifactAnchorsForRecertification() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-code-line-41');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, [
    'artifact-digest-changed',
    'anchor-line-shifted-after-comment'
  ]);

  const task = byId(result.recertificationTasks, 'recertify-comment-code-line-41');
  assert.equal(task.kind, 'inline-comment');
  assert.equal(task.priority, 'normal');
}

function testInlineCommentDigestChangeStalesAnchorEvenWithoutLineShift() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v4',
      changedAt: '2026-05-20T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-same-line-changed-digest',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-same-line-changed-digest');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, ['artifact-digest-changed']);
}

function testInvalidInlineCommentTimestampRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-invalid-submitted-at',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: 'not-a-date'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-invalid-submitted-at');
  const task = byId(result.recertificationTasks, 'recertify-comment-invalid-submitted-at');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, ['invalid-comment-timestamp']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['invalid-comment-timestamp']);
}

function testMissingInlineCommentAnchorMetadataRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-missing-anchor-metadata',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-missing-anchor-metadata');
  const task = byId(result.recertificationTasks, 'recertify-comment-missing-anchor-metadata');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'missing');
  assert.deepEqual(comment.reasons, ['comment-anchor-metadata-missing']);
  assert.equal(comment.anchor, null);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['comment-anchor-metadata-missing']);
}

function testMissingArtifactAnchorMapRequiresCommentRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z'
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-missing-artifact-anchor-map',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-missing-artifact-anchor-map');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'missing');
  assert.deepEqual(comment.reasons, ['anchor-missing-after-comment']);
}

function testStaleInlineCommentsBlockReputationUpdateWithoutStaleReviews() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v4',
      changedAt: '2026-05-20T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-only-stale-evidence',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);

  assert.equal(result.summary.staleReviews, 0);
  assert.equal(result.summary.staleComments, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
  assert.equal(byId(result.recertificationTasks, 'recertify-comment-only-stale-evidence').kind, 'inline-comment');
}

function testInvalidReviewTimestampRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-invalid-recertified-at',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      recertifiedAt: 'not-a-date',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-invalid-recertified-at');
  const action = byId(result.reputationActions, 'review-invalid-recertified-at');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-review-timestamp']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testInvalidArtifactTimestampRequiresReviewRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: 'not-a-date',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-invalid-artifact-timestamp',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-invalid-artifact-timestamp');
  const task = byId(result.recertificationTasks, 'recertify-review-invalid-artifact-timestamp');
  const action = byId(result.reputationActions, 'review-invalid-artifact-timestamp');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-artifact-timestamp']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['invalid-artifact-timestamp']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testTimelinePacketPreservesAuditEvidenceWithoutRawPrivateProfiles() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);

  assert.equal(result.timelinePacket.projectId, 'project-alpha-replication');
  assert.equal(result.timelinePacket.events.length, 5);
  assert.ok(result.timelinePacket.auditDigest.startsWith('sha256:'));
  assert.ok(!JSON.stringify(result.timelinePacket).includes('private@'));
}

const tests = [
  testStaleReviewsFreezeReputationUntilRecertified,
  testCurrentOrRecertifiedReviewsKeepReputationCredit,
  testAnonymousReviewerIdentityIsRedacted,
  testBlindModeRedactionAcceptsCaseAndSeparatorVariants,
  testInlineCommentsUseArtifactAnchorsForRecertification,
  testInlineCommentDigestChangeStalesAnchorEvenWithoutLineShift,
  testInvalidInlineCommentTimestampRequiresRecertification,
  testMissingInlineCommentAnchorMetadataRequiresRecertification,
  testMissingArtifactAnchorMapRequiresCommentRecertification,
  testStaleInlineCommentsBlockReputationUpdateWithoutStaleReviews,
  testInvalidReviewTimestampRequiresRecertification,
  testInvalidArtifactTimestampRequiresReviewRecertification,
  testTimelinePacketPreservesAuditEvidenceWithoutRawPrivateProfiles
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} peer review evidence recertification tests passed`);
