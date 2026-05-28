const assert = require('assert');
const {
  evaluateAliasGuard,
  buildSampleCorpus
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testTrustedTranslatedAliasesBecomeCanonicalGraphNodes() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const crispr = byId(result.entityPackets, 'entity:mesh:D000077768');

  assert.equal(crispr.canonicalName, 'CRISPR-Cas9');
  assert.deepEqual(crispr.languages.sort(), ['de', 'en', 'es']);
  assert.equal(crispr.mentions.length, 3);
  assert.equal(crispr.jsonLd['@type'], 'DefinedTerm');
  assert.equal(crispr.jsonLd.identifier, 'MeSH:D000077768');
}

function testFalseFriendMentionsAreHeldForCuratorReview() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const event = byId(result.mentionDecisions, 'mention-control-es');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'false-friend-or-homograph');
  assert.equal(event.candidateEntityId, 'entity:stat:control-group');

  const action = byId(result.curatorActions, 'curate-mention-control-es');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-homograph');
}

function testSameLanguageAliasCollisionsAreHeldForCuratorReview() {
  const corpus = JSON.parse(JSON.stringify(buildSampleCorpus()));
  corpus.entities.push({
    id: 'entity:custom:diabetes-insipidus',
    canonicalName: 'Diabetes Insipidus',
    ontology: 'SCIBASE-MED',
    identifier: 'diabetes-insipidus',
    localizedNames: {
      es: ['diabetes mellitus']
    }
  });

  const result = evaluateAliasGuard(corpus);
  const event = byId(result.mentionDecisions, 'mention-diabetes-es');

  assert.equal(event.decision, 'hold-for-curator-review');
  assert.equal(event.reason, 'alias-collision');
  assert.deepEqual(event.candidateEntityIds, [
    'entity:custom:diabetes-insipidus',
    'entity:mesh:D003920'
  ]);

  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');
  assert.equal(diabetes.mentions.length, 2);

  const action = byId(result.curatorActions, 'curate-mention-diabetes-es');
  assert.equal(action.priority, 'high');
  assert.equal(action.action, 'review-multilingual-alias-collision');
}

function testLowConfidenceAliasesDoNotDriveRecommendations() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const event = byId(result.mentionDecisions, 'mention-cellule-fr');

  assert.equal(event.decision, 'suppress-recommendation');
  assert.equal(event.reason, 'low-confidence-alias');
  assert.equal(result.recommendationGuards.suppressedMentionIds.includes('mention-cellule-fr'), true);
}

function testLanguageTaggedSynonymsArePreservedForEntityPages() {
  const result = evaluateAliasGuard(buildSampleCorpus());
  const diabetes = byId(result.entityPackets, 'entity:mesh:D003920');

  assert.deepEqual(diabetes.localizedNames, {
    en: ['diabetes mellitus'],
    de: ['Diabetes mellitus'],
    es: ['diabetes mellitus']
  });
  assert.equal(diabetes.schemaOrg.about.length, 3);
}

function testAuditDigestIsDeterministicAndPrivateFree() {
  const result = evaluateAliasGuard(buildSampleCorpus());

  assert.ok(result.auditDigest.startsWith('sha256:'));
  assert.equal(result.summary.acceptedMentions, 6);
  assert.equal(result.summary.heldMentions, 1);
  assert.equal(result.summary.suppressedMentions, 1);
  assert.ok(!JSON.stringify(result).includes('private@'));
}

const tests = [
  testTrustedTranslatedAliasesBecomeCanonicalGraphNodes,
  testFalseFriendMentionsAreHeldForCuratorReview,
  testSameLanguageAliasCollisionsAreHeldForCuratorReview,
  testLowConfidenceAliasesDoNotDriveRecommendations,
  testLanguageTaggedSynonymsArePreservedForEntityPages,
  testAuditDigestIsDeterministicAndPrivateFree
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} multilingual entity alias guard tests passed`);
