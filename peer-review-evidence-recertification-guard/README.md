# Peer Review Evidence Recertification Guard

This module adds a focused Community & User Reputation slice for SCIBASE issue #15. It checks whether peer reviews and inline comments still apply after reviewed documents, datasets, code, or notebooks change.

The guard freezes stale review reputation deltas, blocks reputation updates when review or inline-comment evidence is stale, holds malformed review and inline-comment timestamps for recertification, marks inline comment anchors stale when artifact evidence changes even if a selector line did not move, holds missing inline-comment anchor metadata or missing artifact anchor maps for recertification, generates recertification tasks, preserves anonymous and double-blind reviewer safety, and emits a deterministic project timeline audit packet.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/recertification-packet.json`
- `reports/recertification-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not use credentials, private users, live profile systems, payment systems, or external APIs.
