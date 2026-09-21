# Design Review Pilot: Transcript Recall Retrieval Stack

**Status:** Pilot report; non-governing. Advisory only. No contract, code, or Register change is made or authorized by this document.
**Date:** 2026-09-21
**Reviewer:** Claude (Sonnet 5), with an independent read by Codex. Amended 2026-09-21 (see Amendment Log at the end).
**Reviewed area:** The lexical candidate stage of Transcript Recall: FTS projection, query construction, ranking, and the platform underneath them.
**Not reviewed:** reranker admission, window assembly, capacity planning, bundle presentation, injection. These are outside this pilot's read and are not judged here.

## How To Read This

Each finding names its evidence, what it means, whether the choice is reversible, and a recommended decision. Findings labelled **Decision** need Chris. Findings labelled **Watch** need no action now.

Reversibility rule used throughout: the durable ledgers are canonical authority and `transcript-index.db` is a disposable, rebuildable projection (Recall contract §4.2; header of `transcript-fts-document-projection.js`). Anything that only changes the projection is cheap to be wrong about. Anything that changes a ledger, schema identity, or contract authority is not.

## Summary

The retrieval design is structurally sound. The authority/projection split holds in code as it does in the contracts, selection returns identity and custody only, and truncation is reported honestly. No technology found makes FTS5 the wrong choice today.

The main weakness is not the technology. It is that **retrieval quality has no measurement**, so every improvement option below is currently a guess. The highest-value next step is a baseline, not a change.

## Findings

### D-1 (Decision, recommended first): There is no recall-quality baseline

