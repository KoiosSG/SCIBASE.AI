# Requirements Map

## Challenge Posting Portal

- Verifies that prequalification rounds use published criteria, nonnegative weights, valid weight totals, and pass thresholds.
- Blocks unpublished sponsor preferences from entering solver-screening decisions.
- Keeps prequalification decisions tied to challenge timelines and appeal windows.

## Submission Engine

- Protects anonymous or named participation settings during prequalification review.
- Requires distinct reviewer quorum before a solver team is accepted or rejected.
- Holds incomplete reviewer score packets for evidence completion instead of letting malformed review records crash or drive decisions.
- Preserves audit evidence for each applicant before access to private challenge workspaces changes.

## Arbitration And Reward Distribution

- Holds inconsistent threshold decisions for fairness review before a solver is excluded.
- Flags reviewer conflicts and missing rejection reasons for arbitration-ready remediation.
- Excludes conflicted reviewer scores from weighted threshold evidence while retaining the conflict finding.
- Deduplicates repeated reviewer identities before quorum and weighted threshold scoring while retaining the duplicate-evidence finding.
- Produces deterministic digests for challenge administrators and third-party reviewers.

## Safety And Scope

- Synthetic data only.
- No credentials, payment processors, identity providers, sponsor systems, private workspaces, or external APIs.
- This slice is distinct from intake compliance, workspace privacy, clarification freeze, arbitration scoring, payout eligibility, benchmark leakage, sponsor data-room access, and reviewer workload SLA guards.
