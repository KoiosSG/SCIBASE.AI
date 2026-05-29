# Requirements Map

Issue #10 asks for robust project repositories with versioned files, collaboration, reproducibility, identifiers, citations, programmatic access, and export bundles.

| Issue #10 area | Coverage in this slice |
| --- | --- |
| File and metadata versioning | Holds releases when Git submodules or external code are not pinned to immutable commits. |
| Hash-based integrity | Requires checksums, DOI evidence, or non-floating immutable versions for external datasets and model weights. |
| Computation-aware reproducibility | Blocks reproducibility/export lanes when API data sources are floating or authenticated only. |
| Repository identifiers and citation | Prevents DOI publication when external references are stale, future-dated, or lack license/attribution metadata. |
| Programmatic access and export | Separates API metadata-only access from export-bundle and DOI publication release lanes. |

## Non-Overlap

This contribution is distinct from broad repository ledgers, release engines, structured diffs, provenance attestations, release embargo controls, notebook replay, schema migration, citation impact, API/export contract verification, merge queue governance, environment drift, access review, DOI tombstone handling, metadata readiness, branch hypothesis lineage, sensitive-artifact scanning, dependency-license checks, legal hold, component-owner approval, restore rehearsal, compute sandbox policy, and semantic version-tag governance. It focuses specifically on immutable external reference pins and exportable citation evidence for submodules, linked datasets, API sources, model weights, and external code/data pointers.
