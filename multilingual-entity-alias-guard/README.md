# Multilingual Entity Alias Guard

This module adds a focused Scientific Knowledge Graph Integration slice for SCIBASE issue #17. It normalizes multilingual scientific mentions before they become graph nodes, entity-page aliases, or recommendation signals.

The guard accepts trusted translated aliases, preserves original language tags, normalizes language-tag casing for lookup, emits JSON-LD-style entity packets, holds homographs, false friends, and same-language alias collisions for curator review, and suppresses low-confidence aliases before recommendations are shown.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/alias-guard-packet.json`
- `reports/alias-guard-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
