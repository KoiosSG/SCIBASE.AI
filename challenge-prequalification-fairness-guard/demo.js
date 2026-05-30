const fs = require('fs');
const path = require('path');
const { evaluatePrequalificationRound, buildSampleRound } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluatePrequalificationRound(buildSampleRound());

const packetPath = path.join(reportsDir, 'prequalification-fairness-packet.json');
const reportPath = path.join(reportsDir, 'prequalification-fairness-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const decisions = result.decisions
  .map(
    (decision) =>
      `- ${decision.applicantId}: ${decision.decision}, score ${decision.weightedScore}, reasons: ${
        decision.reasons.length > 0 ? decision.reasons.join(', ') : 'none'
      }`
  )
  .join('\n');

const actions = result.remediationActions
  .map((action) => `- ${action.id}: ${action.action} (${action.priority})`)
  .join('\n');

const markdown = `# Challenge Prequalification Fairness Guard

Challenge: ${result.challengeId}
Generated: ${result.generatedAt}

## Summary

- Accepted applicants: ${result.summary.accepted}
- Held for fairness review: ${result.summary.held}
- Rejected with audit trail: ${result.summary.rejectedWithAudit}
- Remediation actions: ${result.summary.remediationActions}
- Criteria digest: ${result.criteriaDigest}
- Audit digest: ${result.auditDigest}

## Decisions

${decisions}

## Remediation Actions

${actions}

## Safety

All fixtures are synthetic. The guard does not call payment processors, identity providers, private workspaces, sponsor systems, or external APIs.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#102027"/>
  <rect x="54" y="58" width="1172" height="604" rx="16" fill="#17313a" stroke="#9bd67a" stroke-width="4"/>
  <text x="96" y="134" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Challenge Prequalification Fairness Guard</text>
  <text x="96" y="208" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Accepted applicants: ${result.summary.accepted}</text>
  <text x="96" y="258" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Held for fairness review: ${result.summary.held}</text>
  <text x="96" y="308" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Remediation actions: ${result.summary.remediationActions}</text>
  <text x="96" y="380" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Checks: unique criteria, reviewer identity/quorum, thresholds, anonymity, conflicts, appeals</text>
  <text x="96" y="448" fill="#ffd37a" font-family="Arial, sans-serif" font-size="26">Unfair screening decisions are held before applicants are accepted or rejected.</text>
  <text x="96" y="574" fill="#a6d7c3" font-family="Arial, sans-serif" font-size="18">${result.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Accepted applicants: ${result.summary.accepted}`);
console.log(`Held applicants: ${result.summary.held}`);
