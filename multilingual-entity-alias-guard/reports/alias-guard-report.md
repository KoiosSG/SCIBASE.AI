# Multilingual Entity Alias Guard

Corpus: kg-multilingual-upload-batch-17
Generated: 2026-05-28T07:00:00Z

## Summary

- Accepted mentions: 6
- Held curator-review mentions: 3
- Suppressed low-confidence mentions: 1
- Entity packets emitted: 3
- Audit digest: sha256:48d59a0c5224f91e46bbcd93174e2ce12a6f0008946fbcea6f7608abd6798778

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
- curate-mention-crispr-cyrillic-spoof: review-multilingual-script-confusable (en:СRISPR-Cas9)
- curate-mention-crispr-greek-alpha-spoof: review-multilingual-script-confusable (en:CRISPR-Cαs9)

## Recommendation Guard

Held or suppressed mentions are not allowed to drive entity-page recommendations until a curator verifies the alias mapping.

## Safety

All fixtures are synthetic. The module does not call live ontologies, identity providers, external APIs, private corpora, search indexes, or recommendation systems.
