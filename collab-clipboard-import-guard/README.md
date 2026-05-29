# Collaborative Clipboard Import Guard

This module adds a focused issue #12 slice for the real-time collaborative research editor: a trust boundary for pasted or imported content before it becomes shared manuscript state.

It evaluates synthetic import batches for:

- untrusted clipboard or file sources
- missing or unrecognized source trust metadata
- missing or blank signed source attestations from partner imports
- hidden instruction-like text that is not visible to collaborators
- spreadsheet formula cells that could execute after import
- notebook output snippets and table cells containing local or private filesystem paths
- stale or malformed collaborator review metadata bound to old section versions or unverifiable expiry evidence
- duplicate anchors that would collide inside the import payload or with existing shared-document anchors, with every colliding block regenerated before insertion

The guard emits a deterministic packet with sanitized blocks, reviewer actions, insertion lanes, findings, and a SHA-256 audit digest.

## Usage

```powershell
npm test
npm run demo
npm run video
npm run check
```

The demo writes JSON, Markdown, SVG, and MP4 evidence to `reports/`.

## Scope

This is intentionally separate from previous issue #12 work on broad editor foundations, operation replay, offline conflict resolution, notebook kernel leases, reference merge/formatting, authorship governance, autosave/local-cache privacy, round-trip fidelity, presence, accessibility, evidence binding, embargo release, notification visibility, data availability, LaTeX macro safety, and suggestion provenance.

No external services, credentials, private manuscripts, live users, or payment data are used.
