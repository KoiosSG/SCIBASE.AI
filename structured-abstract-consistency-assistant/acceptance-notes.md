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
- Result-direction checks also block abstracts that describe improved results as worse, harmful, or no-effect.
- Result-section certainty overclaims such as statistically significant or clinically meaningful are blocked when evidence is exploratory or confidence intervals cross null.
- Mixed result-section certainty phrasing such as not statistically significant but clinically meaningful is blocked instead of being cleared by the negated significant phrase.
- Conclusion-section certainty overclaims such as statistically significant or clinically meaningful are blocked when evidence is exploratory or confidence intervals cross null.
- Conclusion-direction checks block reviewer-facing conclusion benefit claims when the result packet records no effect, worse outcomes, or harm.
- Conclusion-direction checks block safety-benefit claims such as safe or well tolerated when adverse-outcome evidence worsens.
- Conclusion-direction checks block negated safety-concern claims such as no safety concerns when adverse-outcome evidence worsens.
- Negated benefit wording such as did not improve is treated as no-effect/worse language instead of a positive improvement claim.
- Conclusion-direction checks also block reviewer-facing conclusion worse/no-effect claims when the result packet records improvement.
- Benefit-language checks include lower/shorter/faster outcome wording, not only "improved" phrasing.
- Accurate adverse-outcome wording such as increased adverse events is not mistaken for a benefit claim when the result packet also records a worse direction.
- `reports/revision-packet.json` stages an incomplete but otherwise evidence-aligned abstract for author revision.
- `reports/result-certainty-packet.json` holds an abstract whose results overstate uncertain or null-crossing evidence.
- `reports/mixed-certainty-packet.json` holds an abstract whose results mix negated statistical significance with an asserted clinical-meaningfulness overclaim.
- `reports/conclusion-certainty-packet.json` holds an abstract whose conclusion overstates uncertain or null-crossing evidence.
- `reports/clean-packet.json` releases a consistent structured abstract with monitoring.
- `reports/abstract-consistency-report.md` summarizes lanes and finding codes.
- `reports/summary.svg` provides a visual review packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All records are synthetic. The module does not call external models, citation APIs, manuscript stores, credential systems, payment systems, or private research databases.
