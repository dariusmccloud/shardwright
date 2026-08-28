# Project Archive

This directory preserves historical material and legacy tooling without presenting it
as current Phase X authority.

## Active Documentation

Current design authority lives outside this archive:

- `docs/contracts/PHASE_X_*.md` — active Phase X contracts;
- `docs/contracts/RFC_*.md` — active governing RFCs;
- `docs/schemas/` — active schema contracts and their machine-readable fixtures;
- `docs/identity/` — current Shardwright identity and coexistence proof.

## Archived Pre-Phase-X Material

`pre-phase_x/` preserves C0-era implementation briefs, completion reports, host proofs,
gold examples, operational checklists, and developer proof harnesses. It supplies
historical context and evidence for legacy compatibility only. It does not govern new
Phase X design or authorize runtime changes unless an active Phase X contract
explicitly adopts a precise portion.

`pre-phase_x/tools/` contains legacy C0 proof and smoke-test tooling. These scripts are
archived evidence harnesses, not active runtime plugin payload.

### Fixture Meaning

`pre-phase_x/fixtures/` contains human-readable C0 gold examples. These are historical
review/reference material.

`docs/schemas/**/fixtures/` contains machine-readable valid/refusal inputs used to
exercise active JSON schemas. These fixtures are current implementation proof inputs.

The directory distinction is deliberate: archived gold examples must never be mistaken
for active schema fixtures, and active schema fixtures must never be treated as
historical narrative evidence.
