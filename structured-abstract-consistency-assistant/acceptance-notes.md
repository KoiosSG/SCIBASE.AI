# Acceptance Notes

## Local Validation

Run from `structured-abstract-consistency-assistant/`:

```powershell
npm test
npm run demo
npm run video
npm run check
```

Expected evidence:

- `reports/blocked-packet.json` holds AI peer-review release when abstract claims conflict with methods and results.
- Same-code findings are preserved when methods and results disagree on different evidence targets.
- Comma-formatted manuscript counts such as `1,200` are accepted as matching numeric sample-size evidence.
- Result-direction checks block abstracts that describe worse or harmful results as improvements.
- Conclusion-direction checks block reviewer-facing conclusion benefit claims when the result packet records no effect, worse outcomes, or harm.
- Benefit-language checks include lower/shorter/faster outcome wording, not only "improved" phrasing.
- `reports/revision-packet.json` stages an incomplete but otherwise evidence-aligned abstract for author revision.
- `reports/clean-packet.json` releases a consistent structured abstract with monitoring.
- `reports/abstract-consistency-report.md` summarizes lanes and finding codes.
- `reports/summary.svg` provides a visual review packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All records are synthetic. The module does not call external models, citation APIs, manuscript stores, credential systems, payment systems, or private research databases.