- **Governing source:** Transcript Index and Recall contract; Candidate Selection Policy contract §4-§5.
- **Observed:** The Register and contracts record custody, parity, capacity and refusal proofs. The Parity Diagnostic proves live and offline retrieval agree, which is consistency, not relevance. A search of the transcript contracts for a relevance or recall-quality benchmark found none.
- **Expected:** A way to say "for these real queries against this real chat, the right messages were/were not among the candidates."
- **Effect:** Options D-2 and D-3 cannot be judged. A change could make recall worse and the current proofs would still pass.
- **Reversibility:** N/A (this adds measurement only).
- **Recommendation:** Build a governed evaluation set from real chat data (queries paired with the messages a human agrees should surface), then record current FTS results as the baseline. Precedent exists in the Capture Benchmark Governance pattern.
- **Evaluation set should include (from Codex's review):** normal continuity queries; architecture and lineage queries; names and aliases; negative queries; branch and checkpoint cases; hidden, deleted, archived and tombstoned messages; group-source cases; multilingual or morphology-sensitive examples.
- **Measure at least:** candidate recall@K; content-family recall; anchor-resolution success; false-positive rate; duplicate occurrence rate; latency; materialized token and character size; continuity versus archaeology behavior.
- **Constraint:** the harness is read-only and must not turn model relevance into authority.
- **Bounded slice:** evaluation-set contract plus a read-only scoring harness. No retrieval change.

### D-2 (Decision): Default tokenizer means no stemming

- **Evidence:** `transcript-fts-document-projection.js:67-72` creates the FTS table with no `tokenize=` option, so SQLite's default `unicode61` applies.
- **Verified locally (Node 24.21.0, SQLite 3.53.4, 2026-09-21):** a message containing "running" is *not* matched by the query `run` under the default tokenizer, and *is* matched under `tokenize='porter unicode61'`.
- **Effect:** Morphological variants (run/running, remember/remembered) are missed. Query construction (`transcript-fts-candidate-selection.js:42-45`) quotes each term, so no prefix matching compensates.
- **Trade-offs:** `porter` is English-oriented and can over-stem; `trigram` matches substrings but grows the index and adds noise. Neither is free.
- **Reversibility:** High. Projection only.
- **Crack to verify before any change:** `materializeTranscriptFtsDocuments` skips rebuilding when the stored `projection_hash` matches (`:112-115`), and that hash is computed from documents and links only (`:54`). A tokenizer change would not alter it. `TRANSCRIPT_PROJECTOR_VERSION` exists in the incremental projector (`transcript-incremental-projector.js:14`), so a bump path may exist, but I did not confirm the FTS materializer consults it. This is a correctness prerequisite for D-2, not a separate defect claim.
- **Confirmed by Codex:** the standalone FTS materializer's skip decision uses a hash of documents and links only. It does not include tokenizer identity or FTS schema/configuration, so a tokenizer change can leave the table looking current. `TRANSCRIPT_PROJECTOR_VERSION` protects the incremental projector's generation, not this materializer.
- **Recommendation:** Do not change the tokenizer until D-1 gives a measurable comparison. Then benchmark `unicode61` against `porter unicode61` (and consider effects on exact matches, since Porter is English-biased). Treat tokenizer and FTS configuration as part of projection identity, versioned independently, so a change forces a rebuild. Keep query normalization distinct from index tokenization. Do not reuse the RAG Porter stemmer here without the baseline.

### D-3 (Decision, defer): Semantic or hybrid retrieval

> **Superseded in part (2026-09-21):** this section proposed `sqlite-vec` without accounting for the project's existing BananaBread + Similharity semantic service, which the frozen Operational Model already designates for retrieval, matching, and reranking. See [DESIGN_REVIEW_PILOT_MISSION_AND_CAPABILITY_INVENTORY.md](DESIGN_REVIEW_PILOT_MISSION_AND_CAPABILITY_INVENTORY.md), decision D-A. The cost and reversibility analysis below still applies to any semantic option.

- **What the contracts already say:** The Recall contract §4.2 says "No vector backend ... is required" (not prohibited). Candidate Selection Policy §4 already allows "a future semantic reranker" as a disposable preference that must preserve every candidate identity and never become authority. A reranker admission seam exists (`transcript-reranker-admission.js`).
- **Current technology:** FTS5 BM25 plus sqlite-vec vectors plus reciprocal-rank fusion is a widely used pattern in 2026 (sources below are mostly community write-ups, so moderate reliability). `node:sqlite` exposes `loadExtension` (verified locally), so a vector extension is technically loadable, subject to the `allowExtension` option.
- **Costs and risks:** an embedding source (local model or external API; the project has a stated no-API preference in this conversation); storage and rebuild time; and consent, scope, and branch visibility must apply to embeddings exactly as they do to text (Memory Sharing and Grant contract). Contract line 174 also indexes one whole message per row, not chunks, which may suit embeddings poorly for long messages.
- **Structural limit:** a reranker only reorders what FTS already returned. It cannot recover a message FTS missed. Recovery requires a second candidate source (hybrid), which is a larger contract change.
- **Reversibility:** Embeddings are derived, so reversible. The contract and scope implications are not.
- **Recommendation:** Defer. Revisit only if the D-1 baseline shows lexical misses that D-2 does not fix.

### D-4 (Decision, low urgency): Platform dependence on a release-candidate API

- **Evidence:** `sqlite-node.js` uses `node:sqlite`, documented as Stability 1.2 (release candidate) since Node v25.7.0. The runtime here bundles SQLite 3.53.4, which is the current release (2026-07-24).
- **FTS5 currency:** No FTS5 changes are listed in SQLite 3.50 through 3.53. The FTS5 additions (locale-aware tokenizer API, `contentless_unindexed`) are from 3.47.0 (October 2024). One of my search results wrongly presented these as 2026 changes; the SQLite changelog corrects that.
- **"FTS6":** I found no evidence that an FTS6 exists. Searches returned only FTS3, FTS4 and FTS5.
- **Effect:** No technology reason to move off FTS5. The remaining risk is that an RC API could change and that the Node version requirement is not recorded (`node --version` here is 24.21.0; the host's minimum Node version is unverified).
- **Mitigation already present:** the adapter is a thin seam, and `sqlite-bun.js` exists as an alternative.
- **Recommendation:** Record the minimum supported Node version in a governing document. No engine change.

### W-1 (Watch): Whole-character rebuild on any projection change

- **Evidence:** the direct path, `materializeTranscriptFtsDocuments`, deletes and reinserts every document and link for the character inside one transaction whenever the hash differs (`transcript-fts-document-projection.js:116-129`). The incremental projector is a separate, diff-oriented path; this finding concerns the direct materializer only.
- **Observed scale:** proven at 915 messages. I did not measure larger corpora.
- **Concern:** cost grows with corpus size and with how often new messages arrive.
- **Recommendation:** Measure at a realistic large size before acting.

### W-2 (Watch): Content stored twice

- **Evidence:** message text is written to both `transcript_fts_documents.complete_content` and the FTS table's `complete_content` (`:60-72`, `:121-122`); the FTS table does not use an external-content option.
- **Effect:** roughly double storage for the indexed text. Not a problem at current size.
- **Reversibility:** High. Projection only.

### Positive observations (evidence the design is sound)

- The projection is explicitly disposable and the ledgers stay canonical, in both contract and code.
- Selection refuses on a failed integrity check (`quick_check`) and on structural failure instead of returning partial results.
- Truncation is reported (`availableCandidateCount`, `truncated`) rather than hidden, matching the contract's rule that a truncated set must not pretend to be complete.
- Query, scope, and limit validation is strict and fails closed.

## Recommended Decision Order

1. **D-1** Build the recall-quality baseline (unlocks the rest).
2. **D-4** Record the minimum Node version (documentation only).
3. **D-2** Test stemming against the baseline, after confirming the rebuild-trigger crack.
4. **D-3** Revisit only if 1-3 leave measured gaps.

## Limits of This Review

- Read the lexical stage only; the rest of the stack is unreviewed.
- One reviewer, one model family. A cross-check by Codex is the intended mitigation for correlated blind spots.
- The tokenizer behavior was verified with a small local test, not against real chat data.
- Community sources for D-3 are not primary documentation.
- No performance measurement was performed.

## Amendment Log

- **2026-09-21 (after Codex review):** D-1 evaluation set and metrics expanded; D-2 tokenizer identity gap confirmed and the recommendation reworded to benchmark first and version tokenizer configuration as projection identity; W-1 narrowed to the direct materializer path; D-3 marked superseded in part by the companion report (semantic reranking is conditional on measured lexical misses and advisory only).

## Sources (accessed 2026-09-21)

- SQLite release history: https://www.sqlite.org/changes.html
- Node.js SQLite API documentation: https://nodejs.org/api/sqlite.html
- SQLite FTS5 documentation: https://sqlite.org/fts5.html
- Hybrid FTS5 + sqlite-vec + RRF examples (community): https://dev.to/soytuber/building-a-hybrid-rag-in-200-lines-sqlite-fts5-sqlite-vec-rrf-38h1 ; https://simonwillison.net/2024/Oct/4/hybrid-full-text-search-and-vector-search-with-sqlite/
- Local verification: `node -e` script against `node:sqlite` on Node 24.21.0 (SQLite 3.53.4), 2026-09-21.
