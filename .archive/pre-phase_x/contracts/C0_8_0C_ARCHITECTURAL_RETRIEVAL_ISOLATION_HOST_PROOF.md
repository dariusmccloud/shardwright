# C0.8.0C Architectural Retrieval Isolation Host Proof

Date: 2026-07-13

Status: COMPLETE AS SAFETY BASELINE; blanket-unavailability posture superseded by C0.8.0C.1

## Supersession notice

This record truthfully proves that the pre-contract implementation failed closed. It no longer governs the intended product posture. The approved C0.8.0C.1 contract authorizes Architectural RAG only as a discovery projection over existing persisted shards; it does not authorize RAG to create, supersede, publish, or establish memory authority. The refusal mechanisms recorded here remain the required behavior for malformed, mixed-profile, unsupported, and not-yet-implemented routes.

## Governing boundary

Architectural shards and their portable ledger remain durable semantic evidence. Warm RAG storage, vector collections, and prompt injection are rebuildable projections. At the time of this proof no governing Architectural RAG admission contract existed, so admission and retrieval correctly refused rather than writing, injecting, or silently falling back.

## Bounded correction

- `core/rag/architectural-rag-boundary.js` defines one governed refusal: `ARCH_RAG_UNSUPPORTED` / `architectural-rag-deferred`.
- `core/rag/archive.js` refuses Architectural items before collection lookup or insertion.
- `core/rag/vectorize.js` refuses direct, section-aware, standard, and bulk Architectural indexing paths before vector-client work.
- `core/summarization/output.js` skips Architectural post-save auto-vectorization and warm archive.
- `core/rag/retrieval.js` refuses an active Architectural profile before any collection query, clears prior prompt injection, and returns the original chat unchanged.
- Result filtering remains as defense in depth for historical or malformed Architectural records.

## Automated proof

Command:

```text
node --test core/rag/retrieval.test.mjs core/rag/vectorize.test.mjs core/summarization/architectural-sharder-shell.test.mjs
```

Result: 22 passed, 0 failed.

Syntax checks:

```text
node --check core/rag/architectural-rag-boundary.js
node --check core/rag/vectorize.js
node --check core/rag/archive.js
node --check core/rag/retrieval.js
node --check core/summarization/output.js
node --check index.js
```

Result: every command exited 0.

`git diff --check` reported no patch errors; repository line-ending conversion warnings remain informational.

## Supported-host proof

### SillyTavern

Host: `http://10.11.12.16:8000/`

- Active profile: Architectural Memory.
- RAG was temporarily enabled for the proof and restored to disabled.
- Active collection `ss_shards_Jeep_-_2026-07-11_18h50m14s012ms_imported_661f92a3` contained 0 chunks before indexing.
- `Vectorize All Shards` emitted: `Architectural Memory cannot enter warm RAG, vector indexing, or prompt retrieval.`
- The collection remained at 0 chunks.
- Direct invocation of the loaded `archiveToWarm()` entry point with RAG enabled returned:
  - `success: false`
  - `code: ARCH_RAG_UNSUPPORTED`
  - `reason: architectural-rag-deferred`
  - `inserted: 0`
  - `skipped: 1`
- Direct invocation of the registered retrieval interceptor with an Architectural profile and an in-memory RAG enable emitted a fresh warning event, returned the exact input chat object unchanged, and restored the prior disabled setting.

### SillyBunny

Host: `http://127.0.0.1:4444/`

- Active profile: Architectural Memory.
- RAG was temporarily enabled for the proof and restored to disabled.
- Active collection `ss_shards_Jeep_-_2026-05-25_18h35m36s079ms_-_Checkpoint_e2f03801` contained 0 chunks before indexing.
- `Vectorize All Shards` emitted the same governed refusal.
- The collection remained at 0 chunks.
- Direct invocation of loaded `archiveToWarm()` returned the same `ARCH_RAG_UNSUPPORTED` result with `inserted: 0`.
- Direct invocation of the registered retrieval interceptor emitted a fresh governed refusal, returned the exact input chat object unchanged, and restored the prior disabled setting.

## Proof chain

```text
Architectural output
-> warm archive refuses before backend access
-> direct and bulk vector indexing refuse before insertion
-> active-profile prompt retrieval refuses before collection query
-> historical/malformed result filtering remains as defense in depth
-> no partial write, no prompt injection, no silent fallback
```

## Tangible result

Architectural Memory remained durable as governed evidence while pre-contract warm RAG, vector indexing, and prompt retrieval refused on both supported packaged hosts. This establishes the fail-closed baseline that later discovery-projection support must preserve for disallowed inputs and routes.

## Remaining boundary

This proof does not itself authorize an Architectural embedding schema, retrieval lifecycle, collection migration, or UI availability claim. Those are now governed by C0.8.0C.1 and require the separately authorized C0.8.0C.2-C0.8.0C.4 implementation sequence.

## Stop

C0.8.0C is complete as a safety baseline. C0.8.0C.1 supersedes only its blanket-unavailability product conclusion. C0.8.0C.2 is the candidate next bounded slice and requires separate authorization.
