const fs = require('fs');
const path = require('path');
const { evaluateAliasGuard, buildSampleCorpus } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluateAliasGuard(buildSampleCorpus());

const packetPath = path.join(reportsDir, 'alias-guard-packet.json');
const reportPath = path.join(reportsDir, 'alias-guard-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);

const accepted = result.mentionDecisions
  .filter((decision) => decision.decision === 'accept-canonical-entity')
  .map((decision) => `- ${decision.id}: ${decision.text} (${decision.language}) -> ${decision.candidateEntityId}`)
  .join('\n');

const held = result.curatorActions
  .map((action) => `- ${action.id}: ${action.action} (${action.language}:${action.text})`)
  .join('\n');

const markdown = `# Multilingual Entity Alias Guard

Corpus: ${result.corpusId}
Generated: ${result.generatedAt}

## Summary

- Accepted mentions: ${result.summary.acceptedMentions}
- Held curator-review mentions: ${result.summary.heldMentions}
- Suppressed low-confidence mentions: ${result.summary.suppressedMentions}
- Entity packets emitted: ${result.summary.entityPackets}
- Audit digest: ${result.auditDigest}

## Accepted Canonical Mappings

${accepted}

## Curator Actions

${held}

## Recommendation Guard

Held or suppressed mentions are not allowed to drive entity-page recommendations until a curator verifies the alias mapping.

## Safety

All fixtures are synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0c2130"/>
  <rect x="54" y="58" width="1172" height="604" rx="18" fill="#142f42" stroke="#7bd88f" stroke-width="4"/>
  <text x="96" y="136" fill="#ffffff" font-family="Arial, sans-serif" font-size="44" font-weight="700">Multilingual Entity Alias Guard</text>
  <text x="96" y="210" fill="#d8f6df" font-family="Arial, sans-serif" font-size="28">Accepted canonical mentions: ${result.summary.acceptedMentions}</text>
  <text x="96" y="260" fill="#d8f6df" font-family="Arial, sans-serif" font-size="28">Held curator-review mentions: ${result.summary.heldMentions}</text>
  <text x="96" y="310" fill="#d8f6df" font-family="Arial, sans-serif" font-size="28">Suppressed low-confidence mentions: ${result.summary.suppressedMentions}</text>
  <text x="96" y="380" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Languages preserved: en, de, es, fr</text>
  <text x="96" y="430" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">JSON-LD entity packets ready for schema.org-style pages</text>
  <text x="96" y="510" fill="#ffd37a" font-family="Arial, sans-serif" font-size="26">Unsafe aliases are held before graph recommendations are shown.</text>
  <text x="96" y="574" fill="#a6d7c3" font-family="Arial, sans-serif" font-size="18">${result.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Accepted mentions: ${result.summary.acceptedMentions}`);
console.log(`Suppressed mentions: ${result.summary.suppressedMentions}`);
