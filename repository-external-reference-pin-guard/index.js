const crypto = require('crypto');

const DEFAULT_POLICY = {
  maxReferenceAgeDays: 180
};

function assessExternalReferences(repository) {
  const policy = { ...DEFAULT_POLICY, ...(repository.policy || {}) };
  const findings = repository.references
    .flatMap((reference) => assessReference(reference, repository.assessedAt, policy))
    .sort(compareFindings);

  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  const packet = {
    repositoryId: repository.repositoryId,
    status: chooseStatus(blockerCount, warningCount),
    releaseLanes: chooseReleaseLanes(blockerCount, warningCount),
    findings,
    actions: buildActions(repository, findings),
    referenceSignals: buildSignals(findings),
    referenceSummary: summarizeReferences(repository.references),
    assessedAt: repository.assessedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function assessReference(reference, assessedAt, policy) {
  const findings = [];

  if (isGitReference(reference) && !hasPinnedCommit(reference)) {
    findings.push(finding(reference, 'FLOATING_GIT_REFERENCE', 'blocker', 'Git reference must be pinned to an immutable commit SHA before release.'));
  }

  if (reference.kind === 'api_source' && !hasSnapshotEvidence(reference, assessedAt)) {
    findings.push(finding(reference, 'FLOATING_API_REFERENCE', 'blocker', 'API source must reference a dated snapshot with checksum evidence.'));
  }

  if (needsDurableIdentifier(reference) && !hasDurableIdentifier(reference)) {
    findings.push(finding(reference, 'MISSING_DURABLE_IDENTIFIER', 'blocker', 'External data or model reference needs a checksum, DOI, or immutable version.'));
  }

  if (reference.authRequired) {
    findings.push(finding(reference, 'AUTH_REQUIRED_REFERENCE', 'blocker', 'Export bundles cannot depend on authenticated external references.'));
  }

  if (!hasText(reference.license)) {
    findings.push(finding(reference, 'MISSING_LICENSE', 'warning', 'External reference needs license metadata before DOI publication.'));
  }

  if (!hasText(reference.attribution)) {
    findings.push(finding(reference, 'MISSING_ATTRIBUTION', 'warning', 'External reference needs attribution metadata before DOI publication.'));
  }

  if (hasMissingVerificationEvidence(reference, findings)) {
    findings.push(finding(reference, 'STALE_REFERENCE_EVIDENCE', 'blocker', 'External reference needs verification evidence before release.'));
  } else if (isStale(reference.lastVerifiedAt, assessedAt, policy.maxReferenceAgeDays)) {
    findings.push(finding(reference, 'STALE_REFERENCE_EVIDENCE', 'blocker', 'External reference verification is older than policy allows.'));
  }

  return findings;
}

function isGitReference(reference) {
  return reference.kind === 'git_submodule' || reference.kind === 'external_code';
}

function hasPinnedCommit(reference) {
  const commitSha = reference.commitSha || '';
  return /^[a-f0-9]{40}$/i.test(commitSha) && !/^0{40}$/.test(commitSha);
}

function hasSnapshotEvidence(reference, assessedAt) {
  if (!hasText(reference.snapshotDate) || !hasText(reference.checksum)) return false;
  const snapshot = Date.parse(reference.snapshotDate);
  const assessed = Date.parse(assessedAt);
  if (Number.isNaN(snapshot) || Number.isNaN(assessed)) return false;
  return snapshot <= assessed;
}

function needsDurableIdentifier(reference) {
  return ['linked_dataset', 'model_weights', 'external_data'].includes(reference.kind);
}

function hasDurableIdentifier(reference) {
  return hasText(reference.checksum) || hasText(reference.doi) || hasImmutableVersion(reference.version);
}

function hasImmutableVersion(version) {
  if (!hasText(version)) return false;
  return !/^(latest|main|master|head|current|stable|dev|nightly)$/i.test(version.trim());
}

function hasMissingVerificationEvidence(reference, findings) {
  return !hasText(reference.lastVerifiedAt)
    && !findings.some((item) => item.severity === 'blocker');
}

function isStale(lastVerifiedAt, assessedAt, maxAgeDays) {
  if (!lastVerifiedAt || !assessedAt) return false;
  const verified = Date.parse(lastVerifiedAt);
  const assessed = Date.parse(assessedAt);
  if (Number.isNaN(verified) || Number.isNaN(assessed)) return true;
  if (verified > assessed) return true;
  const ageDays = Math.max(0, (assessed - verified) / (24 * 60 * 60 * 1000));
  return ageDays > maxAgeDays;
}

function chooseStatus(blockerCount, warningCount) {
  if (blockerCount > 0) return 'hold_repository_release';
  if (warningCount > 0) return 'stage_reference_metadata_revision';
  return 'release_repository_references';
}

function chooseReleaseLanes(blockerCount, warningCount) {
  if (blockerCount > 0) {
    return {
      doiPublication: 'blocked',
      exportBundle: 'blocked',
      apiAccess: 'metadata_only'
    };
  }

  if (warningCount > 0) {
    return {
      doiPublication: 'metadata_revision',
      exportBundle: 'draft_only',
      apiAccess: 'allowed'
    };
  }

  return {
    doiPublication: 'allowed',
    exportBundle: 'allowed',
    apiAccess: 'allowed'
  };
}

function buildActions(repository, findings) {
  if (!findings.length) return [`release_with_reference_pin_monitoring:${repository.repositoryId}`];

  const byReference = new Map();
  for (const item of findings) {
    if (!byReference.has(item.referenceId)) byReference.set(item.referenceId, new Set());
    byReference.get(item.referenceId).add(item.code);
  }

  const actions = new Set();
  for (const [referenceId, codes] of byReference.entries()) {
    if (codes.has('AUTH_REQUIRED_REFERENCE')) actions.add(`replace_or_snapshot_auth_reference:${referenceId}`);
    if (codes.has('FLOATING_GIT_REFERENCE') || codes.has('FLOATING_API_REFERENCE')) actions.add(`pin_external_reference:${referenceId}`);
    if (codes.has('MISSING_DURABLE_IDENTIFIER')) actions.add(`add_checksum_or_doi:${referenceId}`);
    if (codes.has('STALE_REFERENCE_EVIDENCE')) actions.add(`refresh_reference_verification:${referenceId}`);
    if (codes.has('MISSING_LICENSE') || codes.has('MISSING_ATTRIBUTION')) actions.add(`complete_license_attribution:${referenceId}`);
  }

  return [...actions].sort();
}

function buildSignals(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    immutablePins: !codes.has('FLOATING_GIT_REFERENCE') && !codes.has('FLOATING_API_REFERENCE'),
    exportable: !codes.has('AUTH_REQUIRED_REFERENCE') && !codes.has('MISSING_DURABLE_IDENTIFIER'),
    attributionComplete: !codes.has('MISSING_LICENSE') && !codes.has('MISSING_ATTRIBUTION'),
    verificationFresh: !codes.has('STALE_REFERENCE_EVIDENCE')
  };
}

function summarizeReferences(references = []) {
  return references.reduce((summary, reference) => {
    summary.total += 1;
    summary.byKind[reference.kind] = (summary.byKind[reference.kind] || 0) + 1;
    return summary;
  }, { total: 0, byKind: {} });
}

function finding(reference, code, severity, message) {
  return {
    referenceId: reference.id,
    kind: reference.kind,
    target: reference.target,
    code,
    severity,
    message
  };
}

function compareFindings(left, right) {
  return `${left.referenceId}:${left.code}`.localeCompare(`${right.referenceId}:${right.code}`);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessExternalReferences
};
