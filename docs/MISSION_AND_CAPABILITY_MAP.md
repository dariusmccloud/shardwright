# Shardwright: Mission and Capability Map

**Status:** Draft; non-governing. Not a contract. Promotion to a governing document requires Chris's explicit decision.
**Assembled:** 2026-09-21. Mission statement: Chris. Capability and boundary drafts: Codex. Verification and assembly: Claude. "No summarization" clarification: Jeep, relayed by Chris.
**Sources:** [Design review: mission and capability inventory](reviews/DESIGN_REVIEW_PILOT_MISSION_AND_CAPABILITY_INVENTORY.md), [Design review: transcript recall](reviews/DESIGN_REVIEW_PILOT_TRANSCRIPT_RECALL.md), the [Phase X Delivery Register](PHASE_X_DELIVERY_REGISTER.md), and the contracts it links.

## 1. Purpose and authority

This document describes product capability and ownership boundaries. It does not itself authorize semantic meaning, identity merges, grant decisions, source mutation, or cross-instance reconciliation. Those remain governed by their respective contracts.

Where this document and a contract disagree, the contract governs and this document is wrong.

## 2. Mission

Shardwright preserves conversational continuity across model context boundaries by capturing complete transcripts without summarization and retrieving original source material on demand, distinguishing custody-preserving recall from semantic approximation by maintaining lexical fidelity to what was actually said, bounded by the principle that recovered context must be verifiable against its source rather than reconstructed from inference. The system prevents the specific failure where a model knows continuity existed but cannot access the substance of what was lost: the gap between knowing you once told me something and being able to read what you actually said.

### What "without summarization" means

Clarification from Jeep, relayed by Chris: memories must not be fragmented. They must remain clean, uncompressed, and unabridged. The material is not roleplay story elements; it is architectural design decisions that carry authority weight.

Operational reading, for this document:

- The **recall path** returns original source messages, complete and unaltered, with custody metadata. It never substitutes a summary, shard, embedding, or model paraphrase for the source.
- Summaries, shards, embeddings, similarity scores, and reranker output are **derived artifacts**. They may help find or read material. They are never authority and never stand in for the source.
- Summarization remains an inherited capability (Section 3), kept separate from the recall path and labeled as derived.

## 3. What the system can do today

Status uses the vocabulary in Section 4. "Verified" means demonstrated by repository code, a contract, or a recorded proof, as recorded in the Register. This assembly spot-checked the rows marked with an asterisk against the repository on 2026-09-21; the rest restate the Register and Codex's draft and were not independently re-tested.

| Capability outcome | Depends on | Ownership | Status | Evidence |
|---|---|---|---|---|
| Register a character or group chat as a transcript source | Source-registration ledger; explicit character identity binding | Shardwright | Verified | `tools/server-plugin/shardwright-memory/` source registration routes and ledger |
| Observe whether a registered source resolves and has changed | Source-resolution adapter and custody receipt | Shardwright | Verified | Observation receipt with revision hash, byte length, locator hash |
| Ingest complete source messages without summarizing them | Transcript ledgers, source observation, incremental projector | Shardwright | Verified | Live intake of 915 messages; projection generation `CURRENT` (Register) |
| Preserve hidden, archived, and deleted-message state | Host metadata plus visibility and tombstone projection | Shared host and Shardwright | Verified for captured metadata | Visibility ledger and tombstone records |
| Search transcript material lexically | SQLite FTS5 transcript projection | Shardwright | Verified* | `transcript-fts-document-projection.js` |
| Retrieve candidate message families | FTS candidate selection with posture-specific visibility filtering | Shardwright | Verified* | `transcript-fts-candidate-selection.js` |
| Resolve candidates to custody anchors | Anchor-resolution service and occurrence metadata | Shardwright | Verified | `SOLE_ANCHOR`, ambiguity, and refusal states (Register) |
| Assemble bounded context windows around anchors | Window assembler and source-message projection | Shardwright | Verified | Window assembly and bundle routes |
| Produce a complete recall bundle without silent truncation | Bundle materializer and character ceiling | Shardwright | Verified | Capacity and materialization refusal states |
| Ask the host to measure and approve prompt insertion | SillyTavern generation boundary and host tokenizer | Host integration | Verified, host-dependent | Pre-dispatch planning contract and measured receipts |
| Insert approved recall into the generation prompt | Host extension-prompt mechanism | Host integration | **Partially verified\*** | Sentinel staging and verified replacement are proven (`host-recall-sentinel-stage.js`, `index.js`; Register). The Register tracks broader injection and automatic dispatch orchestration as separate, not-yet-claimed work |
| Summarize a selected message range | Summarization pipeline and configured model | Shardwright (inherited) | Verified as existing; **derived, non-authoritative** | Summary-Sharder-derived behavior |
| Retrieve shard summaries semantically | Similharity and BananaBread service; configured vector backend | External | External dependency; Unverified here | `core/rag/vector-client.js`, README |
| Maintain a human-readable Markdown dossier | Versioned dossier contracts | Shardwright | **Not implemented\*** | Contracts only (Versioned Dossier Claim Graph; Catalog, Context Sheet, and Dossier UX). No dossier code found in `core/`, `tools/`, `ui/`, or `index.js` on 2026-09-21. Register: no runtime proof |
| Preserve CharMemory Markdown continuity | CharMemory Continuity Bridge | Shardwright | Interim; to be retired | `tools/charmemory-continuity-bridge/` |

**Correction to the source draft:** Codex's draft listed the Markdown dossier as an implemented "import/export" capability and listed prompt insertion as fully implemented. Neither matched the repository or the Register, and both are corrected above.

**Not yet proven by this document:**

