# Multilingual Entity Alias Guard

Corpus: kg-multilingual-upload-batch-17
Generated: 2026-05-28T07:00:00Z

## Summary

- Accepted mentions: 6
- Held homograph mentions: 1
- Suppressed low-confidence mentions: 1
- Entity packets emitted: 3
- Audit digest: sha256:8bd1da50a253839d7f9becefa35e9192633262c8ece8caa8096ebb161ba52457

## Accepted Canonical Mappings

- mention-crispr-en: CRISPR-Cas9 (en) -> entity:mesh:D000077768
- mention-crispr-de: CRISPR-Cas9 Geneditierung (de) -> entity:mesh:D000077768
- mention-crispr-es: edicion genetica CRISPR-Cas9 (es) -> entity:mesh:D000077768
- mention-diabetes-en: diabetes mellitus (en) -> entity:mesh:D003920
- mention-diabetes-de: Diabetes mellitus (de) -> entity:mesh:D003920
- mention-diabetes-es: diabetes mellitus (es) -> entity:mesh:D003920

## Curator Actions

- curate-mention-control-es: review-multilingual-homograph (es:control)
- curate-mention-cellule-fr: verify-translated-alias-before-recommendation (fr:cellule)

## Recommendation Guard

Suppressed mentions are not allowed to drive entity-page recommendations until a curator verifies the alias mapping.

## Safety

All fixtures are synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
