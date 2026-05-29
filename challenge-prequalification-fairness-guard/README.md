# Challenge Prequalification Fairness Guard

This module adds a focused Scientific Bounty System slice for SCIBASE issue #18. It evaluates sponsor-side prequalification rounds before solver teams are accepted or rejected from a challenge.

The guard checks published screening criteria, valid criterion weight values and totals, complete reviewer score evidence, weighted threshold consistency, anonymous-screening requirements, reviewer conflicts, distinct reviewer quorum, duplicate reviewer score evidence, rejection reason completeness, appeal windows, and audit evidence. Conflicted reviewer scores are excluded from threshold scoring while the conflict remains auditable, and repeated reviewer identities are deduplicated before quorum or threshold scoring. Unfair or incomplete screening decisions are held for remediation before challenge access changes.

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
