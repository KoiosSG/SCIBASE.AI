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
- timeline packets include deterministic audit digests
