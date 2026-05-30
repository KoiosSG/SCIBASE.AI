# Challenge Prequalification Fairness Guard

Challenge: challenge-18-prequalification-rna-biomarker
Generated: 2026-05-28T08:00:00Z

## Summary

- Accepted applicants: 1
- Held for fairness review: 3
- Rejected with audit trail: 0
- Remediation actions: 3
- Criteria digest: sha256:d643b033793917b9d0488787518a11e97094e671d52b86b69a6153375d726721
- Audit digest: sha256:5ec541696fa83ff5f5ac49891dbb4bdf0e1174638039f2a2e7b6e65f2df49d16

## Decisions

- applicant-biofoundry: accept-prequalified, score 87, reasons: none
- applicant-neuro-lab: hold-for-fairness-review, score 81, reasons: anonymous-screening-leak, inconsistent-threshold-decision
- applicant-sponsor-alumni: hold-for-fairness-review, score 70, reasons: missing-appeal-window, missing-rejection-reason, reviewer-conflict, reviewer-quorum-shortfall
- applicant-missing-reviewer-identity: hold-for-fairness-review, score 0, reasons: inconsistent-threshold-decision, missing-reviewer-identity, reviewer-quorum-shortfall

## Remediation Actions

- remediate-applicant-neuro-lab: rerun-blinded-prequalification-review (high)
- remediate-applicant-sponsor-alumni: replace-conflicted-reviewer (high)
- remediate-applicant-missing-reviewer-identity: complete-prequalification-evidence (high)

## Missing Criterion Identifier Packet

- Applicant: applicant-missing-criterion-id
- Decision: hold-for-fairness-review
- Reasons: missing-published-criterion-id
- Remediation: publish-complete-screening-criteria
- Audit digest: sha256:b9df8bf4b4cf0ab259501a17673e27b1537153778f87a19190f026759151b27e

## Invalid Reviewer Score Packet

- Applicant: applicant-invalid-reviewer-score
- Decision: hold-for-fairness-review
- Reasons: reviewer-score-value-invalid
- Remediation: publish-valid-reviewer-score-evidence
- Audit digest: sha256:806cf8166a6f1d58824929c4964ec009b6d6a8ce4d613b9e357a1e0e684fda69

## Safety

All fixtures are synthetic. The guard does not call payment processors, identity providers, private workspaces, sponsor systems, or external APIs.
