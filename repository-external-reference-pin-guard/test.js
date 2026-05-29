const assert = require('assert');

const { assessExternalReferences } = require('./index');

function findingCodes(packet) {
  return packet.findings.map((finding) => finding.code).sort();
}

function testBlocksFloatingAndNonExportableExternalReferences() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-risk',
    assessedAt: '2026-05-28T12:00:00Z',
    policy: {
      maxReferenceAgeDays: 180
    },
    references: [
      {
        id: 'submodule-analysis-tools',
        kind: 'git_submodule',
        target: 'https://github.com/example/analysis-tools',
        branch: 'main',
        commitSha: '',
        license: 'MIT',
        attribution: 'Example Analysis Tools'
      },
      {
        id: 'dataset-lab-export',
        kind: 'linked_dataset',
        target: 'https://data.example.invalid/lab-export.csv',
        checksum: '',
        doi: '',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2025-01-15T08:00:00Z'
      },
      {
        id: 'api-weather-source',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/latest',
        snapshotDate: '',
        checksum: 'sha256:abcdef',
        authRequired: true,
        license: 'CC0-1.0',
        attribution: 'Example Weather API'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.equal(packet.releaseLanes.doiPublication, 'blocked');
  assert.equal(packet.releaseLanes.exportBundle, 'blocked');
  assert.deepEqual(findingCodes(packet), [
    'AUTH_REQUIRED_REFERENCE',
    'FLOATING_API_REFERENCE',
    'FLOATING_GIT_REFERENCE',
    'MISSING_DURABLE_IDENTIFIER',
    'STALE_REFERENCE_EVIDENCE'
  ]);
  assert.ok(packet.actions.includes('pin_external_reference:submodule-analysis-tools'));
  assert.ok(packet.actions.includes('add_checksum_or_doi:dataset-lab-export'));
  assert.ok(packet.actions.includes('replace_or_snapshot_auth_reference:api-weather-source'));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testAllowsPinnedExportableReferences() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-clean',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'submodule-analysis-tools',
        kind: 'git_submodule',
        target: 'https://github.com/example/analysis-tools',
        commitSha: '7f9c2d6c8e0f4b1a2d3c5e6f708192a3b4c5d6e7',
        license: 'MIT',
        attribution: 'Example Analysis Tools',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      },
      {
        id: 'dataset-lab-export',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.1234567',
        checksum: 'sha256:1234567890abcdef',
        doi: '10.5281/zenodo.1234567',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      },
      {
        id: 'api-weather-source',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/snapshots/2026-05-01.json',
        snapshotDate: '2026-05-01',
        checksum: 'sha256:abcdef',
        authRequired: false,
        license: 'CC0-1.0',
        attribution: 'Example Weather API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'release_repository_references');
  assert.equal(packet.releaseLanes.doiPublication, 'allowed');
  assert.equal(packet.releaseLanes.exportBundle, 'allowed');
  assert.deepEqual(packet.findings, []);
  assert.deepEqual(packet.actions, ['release_with_reference_pin_monitoring:repo-reference-clean']);
  assert.equal(packet.referenceSignals.immutablePins, true);
  assert.equal(packet.referenceSignals.exportable, true);
}

function testStagesReferencesMissingLicenseAttributionOnly() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-warning',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'model-weights',
        kind: 'model_weights',
        target: 'https://models.example.invalid/model-v3.bin',
        checksum: 'sha256:feedface',
        version: 'v3.0.1',
        license: '',
        attribution: '',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'stage_reference_metadata_revision');
  assert.equal(packet.releaseLanes.doiPublication, 'metadata_revision');
  assert.equal(packet.releaseLanes.exportBundle, 'draft_only');
  assert.deepEqual(findingCodes(packet), [
    'MISSING_ATTRIBUTION',
    'MISSING_LICENSE'
  ]);
  assert.deepEqual(packet.actions, ['complete_license_attribution:model-weights']);
}

function testFloatingVersionAliasDoesNotCountAsDurableIdentifier() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-floating-version',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'model-weights-latest',
        kind: 'model_weights',
        target: 'https://models.example.invalid/model.bin',
        version: 'latest',
        checksum: '',
        doi: '',
        license: 'Apache-2.0',
        attribution: 'Example Model Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MISSING_DURABLE_IDENTIFIER']);
  assert.ok(packet.actions.includes('add_checksum_or_doi:model-weights-latest'));
  assert.equal(packet.referenceSignals.exportable, false);
}

