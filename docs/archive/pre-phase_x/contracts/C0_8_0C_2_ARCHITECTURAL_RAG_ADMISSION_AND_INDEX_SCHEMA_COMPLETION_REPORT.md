# C0.8.0C.2 Architectural RAG Admission And Index Schema Completion Report

Date: 2026-07-13
Status: COMPLETE

## Governing boundary

`PHASE_C0_8_0C_1_ARCHITECTURAL_RAG_DISCOVERY_PROJECTION_CONTRACT_BRIEF.md` governs this slice. Persisted Architectural shards and their integrity/replay records remain authority. Vector chunks, hashes, metadata, and collections are rebuildable discovery projections only.

## Changed

- Replaced blanket Architectural vector-write refusal in direct and bulk shard indexing with contract-aware admission.
- Required a persisted system-message or lorebook-entry identity, stable chat and output identity, exact source message bindings, source identity hash, source revision hash, matching source range, valid Architectural profile/schema, and canonical shell before candidate creation.
- Added profile-isolated per-record projection metadata: profile, schema version, projection version, source type/chat/output/range/bindings/hashes, section type, record identity, and source content hash.
- Routed Architectural standard and section-aware requests through the same Architectural projector; Narrative chunking behavior remains unchanged.
- Kept Architectural retrieval and warm-archive admission fail-closed pending C0.8.0C.3 and C0.8.0C.4.

## Proof

Exact command:

```text
node --test core/rag/architectural-rag-admission.test.mjs core/rag/vectorize.test.mjs core/rag/retrieval.test.mjs
node --check core/rag/chunk-hash.js
node --check core/rag/architectural-rag-admission.js
node --check core/rag/vectorize.js
node --check core/summarization/output.js
```

Observed result:

- 17 focused tests passed; 0 failed.
- All four syntax checks completed with exit code 0.
- The admission proof produced provenance-complete candidates from both a persisted wrapper and its post-save canonical body.
- Unsaved, provenance-incomplete, range-mismatched, malformed, mixed-profile, Narrative, and unsupported-schema inputs were refused before candidate creation.
- Projection preparation left the persisted source envelope unchanged.
- Existing Narrative identity behavior and Architectural retrieval isolation regressions remained green.

## Tangible result

An already-persisted, valid, provenance-complete Architectural shard can now be converted into a profile-isolated vector projection. Text alone cannot establish index eligibility, and projection preparation has no authority mutation path.

## Unresolved

- Architectural retrieval, ranking/re-ranking, stale-source exclusion at read time, and source-labelled prompt rendering remain disabled/unimplemented.
- No packaged SillyTavern/SillyBunny host proof has been performed for this new projection path.
- Warm-archive behavior remains fail-closed.

## Candidate next slice

C0.8.0C.3: Retrieval Semantics And Prompt Boundary.

## Stop

C0.8.0C.2 is complete. No C0.8.0C.3 work is authorized by this report.
