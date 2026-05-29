# Requirements Map

## Entity Extraction

- Preserves language-tagged mentions from uploaded papers and datasets.
- Maps trusted translated aliases to canonical ontology identifiers.
- Normalizes language-tag casing and regional subtags for alias lookup while preserving the original tag on decisions.
- Holds false friends and homographs before creating graph edges.
- Holds same-language alias collisions when ontology entries reuse the same translated term.
- Emits schema.org-style `DefinedTerm` JSON-LD packets for entity pages.

## Knowledge Navigation

- Keeps accepted multilingual aliases attached to canonical entity pages.
- Produces curator actions for ambiguous terms that would pollute graph search.
- Prevents unknown or low-confidence aliases from becoming discoverable graph nodes.

## AI Research Recommendations

- Suppresses low-confidence mentions from recommendation inputs.
- Exposes safe canonical entity IDs for graph recommendations.
- Keeps multilingual evidence auditable with deterministic digests.

## Safety And Scope

- Synthetic data only.
- No credentials, private corpora, live ontology calls, external APIs, or production recommendation systems.
- This slice is distinct from ontology drift, synonym dedupe, temporal validity, geospatial provenance, and recommendation visibility/diversity guards.
