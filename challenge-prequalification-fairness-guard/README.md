# Challenge Prequalification Fairness Guard

This module adds a focused Scientific Bounty System slice for SCIBASE issue #18. It evaluates sponsor-side prequalification rounds before solver teams are accepted or rejected from a challenge.

The guard checks published screening criteria, complete criteria-list evidence, complete and unique criterion identifiers after trimming, valid criterion weight values and totals, valid pass thresholds, valid reviewer quorum requirements, valid sponsor accept/reject decisions, complete applicant-list and applicant identity evidence, complete round-level review-list evidence, complete reviewer score evidence, valid finite 0-100 reviewer score values, weighted threshold consistency, anonymous-screening requirements, reviewer conflicts, distinct reviewer quorum, missing reviewer identity evidence, duplicate reviewer score evidence, missing, empty, or blank rejection reason evidence, parseable appeal windows, and audit evidence. Conflicted reviewer scores are excluded from threshold scoring while the conflict remains auditable, repeated reviewer identities are deduplicated before quorum or threshold scoring, and missing applicant lists, missing applicant identities, missing criteria lists, missing review lists, missing reviewer identities, invalid sponsor decisions, or invalid score values are excluded from taking effect until the evidence is completed. Unfair or incomplete screening decisions are held for remediation before challenge access changes.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/prequalification-fairness-packet.json`
- `reports/missing-criterion-id-packet.json`
- `reports/normalized-criterion-id-packet.json`
- `reports/invalid-reviewer-score-packet.json`
- `reports/invalid-reviewer-quorum-packet.json`
- `reports/invalid-sponsor-decision-packet.json`
- `reports/missing-applicant-identity-packet.json`
- `reports/missing-review-list-packet.json`
- `reports/missing-criteria-list-packet.json`
- `reports/missing-applicant-list-packet.json`
- `reports/blank-rejection-reason-packet.json`
- `reports/prequalification-fairness-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call payment processors, identity providers, private workspaces, sponsor systems, solver accounts, or external APIs.
