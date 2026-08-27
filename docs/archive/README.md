# Documentation Archive

This directory preserves historical material without presenting it as current Phase X
authority.

## Active Documentation

Current design authority lives outside this archive:

- `docs/contracts/PHASE_X_*.md` — active Phase X contracts;
- `docs/contracts/RFC_*.md` — active governing RFCs;
- `docs/schemas/` — active schema contracts and their machine-readable fixtures;
- `docs/identity/` — current Shardwright identity and coexistence proof.

## Archived Pre-Phase-X Material

`pre-phase_x/` preserves C0-era implementation briefs, completion reports, host proofs,
gold examples, and operational checklists. It supplies historical context and evidence
for legacy compatibility only. It does not govern new Phase X design or authorize
runtime changes unless an active Phase X contract explicitly adopts a precise portion.

### Fixture Meaning

`pre-phase_x/fixtures/` contains human-readable C0 gold examples. These are historical
review/reference material.

`docs/schemas/**/fixtures/` contains machine-readable valid/refusal inputs used to
exercise active JSON schemas. These fixtures are current implementation proof inputs.

The directory distinction is deliberate: archived gold examples must never be mistaken
for active schema fixtures, and active schema fixtures must never be treated as
historical narrative evidence.
