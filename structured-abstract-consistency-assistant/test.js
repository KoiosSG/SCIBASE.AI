const assert = require('assert');

const { assessStructuredAbstract } = require('./index');

function findingCodes(packet) {
  return packet.findings.map((finding) => finding.code).sort();
}

function findingTargets(packet, code) {
  return packet.findings
    .filter((finding) => finding.code === code)
    .map((finding) => finding.target)
    .sort();
}

function testBlocksReviewerReadyAbstractWhenClaimsDoNotMatchEvidence() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-risk',
    assessedAt: '2026-05-28T10:10:00Z',
    abstract: {
      background: 'Remote review tools may improve manuscript quality.',
      methods: 'We evaluated 120 participants in a randomized study.',
      results: 'The primary endpoint improved strongly after the assistant was used.',
      conclusions: 'The assistant definitively improves all review outcomes and is ready for clinical deployment.'
    },
    methods: {
      design: 'exploratory observational pilot',
      sampleSize: 84,
      primaryEndpoint: 'review turnaround time',
      confidenceIntervalCrossesNull: true
    },
    results: {
      primaryEndpoint: 'review turnaround time',
      direction: 'no_clear_effect',
      sampleSize: 84,
      effect: 'median review time changed by 1.1 hours',
      exploratory: true
    },
    limitations: []
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.equal(packet.reviewLanes.authorDraft, 'revise_required');
  assert.equal(packet.reviewLanes.aiPeerReview, 'blocked');
  assert.equal(packet.reviewLanes.editorSummary, 'blocked');
  assert.deepEqual(findingCodes(packet), [
    'CONCLUSION_OVERSTATES_EVIDENCE',
    'CONCLUSION_RESULT_DIRECTION_MISMATCH',
    'ENDPOINT_MISMATCH',
    'METHODS_DESIGN_MISMATCH',
    'MISSING_LIMITATION_LANGUAGE',
    'RESULT_DIRECTION_MISMATCH',
    'SAMPLE_SIZE_MISMATCH',
    'SAMPLE_SIZE_MISMATCH'
  ]);
  assert.deepEqual(findingTargets(packet, 'SAMPLE_SIZE_MISMATCH'), [
    'methods.sampleSize',
    'results.sampleSize'
  ]);
  assert.ok(packet.actions.includes('revise_methods_summary:ms-abstract-risk'));
  assert.ok(packet.actions.includes('tone_down_conclusion:ms-abstract-risk'));
  assert.ok(packet.actions.includes('add_limitations_to_abstract:ms-abstract-risk'));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testPreservesSameCodeFindingsForDifferentEvidenceTargets() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-dual-sample-mismatch',
    assessedAt: '2026-05-28T10:25:00Z',
    abstract: {
      background: 'Automated checks may reduce reviewer load.',
      methods: 'We evaluated 120 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, improved in 118 manuscripts.',
      conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 94,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingTargets(packet, 'SAMPLE_SIZE_MISMATCH'), [
    'methods.sampleSize',
    'results.sampleSize'
  ]);
  assert.equal(packet.findings.filter((finding) => finding.code === 'SAMPLE_SIZE_MISMATCH').length, 2);
}

function testBlocksGenericPrimaryEndpointLanguageWithoutNamedEndpoint() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-generic-endpoint',
    assessedAt: '2026-05-28T10:35:00Z',
    abstract: {
      background: 'Automated checks may reduce reviewer load.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint improved in 96 manuscripts.',
      conclusions: 'The assistant may reduce reviewer load in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingTargets(packet, 'ENDPOINT_MISMATCH'), ['results.primaryEndpoint']);
  assert.ok(packet.actions.includes('align_results_with_primary_endpoint:ms-abstract-generic-endpoint'));
}

function testBlocksImprovementClaimWhenResultsShowWorseDirection() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-worse-direction',
    assessedAt: '2026-05-28T10:38:00Z',
    abstract: {
      background: 'Automated checks may reduce reviewer load.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
      conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'worse',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingCodes(packet), ['RESULT_DIRECTION_MISMATCH']);
  assert.ok(packet.actions.includes('align_results_with_primary_endpoint:ms-abstract-worse-direction'));
  assert.equal(packet.abstractSignals.resultsAligned, false);
}

function testBlocksConclusionBenefitClaimWhenResultsShowWorseDirection() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-conclusion-benefit-drift',
    assessedAt: '2026-05-29T17:10:00Z',
    abstract: {
      background: 'Automated checks may reduce reviewer load.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, worsened in 96 manuscripts.',
      conclusions: 'The assistant is effective for reducing comment triage time in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'worse',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingCodes(packet), ['CONCLUSION_RESULT_DIRECTION_MISMATCH']);
  assert.ok(packet.actions.includes('tone_down_conclusion:ms-abstract-conclusion-benefit-drift'));
  assert.equal(packet.abstractSignals.resultsAligned, false);
}

function testBlocksLowerOutcomeBenefitLanguageWhenResultsShowNoClearEffect() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-lower-outcome-drift',
    assessedAt: '2026-05-29T19:25:00Z',
    abstract: {
      background: 'Automated checks may reduce reviewer load.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, was lower in 96 manuscripts.',
      conclusions: 'The assistant may lower comment triage time in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'no_clear_effect',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingCodes(packet), [
    'CONCLUSION_RESULT_DIRECTION_MISMATCH',
    'RESULT_DIRECTION_MISMATCH'
  ]);
  assert.ok(packet.actions.includes('align_results_with_primary_endpoint:ms-abstract-lower-outcome-drift'));
  assert.ok(packet.actions.includes('tone_down_conclusion:ms-abstract-lower-outcome-drift'));
  assert.equal(packet.abstractSignals.resultsAligned, false);
}

