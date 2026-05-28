# Repository External Reference Pin Guard

Self-contained Project Repository & Version Control slice for issue #10.

This module checks whether a scientific repository can safely publish a DOI, citation badge, API view, or export bundle when it depends on external references such as Git submodules, linked datasets, API snapshots, model weights, or external code/data pointers.

## What It Checks

- Git submodules and external code are pinned to immutable commit SHAs.
- Linked datasets and model weights have checksum, DOI, or immutable version evidence.
- API sources use dated snapshots with checksum evidence instead of floating "latest" endpoints.
- Export bundles do not require authenticated external references.
- License and attribution metadata are present before DOI publication.
- Reference verification evidence is fresh enough for release.

## Commands

```powershell
npm test
npm run demo
npm run video
npm run check
```

The demo writes deterministic JSON, Markdown, SVG, and MP4 reviewer artifacts under `reports/`.

## Safety

All records are synthetic. The module does not call external repositories, APIs, DOI registries, identity providers, storage systems, payment systems, or private research databases.
