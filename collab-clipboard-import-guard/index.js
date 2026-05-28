const crypto = require('crypto');

function assessImportBatch(batch) {
  const sourceFindings = assessSource(batch);
  const duplicateAnchorBlocks = findDuplicateAnchorBlocks(batch.blocks || []);
  const sanitizedBlocks = [];
  const blockFindings = [];

  for (const block of batch.blocks || []) {
    const { sanitizedBlock, findings } = assessBlock(block, batch, duplicateAnchorBlocks);
    sanitizedBlocks.push(sanitizedBlock);
    blockFindings.push(...findings);
  }

  const findings = [...sourceFindings, ...blockFindings].sort(compareFindings);
  const status = chooseStatus(findings);
  const packet = {
    importId: batch.importId,
    workspaceId: batch.workspaceId,
    status,
    insertionLanes: chooseInsertionLanes(status),
    source: sanitizeSource(batch.source || {}),
    findings,
    sanitizedBlocks,
    actions: buildActions(batch, findings),
    assessedAt: batch.receivedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function assessSource(batch) {
  const source = batch.source || {};
  const findings = [];

  if (source.trustLevel === 'untrusted') {
    findings.push(finding({
      code: 'UNTRUSTED_SOURCE',
      severity: 'blocker',
      blockId: null,
      message: `Import source ${source.origin || 'unknown'} is not trusted for collaborative insertion.`
    }));
  }

  if (source.trustLevel === 'partner' && !source.signedAttestation) {
    findings.push(finding({
      code: 'MISSING_SOURCE_ATTESTATION',
      severity: 'warning',
      blockId: null,
      message: 'Partner import needs a signed source attestation before direct insertion.'
    }));
  }

  return findings;
}

function assessBlock(block, batch, duplicateAnchorBlocks) {
  const findings = [];
  const sanitizedBlock = sanitizeBlockBase(block, duplicateAnchorBlocks);

  if (containsHiddenInstruction(block.hiddenText)) {
    findings.push(finding({
      code: 'HIDDEN_INSTRUCTION_TEXT',
      severity: 'blocker',
      blockId: block.id,
      message: 'Hidden clipboard text contains instruction-like content that reviewers cannot see.'
    }));
  }

  if (hasFormulaCell(block)) {
    findings.push(finding({
      code: 'CSV_FORMULA_CELL',
      severity: 'blocker',
      blockId: block.id,
      message: 'Imported table contains spreadsheet formulas that must be escaped before render.'
    }));
    sanitizedBlock.cells = sanitizeCells(block.cells);
  }

  if (containsLocalPrivatePath(block.content)) {
    findings.push(finding({
      code: 'LOCAL_PRIVATE_PATH',
      severity: 'blocker',
      blockId: block.id,
      message: 'Imported notebook output references a local or private filesystem path.'
    }));
    sanitizedBlock.content = redactLocalPrivatePaths(block.content);
  }

  if (isStaleReviewMetadata(block, batch)) {
    findings.push(finding({
      code: 'STALE_REVIEW_METADATA',
      severity: 'blocker',
      blockId: block.id,
      message: 'Imported review metadata is expired or bound to an old section version.'
    }));
    delete sanitizedBlock.reviewMetadata;
    sanitizedBlock.reviewMetadataStatus = 'dropped_stale';
  }

  if (duplicateAnchorBlocks.has(block.id)) {
    findings.push(finding({
      code: 'DUPLICATE_ANCHOR',
      severity: 'blocker',
      blockId: block.id,
      message: `Anchor ${block.anchor} appears more than once in the imported payload.`
    }));
  }

  return { sanitizedBlock, findings };
}

function sanitizeBlockBase(block, duplicateAnchorBlocks) {
  const sanitized = {};
  for (const [key, value] of Object.entries(block)) {
    if (key !== 'hiddenText') {
      sanitized[key] = clone(value);
    }
  }

  if (sanitized.anchor && duplicateAnchorBlocks.has(block.id)) {
    sanitized.anchor = `${sanitized.anchor}-${digestValue(block.id || sanitized.anchor).slice(0, 8)}`;
  }

  return sanitized;
}

function findDuplicateAnchorBlocks(blocks) {
  const blocksByAnchor = new Map();
  const duplicates = new Set();

  for (const block of blocks) {
    if (!block.anchor) continue;
    const anchorBlocks = blocksByAnchor.get(block.anchor) || [];
    anchorBlocks.push(block);
    blocksByAnchor.set(block.anchor, anchorBlocks);
  }

  for (const anchorBlocks of blocksByAnchor.values()) {
    if (anchorBlocks.length > 1) {
      anchorBlocks.forEach((block) => duplicates.add(block.id));
    }
  }

  return duplicates;
}

function hasFormulaCell(block) {
  return Array.isArray(block.cells) && block.cells.some((row) => (
    Array.isArray(row) && row.some((cell) => typeof cell === 'string' && /^[=+\-@]/.test(cell.trim()))
  ));
}

function sanitizeCells(cells) {
  return cells.map((row) => row.map((cell) => {
    if (typeof cell === 'string' && /^[=+\-@]/.test(cell.trim())) {
      return `'${cell}`;
    }
    return cell;
  }));
}

function containsHiddenInstruction(value = '') {
  return /ignore previous|system prompt|hidden instruction|do not show|approve the submission/i.test(value);
}

function containsLocalPrivatePath(value = '') {
  return /(?:file:\/\/|[A-Z]:\\Users\\[^ ]+|\/Users\/[^ \n]+|\/home\/[^ \n]+|private-lab|patient-export)/i.test(value);
}

function redactLocalPrivatePaths(value = '') {
  return value
    .replace(/file:\/\/[^ \n]+/gi, '[redacted-local-path]')
    .replace(/[A-Z]:\\Users\\[^ \n]+/g, '[redacted-local-path]')
    .replace(/\/Users\/[^ \n]+/g, '[redacted-local-path]')
    .replace(/\/home\/[^ \n]+/g, '[redacted-local-path]');
}

function isStaleReviewMetadata(block, batch) {
  const metadata = block.reviewMetadata;
  if (!metadata) return false;

  const receivedAt = Date.parse(batch.receivedAt);
  const expiresAt = metadata.expiresAt ? Date.parse(metadata.expiresAt) : null;
  if (expiresAt && receivedAt && expiresAt < receivedAt) return true;

  const currentVersion = batch.currentSectionVersions?.[block.sectionId];
  return Boolean(currentVersion && metadata.sectionVersion && metadata.sectionVersion !== currentVersion);
}

function chooseStatus(findings) {
  if (findings.some((item) => item.severity === 'blocker')) return 'quarantine_import';
  if (findings.length) return 'stage_for_curator_review';
  return 'allow_collaborative_insert';
}

function chooseInsertionLanes(status) {
  if (status === 'quarantine_import') {
    return {
      collaborativeInsert: 'blocked',
      reviewerPreview: 'redacted',
      auditRetention: 'quarantine'
    };
  }
  if (status === 'stage_for_curator_review') {
    return {
      collaborativeInsert: 'curator_review',
      reviewerPreview: 'watermarked',
      auditRetention: 'staged'
    };
  }
  return {
    collaborativeInsert: 'allowed',
    reviewerPreview: 'allowed',
    auditRetention: 'standard'
  };
}

function buildActions(batch, findings) {
  if (!findings.length) return [`allow_collaborative_insert:${batch.importId}`];

  const actions = new Set();
  if (findings.some((item) => item.severity === 'blocker')) {
    actions.add(`quarantine_import:${batch.importId}`);
  }

  for (const item of findings) {
    if (item.code === 'CSV_FORMULA_CELL') actions.add(`escape_formula_cells:${item.blockId}`);
    if (item.code === 'LOCAL_PRIVATE_PATH') actions.add(`redact_local_paths:${item.blockId}`);
    if (item.code === 'STALE_REVIEW_METADATA') actions.add(`drop_stale_review_metadata:${item.blockId}`);
    if (item.code === 'DUPLICATE_ANCHOR') actions.add(`regenerate_anchor:${item.blockId}`);
    if (item.code === 'HIDDEN_INSTRUCTION_TEXT') actions.add(`strip_hidden_instruction_text:${item.blockId}`);
    if (item.code === 'UNTRUSTED_SOURCE') actions.add(`require_curator_source_review:${batch.importId}`);
    if (item.code === 'MISSING_SOURCE_ATTESTATION') actions.add(`request_signed_source_attestation:${batch.importId}`);
  }

  return [...actions].sort();
}

function finding({ code, severity, blockId, message }) {
  return { code, severity, blockId, message };
}

function compareFindings(left, right) {
  return `${left.code}:${left.blockId || ''}`.localeCompare(`${right.code}:${right.blockId || ''}`);
}

function sanitizeSource(source) {
  return {
    channel: source.channel || 'unknown',
    origin: source.origin || 'unknown',
    trustLevel: source.trustLevel || 'unknown',
    attested: Boolean(source.signedAttestation)
  };
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

function digestValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessImportBatch
};
