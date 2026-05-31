# Repository External Reference Pin Guard Report

| Packet | Status | DOI publication | Export bundle | API access | Findings |
| --- | --- | --- | --- | --- | --- |
| blocked-packet.json | hold_repository_release | blocked | blocked | metadata_only | AUTH_REQUIRED_REFERENCE, FLOATING_API_REFERENCE, INVALID_CHECKSUM_EVIDENCE, INVALID_DOI_EVIDENCE, MISSING_DURABLE_IDENTIFIER, STALE_REFERENCE_EVIDENCE, FLOATING_GIT_REFERENCE |
| malformed-manifest-packet.json | hold_repository_release | blocked | blocked | metadata_only | MALFORMED_REFERENCE_MANIFEST |
| malformed-packet.json | hold_repository_release | blocked | blocked | metadata_only | MALFORMED_REFERENCE_ENTRY |
| clean-packet.json | release_repository_references | allowed | allowed | allowed | none |
| warning-packet.json | stage_reference_metadata_revision | metadata_revision | draft_only | allowed | MISSING_ATTRIBUTION, MISSING_LICENSE |

Synthetic data only. No external repositories, APIs, DOI registries, or private data sources are contacted.
