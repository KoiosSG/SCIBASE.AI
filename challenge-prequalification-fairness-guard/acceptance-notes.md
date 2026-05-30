# Acceptance Notes

This #18 slice focuses specifically on fair sponsor-side prequalification before solvers enter or are rejected from a scientific challenge.

It is not:

- a broad scientific bounty marketplace module
- a general challenge intake compliance gate
- a submission workspace privacy or data-room access guard
- an arbitration scoring or payout eligibility ledger
- a clarification freeze, benchmark leakage, evaluator calibration, or reviewer workload guard

Validation coverage:

- eligible applicants are accepted when published criteria, quorum, and weighted thresholds are satisfied
- anonymous-screening leaks hold a candidate for fairness review
- inconsistent threshold decisions are held before rejection is published
- conflicted reviewer participation and missing rejection reasons remain auditable
- conflicted reviewer scores are excluded from weighted threshold evidence
- unpublished screening criteria are blocked before results are published
- invalid appeal-window timestamps hold rejected applicants before rejection packets are published
- invalid individual criterion weights are held even when the total still sums to 100
- duplicate published criterion IDs are held before ambiguous rubric evidence can drive acceptance or rejection
- whitespace-variant published criterion IDs such as `domain-fit` and ` domain-fit ` are treated as duplicates before ambiguous rubric evidence can drive acceptance or rejection
- missing or blank published criterion IDs are held before unauditable rubric evidence can drive acceptance or rejection
- invalid pass thresholds are held before sponsor accept/reject decisions can take effect
- invalid reviewer quorum requirements are held before sponsor accept/reject decisions can take effect
- invalid reviewer score values outside the finite 0-100 range are held before malformed scoring evidence can drive acceptance or rejection
- missing rejection reason lists are normalized to an auditable fairness hold instead of crashing the prequalification packet
- incomplete reviewer score evidence is held for completion without crashing the prequalification packet
- duplicate reviewer score evidence is held and deduplicated before quorum or weighted threshold scoring
- missing or blank reviewer identities are held and excluded from reviewer quorum until evidence is completed
- audit digests are deterministic and private-data free
