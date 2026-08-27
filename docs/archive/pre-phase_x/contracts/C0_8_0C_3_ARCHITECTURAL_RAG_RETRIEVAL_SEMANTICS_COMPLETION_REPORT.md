# C0.8.0C.3 Architectural RAG Retrieval Semantics Completion Report

Date: 2026-07-13
Status: COMPLETE

## Governing boundary

`PHASE_C0_8_0C_1_ARCHITECTURAL_RAG_DISCOVERY_PROJECTION_CONTRACT_BRIEF.md` governs this slice. Retrieval may discover and label evidence already present in persisted Architectural shards. It cannot create, adopt, supersede, withdraw, publish, or otherwise establish memory authority.

## Changed

- Replaced the active-profile retrieval refusal with a separate Architectural read path while retaining Narrative exclusion of Architectural chunks.
- Revalidated projection profile, schema, projection version, section and record identity, exact source range/message bindings, source identity/revision hashes, and saved-shard content hash against current persisted sources.
- Excluded mixed-profile, incomplete, unsupported, unverified, and stale projection results both after vector query and again at the final prompt boundary.
- Rolled `DECISIONS`, `THREADS`, and `CURRENT` forward by stable record identity; retained exact historical `EVENTS`, `DEVELOPMENTS`, `TIMELINE`, and `DIALOGUE` records.
- Ensured the latest eligible `CURRENT` record survives relevance thresholding while unrelated stable records are not pinned automatically.
- Reused vector scoring and optional re-ranking only as relevance ordering. Re-ranker or backend failure is reported and safely degrades without presenting retrieval as complete.
- Rendered Architectural context inside an explicit `NON-AUTHORITATIVE` evidence envelope with section, chat, message range, saved output identity, content hash, and source revision hash.
- Added a retrieval-jurisdiction operation gate that hard-refuses authority-changing operations.

## Proof

Exact command:

```text
node --test core/rag/architectural-rag-retrieval.test.mjs core/rag/architectural-rag-admission.test.mjs core/rag/vectorize.test.mjs core/rag/retrieval.test.mjs
node --check core/rag/architectural-rag-retrieval.js
node --check core/rag/retrieval.js
git diff --check
```

Observed result:

- 24 focused tests passed; 0 failed.
- Both syntax checks completed with exit code 0.
- `git diff --check` completed without patch errors; only existing Windows line-ending notices were emitted.
- The final prompt-boundary proof excluded a mixed-profile result introduced after ranking and rendered only provenance-valid evidence.
- The authority-operation counterproof refused `publish` with `ARCH_RAG_AUTHORITY_MUTATION_FORBIDDEN`.
- Existing Narrative retrieval isolation and vector identity regressions remained green.

## Tangible result

Architectural generation can now receive relevant, clearly labelled evidence from current persisted Architectural projections. Stable lifecycle-bearing records resolve to their latest eligible projection, stale or unverifiable records do not enter the prompt, and retrieval has no authority mutation capability.

## Unresolved

- The new read path has not yet been exercised in packaged SillyTavern and SillyBunny hosts.
- UI availability, help text, explicit operator diagnostics, collection rebuild observation, and cross-host parity remain open.
- Warm archive remains fail-closed and is not required for this discovery projection path.

## Candidate next slice

C0.8.0C.4: Packaged Host Proof And UI Posture.

## Stop

C0.8.0C.3 is complete. No C0.8.0C.4 work is authorized by this report.
