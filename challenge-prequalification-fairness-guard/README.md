# Challenge Prequalification Fairness Guard

This module adds a focused Scientific Bounty System slice for SCIBASE issue #18. It evaluates sponsor-side prequalification rounds before solver teams are accepted or rejected from a challenge.

The guard checks published screening criteria, unique criterion identifiers, valid criterion weight values and totals, valid pass thresholds, complete reviewer score evidence, weighted threshold consistency, anonymous-screening requirements, reviewer conflicts, distinct reviewer quorum, missing reviewer identity evidence, duplicate reviewer score evidence, missing or empty rejection reason lists, parseable appeal windows, and audit evidence. Conflicted reviewer scores are excluded from threshold scoring while the conflict remains auditable, repeated reviewer identities are deduplicated before quorum or threshold scoring, and missing reviewer identities are excluded from quorum until the evidence is completed. Unfair or incomplete screening decisions are held for remediation before challenge access changes.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/prequalification-fairness-packet.json`
- `reports/prequalification-fairness-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call payment processors, identity providers, private workspaces, sponsor systems, solver accounts, or external APIs.
