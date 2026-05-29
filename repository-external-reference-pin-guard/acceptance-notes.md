# Acceptance Notes

## Local Validation

Run from `repository-external-reference-pin-guard/`:

```powershell
npm test
npm run demo
npm run video
npm run check
```

Expected evidence:

- `reports/blocked-packet.json` blocks repository release when external references are floating, authenticated only, stale, or missing durable identifiers.
- Floating version aliases such as `latest` are blocked unless the reference also has checksum or DOI evidence.
- Future-dated API snapshots do not count as pinned snapshot evidence for DOI/export release.
- `reports/warning-packet.json` stages pinned references that still need license and attribution metadata.
- `reports/clean-packet.json` releases a repository with immutable external pins, fresh verification evidence, and exportable metadata.
- `reports/external-reference-report.md` summarizes lanes and finding codes.
- `reports/summary.svg` provides a visual reviewer packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All records are synthetic. No external repositories, live APIs, DOI registries, object stores, credentials, private research data, identity providers, or payment systems are contacted.