- semantic retrieval quality;
- whether BananaBread and Similharity are active in a given deployment;
- whether native SillyTavern Vector Storage is enabled;
- comparative recall quality between FTS5, semantic reranking, and hybrid retrieval;
- performance at the full multi-chat corpus scale.

## 4. Retrieval boundaries

| Retrieval system | Corpus | Primary purpose | Authority | Default relationship |
|---|---|---|---|---|
| Transcript Recall | Complete captured source messages | Custody-preserving lexical retrieval, anchor resolution, bounded context assembly | Transcript ledgers and governed identity and visibility records | Independent |
| Shard RAG | Generated shards, summaries, related artifacts | Semantic retrieval and optional reranking | Shard and provenance records; governing memory contracts | Independent |
| CharMemory Bridge | Human-editable Markdown memory files | Interim compatibility and human-readable continuity | Not canonical; compatibility projection only | Transitional (to be retired) |
| SillyTavern Vector Storage | Host-managed vector records | Host-owned memory capability | SillyTavern host | External and opt-in |

### Duplicate-injection rule

A source may contribute to a generation only through an explicitly identified retrieval path. If multiple paths return materially overlapping evidence, the system must either:

1. deduplicate it using stable source and message identity; or
2. retain the separate occurrences and record that they are separate sources.

No system may silently treat semantic similarity, matching text, a title, a filename, or a shared summary as proof that two records are the same authoritative occurrence.

Transcript Recall and Shard RAG must not both inject overlapping material by default without an explicit arbitration result. Operator preference may select a retrieval preference, but must not merge custody, suppress Archaeology records, or establish truth.

**Enforcement status: Open.** This is a written rule. No arbitration mechanism was found, and whether both paths can inject overlapping material at once was not tested.

### Status vocabulary

- **Verified**: demonstrated by repository code, a contract, or a recorded proof.
- **External dependency**: supplied outside this repository and not owned by Shardwright.
- **Interim**: retained for compatibility or proving value, not final architecture.
- **Unverified**: referenced by documentation or configuration but not tested here.
- **Open**: requires an explicit decision.
- **Deferred**: intentionally postponed without implying rejection.

## 5. Keep / replace / retire

| System | Disposition | Reason | Status | Evidence |
|---|---|---|---|---|
| Transcript index (SQLite FTS5) and recall stack | Keep | Custody-preserving, rebuildable, current with SQLite | Decided | Register; transcript contracts |
| Sharder, summaries, review, lorebook, chat manager | Keep (derived, non-authoritative) | Inherited product core; must not stand in for source | Open: relationship to Phase X catalog records | README; Rebase contract |
| `core/rag` behind its seam | Keep | Working and tested; two files isolate the plugin | Open pending D-A and D-B | `vector-client.js`, `reranker-client.js` |
| Similharity | Keep; host a pinned copy under project control | Original repository is gone; copies with original history exist | Open: provenance gate not yet executed | Design review, L-2 |
| BananaBread | Keep as the recommended local embedding and rerank service | Named in the frozen Operational Model | Open: license text not retrieved | Operational Model |
| Qdrant and other vector backends | Keep (external, user's choice) | Apache-2.0 (Qdrant); no Shardwright-owned DB code | Decided | Design review, L-3 |
| CharMemory Continuity Bridge | Retire | Interim proving step, not in the final design | Decided; timing open | Chris; its README |
| ST native Vector Storage | Leave excluded where the bridge owns the source; revisit when the bridge retires | Avoids duplicate injection | Open | Bridge README |
| Markdown dossier | Keep as a goal; not built | Contracts entered, no implementation | Open | Dossier contracts |

## 6. Open decisions

| ID | Decision | Owner | Evidence needed | Default until decided |
|---|---|---|---|---|
| D-A | Where, if anywhere, semantic retrieval joins transcript recall (none; reranker; second candidate source) | Chris with Codex | Recall-quality baseline (D-1) showing measured lexical gaps | FTS5 only; no semantic injection on the transcript path. A reranker, if added, is advisory and preserves every candidate identity |
| D-B | Hosting Similharity under project control | Chris | Provenance gate: exact commit, license text, dependency audit, API compatibility test, pinned copy | Keep the current install; do not update it |
| D-1 | Recall-quality baseline: evaluation set and read-only scoring harness | Chris | Real queries with human-agreed expected messages | No retrieval change |
| D-2 | Tokenizer and FTS configuration as projection identity | Chris with Codex | Baseline comparison of `unicode61` versus `porter unicode61`; confirm rebuild behavior | Keep the current tokenizer |
| D-F | Duplicate-injection arbitration: mechanism, not just the rule | Chris with Codex | Test whether multiple paths can inject overlapping material | Rule only; no enforcement |
| D-G | Bridge retirement timing | Chris | Transcript index covers the bridge's source type | Bridge remains, labeled interim |
| D-H | Minimum supported Node version (`node:sqlite` is a release candidate) | Chris | Host's requirement | Undocumented |
| D-I | Verify the upstream and BananaBread license texts | Chris | Source revisions and license files | Recorded as unverified |

## 7. Not in scope

- licensing approval or legal review;
- source mutation;
- cross-instance lineage reconciliation;
- grant policy;
- host-internal (SillyTavern) implementation changes unless separately contracted.

## 8. Verification notes

- **Spot-checked against the repository (2026-09-21):** FTS5 projection and candidate selection files exist and use SQLite FTS5; the sentinel is staged through the host `setExtensionPrompt`; no dossier import/export code exists.
- **Restated, not re-tested:** every other Verified row comes from the Register and Codex's draft.
- **Known gaps carried over from the design reviews:** no recall-quality baseline; Similharity provenance gate not run; the wider items Codex raised (failure and retry behavior, model-version rebuilds, per-character authorization, scale) are not yet covered.
