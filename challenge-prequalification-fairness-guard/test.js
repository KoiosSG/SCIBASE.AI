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

function testInvalidAppealWindowHoldsRejectedApplicantForFairnessReview() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-invalid-appeal',
      sponsorDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      appealDueAt: 'not-a-date'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-invalid-appeal',
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
      applicantId: 'applicant-invalid-appeal',
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
  const decision = byId(result.decisions, 'applicant-invalid-appeal');
  const action = byId(result.remediationActions, 'remediate-applicant-invalid-appeal');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.appealStatus, 'invalid');
  assert.equal(decision.reasons.includes('invalid-appeal-window'), true);
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

function testDuplicatePublishedCriterionIdsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 50
    },
    {
      id: 'domain-fit',
      label: 'Duplicated sponsor rubric identifier',
      weight: 25
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 25
    }
  ];
  round.applicants = [
    {
      id: 'applicant-duplicate-criterion',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-duplicate-criterion',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'safety-plan': 92
      }
    },
    {
      applicantId: 'applicant-duplicate-criterion',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-duplicate-criterion');
  const action = byId(result.remediationActions, 'remediate-applicant-duplicate-criterion');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('duplicate-published-criterion'), true);
  assert.equal(action.action, 'publish-unique-screening-criteria');
  assert.equal(action.priority, 'high');
}

function testInvalidPassThresholdHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.passThreshold = -5;

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('pass-threshold-invalid'), true);
  assert.equal(action.action, 'publish-valid-prequalification-threshold');
  assert.equal(action.priority, 'high');
}

function testMissingRejectionReasonListHoldsWithoutCrashing() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-missing-rejection-list',
      sponsorDecision: 'reject',
      appealDueAt: '2026-06-04T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-missing-rejection-list',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 58,
        'data-readiness': 60,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-missing-rejection-list',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 59,
        'data-readiness': 61,
        'safety-plan': 60
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-rejection-list');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-rejection-list');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.deepEqual(decision.rejectionReasons, []);
  assert.equal(decision.reasons.includes('missing-rejection-reason'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
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

function testDuplicateReviewerScoreEvidenceDoesNotSatisfyQuorum() {
  const round = buildSampleRound();
  round.minReviewers = 2;
  round.applicants = [
    {
      id: 'applicant-duplicate-reviewer',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-duplicate-reviewer',
      reviewerId: 'reviewer-repeat',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        'data-readiness': 94,
        'safety-plan': 95
      }
    },
    {
      applicantId: 'applicant-duplicate-reviewer',
      reviewerId: 'reviewer-repeat',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 93,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-duplicate-reviewer');
  const action = byId(result.remediationActions, 'remediate-applicant-duplicate-reviewer');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reviewersCounted, 1);
  assert.equal(decision.reasons.includes('duplicate-reviewer-score-evidence'), true);
  assert.equal(decision.reasons.includes('reviewer-quorum-shortfall'), true);
  assert.equal(action.action, 'deduplicate-reviewer-score-evidence');
  assert.equal(action.priority, 'high');
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
  testInvalidAppealWindowHoldsRejectedApplicantForFairnessReview,
  testInvalidCriterionWeightsHoldPrequalificationRound,
  testInvalidIndividualCriterionWeightsHoldPrequalificationRound,
  testDuplicatePublishedCriterionIdsHoldPrequalificationRound,
  testInvalidPassThresholdHoldsPrequalificationRound,
  testMissingRejectionReasonListHoldsWithoutCrashing,
  testIncompleteReviewerScoreEvidenceHoldsWithoutCrashing,
  testDuplicateReviewerScoreEvidenceDoesNotSatisfyQuorum,
  testAuditDigestIsDeterministicAndPrivateFree
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} challenge prequalification fairness tests passed`);
