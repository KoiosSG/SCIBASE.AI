# Acceptance Notes

This #17 slice focuses specifically on multilingual scientific alias quality before graph nodes and recommendations are produced.

It is not:

- a broad entity extractor or navigator
- an ontology deprecation or synonym migration tool
- a recommendation visibility or diversity guard
- a geospatial, clinical trial, biological accession, software runtime, or temporal validity guard

Validation coverage:

- trusted CRISPR aliases in English, German, and Spanish map to one canonical MeSH entity
- Spanish `control` is held as a homograph/false friend instead of silently creating a statistical control-group edge
- same-language translated alias collisions are held instead of silently attaching a mention to the wrong canonical entity
- low-confidence French alias output is suppressed from recommendations
- localized names remain language-tagged on entity packets
- audit output is deterministic and private-data free
