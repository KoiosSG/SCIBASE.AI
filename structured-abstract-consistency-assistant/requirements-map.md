# Requirements Map

| Issue #16 requirement | Coverage in this slice |
| --- | --- |
| Auto peer review reports | Blocks or stages AI peer-review output when the abstract is not evidence-aligned. |
| Clarity and coherence checks | Verifies the structured abstract has required sections and coherent methods/results/conclusion text. |
| Claims vs. evidence alignment | Compares abstract claims against method design, target-specific sample sizes, comma-formatted manuscript counts, percentage and decimal wording that is not valid sample-size count evidence, primary endpoint, bidirectional result direction, result-section and conclusion-section certainty overclaims when evidence is exploratory or confidence intervals cross null, mixed negated/statistical and asserted/clinical certainty phrasing, conclusion benefit drift, safety-benefit or negated-safety-concern claims over worse adverse-outcome evidence, lower/shorter/faster benefit wording, negated benefit wording, negative/no-effect-result drift, improved-result/worse-wording drift, accurate adverse-outcome wording, and limitation language beyond weak hedging. |
| Adaptive review workflow | Emits author-draft, AI peer-review, and editor-summary lanes with remediation actions. |
| Reviewer-ready artifacts | Produces deterministic JSON packets, Markdown summary, SVG overview, and MP4 demo evidence. |

## Non-overlap Notes

The contribution is scoped to structured abstract consistency before AI review release. It does not implement another broad assistant suite, evidence/protocol trace module, statistical consistency checker, research-gap planner, rebuttal response pack, ethics/data audit, citation-context assistant, reporting-guideline compliance assistant, figure/table consistency assistant, domain-template selector, external-validity assistant, image-integrity assistant, assay-control assistant, literature-freshness assistant, randomization/blinding assistant, or Bayesian prior sensitivity assistant.
