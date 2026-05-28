const crypto = require('crypto');

const REQUIRED_SECTIONS = ['background', 'methods', 'results', 'conclusions'];

function assessStructuredAbstract(manuscript) {
  const findings = dedupeFindings([
    ...assessRequiredSections(manuscript),
    ...assessMethodsAlignment(manuscript),
    ...assessResultsAlignment(manuscript),
    ...assessConclusionBalance(manuscript)
  ]).sort(compareFindings);

  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  const packet = {
    manuscriptId: manuscript.manuscriptId,
    status: chooseStatus(blockerCount, warningCount),
    reviewLanes: chooseReviewLanes(blockerCount, warningCount),
    findings,
    actions: buildActions(manuscript, findings),
    abstractSignals: buildSignals(findings),
    assessedAt: manuscript.assessedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function assessRequiredSections(manuscript) {
  const abstract = manuscript.abstract || {};
  return REQUIRED_SECTIONS
    .filter((section) => !hasText(abstract[section]))
    .map((section) => finding({
      code: 'MISSING_ABSTRACT_SECTION',
      severity: 'warning',
      target: section,
      message: `Structured abstract is missing the ${section} section.`
    }));
}

function assessMethodsAlignment(manuscript) {
  const abstractMethods = normalize(manuscript.abstract?.methods);
  const findings = [];

  if (manuscript.methods?.sampleSize && !abstractMethods.includes(String(manuscript.methods.sampleSize))) {
    findings.push(finding({
      code: 'SAMPLE_SIZE_MISMATCH',
      severity: 'blocker',
      target: 'methods.sampleSize',
      message: `Abstract methods do not match the method sample size of ${manuscript.methods.sampleSize}.`
    }));
  }

  const design = normalize(manuscript.methods?.design);
  if (design && !abstractMethods.includes(design)) {
    findings.push(finding({
      code: 'METHODS_DESIGN_MISMATCH',
      severity: 'blocker',
      target: 'methods.design',
      message: `Abstract methods do not describe the study design as ${manuscript.methods.design}.`
    }));
  }

  return findings;
}

function assessResultsAlignment(manuscript) {
  const results = manuscript.results || {};
  const abstractResults = normalize(manuscript.abstract?.results);
  const findings = [];

  if (results.sampleSize && !abstractResults.includes(String(results.sampleSize))) {
    findings.push(finding({
      code: 'SAMPLE_SIZE_MISMATCH',
      severity: 'blocker',
      target: 'results.sampleSize',
      message: `Abstract results do not match the result sample size of ${results.sampleSize}.`
    }));
  }

  if (
    results.primaryEndpoint
    && !abstractResults.includes(normalize(results.primaryEndpoint))
    && !abstractResults.includes('primary endpoint')
  ) {
    findings.push(finding({
      code: 'ENDPOINT_MISMATCH',
      severity: 'blocker',
      target: 'results.primaryEndpoint',
      message: `Abstract results do not name the primary endpoint: ${results.primaryEndpoint}.`
    }));
  }

  if (results.direction === 'no_clear_effect' && impliesImprovement(abstractResults)) {
    findings.push(finding({
      code: 'RESULT_DIRECTION_MISMATCH',
      severity: 'blocker',
      target: 'results.direction',
      message: 'Abstract results imply improvement, but the result packet reports no clear effect.'
    }));
  }

  return findings;
}

function assessConclusionBalance(manuscript) {
  const findings = [];
  const conclusion = normalize(manuscript.abstract?.conclusions);
  const uncertainEvidence = manuscript.results?.exploratory || manuscript.methods?.confidenceIntervalCrossesNull;

  if (uncertainEvidence && !hasLimitations(manuscript, conclusion)) {
    findings.push(finding({
      code: 'MISSING_LIMITATION_LANGUAGE',
      severity: 'blocker',
      target: 'abstract.conclusions',
      message: 'Exploratory or uncertain findings need limitation language before AI review release.'
    }));
  }

  if (uncertainEvidence && overstatesConclusion(conclusion)) {
    findings.push(finding({
      code: 'CONCLUSION_OVERSTATES_EVIDENCE',
      severity: 'blocker',
      target: 'abstract.conclusions',
      message: 'Conclusion uses definitive language despite exploratory or uncertain evidence.'
    }));
  }

  return findings;
}

function chooseStatus(blockerCount, warningCount) {
  if (blockerCount > 0) return 'hold_peer_review_packet';
  if (warningCount > 0) return 'stage_for_author_revision';
  return 'release_peer_review_packet';
}

function chooseReviewLanes(blockerCount, warningCount) {
  if (blockerCount > 0) {
    return {
      authorDraft: 'revise_required',
      aiPeerReview: 'blocked',
      editorSummary: 'blocked'
    };
  }
  if (warningCount > 0) {
    return {
      authorDraft: 'revision_queue',
      aiPeerReview: 'draft_only',
      editorSummary: 'withhold'
    };
  }
  return {
    authorDraft: 'allowed',
    aiPeerReview: 'allowed',
    editorSummary: 'allowed'
  };
}

function buildActions(manuscript, findings) {
  if (!findings.length) return [`release_with_abstract_consistency_monitoring:${manuscript.manuscriptId}`];

  const actions = new Set();
  const codes = new Set(findings.map((finding) => finding.code));
  if (codes.has('MISSING_ABSTRACT_SECTION')) actions.add(`add_missing_sections:${manuscript.manuscriptId}`);
  if (codes.has('METHODS_DESIGN_MISMATCH') || codes.has('SAMPLE_SIZE_MISMATCH')) actions.add(`revise_methods_summary:${manuscript.manuscriptId}`);
  if (codes.has('ENDPOINT_MISMATCH') || codes.has('RESULT_DIRECTION_MISMATCH')) actions.add(`align_results_with_primary_endpoint:${manuscript.manuscriptId}`);
  if (codes.has('CONCLUSION_OVERSTATES_EVIDENCE')) actions.add(`tone_down_conclusion:${manuscript.manuscriptId}`);
  if (codes.has('MISSING_LIMITATION_LANGUAGE')) actions.add(`add_limitations_to_abstract:${manuscript.manuscriptId}`);
  return [...actions].sort();
}

function buildSignals(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    sectionsComplete: !codes.has('MISSING_ABSTRACT_SECTION'),
    methodsAligned: !codes.has('METHODS_DESIGN_MISMATCH') && !codes.has('SAMPLE_SIZE_MISMATCH'),
    resultsAligned: !codes.has('ENDPOINT_MISMATCH') && !codes.has('RESULT_DIRECTION_MISMATCH'),
    limitationsBalanced: !codes.has('MISSING_LIMITATION_LANGUAGE') && !codes.has('CONCLUSION_OVERSTATES_EVIDENCE')
  };
}

function finding({ code, severity, target, message }) {
  return { code, severity, target, message };
}

function compareFindings(left, right) {
  return `${left.code}:${left.target}`.localeCompare(`${right.code}:${right.target}`);
}

function dedupeFindings(findings) {
  const seen = new Set();
  const deduped = [];
  for (const finding of findings) {
    if (seen.has(finding.code)) continue;
    seen.add(finding.code);
    deduped.push(finding);
  }
  return deduped;
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function impliesImprovement(value) {
  return /\b(improved|improves|increase|increased|reduced|decreased|better|effective|benefit)\b/i.test(value);
}

function overstatesConclusion(value) {
  return /\b(definitively|proves|all|ready for clinical deployment|guarantees|always)\b/i.test(value);
}

function hasLimitations(manuscript, conclusion) {
  const limitations = manuscript.limitations || [];
  if (limitations.some((item) => hasText(item))) return true;
  return /\b(may|exploratory|limited|uncertain|pilot|retrospective|requires validation)\b/i.test(conclusion);
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
  assessStructuredAbstract
};
