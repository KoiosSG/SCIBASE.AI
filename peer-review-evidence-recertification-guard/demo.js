const fs = require('fs');
const path = require('path');
const { evaluateRecertification, buildSampleProject } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const project = buildSampleProject();
const result = evaluateRecertification(project);
const emptyEvidenceProject = {
  projectId: 'project-empty-reputation-evidence',
  asOf: '2026-05-30T12:00:00Z',
  artifacts: []
};
const emptyEvidenceResult = evaluateRecertification(emptyEvidenceProject);

const packetPath = path.join(reportsDir, 'recertification-packet.json');
const emptyPacketPath = path.join(reportsDir, 'empty-evidence-packet.json');
const reportPath = path.join(reportsDir, 'recertification-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(emptyPacketPath, `${JSON.stringify(emptyEvidenceResult, null, 2)}\n`);

const staleReviewList = result.reviewDecisions
  .filter((decision) => decision.status !== 'current')
  .map((decision) => `- ${decision.id}: ${decision.reasons.join(', ')}`)
  .join('\n');

const taskList = result.recertificationTasks
  .map((task) => `- ${task.id} (${task.kind}, ${task.priority}): ${task.requiredAction}`)
  .join('\n');

const markdown = `# Peer Review Evidence Recertification Guard

Project: ${result.projectId}
Generated: ${result.generatedAt}

## Summary

- Total reviews evaluated: ${result.summary.totalReviews}
- Stale reviews requiring recertification: ${result.summary.staleReviews}
- Stale inline comments requiring anchor review: ${result.summary.staleComments}
- Frozen reputation delta: ${result.summary.frozenReputationDelta}
- Recommended action: ${result.summary.recommendedAction}
- Timeline audit digest: ${result.timelinePacket.auditDigest}

## Stale Review Evidence

${staleReviewList}

## Recertification Tasks

${taskList}

## Sparse Snapshot Guard

Sparse project payloads that omit review, comment, or artifact collections still produce deterministic audit packets instead of runtime failures. The empty evidence fixture recommends ${emptyEvidenceResult.summary.recommendedAction} and emits ${emptyEvidenceResult.timelinePacket.events.length} timeline events.

## Privacy Notes

Double-blind reviewer identifiers are replaced with reviewer-safe anonymous labels in tasks and timeline events. The audit packet uses synthetic data only and does not contain private profile emails, live profile IDs, credentials, or external API output.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#102033"/>
  <rect x="60" y="70" width="1160" height="580" rx="20" fill="#172b44" stroke="#6cc7ff" stroke-width="4"/>
  <text x="100" y="145" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="700">Peer Review Evidence Recertification</text>
  <text x="100" y="215" fill="#d7edf9" font-family="Arial, sans-serif" font-size="28">Stale reviews: ${result.summary.staleReviews}</text>
  <text x="100" y="265" fill="#d7edf9" font-family="Arial, sans-serif" font-size="28">Stale comments: ${result.summary.staleComments}</text>
  <text x="100" y="315" fill="#d7edf9" font-family="Arial, sans-serif" font-size="28">Frozen reputation delta: ${result.summary.frozenReputationDelta}</text>
  <text x="100" y="365" fill="#ffdf7e" font-family="Arial, sans-serif" font-size="28">Action: ${result.summary.recommendedAction}</text>
  <text x="100" y="445" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Tasks generated: ${result.recertificationTasks.length}</text>
  <text x="100" y="500" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Anonymous reviewer labels preserved without raw identity leakage.</text>
  <text x="100" y="560" fill="#94c9df" font-family="Arial, sans-serif" font-size="18">${result.timelinePacket.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, emptyPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Recommended action: ${result.summary.recommendedAction}`);