function testAllowsAccurateAdverseIncreaseWhenResultsShowWorseDirection() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-adverse-increase',
    assessedAt: '2026-05-29T21:45:00Z',
    abstract: {
      background: 'Automated checks may reduce manual reviewer triage.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, adverse event rate, increased in 96 manuscripts.',
      conclusions: 'The assistant may require additional monitoring in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'adverse event rate',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'adverse event rate',
      direction: 'worse',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'release_peer_review_packet');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.abstractSignals.resultsAligned, true);
}

function testBlocksWorseOutcomeClaimWhenResultsShowImprovement() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-worse-wording-drift',
    assessedAt: '2026-05-29T22:35:00Z',
    abstract: {
      background: 'Automated checks may reduce manual reviewer triage.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, worsened in 96 manuscripts.',
      conclusions: 'The assistant may require additional monitoring in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingCodes(packet), ['RESULT_DIRECTION_MISMATCH']);
  assert.ok(packet.actions.includes('align_results_with_primary_endpoint:ms-abstract-worse-wording-drift'));
  assert.equal(packet.abstractSignals.resultsAligned, false);
}

function testAllowsFormattedSampleSizesInStructuredAbstract() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-formatted-sample-size',
    assessedAt: '2026-05-29T18:18:00Z',
    abstract: {
      background: 'Automated checks may reduce manual reviewer triage.',
      methods: 'We evaluated 1,200 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, improved in 1,200 manuscripts.',
      conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 1200,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 1200,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'release_peer_review_packet');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.abstractSignals.methodsAligned, true);
  assert.equal(packet.abstractSignals.resultsAligned, true);
}

function testRequiresLimitationLanguageInStructuredAbstractConclusion() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-limitation-outside-abstract',
    assessedAt: '2026-05-28T10:40:00Z',
    abstract: {
      background: 'Automated checks may reduce reviewer load.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
      conclusions: 'The assistant reduces comment triage time in similar settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 96,
      exploratory: true
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'hold_peer_review_packet');
  assert.deepEqual(findingCodes(packet), ['MISSING_LIMITATION_LANGUAGE']);
  assert.ok(packet.actions.includes('add_limitations_to_abstract:ms-abstract-limitation-outside-abstract'));
  assert.equal(packet.abstractSignals.limitationsBalanced, false);
}

function testStagesAbstractMissingRequiredSections() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-incomplete',
    assessedAt: '2026-05-28T10:15:00Z',
    abstract: {
      background: 'A short background is present.',
      methods: 'We evaluated 64 projects in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, improved in 64 projects.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 64,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 64,
      exploratory: false
    },
    limitations: ['single-institution pilot']
  });

  assert.equal(packet.status, 'stage_for_author_revision');
  assert.equal(packet.reviewLanes.authorDraft, 'revision_queue');
  assert.equal(packet.reviewLanes.aiPeerReview, 'draft_only');
  assert.equal(packet.reviewLanes.editorSummary, 'withhold');
  assert.deepEqual(findingCodes(packet), ['MISSING_ABSTRACT_SECTION']);
  assert.deepEqual(packet.actions, ['add_missing_sections:ms-abstract-incomplete']);
}

function testAllowsConsistentStructuredAbstractWithStableDigest() {
  const packet = assessStructuredAbstract({
    manuscriptId: 'ms-abstract-clean',
    assessedAt: '2026-05-28T10:20:00Z',
    abstract: {
      background: 'Automated checks may reduce manual reviewer triage.',
      methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
      results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
      conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
    },
    methods: {
      design: 'retrospective cohort',
      sampleSize: 96,
      primaryEndpoint: 'comment triage time',
      confidenceIntervalCrossesNull: false
    },
    results: {
      primaryEndpoint: 'comment triage time',
      direction: 'improved',
      sampleSize: 96,
      exploratory: false
    },
    limitations: ['single-institution retrospective data']
  });

  assert.equal(packet.status, 'release_peer_review_packet');
  assert.equal(packet.reviewLanes.authorDraft, 'allowed');
  assert.equal(packet.reviewLanes.aiPeerReview, 'allowed');
  assert.equal(packet.reviewLanes.editorSummary, 'allowed');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.abstractSignals.sectionsComplete, true);
  assert.equal(packet.abstractSignals.methodsAligned, true);
  assert.equal(packet.abstractSignals.resultsAligned, true);
  assert.equal(packet.abstractSignals.limitationsBalanced, true);
  assert.deepEqual(packet.actions, ['release_with_abstract_consistency_monitoring:ms-abstract-clean']);
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

const tests = [
  testBlocksReviewerReadyAbstractWhenClaimsDoNotMatchEvidence,
  testPreservesSameCodeFindingsForDifferentEvidenceTargets,
  testBlocksGenericPrimaryEndpointLanguageWithoutNamedEndpoint,
  testBlocksImprovementClaimWhenResultsShowWorseDirection,
  testBlocksConclusionBenefitClaimWhenResultsShowWorseDirection,
  testBlocksLowerOutcomeBenefitLanguageWhenResultsShowNoClearEffect,
  testAllowsAccurateAdverseIncreaseWhenResultsShowWorseDirection,
  testBlocksWorseOutcomeClaimWhenResultsShowImprovement,
  testAllowsFormattedSampleSizesInStructuredAbstract,
  testRequiresLimitationLanguageInStructuredAbstractConclusion,
  testStagesAbstractMissingRequiredSections,
  testAllowsConsistentStructuredAbstractWithStableDigest
];

for (const test of tests) {
  test();
}

console.log(`structured-abstract-consistency-assistant tests passed (${tests.length})`);
