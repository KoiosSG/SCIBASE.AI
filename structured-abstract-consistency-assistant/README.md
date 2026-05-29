# Structured Abstract Consistency Assistant

This module adds a focused issue #16 slice for the AI-Powered Research Assistant Suite: checking whether a structured manuscript abstract is consistent with the manuscript methods, results, and limitation evidence before AI peer-review output is shown.

It evaluates synthetic manuscript packets for:

- missing structured abstract sections
- target-specific sample-size mismatches between abstract, methods, and results
- methods design mismatches
- primary endpoint and result-direction drift, including negative results described as improvements
- conclusions that overstate exploratory or uncertain evidence
- missing limitation language when confidence intervals cross null or findings are exploratory

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
