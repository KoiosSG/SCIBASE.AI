# Collaborative Clipboard Import Provenance Report

| Packet | Status | Collaborative insert | Reviewer preview | Retention | Findings |
| --- | --- | --- | --- | --- | --- |
| unsafe-packet.json | quarantine_import | blocked | redacted | quarantine | CSV_FORMULA_CELL, DUPLICATE_ANCHOR, DUPLICATE_ANCHOR, HIDDEN_INSTRUCTION_TEXT, LOCAL_PRIVATE_PATH, STALE_REVIEW_METADATA, UNTRUSTED_SOURCE |
| partner-review-packet.json | stage_for_curator_review | curator_review | watermarked | staged | MISSING_SOURCE_ATTESTATION |
| trusted-attestation-packet.json | stage_for_curator_review | curator_review | watermarked | staged | MISSING_SOURCE_ATTESTATION |
| placeholder-attestation-packet.json | stage_for_curator_review | curator_review | watermarked | staged | INVALID_SOURCE_ATTESTATION |
| unsupported-channel-packet.json | stage_for_curator_review | curator_review | watermarked | staged | UNKNOWN_IMPORT_CHANNEL |
| malformed-block-list-packet.json | stage_for_curator_review | curator_review | watermarked | staged | MALFORMED_IMPORT_BLOCKS |
| source-origin-packet.json | quarantine_import | blocked | redacted | quarantine | LOCAL_PRIVATE_SOURCE |
| lowercase-windows-path-packet.json | quarantine_import | blocked | redacted | quarantine | LOCAL_PRIVATE_PATH |
| forward-slash-windows-path-packet.json | quarantine_import | blocked | redacted | quarantine | LOCAL_PRIVATE_PATH |
| clean-packet.json | allow_collaborative_insert | allowed | allowed | standard | none |

All packets use synthetic import payloads and deterministic SHA-256 audit digests.
The guard runs before pasted or imported blocks become visible in a shared manuscript session.
