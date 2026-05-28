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
  testHiddenCriteriaAreBlockedBeforeScreeningResultsPublish,
  testAuditDigestIsDeterministicAndPrivateFree
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} challenge prequalification fairness tests passed`);
