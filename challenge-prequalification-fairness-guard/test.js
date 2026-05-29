const assert = require('assert');
const {
  evaluatePrequalificationRound,
  buildSampleRound
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testEligibleApplicantIsAcceptedWithPublishedCriteriaAndQuorum() {
  const result = evaluatePrequalificationRound(buildSampleRound());
  const decision = byId(result.decisions, 'applicant-biofoundry');

  assert.equal(decision.decision, 'accept-prequalified');
  assert.equal(decision.weightedScore, 87);
  assert.equal(decision.reviewersCounted, 2);
  assert.deepEqual(decision.criteriaApplied, [
    'domain-fit',
    'data-readiness',
    'safety-plan'
  ]);
}

function testAnonymousScreeningLeakHoldsApplicantForFairnessReview() {
  const result = evaluatePrequalificationRound(buildSampleRound());
  const decision = byId(result.decisions, 'applicant-neuro-lab');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('anonymous-screening-leak'), true);
  assert.equal(decision.reasons.includes('inconsistent-threshold-decision'), true);

  const action = byId(result.remediationActions, 'remediate-applicant-neuro-lab');
  assert.equal(action.action, 'rerun-blinded-prequalification-review');
  assert.equal(action.priority, 'high');
}

function testConflictedAndIncompleteRejectionsStayAuditable() {
  const result = evaluatePrequalificationRound(buildSampleRound());
  const decision = byId(result.decisions, 'applicant-sponsor-alumni');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('reviewer-conflict'), true);
  assert.equal(decision.reasons.includes('missing-rejection-reason'), true);
  assert.equal(decision.appealStatus, 'missing');
}

function testConflictedReviewerScoresDoNotInflateWeightedScore() {
  const round = buildSampleRound();
  round.minReviewers = 1;
  round.applicants = [
    {
      id: 'applicant-conflicted-score',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-conflicted-score',
      reviewerId: 'reviewer-sponsor-advisor',
      anonymousScreeningObserved: true,
      conflict: true,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 100,
        'data-readiness': 100,
        'safety-plan': 100
      }
    },
    {
      applicantId: 'applicant-conflicted-score',
      reviewerId: 'reviewer-independent',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['missing independent validation plan'],
      scores: {
        'domain-fit': 50,
        'data-readiness': 50,
        'safety-plan': 50
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-conflicted-score');

  assert.equal(decision.weightedScore, 50);
  assert.equal(decision.reasons.includes('reviewer-conflict'), true);
  assert.equal(decision.reasons.includes('inconsistent-threshold-decision'), true);
}

function testHiddenCriteriaAreBlockedBeforeScreeningResultsPublish() {
  const round = buildSampleRound();
  round.reviews.push({
    applicantId: 'applicant-biofoundry',
    reviewerId: 'reviewer-hidden',
    anonymousScreeningObserved: true,
    conflict: false,
    recommendedDecision: 'reject',
    rejectionReasons: ['private sponsor preference'],
    scores: {
      'domain-fit': 80,
      'data-readiness': 84,
      'safety-plan': 88,
      'brand-prestige': 15
    }
  });

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('unpublished-screening-criterion'), true);
}

function testExpiredAppealWindowHoldsRejectedApplicantForFairnessReview() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-expired-appeal',
      sponsorDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      appealDueAt: '2026-05-27T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-expired-appeal',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 60,
        'data-readiness': 58,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-expired-appeal',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 62,
        'data-readiness': 57,
        'safety-plan': 61
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-expired-appeal');
  const action = byId(result.remediationActions, 'remediate-applicant-expired-appeal');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.appealStatus, 'expired');
  assert.equal(decision.reasons.includes('expired-appeal-window'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
}

function testInvalidCriterionWeightsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 60
    },
    {
      id: 'data-readiness',
      label: 'Evidence that required data and tools are ready',
      weight: 60
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 25
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('criteria-weight-total-invalid'), true);
  assert.equal(action.action, 'publish-valid-weighted-scoring-rubric');
  assert.equal(action.priority, 'high');
}

function testInvalidIndividualCriterionWeightsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 120
    },
    {
      id: 'data-readiness',
      label: 'Evidence that required data and tools are ready',
      weight: -20
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 0
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('criteria-weight-value-invalid'), true);
  assert.equal(action.action, 'publish-valid-weighted-scoring-rubric');
  assert.equal(action.priority, 'high');
}

function testIncompleteReviewerScoreEvidenceHoldsWithoutCrashing() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-incomplete-review-evidence',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-incomplete-review-evidence',
      reviewerId: 'reviewer-incomplete',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: []
    },
    {
      applicantId: 'applicant-incomplete-review-evidence',
      reviewerId: 'reviewer-partial',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 90
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-incomplete-review-evidence');
  const action = byId(result.remediationActions, 'remediate-applicant-incomplete-review-evidence');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.weightedScore, 36);
  assert.equal(decision.reasons.includes('missing-published-criterion-score'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
}

function testAuditDigestIsDeterministicAndPrivateFree() {
  const first = evaluatePrequalificationRound(buildSampleRound());
  const second = evaluatePrequalificationRound(buildSampleRound());

  assert.equal(first.auditDigest, second.auditDigest);
  assert.ok(first.auditDigest.startsWith('sha256:'));
  assert.equal(first.summary.accepted, 1);
  assert.equal(first.summary.held, 2);
  assert.equal(JSON.stringify(first).includes('private@'), false);
  assert.equal(JSON.stringify(first).includes('government_id'), false);
}

const tests = [
  testEligibleApplicantIsAcceptedWithPublishedCriteriaAndQuorum,
  testAnonymousScreeningLeakHoldsApplicantForFairnessReview,
  testConflictedAndIncompleteRejectionsStayAuditable,
  testConflictedReviewerScoresDoNotInflateWeightedScore,
  testHiddenCriteriaAreBlockedBeforeScreeningResultsPublish,
  testExpiredAppealWindowHoldsRejectedApplicantForFairnessReview,
  testInvalidCriterionWeightsHoldPrequalificationRound,
  testInvalidIndividualCriterionWeightsHoldPrequalificationRound,
  testIncompleteReviewerScoreEvidenceHoldsWithoutCrashing,
  testAuditDigestIsDeterministicAndPrivateFree
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} challenge prequalification fairness tests passed`);
