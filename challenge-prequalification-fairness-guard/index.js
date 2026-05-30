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

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

function scoreForCriterion(reviews, criterionId) {
  const scores = reviews
    .map((review) => reviewScores(review)[criterionId])
    .filter((score) => isValidReviewerScore(score));

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function weightedScore(criteria, reviews) {
  const weighted = criteria.reduce((total, criterion) => {
    const average = scoreForCriterion(reviews, criterion.id);
    if (average === null) {
      return total;
    }
    return total + average * (criterion.weight / 100);
  }, 0);

  return Math.round(weighted);
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function criterionIdFor(criterion) {
  return typeof criterion.id === 'string' ? criterion.id.trim() : criterion.id;
}

function duplicatePublishedCriterionIds(round) {
  const criterionCounts = round.criteria.reduce((counts, criterion) => {
    const criterionId = criterionIdFor(criterion);
    counts[criterionId] = (counts[criterionId] || 0) + 1;
    return counts;
  }, Object.create(null));

  return uniqueSorted(
    Object.entries(criterionCounts)
      .filter(([, count]) => count > 1)
      .map(([criterionId]) => criterionId)
  );
}

function hasMissingPublishedCriterionIds(round) {
  return round.criteria.some(
    (criterion) => typeof criterion.id !== 'string' || criterion.id.trim().length === 0
  );
}

function reviewerIdFor(review) {
  return typeof review.reviewerId === 'string' ? review.reviewerId.trim() : '';
}

function applicantIdFor(applicant) {
  return typeof applicant.id === 'string' ? applicant.id.trim() : '';
}

function applicantIdentityIsMissing(applicant) {
  return !applicantIdFor(applicant);
}

function reviewApplicantIdFor(review) {
  return typeof review.applicantId === 'string' ? review.applicantId.trim() : review.applicantId;
}

function reviewListFor(round) {
  return Array.isArray(round.reviews) ? round.reviews : [];
}

function reviewListIsMissing(round) {
  return !Array.isArray(round.reviews);
}

function outputApplicantIdFor(applicant) {
  return applicantIdFor(applicant) || 'unidentified-applicant';
}

function duplicateNonConflictedReviewerIds(reviews) {
  const counts = reviews
    .filter((review) => !review.conflict)
    .reduce((reviewerCounts, review) => {
      const reviewerId = reviewerIdFor(review);
      if (!reviewerId) {
        return reviewerCounts;
      }
      reviewerCounts[reviewerId] = (reviewerCounts[reviewerId] || 0) + 1;
      return reviewerCounts;
    }, {});

  return uniqueSorted(
    Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([reviewerId]) => reviewerId)
  );
}

function hasMissingReviewerIdentity(reviews) {
  return reviews.some((review) => !reviewerIdFor(review));
}

function countableNonConflictedReviews(reviews) {
  const seenReviewerIds = new Set();

  return reviews.filter((review) => {
    if (review.conflict) {
      return false;
    }

    const reviewerId = reviewerIdFor(review);
    if (!reviewerId) {
      return false;
    }

    if (seenReviewerIds.has(reviewerId)) {
      return false;
    }

    seenReviewerIds.add(reviewerId);
    return true;
  });
}

function publicCriteriaIds(round) {
  return round.criteria.map((criterion) => criterion.id);
}

function reviewScores(review) {
  return review.scores && typeof review.scores === 'object' ? review.scores : {};
}

function isValidReviewerScore(score) {
  return typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;
}

function applicantRejectionReasons(applicant) {
  if (!Array.isArray(applicant.rejectionReasons)) {
    return [];
  }

  return applicant.rejectionReasons
    .filter((reason) => typeof reason === 'string')
    .map((reason) => reason.trim())
    .filter(Boolean);
}

function criteriaWeightTotal(round) {
  return round.criteria.reduce((total, criterion) => total + criterion.weight, 0);
}

function criteriaWeightsHaveInvalidValues(round) {
  return round.criteria.some(
    (criterion) =>
      typeof criterion.weight !== 'number' ||
      !Number.isFinite(criterion.weight) ||
      criterion.weight < 0 ||
      criterion.weight > 100
  );
}

function passThresholdIsInvalid(round) {
  return (
    typeof round.passThreshold !== 'number' ||
    !Number.isFinite(round.passThreshold) ||
    round.passThreshold < 0 ||
    round.passThreshold > 100
  );
}

function reviewerQuorumIsInvalid(round) {
  return !Number.isInteger(round.minReviewers) || round.minReviewers < 1;
}

function sponsorDecisionIsInvalid(applicant) {
  return !['accept', 'reject'].includes(applicant.sponsorDecision);
}

function reviewUsesHiddenCriteria(review, criteriaIds) {
  return Object.keys(reviewScores(review)).some((criterionId) => !criteriaIds.includes(criterionId));
}

function reviewHasInvalidPublishedScoreValues(review, criteriaIds) {
  const scores = reviewScores(review);
  return criteriaIds.some(
    (criterionId) =>
      Object.prototype.hasOwnProperty.call(scores, criterionId) &&
      !isValidReviewerScore(scores[criterionId])
  );
}

function appealStatus(applicant, round) {
  if (applicant.sponsorDecision !== 'reject') {
    return 'not-required';
  }

  if (!applicant.appealDueAt) {
    return 'missing';
  }

  const appealDueAt = Date.parse(applicant.appealDueAt);
  const generatedAt = Date.parse(round.generatedAt);
  if (!Number.isFinite(appealDueAt) || !Number.isFinite(generatedAt)) {
    return 'invalid';
  }

  return appealDueAt >= generatedAt ? 'open' : 'expired';
}

function reasonsForApplicant(applicant, reviews, round) {
  const criteriaIds = publicCriteriaIds(round);
  const duplicateCriterionIds = duplicatePublishedCriterionIds(round);
  const nonConflictedReviews = countableNonConflictedReviews(reviews);
  const duplicateReviewerIds = duplicateNonConflictedReviewerIds(reviews);
  const applicantAppealStatus = appealStatus(applicant, round);
  const reasons = [];

  if (round.anonymousScreeningRequired && reviews.some((review) => !review.anonymousScreeningObserved)) {
    reasons.push('anonymous-screening-leak');
  }

  if (reviews.some((review) => review.conflict)) {
    reasons.push('reviewer-conflict');
  }

  if (duplicateCriterionIds.length > 0) {
    reasons.push('duplicate-published-criterion');
  }

  if (hasMissingPublishedCriterionIds(round)) {
    reasons.push('missing-published-criterion-id');
  }

  if (duplicateReviewerIds.length > 0) {
    reasons.push('duplicate-reviewer-score-evidence');
  }

  if (hasMissingReviewerIdentity(reviews)) {
    reasons.push('missing-reviewer-identity');
  }

  if (reviewListIsMissing(round)) {
    reasons.push('missing-review-list');
  }

  if (applicantIdentityIsMissing(applicant)) {
    reasons.push('missing-applicant-identity');
  }

  if (criteriaWeightTotal(round) !== 100) {
    reasons.push('criteria-weight-total-invalid');
  }

  if (criteriaWeightsHaveInvalidValues(round)) {
    reasons.push('criteria-weight-value-invalid');
  }

  if (passThresholdIsInvalid(round)) {
    reasons.push('pass-threshold-invalid');
  }

  if (reviewerQuorumIsInvalid(round)) {
    reasons.push('reviewer-quorum-invalid');
  }

  if (nonConflictedReviews.length < round.minReviewers) {
    reasons.push('reviewer-quorum-shortfall');
  }

  if (sponsorDecisionIsInvalid(applicant)) {
    reasons.push('sponsor-decision-invalid');
  }

  if (reviews.some((review) => reviewUsesHiddenCriteria(review, criteriaIds))) {
    reasons.push('unpublished-screening-criterion');
  }

  if (
    criteriaIds.some((criterionId) =>
      reviews.some((review) => typeof reviewScores(review)[criterionId] !== 'number')
    )
  ) {
    reasons.push('missing-published-criterion-score');
  }

  if (reviews.some((review) => reviewHasInvalidPublishedScoreValues(review, criteriaIds))) {
    reasons.push('reviewer-score-value-invalid');
  }

  const score = weightedScore(round.criteria, nonConflictedReviews);
  const passesThreshold = score >= round.passThreshold;

  if (
    (applicant.sponsorDecision === 'reject' && passesThreshold) ||
    (applicant.sponsorDecision === 'accept' && !passesThreshold)
  ) {
    reasons.push('inconsistent-threshold-decision');
  }

  if (applicant.sponsorDecision === 'reject' && applicantRejectionReasons(applicant).length === 0) {
    reasons.push('missing-rejection-reason');
  }

  if (applicant.sponsorDecision === 'reject' && applicantAppealStatus === 'missing') {
    reasons.push('missing-appeal-window');
  }

  if (applicant.sponsorDecision === 'reject' && applicantAppealStatus === 'expired') {
    reasons.push('expired-appeal-window');
  }

  if (applicant.sponsorDecision === 'reject' && applicantAppealStatus === 'invalid') {
    reasons.push('invalid-appeal-window');
  }

  return uniqueSorted(reasons);
}

function remediationAction(applicant, reasons) {
  if (reasons.includes('anonymous-screening-leak')) {
    return 'rerun-blinded-prequalification-review';
  }

  if (reasons.includes('unpublished-screening-criterion')) {
    return 'remove-unpublished-criterion-and-rescore';
  }

  if (reasons.includes('duplicate-published-criterion')) {
    return 'publish-unique-screening-criteria';
  }

  if (reasons.includes('missing-published-criterion-id')) {
    return 'publish-complete-screening-criteria';
  }

  if (reasons.includes('criteria-weight-total-invalid')) {
    return 'publish-valid-weighted-scoring-rubric';
  }

  if (reasons.includes('criteria-weight-value-invalid')) {
    return 'publish-valid-weighted-scoring-rubric';
  }

  if (reasons.includes('pass-threshold-invalid')) {
    return 'publish-valid-prequalification-threshold';
  }

  if (reasons.includes('reviewer-quorum-invalid')) {
    return 'publish-valid-reviewer-quorum';
  }

  if (reasons.includes('sponsor-decision-invalid')) {
    return 'publish-valid-sponsor-decision';
  }

  if (reasons.includes('reviewer-score-value-invalid')) {
    return 'publish-valid-reviewer-score-evidence';
  }

  if (reasons.includes('reviewer-conflict')) {
    return 'replace-conflicted-reviewer';
  }

  if (reasons.includes('duplicate-reviewer-score-evidence')) {
    return 'deduplicate-reviewer-score-evidence';
  }

  if (
    reasons.includes('missing-rejection-reason') ||
    reasons.includes('missing-appeal-window') ||
    reasons.includes('expired-appeal-window') ||
    reasons.includes('invalid-appeal-window')
  ) {
    return 'publish-rejection-reasons-and-appeal-window';
  }

  if (reasons.includes('missing-published-criterion-score')) {
    return 'complete-prequalification-evidence';
  }

  if (reasons.includes('missing-reviewer-identity')) {
    return 'complete-prequalification-evidence';
  }

  if (reasons.includes('missing-review-list')) {
    return 'complete-prequalification-evidence';
  }

  if (reasons.includes('missing-applicant-identity')) {
    return 'complete-prequalification-evidence';
  }

  if (reasons.includes('inconsistent-threshold-decision')) {
    return 'reconcile-score-threshold-decision';
  }

  return 'complete-prequalification-evidence';
}

function evaluatePrequalificationRound(round) {
  const reviewsByApplicant = groupBy(reviewListFor(round), reviewApplicantIdFor);

  const decisions = round.applicants.map((applicant) => {
    const reviews = reviewsByApplicant[applicantIdFor(applicant)] || [];
    const applicantId = outputApplicantIdFor(applicant);
    const nonConflictedReviews = countableNonConflictedReviews(reviews);
    const reasons = reasonsForApplicant(applicant, reviews, round);
    const score = weightedScore(round.criteria, nonConflictedReviews);
    const decision =
      reasons.length > 0
        ? 'hold-for-fairness-review'
        : score >= round.passThreshold
        ? 'accept-prequalified'
        : 'reject-with-audit';

    return {
      id: applicantId,
      applicantId,
      challengeId: round.challengeId,
      decision,
      sponsorDecision: applicant.sponsorDecision,
      weightedScore: score,
      passThreshold: round.passThreshold,
      reviewersCounted: nonConflictedReviews.length,
      criteriaApplied: publicCriteriaIds(round),
      reasons,
      rejectionReasons: applicantRejectionReasons(applicant),
      appealStatus: appealStatus(applicant, round),
      auditDigest: digest({
        applicantId,
        challengeId: round.challengeId,
        score,
        reasons,
        reviews: reviews.map((review) => ({
          reviewerId: review.reviewerId,
          conflict: review.conflict,
          anonymousScreeningObserved: review.anonymousScreeningObserved,
          scores: reviewScores(review)
        }))
      })
    };
  });

  const remediationActions = decisions
    .filter((decision) => decision.decision === 'hold-for-fairness-review')
    .map((decision) => ({
      id: `remediate-${decision.applicantId}`,
      applicantId: decision.applicantId,
      action: remediationAction(decision, decision.reasons),
      priority:
        decision.reasons.includes('anonymous-screening-leak') ||
        decision.reasons.includes('reviewer-conflict') ||
        decision.reasons.includes('duplicate-published-criterion') ||
        decision.reasons.includes('missing-published-criterion-id') ||
        decision.reasons.includes('duplicate-reviewer-score-evidence') ||
        decision.reasons.includes('missing-reviewer-identity') ||
        decision.reasons.includes('missing-review-list') ||
        decision.reasons.includes('missing-applicant-identity') ||
        decision.reasons.includes('unpublished-screening-criterion') ||
        decision.reasons.includes('criteria-weight-total-invalid') ||
        decision.reasons.includes('criteria-weight-value-invalid') ||
        decision.reasons.includes('pass-threshold-invalid') ||
        decision.reasons.includes('reviewer-quorum-invalid') ||
        decision.reasons.includes('sponsor-decision-invalid') ||
        decision.reasons.includes('reviewer-score-value-invalid')
          ? 'high'
          : 'normal',
      reasons: decision.reasons
    }));

  const summary = {
    accepted: decisions.filter((decision) => decision.decision === 'accept-prequalified').length,
    held: decisions.filter((decision) => decision.decision === 'hold-for-fairness-review').length,
    rejectedWithAudit: decisions.filter((decision) => decision.decision === 'reject-with-audit')
      .length,
    remediationActions: remediationActions.length
  };

  return {
    challengeId: round.challengeId,
    generatedAt: round.generatedAt,
    criteriaDigest: digest(round.criteria),
    decisions,
    remediationActions,
    summary,
    auditDigest: digest({
      challengeId: round.challengeId,
      generatedAt: round.generatedAt,
      decisions,
      remediationActions,
      summary
    })
  };
}

function buildSampleRound() {
  return {
    challengeId: 'challenge-18-prequalification-rna-biomarker',
    generatedAt: '2026-05-28T08:00:00Z',
    anonymousScreeningRequired: true,
    minReviewers: 2,
    passThreshold: 75,
    criteria: [
      {
        id: 'domain-fit',
        label: 'Domain fit for the scientific challenge',
        weight: 40
      },
      {
        id: 'data-readiness',
        label: 'Evidence that required data and tools are ready',
        weight: 35
      },
      {
        id: 'safety-plan',
        label: 'Risk, NDA, and responsible-use plan',
        weight: 25
      }
    ],
    applicants: [
      {
        id: 'applicant-biofoundry',
        sponsorDecision: 'accept',
        rejectionReasons: [],
        appealDueAt: null
      },
      {
        id: 'applicant-neuro-lab',
        sponsorDecision: 'reject',
        rejectionReasons: ['methods plan did not match expected wet-lab validation'],
        appealDueAt: '2026-06-04T08:00:00Z'
      },
      {
        id: 'applicant-sponsor-alumni',
        sponsorDecision: 'reject',
        rejectionReasons: [],
        appealDueAt: null
      },
      {
        id: 'applicant-missing-reviewer-identity',
        sponsorDecision: 'accept',
        rejectionReasons: [],
        appealDueAt: null
      }
    ],
    reviews: [
      {
        applicantId: 'applicant-biofoundry',
        reviewerId: 'reviewer-alpha',
        anonymousScreeningObserved: true,
        conflict: false,
        recommendedDecision: 'accept',
        rejectionReasons: [],
        scores: {
          'domain-fit': 90,
          'data-readiness': 86,
          'safety-plan': 84
        }
      },
      {
        applicantId: 'applicant-biofoundry',
        reviewerId: 'reviewer-beta',
        anonymousScreeningObserved: true,
        conflict: false,
        recommendedDecision: 'accept',
        rejectionReasons: [],
        scores: {
          'domain-fit': 88,
          'data-readiness': 85,
          'safety-plan': 85
        }
      },
      {
        applicantId: 'applicant-neuro-lab',
        reviewerId: 'reviewer-alpha',
        anonymousScreeningObserved: false,
        conflict: false,
        recommendedDecision: 'reject',
        rejectionReasons: ['identity visible in screening packet'],
        scores: {
          'domain-fit': 82,
          'data-readiness': 80,
          'safety-plan': 78
        }
      },
      {
        applicantId: 'applicant-neuro-lab',
        reviewerId: 'reviewer-gamma',
        anonymousScreeningObserved: true,
        conflict: false,
        recommendedDecision: 'reject',
        rejectionReasons: ['identity visible in screening packet'],
        scores: {
          'domain-fit': 84,
          'data-readiness': 81,
          'safety-plan': 79
        }
      },
      {
        applicantId: 'applicant-sponsor-alumni',
        reviewerId: 'reviewer-delta',
        anonymousScreeningObserved: true,
        conflict: true,
        recommendedDecision: 'reject',
        rejectionReasons: [],
        scores: {
          'domain-fit': 74,
          'data-readiness': 72,
          'safety-plan': 76
        }
      },
      {
        applicantId: 'applicant-sponsor-alumni',
        reviewerId: 'reviewer-epsilon',
        anonymousScreeningObserved: true,
        conflict: false,
        recommendedDecision: 'reject',
        rejectionReasons: [],
        scores: {
          'domain-fit': 70,
          'data-readiness': 68,
          'safety-plan': 73
        }
      },
      {
        applicantId: 'applicant-missing-reviewer-identity',
        reviewerId: '   ',
        anonymousScreeningObserved: true,
        conflict: false,
        recommendedDecision: 'accept',
        rejectionReasons: [],
        scores: {
          'domain-fit': 94,
          'data-readiness': 95,
          'safety-plan': 93
        }
      },
      {
        applicantId: 'applicant-missing-reviewer-identity',
        anonymousScreeningObserved: true,
        conflict: false,
        recommendedDecision: 'accept',
        rejectionReasons: [],
        scores: {
          'domain-fit': 92,
          'data-readiness': 94,
          'safety-plan': 91
        }
      }
    ]
  };
}

module.exports = {
  evaluatePrequalificationRound,
  buildSampleRound,
  digest
};
