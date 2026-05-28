# Requirements Map

| Issue #12 requirement | Coverage in this slice |
| --- | --- |
| Real-time collaborative editor shared state | Gates pasted/imported blocks before they become collaborative manuscript state. |
| Markdown, scientific blocks, and WYSIWYG workflows | Models paragraph, table, notebook-output, and comment blocks from clipboard and file-import paths. |
| Inline comments, suggestions, and review metadata | Detects stale review metadata before imported comments are trusted. |
| Version history and controlled sections | Compares imported review metadata against current section versions. |
| Scientific rigor and formatting fidelity | Escapes spreadsheet formulas, regenerates every colliding duplicate anchor, and redacts private notebook paths while preserving clean content. |
| Reviewer-ready artifacts | Produces deterministic JSON packets, Markdown summary, SVG overview, and MP4 demo evidence. |

## Non-overlap Notes

The contribution is scoped to import provenance and pre-insertion sanitation. It does not implement another broad editor module, operation replay engine, offline conflict resolver, notebook kernel lease guard, reference manager, authorship workflow, freeze lane, autosave/local-cache privacy guard, export round-trip checker, presence guard, accessibility guard, evidence-binding guard, embargo release guard, notification guard, data availability guard, LaTeX macro guard, or accepted-suggestion provenance guard.
