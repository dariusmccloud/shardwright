# Design Review Pilot: Mission, Capability Inventory, and Keep/Replace Draft

**Status:** Pilot report; non-governing. Advisory only. No contract, code, Register, or license file is changed by this document.
**Date:** 2026-09-21 (amended 2026-09-21 after Codex's independent review and a Similharity provenance check; see Amendment Log)
**Reviewer:** Claude (Sonnet 5), with an independent read by Codex.
**Companion to:** [DESIGN_REVIEW_PILOT_TRANSCRIPT_RECALL.md](DESIGN_REVIEW_PILOT_TRANSCRIPT_RECALL.md), which reviewed only the lexical stage.
**Method:** Chris's working-backwards frame: mission, then what exists, then current design scope, then keep/repurpose/replace, then "is this still trending true?"

Licensing statements below are observed facts, not legal advice. Chris's stated posture: the project is private and never distributed; proper licensing is wanted as housekeeping, not as a legal-risk driver.

**Evidence labels used below:** **Verified** = observed directly (local command, cloned source, primary page). **Reported** = stated by a page summary or search result; not confirmed against the primary text. **Inferred** = my reasoning.

## 1. Mission (as documented today)

- **Product:** README: "Structured continuity for long-form roleplay." A SillyTavern extension that keeps chat history from being lost when it falls out of context.
- **Phase X:** the frozen [Operational Model](../contracts/PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md) states the human purpose and finish line of each memory route, and requires every child requirement to trace back to a practical distinction.

**Finding M-1:** No single document connects mission to the capability set to what is kept or replaced. The README describes the inherited product. The Operational Model describes Phase X. Nothing states how the two fit, or which retrieval service serves which purpose. That map is the missing artifact (decision D-E).

## 2. What exists today

| # | Component | What it does | Where | Origin | Evidence |
|---|---|---|---|---|---|
| A | Summarization and Sharder | Prose summaries; 16-section Memory Shards with scene codes; review, weights, pruning; visibility; lorebook output; chat manager; batch; themes; FAB | `core/sharder`, `core/summarization`, `core/api`, `ui/` | Inherited from Promansis/summary-sharder; extended | README credits; Identity and Legacy Migration contract |
| B | Inherited RAG stack | Vectorizes shards; retrieval; client-side hybrid scoring; Porter stemmer and stop words; reranker client with `similharity` or `direct` mode | `core/rag/` (30 files) | Present from the fork's early history; upstream vs. later authorship not established | `vector-client.js`, `reranker-client.js`, `scoring.js`, `stemmer.js` |
| C | Owned server plugin | Phase X ledgers (identity, membership); transcript index (SQLite FTS5); source registry; branch lineage; character binding | `tools/server-plugin/shardwright-memory/` | New, Shardwright-owned | Register rows; contract-specific tests |
| D | Owned client transcript layer | Recall planning, capacity, dispatch composition, grants policy, character identity | `core/transcript/` | New, Shardwright-owned | Register rows |
| E | CharMemory Continuity Bridge | Interim FTS5 retrieval over CharMemory Markdown | `tools/charmemory-continuity-bridge/` | Owned; **Chris: a mid-point proving step, not part of the final design** | Its README; Chris |
| F | External services | **Similharity** (SillyTavern server plugin, REST at `/api/plugins/similharity`) fronting vector DBs (Vectra, LanceDB, Qdrant, Milvus); **BananaBread** (local embedding, reranking, emotion classification server); **SillyTavern Vector Storage** (host-native) | Outside the repo | Third-party | README Quick Start; `vector-client.js` header |

**Finding C-1 (retrieval boundaries):** four retrieval mechanisms exist. They index different artifact classes and are not necessarily competing pipelines:

| System | Corpus | Retrieval role | Authority |
|---|---|---|---|
| Transcript Recall | Full source messages | Lexical candidate retrieval with custody | Transcript ledgers |
| Shard RAG | Summaries and shards | Semantic recall and reranking | Shard records |
| CharMemory bridge | Markdown dossiers | Interim compatibility layer (to be retired) | Not canonical |
| ST Vector Storage | Host-managed memories | Host-owned, opt-in | SillyTavern |

The actual gaps are undocumented **precedence**, possible **duplicate injection** of the same evidence through more than one path, external-service failure behavior, and cost. Nothing records an arbitration rule. Whether these paths ever inject overlapping material at the same time was not tested.

## 3. Current design scope, as recorded

- The frozen Operational Model assigns **BananaBread and Similharty** responsibility for "retrieval, matching, and reranking" in the Phase X discovery flow, states that "similarity is never evidence," and calls the existing solution the supplier of embeddings, retrieval, and reranking. Its only new routine model role is a local instruction model for capture.
- The Active Continuity Assembly contract §12 allows "BananaBread, Similharty, or another authorized retrieval service," and forbids retrieval from activating dormant material, bypassing blocked state, creating precedence, or crossing scope.
- The Transcript Candidate Selection Policy §4 is FTS-first and allows "a future semantic reranker" as a disposable preference that preserves every candidate identity. A reranker adapter and planning seam already exist in `core/transcript/`.
- Phase X row status per the Register (2026-09-01 snapshot, with entries through 2026-09-21): capture, catalog, dossier, and assembly work are mostly `ENTERED` (contract approved, no implementation proof); membership and identity persistence are `PROVEN`; the transcript recall track is the most advanced.

**Correction to the earlier pilot report:** its D-3 suggested `sqlite-vec` as a semantic option without accounting for the above. The project already has a designated semantic service. The real question is where, if anywhere, that service plugs into transcript recall (decision D-A).

## 4. Findings that affect keep/replace decisions

### L-1 (license file): README declares MIT but no LICENSE file exists
- **Verified:** README ends with `[MIT](LICENSE)`. There is no LICENSE file in the working tree, and `git log --all` shows none was ever added.
- **Reported:** the GitHub page for Promansis/summary-sharder shows MIT. The license text and copyright holder were not retrieved.
- **Decided by Chris, completed 2026-09-21:** root `LICENSE` added (MIT; copyright lines for DariusMcCloud and Promansis). Upstream summary-sharder also shipped no LICENSE file (its README links one that does not exist), so there was no upstream notice text to copy; the Promansis line preserves attribution. Housekeeping, since the project is private.
- **Bounded repair:** obtain upstream's LICENSE text and copyright line, add a LICENSE that preserves the upstream notice plus Shardwright's own, and fix the README link.

### L-2 (dependency continuity): Similharity's original repository is unavailable; preserved copies exist
- **Verified (2026-09-21):** `git ls-remote https://github.com/Coneja-Chibi/VectHare.git` returns "Repository not found." Codex reported the page as reachable; the git-level check contradicts that, and Chris confirms it is gone and has been gone before. Treat the original as unavailable.
- **Verified:** the `Similharity-Plugin` branch survives, with the original author's history, in two forks:

| Fork | Branch HEAD | Version | Commits | package.json license | LICENSE file |
|---|---|---|---|---|---|
| Dogoo9/VectHare | `8b370f1` (2026-09-21) | 3.2.1 | 65 | MIT, author Coneja-Chibi | none |
| KritBlade/VectFox | `0d7e701` (2026-07-30) | 3.3.4 | 135 | MIT | none |

  Both contain the original initial commit (`98d886b`, 2025-11-21, "VectHare plugin v1.0.0") and the original author's commits. Both READMEs state "MIT." Neither ships a LICENSE file. Contributors in the histories include Coneja-Chibi, Darran Hall (24 commits), Mykhailo, LeviTheWeasel, and the fork maintainers.
- **Correction to the earlier report and to Codex's caution:** VectFox's *extension* is AGPL-3.0 (verified), but its `Similharity-Plugin` branch declares MIT in `package.json` and README. The AGPL attaches to the extension on `main`, not necessarily to the plugin branch. This is a declaration only, since there is no LICENSE file to read. Do not take code from VectFox's `main`.
- **Verified:** both plugin branches contain the endpoints Shardwright calls (`get-embedding`, `rerank`, `health`). Behavioral compatibility was not tested.
- **Risk:** the plugin is multi-author and has no LICENSE file anywhere, so its MIT status rests on declarations by the current maintainers of each fork.
- **Mitigation already in the code:** every vector and rerank call goes through two files, `vector-client.js` and `reranker-client.js`, a narrow seam that makes an exit path feasible.

### L-3: Other dependencies
- BananaBread: **Reported** MIT (repository page summary; license text not retrieved). Qdrant: Apache-2.0 (**verified** from its repository page). Both are used as external services, not copied code.

### R-1 (tokenization): the RAG code already has a stemmer; the transcript FTS query has none
`core/rag/stemmer.js` contains a Porter stemmer and stop words. The transcript FTS query does not use one. These serve different purposes (client-side scoring versus a durable index) and should not be silently reconciled. Porter is English-biased and can change exact-match behavior. The choice should follow the recall-quality baseline.

## 5. Keep / repurpose / replace (draft, for decision)

"Lean" is my recommendation from evidence found. Nothing here is decided.

| Component | Lean | Reasoning | What is needed to decide |
|---|---|---|---|
| A. Sharder, summaries, review, lorebook, chat manager | Keep | The inherited product core; Phase X sits above it | Confirm how shards relate to Phase X catalog records (Rebase contract governs; not fully reviewed) |
| B. `core/rag` | Keep behind its seam | Working, tested; two files isolate the plugin | D-A and D-B |
| F. Similharity | Keep; host a pinned copy under our control | Original repo is gone (verified); copies with original history exist | D-B provenance gate |
| F. Qdrant / other vector DBs | Keep (external, user's choice) | Apache-2.0; Shardwright owns no DB code | None |
| F. BananaBread | Keep as the recommended local embed/rerank service | Named in the frozen model; reported MIT | Confirm license text; confirm intended service |
| C/D. FTS5 transcript index | Keep as the lexical exact-recall foundation | Rebuildable, custody-preserving | Recall-quality baseline |
| E. CharMemory bridge | Retire | Chris: interim, not in the final design | Retirement slice, when the transcript index covers its source |
| ST native Vector Storage | Leave excluded where the bridge owns the source | Avoids duplicate injection | Revisit when the bridge retires |

## 6. Decisions

- **D-A (retrieval ownership boundary): to be discussed with Codex.** Codex's recommendation: keep FTS5 as the initial candidate source; if the baseline shows lexical recall gaps, evaluate BananaBread and Similharity as an optional, advisory **reranker** through the existing seam; do not make semantic retrieval a second candidate source yet, since that requires candidate-source union, duplicate identity, source precedence, semantic-only candidate handling, unavailable-service behavior, evidence receipts, and budget rules. I concur, conditional on measured misses. Not decided.
- **D-B (Similharity hosting): approved in principle by Chris**, from the original licensed source where possible. The original is unavailable, so the provenance gate below applies to the surviving forks. Not yet executed.
- **D-C (license housekeeping): decided.** Add an MIT LICENSE with upstream's notice.
- **D-D (CharMemory bridge): decided.** Interim only; retire later.
- **D-E (mission map document): decided.** Chris, Codex, and Jeep will write it. Guidance on its shape is in the session record, not here.

### Provenance gate for hosting Similharity (from Codex's review)
1. Identify the exact repository, branch, and commit. Candidates above.
2. Retrieve actual license text and copyright notices. Neither fork ships a LICENSE file, so the declarations in `package.json` and README are the available evidence.
3. Audit transitive dependencies (`@lancedb/lancedb`, `@zilliz/milvus2-sdk-node`, `sanitize-filename`, `vectra`) and runtime requirements.
4. Decide the form: separately distributed plugin, or code vendored into this project.
5. Pin the version and record an update procedure.
6. Add an API compatibility test for `/api/plugins/similharity`.
7. Test behavior against future SillyTavern updates.
8. Preserve a copy (for example a git bundle of the pinned commit) so it cannot vanish again.

## 7. Additional review items (from Codex)

Not yet covered by either report and worth a later pass: external-service timeout, retry, and fail-closed behavior; embedding and model version changes and rebuild requirements; hidden, deleted, and tombstoned message parity across every index; branch, checkpoint, and group-source scoping; per-character and per-group authorization; privacy and authentication boundaries; service and plugin version drift; corpus-scale performance and memory; provenance, notice, and dependency records; multilingual retrieval; and whether scheduled scanning is registry maintenance, current-chat change detection, or both. VectFox's own README notes separate extension and plugin updates and limits around shared multi-user authorization, which is deployment risk to weigh.

## 8. Is it still trending true?

- **Holds up:** the authority/projection discipline, the proof discipline, and the choice to treat similarity as a lead rather than evidence are consistent across the contracts and the code read.
- **Drift risks:** no recorded precedence between retrieval paths (C-1); a critical external dependency whose home repository is gone and whose surviving copies have no LICENSE file (L-2); a claimed license file that is missing (L-1); and no recall-quality measurement (earlier report D-1).

## 9. Limits of This Review

- Did not read the Phase X Rebase contract, the Origin document, or most of the inherited Sharder and RAG code in depth. Capability rows come from headers, README, and greps, not behavior tests.
- Did not run Similharity, BananaBread, or Qdrant. Nothing here measures quality, speed, or fit.
- Upstream summary-sharder license text and holder, and BananaBread's license text, were not retrieved.
- Similharity forks were inspected by cloning and reading metadata, not by running them.
- One reviewer plus Codex's read; both are model families with shared blind spots.

## 10. Amendment Log

- **2026-09-21 (after Codex review):** L-2 corrected from "appears deleted" to a verified status with named surviving sources; VectFox AGPL scope narrowed to its extension, with its plugin branch declaring MIT; BananaBread license downgraded to "reported"; C-1 reframed from "four pipelines" to precedence and duplicate-injection gaps and given a boundary matrix; R-1 no longer implies reconciling the tokenizers; D-A recorded as Codex's conditional recommendation; decisions D-B through D-E updated with Chris's answers; provenance gate and Codex's additional items added.

## 11. Sources (accessed 2026-09-21)

- Shardwright `README.md`, `manifest.json`, `docs/FEATURES.md`; `core/rag/*.js`; `tools/charmemory-continuity-bridge/README.md`
- Contracts: Phase X Memory Formation Operational Model; Active Continuity Assembly and Precedence §12; Transcript Candidate Selection Policy §4; Transcript Index and Recall Experience §4.2; Identity and Legacy Migration (SWI-DOC-001)
- Local `git ls-remote` and `git clone` of Dogoo9/VectHare (`Similharity-Plugin`) and KritBlade/VectFox (`Similharity-Plugin`), run 2026-09-21
- https://github.com/Promansis/summary-sharder (MIT shown on repository page)
- https://github.com/prolix-oc/BananaBread (reported MIT)
- https://github.com/qdrant/qdrant (Apache-2.0)
- https://github.com/KritBlade/VectFox (extension declared AGPL-3.0)
- https://github.com/Dogoo9/VectHare and https://github.com/timwu/VectHare (MIT declared; fork chain)
