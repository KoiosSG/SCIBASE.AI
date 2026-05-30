# Enterprise Dashboard Accessibility Report

| Packet | Status | Dashboard | Export | Webhook | Findings |
| --- | --- | --- | --- | --- | --- |
| blocked-packet.json | hold_accessibility_release | blocked | blocked | blocked | MISSING_VISIBLE_FOCUS_INDICATOR, PRIVATE_DATA_IN_ACCESSIBILITY_TEXT, INVALID_CONTRAST_EVIDENCE, MISSING_SCREEN_READER_LABEL, KEYBOARD_TRAP, MISSING_TABLE_SUMMARY, LOW_CONTRAST_CRITICAL_METRIC, MISSING_TABLE_SUMMARY, HEADING_ORDER_SKIP, MISSING_REDUCED_MOTION_FALLBACK |
| clean-packet.json | release_with_accessibility_monitoring | allowed | allowed | allowed | none |
| warning-packet.json | remediate_before_public_release | internal_only | blocked | internal_only | MISSING_REDUCED_MOTION_FALLBACK |

All packets use synthetic dashboard records and deterministic SHA-256 audit digests.
