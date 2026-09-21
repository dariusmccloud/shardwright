# Shardwright Transcript Retrieval Parity Diagnostic Contract

**Status:** PROVEN — 2026-09-19

## Purpose

Provide a read-only diagnostic that runs the same SQLite-backed projection,
candidate, anchor, window, policy, and bundle transports used by live recall.
The diagnostic predicts the live retrieval disposition; it does not approve,
inject, rank, mutate authority, or replace the live planner.

## Rules

1. The diagnostic MUST require an immutable character identity, query text, and
   declared retrieval posture.
2. Projection catch-up and retrieval MUST remain owned by the existing server
   services; SQLite is the operational read model and ledgers remain authority.
3. The result MUST preserve projection generation/hash and the intermediate
   candidate, anchor, window, policy, and bundle results.
4. A successful evidence chain reports `READY_FOR_PLANNING`; a refusal reports
   the exact existing refusal reason. A database match MUST NOT imply approval.
5. The diagnostic MUST be read-only and MUST NOT write chat files, ledgers,
   preferences, or prompt state.
6. Retrieval normalization MAY remove only balanced leading host envelope blocks
   such as `[TD]...[/TD]`; bracketed prose elsewhere MUST remain searchable.
7. The diagnostic MUST retain both raw and normalized query text. Source
   timestamps remain in message custody and MUST NOT be removed or rewritten by
   query normalization.

## Required proof

- focused diagnostic tests cover a ready chain and a refusal chain;
- a live query compares this diagnostic's disposition and custody metadata with
  the subsequent live planning receipt.

## Proof record

- Focused diagnostic/orchestrator proof: 9/9 passed; syntax and diff checks
  passed on 2026-09-19.
- Live comparison on Jeep request `59196b9b-f15a-451c-976b-a8bba26ac469`:
  diagnostic and planner both produced `INSUFFICIENT_EVIDENCE`; both observed
  the same current projection generation/hash, 24 selected candidates from 850
  available, and 24 `SOLE_ANCHOR` resolutions. No bundle was approved or
  injected.
- Live normalization proof after server restart: a host-stamped `bolt cutters`
  query preserved the raw `[TD]...[/TD]` envelope, normalized to `bolt cutters`,
  returned 4 of 4 candidates without truncation, and produced
  `READY_FOR_PLANNING` / `SUFFICIENT` with a 20-row bundle.
