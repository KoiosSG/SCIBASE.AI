# Acceptance Notes

The implemented slice is intentionally distinct from existing #15 submissions:

- It is not a broad reputation ledger.
- It is not COI, recusal, civility, workload, accessibility, rubric validation, edit history, badge renewal, or profile visibility work.
- It focuses on stale review evidence after artifact revisions and the recertification workflow needed before reputation updates are allowed.

Validation targets:

- stale dataset review freezes an 18 point reputation delta
- recertified code review keeps its 14 point reputation delta
- double-blind reviewer identity is not leaked in tasks or timeline events
- stale inline comment anchors generate comment-specific recertification tasks
- artifact digest changes mark inline comment anchors stale even when the selector line is unchanged
- malformed inline comment timestamps require recertification before comment evidence is treated as current
- missing inline comment anchor metadata requires recertification instead of crashing evidence evaluation
- missing artifact anchor maps require comment recertification instead of crashing evidence evaluation
- stale inline-comment evidence blocks reputation updates even when no stale review is present
- malformed artifact change timestamps require review and inline-comment recertification before reputation credit or comment evidence is applied
- timeline packets include deterministic audit digests
