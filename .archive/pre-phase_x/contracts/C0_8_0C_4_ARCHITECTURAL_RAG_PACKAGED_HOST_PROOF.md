# C0.8.0C.4 Architectural RAG Packaged Host Proof And UI Posture

Date: 2026-07-14
Status: COMPLETE

## Governing boundary

`PHASE_C0_8_0C_1_ARCHITECTURAL_RAG_DISCOVERY_PROJECTION_CONTRACT_BRIEF.md` governs this slice. Persisted Architectural shards and their canonical replay records remain authority. Vectors, collection metadata, ranking, RAG History, and prompt evidence are rebuildable discovery projections. Retrieval may surface relevant persisted evidence; it cannot create, adopt, supersede, withdraw, publish, or otherwise establish memory authority.

## Changed

- Presented the Architectural profile as **Architectural Discovery** and stated that only persisted, provenance-complete shards are indexed, retrieved records are non-authoritative evidence, ordinary governance still applies, and warm archive remains unavailable.
- Exposed the active retrieval profile and grouped Architectural exclusion diagnostics in RAG History.
- Added explicit query, response, continuity, backend, and degradation diagnostics without weakening fail-closed admission or final-boundary revalidation.
- Corrected production retrieval initialization so Architectural continuity executes after the insertion count is available.
- Resolved Similharity collection metadata within the active backend and configured embedding source. When the plugin exposes the same collection id for multiple sources, retrieval now selects the configured source and then the populated variant instead of an empty legacy variant.
- Preserved Narrative exclusion of Architectural chunks and preserved the Architectural no-authority-effect operation gate.

## Proof

### Focused automated proof

Exact commands:

```text
node --test core/rag/collection-metadata.test.mjs
node --check core/rag/vector-client.js
node --test core/rag/*.test.mjs
git diff --check -- core/rag/collection-metadata.js core/rag/collection-metadata.test.mjs core/rag/vector-client.js
```

Observed result:

- The exact duplicate-id regression selected `bananabread` with 36 chunks over the same Vectra collection id exposed as `transformers` with 0 chunks.
- The deterministic fallback selected the populated variant when the configured source was absent.
- 31 RAG tests passed; 0 failed.
- Syntax and patch checks passed; only the existing Windows line-ending notice was emitted.

### Packaged SillyBunny proof

Host: `http://127.0.0.1:4444/`

Observed production path:

```text
Profile: architectural
Backend: vectra
Threshold: 0
Reranker: similharity
Entries: 5
Architectural exclusions: none
```

The query `Why must CV Application and CS Application remain separate?` retrieved `cv-cs-separation` first with score `0.6418`. The prompt evidence rendered:

- `ARCHITECTURAL RETRIEVAL EVIDENCE (NON-AUTHORITATIVE)`,
- `Ranking is relevance, not truth`,
- exact `messages:270-290`,
- saved output identity,
- content hash,
- source revision hash,
- the ordinary-save-and-governance instruction.

### Packaged SillyTavern proof

Host: `http://127.0.0.1:8000/`

Before rebuild, the current collection truthfully degraded to zero entries and RAG History reported `ARCH_RAG_QUERY_EMPTY` and `ARCH_RAG_CONTINUITY_EMPTY`. The existing projection rebuild discovered and saved 156 Architectural chunks without modifying persisted shard authority.

The plugin then reported the same Vectra collection id as:

```text
bananabread  156 chunks
transformers  0 chunks
```

Observed production path after rebuild:

```text
Profile: architectural
Backend: vectra
Threshold: 0.25
Reranker: similharity
Entries: 5
Architectural exclusions: none
```

The injection rendered the non-authoritative boundary, relevance-not-truth warning, exact chat and message ranges, output identities, content hashes, and source revision hashes for both `CURRENT` and `DECISIONS` evidence.

## Tangible result

Both supported packaged hosts now rebuild and query persisted Architectural discovery projections through the production generation path. Retrieved evidence is provenance-bearing and visibly non-authoritative. Empty or invalid projection state is reported rather than presented as successful retrieval, duplicate source variants no longer redirect production to an empty legacy collection, and indexing/retrieval still have no authority-changing capability.

## Unresolved

- Warm archive remains unavailable for Architectural Memory by contract.
- RAG Debug remains a diagnostics-only surface and does not itself prove production prompt injection.
- FAB mode switching and direct RAG History shortcuts remain separate UI-discoverability candidates.
- Exact source navigation remains governed by C0.8.0D.

## Candidate next slice

C0.8.0D: Evidence Usability And Exact Source Navigation.

## Stop

C0.8.0C.4 is complete. No C0.8.0D implementation is authorized by this report.