function testInvalidChecksumDoesNotCountAsDurableIdentifier() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-invalid-checksum',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-invalid-checksum',
        kind: 'linked_dataset',
        target: 'https://data.example.invalid/lab-export.csv',
        checksum: 'pending',
        doi: '',
        version: '',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['MISSING_DURABLE_IDENTIFIER']);
  assert.ok(packet.actions.includes('add_checksum_or_doi:dataset-invalid-checksum'));
  assert.equal(packet.referenceSignals.exportable, false);
}

function testFutureDatedVerificationEvidenceIsNotFresh() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-future-verification',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-future-verified',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.7654321',
        checksum: 'sha256:feedface',
        doi: '10.5281/zenodo.7654321',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab',
        lastVerifiedAt: '2026-05-29T12:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['STALE_REFERENCE_EVIDENCE']);
  assert.ok(packet.actions.includes('refresh_reference_verification:dataset-future-verified'));
  assert.equal(packet.referenceSignals.verificationFresh, false);
}

function testFutureDatedApiSnapshotDoesNotCountAsPinnedEvidence() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-future-api-snapshot',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'api-future-snapshot',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/snapshots/2026-06-01.json',
        snapshotDate: '2026-06-01',
        checksum: 'sha256:abcdef',
        authRequired: false,
        license: 'CC0-1.0',
        attribution: 'Example Weather API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['FLOATING_API_REFERENCE']);
  assert.ok(packet.actions.includes('pin_external_reference:api-future-snapshot'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testInvalidApiSnapshotChecksumDoesNotCountAsPinnedEvidence() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-invalid-api-checksum',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'api-invalid-checksum',
        kind: 'api_source',
        target: 'https://api.example.invalid/weather/snapshots/2026-05-01.json',
        snapshotDate: '2026-05-01',
        checksum: 'pending',
        authRequired: false,
        license: 'CC0-1.0',
        attribution: 'Example Weather API',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['FLOATING_API_REFERENCE']);
  assert.ok(packet.actions.includes('pin_external_reference:api-invalid-checksum'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testNullGitCommitShaDoesNotCountAsImmutablePin() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-null-git-pin',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'submodule-null-sha',
        kind: 'git_submodule',
        target: 'https://github.com/example/analysis-tools',
        commitSha: '0000000000000000000000000000000000000000',
        license: 'MIT',
        attribution: 'Example Analysis Tools',
        lastVerifiedAt: '2026-05-20T08:00:00Z'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['FLOATING_GIT_REFERENCE']);
  assert.ok(packet.actions.includes('pin_external_reference:submodule-null-sha'));
  assert.equal(packet.referenceSignals.immutablePins, false);
}

function testMissingVerificationEvidenceBlocksOtherwisePinnedReference() {
  const packet = assessExternalReferences({
    repositoryId: 'repo-reference-missing-verification',
    assessedAt: '2026-05-28T12:00:00Z',
    references: [
      {
        id: 'dataset-needs-verification',
        kind: 'linked_dataset',
        target: 'https://doi.org/10.5281/zenodo.2345678',
        checksum: 'sha256:abcdef123456',
        doi: '10.5281/zenodo.2345678',
        license: 'CC-BY-4.0',
        attribution: 'Example Lab'
      }
    ]
  });

  assert.equal(packet.status, 'hold_repository_release');
  assert.deepEqual(findingCodes(packet), ['STALE_REFERENCE_EVIDENCE']);
  assert.ok(packet.actions.includes('refresh_reference_verification:dataset-needs-verification'));
  assert.equal(packet.referenceSignals.verificationFresh, false);
}

const tests = [
  testBlocksFloatingAndNonExportableExternalReferences,
  testAllowsPinnedExportableReferences,
  testStagesReferencesMissingLicenseAttributionOnly,
  testFloatingVersionAliasDoesNotCountAsDurableIdentifier,
  testInvalidChecksumDoesNotCountAsDurableIdentifier,
  testFutureDatedVerificationEvidenceIsNotFresh,
  testFutureDatedApiSnapshotDoesNotCountAsPinnedEvidence,
  testInvalidApiSnapshotChecksumDoesNotCountAsPinnedEvidence,
  testNullGitCommitShaDoesNotCountAsImmutablePin,
  testMissingVerificationEvidenceBlocksOtherwisePinnedReference
];

for (const test of tests) {
  test();
}

console.log(`repository-external-reference-pin-guard tests passed (${tests.length})`);
