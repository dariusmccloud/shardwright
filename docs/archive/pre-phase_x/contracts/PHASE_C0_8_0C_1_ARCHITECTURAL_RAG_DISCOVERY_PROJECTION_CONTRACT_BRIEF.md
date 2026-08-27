# Phase C0.8.0C.1 Architectural RAG Discovery-Projection Contract Brief

Date: 2026-07-13

Status: GOVERNING CONTRACT; RECONCILIATION COMPLETE; IMPLEMENTATION NOT AUTHORIZED BY THIS RECORD

## Purpose

Restore the original Architectural RAG product intent without weakening architectural authority. Architectural RAG exists to locate and surface relevant evidence already present in persisted Architectural shards. It is a rebuildable discovery projection, never a source of semantic authority.

## Approved authority boundary

```text
persisted Architectural shard
canonical architectural ledger and replay artifacts
governed validation and lifecycle services
-> establish and preserve memory evidence and authority

Architectural vector index
retrieval ranking and re-ranking
prompt-context rendering
-> discover and surface relevant existing evidence only
-> no authority effect
```

Retrieval may suggest relevant events. It must never create, adopt, correct, supersede, withdraw, publish, or establish a memory record. A model response influenced by retrieved material remains a proposal or generated output subject to the ordinary save, validation, admission, review, and publication contracts.

## Authority Gate

### Governing contract

This brief governs Architectural RAG admission, projection identity, retrieval, prompt rendering, and failure behavior. Existing persistence, replay, proposal, review, subject-disposition, publication, and structural-promotion contracts remain authoritative for their jurisdictions.

### Authoritative sources

- Persisted Architectural shards with valid Architectural profile/schema identity are the indexable evidence source.
- Canonical architectural and interpretive ledgers remain the durable lifecycle authority where those contracts apply.
- Exact source bindings, message identities, range identity, and content hashes remain authoritative provenance.

Vector chunks, collection metadata, scores, ranking order, re-ranker output, cached prompt text, and debug views are not authority.

### Projection boundary

Architectural vector collections are disposable and rebuildable from eligible persisted shards. Deleting or rebuilding a vector collection must not delete, mutate, supersede, or reclassify its source shard or any governed ledger record.

### Lifecycle owners

- Shard save/persistence owns creation of indexable source material.
- Existing schema/profile validators own eligibility classification.
- Architectural RAG indexing owns only projection creation, replacement, and rebuild.
- Architectural RAG retrieval owns only candidate discovery, ranking, filtering, and source-labelled prompt rendering.
- Existing proposal/review/publication services own every authority-changing action.

### Mechanisms reused

- saved-shard profile and schema identity,
- exact chat/message/range bindings,
- content and candidate hashes,
- existing vector backend and collection manager,
- existing scoring and optional re-ranker pipeline,
- existing Architectural section registry and parser,
- existing fail-closed boundary diagnostics.

### Jurisdiction fit

These mechanisms already identify persisted shards, build rebuildable vector projections, and retrieve ranked context. They may be reused only while the projection retains exact provenance and cannot call or impersonate an authority-changing route.

## Admission contract

Only an already-persisted shard may enter the Architectural index. Direct model output, unsaved review edits, proposal prose, browser-synthesized findings, and malformed legacy text are ineligible.

An admitted projection must carry, at minimum:

- `shardProfile: architectural`,
- Architectural schema version,
- stable source chat identity,
- source range and exact available message bindings,
- source shard/content hash,
- section type,
- stable record identity where the section contract defines one,
- projection/index format version.

Missing, ambiguous, malformed, or mixed-profile identity must refuse before insertion. Narrative and Architectural chunks must not share an admission path that can erase their profile distinction.

## Index semantics

The first implementation must preserve the original intended section behavior:

- `DECISIONS`: key by stable decision identity; retrieval may prefer the latest valid state while preserving links to recoverable supersession history.
- `THREADS`: key and roll forward by stable thread identity.
- `CURRENT`: expose the latest eligible current-state evidence without deleting source history.
- `EVENTS`, `DEVELOPMENTS`, `TIMELINE`, and `DIALOGUE`: retain exact shard/range provenance and section identity; no inferred lifecycle authority.
- `KEY`: supply identity/provenance metadata, not ordinary semantic retrieval prose unless a later contract explicitly needs it.

