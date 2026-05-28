# Acceptance Notes

## Local Validation

Run from `collab-clipboard-import-guard/`:

```powershell
npm test
npm run demo
npm run video
npm run check
```

Expected evidence:

- `reports/unsafe-packet.json` quarantines an untrusted clipboard payload.
- `reports/partner-review-packet.json` stages a partner import missing a signed source attestation.
- `reports/clean-packet.json` allows a trusted, attested import.
- `reports/import-provenance-report.md` summarizes insertion lanes and findings.
- `reports/summary.svg` provides a visual review packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All sample records are synthetic. The module does not call network services, external editors, storage systems, reviewer databases, payment systems, or credential stores.
