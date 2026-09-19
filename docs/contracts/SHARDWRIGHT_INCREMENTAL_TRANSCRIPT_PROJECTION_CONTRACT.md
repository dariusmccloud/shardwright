# Shardwright Incremental Transcript Projection Contract

**Version:** 0.6.0
**Status:** PROVEN — incremental projector foundation, service catch-up seam, current-projection gate, and host transport pass.

## 1. Purpose

The Transcript Index must make SQLite the normal operational read path without
moving canonical authority out of the append-only Shardwright ledgers. This contract
defines the incremental projector that applies newly admitted authoritative events
to rebuildable SQLite state.

## 2. Authority boundary

The existing transcript ledgers remain authoritative:

- source registration and custody;
- source revisions;
- complete message rows;
- visibility, archive, and tombstone state; and
- replay order and integrity.

`transcript-index.db` remains rebuildable operational state. Its tables, FTS5 data,
current-state rows, indexes, cursors, and hashes MUST NOT establish, repair, or
replace ledger authority. A projection may be deleted and rebuilt from intact
authoritative ledgers.

## 3. Projector ownership and inputs

The server-side Transcript Index service owns projection application and recovery.
Browser code, host files, retrieval, reranking, injection, and UI are not projection
owners.

The projector consumes only validated, ordered entries from the transcript source
registry, source-revision, message, and visibility ledgers. It MUST NOT read a
projection as an authoritative input or infer missing events from current JSONL.

## 4. High-water marks and cursor state

The projector MUST persist one high-water mark per authoritative ledger and storage
root, including at least:

- ledger identity and schema version;
- last applied sequence;
- last applied entry hash; and
- projection generation/hash.

The projection generation is the canonical hash of the tuple
`(projectorVersion, projectionSchemaVersion, ledgerIdentity, applied high-water
marks, projection content hash)`. The high-water-mark tuple identifies the input
prefix; the projection content hash verifies the materialized rows. Both values MUST
be recorded so equivalent rebuilds have deterministic generation semantics and any
divergence is detectable.

Cursor state is operational metadata. It is valid only when the referenced ledger
prefix replays with the recorded sequence and hash. Cursors MUST be advanced only in
the same transaction that commits the corresponding projection changes.

## 5. Transaction boundary

One projection transaction may apply a contiguous batch from one or more ledgers and
commits all affected current-state, occurrence, FTS, and cursor rows atomically.
An interrupted transaction MUST leave the prior cursor and projection generation
intact. Partial projection application MUST NOT be presented as current.

Each ledger has an independent cursor. A transaction advances only the cursors for
ledger prefixes actually consumed by that transaction; the four ledgers do not share
an implicit synchronized clock.

Cross-ledger prerequisites MUST be applied in the existing deterministic authority
order. A dependent event with a temporarily unavailable prerequisite remains
`PROJECTION_PENDING`/stale and is eligible for a later catch-up; it MUST NOT be
applied by arrival order alone. An impossible, contradictory, malformed, or
permanently unreconcilable prerequisite is `PROJECTION_QUARANTINED` and requires
operator or recovery action.

## 6. Gap and integrity detection

The projector MUST refuse and quarantine when it observes:

- a sequence gap, duplicate, regression, or ledger identity mismatch;
- a changed entry at or before the recorded high-water mark;
- an entry hash, payload hash, or schema mismatch;
- an impossible, contradictory, malformed, or unreconcilable prerequisite;
- a cursor referring to a projection generation that no longer verifies; or
- conflicting current-state effects that cannot be resolved by the governing ledger
  replay rules.

It MUST distinguish `NOT_SCANNED`, `SCAN_FAILED`, `PROJECTION_PENDING`,
`PROJECTION_STALE`, and `PROJECTION_QUARANTINED`. It MUST preserve authoritative bytes and the last verified
projection while exposing the refusal reason.

## 7. Rebuild triggers and recovery

Full ledger replay and projection rebuild are permitted for:

- a missing, corrupt, or unverifiable SQLite projection;
- cursor loss or invalidation;
- detected ledger/projector divergence;
- schema or projector-version migration; and
- explicit operator recovery.

Rebuild MUST materialize a replacement projection off to the side, verify its
generation/hash against the authoritative inputs, then activate it atomically. A
failed rebuild MUST NOT replace the last verified projection or mutate any ledger.

## 8. Ordinary operation requirement

After initial catch-up, normal source mutation MUST consume only the new ledger suffix
and affected projection rows. Ordinary retrieval MUST operate exclusively against the
last verified SQLite projection and MUST NOT itself perform ledger catch-up. The
Transcript Index service owns catch-up before a projection is exposed as current.
Neither mutation nor retrieval may replay complete ledgers or rebuild a character's
entire FTS projection merely to answer an ordinary query.

Full replay remains an exceptional operation for validation, recovery, migration, or
explicit rebuild. The projector MAY perform bounded integrity checks against the
ledger suffix during ordinary operation.

## 9. Scope and exclusions

This contract does not authorize:

- moving canonical authority into SQLite;
- changing existing ledger formats or ownership;
- cross-instance event packages or ancestry reconciliation;
- OneDrive live multi-writer operation;
- semantic capture, reranking, sufficiency, or prompt injection; or
- a generic projection framework for unrelated authority domains.

Cross-instance local branches and globally accepted lineage require a separate
contract after this projection boundary is implemented and proven.

## 10. Required proof for implementation

An implementation slice must prove, at minimum:

1. a suffix append updates only affected SQLite rows and advances the matching
   high-water mark atomically;
2. a repeated suffix application is idempotent;
3. a sequence/hash gap refuses without changing the last verified projection;
4. an interrupted transaction exposes neither partial rows nor an advanced cursor;
5. ordinary retrieval reads SQLite without replaying complete ledgers; and
6. deleting the projection and rebuilding from intact ledgers reproduces the same
   verified generation/hash.

## 11. Status

The incremental projector foundation, explicit service-owned catch-up/status seams,
and the host transport for the authenticated catch-up seam are proven by focused
projector, route, orchestration, and transport suites. The focused six-proof suite
`transcript-incremental-projector.test.mjs` (6/6). The proof covers atomic suffix
application, idempotence, prefix-integrity refusal, transaction rollback, SQLite-only
retrieval, and deterministic rebuild equivalence. Cross-instance synchronization,
lineage reconciliation, automatic host dispatch wiring, transport composition into a
specific host call site, and UI remain out of scope.
