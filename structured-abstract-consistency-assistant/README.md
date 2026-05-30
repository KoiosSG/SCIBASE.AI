# Structured Abstract Consistency Assistant

This module adds a focused issue #16 slice for the AI-Powered Research Assistant Suite: checking whether a structured manuscript abstract is consistent with the manuscript methods, results, and limitation evidence before AI peer-review output is shown.

It evaluates synthetic manuscript packets for:

- missing structured abstract sections
- target-specific sample-size mismatches between abstract, methods, and results, while accepting normal comma-formatted counts such as `1,200` and rejecting percentages, decimal values, and duration/effect measurements as count evidence
- methods design mismatches
- primary endpoint and bidirectional result-direction drift, including negative/no-effect results described as improvements and improved results described as worsened or harmful
- result-section certainty overclaims, such as statistically significant or clinically meaningful, when evidence is exploratory or confidence intervals cross null, including mixed phrasing like not statistically significant but clinically meaningful
- conclusion certainty overclaims, such as statistically significant or clinically meaningful, when evidence is exploratory or confidence intervals cross null
- conclusions that imply benefit with improvement/lower/shorter/faster language even when the results packet records no effect, worse outcomes, or harm
- safety-benefit conclusions such as safe, well tolerated, or tolerable when adverse-outcome evidence worsens
- negated safety-concern conclusions, such as no safety concerns or no adverse events, when adverse-outcome evidence worsens
- results or conclusions that use negated benefit wording, such as did not improve, when the results packet records improvement
- conclusions that describe worse/no-effect outcomes when the results packet records improvement
- accurate adverse-outcome wording, such as increased adverse events, without mistaking it for a benefit claim when the result packet also records a worse direction
- conclusions that overstate exploratory or uncertain evidence
- missing limitation language when confidence intervals cross null or findings are exploratory, with weak hedges such as `may` alone treated as insufficient

The assistant emits reviewer lanes, findings, remediation actions, abstract consistency signals, and a stable SHA-256 audit digest.

## Usage

```powershell
npm test
npm run demo
npm run video
npm run check
```

The demo writes JSON, Markdown, SVG, and MP4 evidence to `reports/`.

## Scope

This is intentionally separate from previous issue #16 work on broad assistant suites, evidence/protocol trace, statistics review, research-gap planning, rebuttal packs, ethics/data, citation context, reporting guidelines, benchmark leakage, figure/table consistency, analysis-variable provenance, domain templates, grant fit, limitations disclosure, uncertainty calibration, supplement readiness, prompt safety, study power, COI/funding, retraction, preregistration, external validity, image integrity, assay-control/calibration, literature freshness, randomization/blinding, and Bayesian prior sensitivity.

No external services, credentials, live databases, private manuscripts, or payment data are used.