Index replacement and compaction operate only on vector projections. They must not rewrite persisted shards or ledgers.

## Retrieval contract

Architectural retrieval may:

- search eligible Architectural projections,
- score and optionally re-rank results,
- return relevant existing records or excerpts,
- include exact source labels and hashes,
- inject clearly labelled evidence context into an Architectural generation request.

Architectural retrieval must not:

- convert a retrieved claim into accepted memory,
- hide whether text is retrieved evidence or current instructions,
- merge Narrative and Architectural results without explicit profile isolation,
- fabricate missing source bindings,
- use ranking score as confidence, truth, lifecycle state, or authority,
- call proposal, review, publication, supersession, withdrawal, or structural-promotion mutations.

Retrieved context must be rendered as non-authoritative source evidence. Downstream generation remains subject to the same parser, validator, save, and governance boundaries as generation without RAG.

## Failure policy

- Malformed or ambiguous identity: refuse admission and report the exact reason.
- Mixed-profile collection or result: exclude/quarantine the item and report the boundary violation.
- Missing source binding or hash: refuse admission; never invent provenance.
- Stale source hash: omit the projection and require rebuild/reconciliation.
- Partial index write: report failure and leave canonical source untouched; retry or rebuild only the projection.
- Backend, embedding, or re-ranker failure: report explicitly and continue without Architectural retrieval only when generation itself remains safe; never silently present degraded retrieval as complete.
- Unsupported section/index version: refuse or quarantine until a compatible projector exists.
- Any attempted authority mutation from retrieval code: hard refusal and diagnostic.

## Required implementation sequence

### C0.8.0C.2: Admission And Index Schema

Replace blanket Architectural admission guards with contract-aware eligibility. Prove only persisted, valid, provenance-complete Architectural shards enter a profile-isolated vector projection and that rebuild leaves authority untouched.

Status: complete. See `C0_8_0C_2_ARCHITECTURAL_RAG_ADMISSION_AND_INDEX_SCHEMA_COMPLETION_REPORT.md`. This completion authorizes neither retrieval nor UI availability claims.

### C0.8.0C.3: Retrieval Semantics And Prompt Boundary

Implement section-aware retrieval, stable-identity behavior, scoring/re-ranking, source-labelled rendering, stale/mixed-profile exclusion, and a hard no-authority-effect boundary.

Status: complete. See `C0_8_0C_3_ARCHITECTURAL_RAG_RETRIEVAL_SEMANTICS_COMPLETION_REPORT.md`. Packaged-host and UI availability claims remain unauthorized pending C0.8.0C.4.

### C0.8.0C.4: Packaged-Host Proof And UI Posture

Prove equivalent SillyTavern and SillyBunny behavior, collection rebuild, exact source traceability, narrative isolation, explicit degradation diagnostics, and truthful UI availability/help text.

Status: complete. See `C0_8_0C_4_ARCHITECTURAL_RAG_PACKAGED_HOST_PROOF.md`. Both supported hosts rebuilt and queried provenance-bearing discovery projections through the production path while retaining the non-authoritative and no-authority-effect boundary.

Each subphase is separately declared, authorized, implemented, and proven.

## Required proof chain

```text
persisted valid Architectural shard
-> provenance-complete profile-isolated vector projection
-> relevant section-aware retrieval/re-ranking
-> clearly labelled source evidence in prompt context
-> ordinary generated-output validation and governance
-> no authority mutation from indexing or retrieval
```

Counterproofs must include malformed identity, missing provenance, stale hash, mixed Narrative/Architectural results, backend failure, and an attempted authority-changing call from retrieval jurisdiction.

## Explicit non-goals

- replacing the canonical ledger or persisted shard with vectors,
- treating vector similarity as truth or approval,
- automatic proposal adoption or publication,
- browser-authored evidence meaning,
- destructive migration of existing shards,
- generalized graph-memory inference,
- widening Narrative RAG behavior without separate evidence.

## Release posture

Architectural RAG discovery support is required for the intended `v1.0` product. C0.8.0C.2-C0.8.0C.4 now provide persisted-source projection writes, discovery-only retrieval, truthful UI posture, and equivalent supported-host proof. Vectors and retrieval remain non-authoritative projections; warm archive remains unavailable for Architectural Memory.

## Stop

This reconciliation establishes authority and implementation order only. It does not authorize removing guards or implementing C0.8.0C.2.
