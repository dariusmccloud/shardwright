# Phase X: Context-Sheet Membership Runtime Persistence And Replay Ownership Contract

**Version:** 0.2.0
**Status:** ENTERED — runtime persistence, replay ownership, and failure boundaries are
normative; routes, writers, storage migration, and projections remain unauthorized.
**Parent:** `PHASE_X_CONTEXT_SHEET_MEMBERSHIP_LINK_CONTRACT.md`

## 1. Problem

The Membership Link contract assigns nomination intake, validation, correction,
merge/split impact, replay, and reconciliation to the server-side Membership Link
service. It does not yet name the durable authority boundary through which that service
records those actions.

Reusing `interpretive-governance-ledger.jsonl` would merge membership relationship
authority with proposal/disposition authority. Reusing the DNM publication ledger would
make relationship organization look like continuity publication. A mutable SQLite row
or UI state would make replay unable to distinguish a lawful decision from a later
projection.

This contract establishes a separate durable Membership Link authority ledger and its
replay ownership before any runtime writer or route exists.

## 2. Governing Authority

The Membership Link contract remains the authority for link vocabulary, nomination,
validation, successors, merge/split impact, and membership replay semantics.

Existing ledgers retain their established authority:

- `interpretive-governance-ledger.jsonl` owns interpretive proposal, review, and
  disposition history;
- `dnm-publication-ledger.jsonl` owns continuity publication lifecycle;
- catalog registration and citation events own catalog identity and locators;
- Context Sheet events own anchors and sheet lifecycle.

The Membership Link ledger owns only the durable record of lawful membership artifacts
and their service-local ordering. It does not own source meaning, catalog lifecycle,
anchor identity, proposal disposition, publication, or dossier authority.

## 3. Durable Store And Lifecycle Owner

For each authenticated Shardwright storage root, the authoritative membership store is:

```text
<shardwright-storage-root>/context-sheet-membership-ledger.jsonl
```

The server-side **Membership Link service** is the sole writer and replay owner for
this ledger. Browser code, models, retrieval, RAG indexes, UI state, direct database
editing, and other services MUST NOT append or rewrite it.

The ledger is append-only. Each accepted line is one immutable canonical ledger entry:

```text
ledgerVersion
sequence
entryId
recordedAt
scopeId
operation
idempotencyKey
artifactSchemaId
artifactClass
artifactId
artifactHash
artifact
```

`artifact` is the exact schema-bound membership artifact. `artifactHash` is the hash of
that canonical artifact payload. `sequence` is a strictly increasing positive integer
within this ledger. The entry does not embed or copy catalog, Context Sheet, or
governance records: those remain exact references in the artifact.

## 4. Lawful Operations

Initial allowed operations are closed:

| Operation | Stored artifact | Authority limited to |
| --- | --- | --- |
| `NOMINATE` | `context-sheet-membership-nomination-v1` | durable reversible nomination |
| `VALIDATE` | `context-sheet-membership-validation-event-v1` | validation decision; only accepted decision may support a link |
| `LINK` | `context-sheet-membership-link-v1` | immutable accepted catalog-to-sheet relationship |
| `SUCCEED` | `context-sheet-membership-successor-event-v1` | correction and current-use change for an exact predecessor link |
| `IMPACT_DECIDE` | `context-sheet-membership-impact-decision-v1` | per-link merge/split consequence |
| `RECONCILE` | `context-sheet-membership-reconciliation-result-v1` | diagnostic rebuild/quarantine result only |

An unknown operation, artifact class, schema identity, or schema version MUST refuse
before append. The ledger MAY store a valid refusal/defer/quarantine artifact where its
governing schema allows it; it MUST NOT manufacture an accepted artifact to explain a
failure.

## 5. Write Admission And Idempotency

Before append, the Membership Link service MUST:

1. authenticate and resolve the Shardwright storage root;
2. validate the artifact against its recorded canonical schema, contract, and policy
   version;
3. verify every required exact reference is structurally complete;
4. enforce the operation-to-schema mapping above;
5. calculate canonical artifact hash and content-bound idempotency identity;
6. acquire the membership-ledger write lease or equivalent exclusive append guard;
7. recheck the idempotency identity under that guard;
8. append one canonical entry and durably flush it before returning success.

The idempotency identity binds at least:

```text
scopeId
operation
artifactSchemaId
artifactId
canonical artifact hash
```

Repetition with the same identity and same artifact hash returns the original entry and
MUST NOT append a second effect. Reuse of an identity with a different hash refuses as
an idempotency collision. Concurrent different lawful successors remain distinct
explicit events; storage order does not select a semantic winner.

Structural reference completeness is not semantic validation. In particular, a valid
write of a `NOMINATE` artifact does not establish that a catalog claim, anchor, or
relationship is true; that remains the later validation boundary.

### 5.1 Write Lease Recovery

The membership-ledger write lease is append-safety infrastructure only. It has no
membership authority and cannot prove that an artifact was accepted, refused, failed,
or partially written.

A recoverable lease MUST record service-local metadata sufficient to distinguish an
active writer from a stale guard:

```text
leaseVersion
leaseId
ownerProcessId
acquiredAt
heartbeatAt
operation
scopeId
idempotencyKey
artifactHash
```

`artifactHash` is advisory lock metadata only. The membership ledger entry remains the
sole authority for accepted artifact custody.

If the lease is absent, the writer may acquire it. If the lease exists and is active,
the writer MUST refuse as lock-held. If the lease exists and satisfies the entered
stale criteria, the service may reclaim only the lease and then MUST replay the ledger
and apply the normal idempotency rules under the newly acquired guard. Recovery MUST
NOT infer whether the interrupted write succeeded from the lease.

If the lease metadata is malformed, missing required fields, future-dated, owned by a
possibly active writer, or otherwise ambiguous, the service MUST fail closed for write
admission and leave the lease in place for operator recovery. It MUST NOT delete an
ambiguous lease automatically.

Stale reclamation requires all of the following:

1. `heartbeatAt` is older than the configured stale threshold;
2. process liveness checking is unavailable or reports that `ownerProcessId` is not
   currently live for this service host;
3. the membership ledger replays without malformed JSONL, duplicate/non-monotonic
   sequence, or artifact-hash mismatch;
4. the reclaiming writer records a non-authoritative lease recovery report outside
   `context-sheet-membership-ledger.jsonl`.

Lease recovery reports are diagnostic artifacts only. They MUST NOT be used as
membership authority, schema custody, current-use truth, or semantic evidence.

## 6. Projection Boundary

Any SQLite tables, caches, indexes, graph edges, dossier inputs, or UI lists derived
from this ledger are disposable membership projections. They may be rebuilt only from
the ledger plus the exact referenced catalog and Context Sheet authority.

No projection may:

- append a membership artifact;
- repair a missing ledger entry;
- infer a missing source, anchor, claim, jurisdiction, or predecessor;
- select one conflicting successor merely because it was written later;
- convert a nomination, score, or graph edge into an accepted link.

## 7. Replay And Reconciliation

The Membership Link service replays membership authority only after replay can resolve
the prerequisite catalog and Context Sheet authority. Its deterministic order is:

```text
1. exact governed Memory Catalog records and lifecycle
2. exact Context Sheet anchors and lifecycle
3. membership-ledger NOMINATE entries
4. membership-ledger VALIDATE entries
5. membership-ledger LINK entries
6. membership-ledger SUCCEED entries
7. membership-ledger IMPACT_DECIDE entries
8. membership-ledger RECONCILE entries
9. disposable membership projections, indexes, dossier inputs, and UI views
```

Replay validates each entry using its recorded schema, contract, and policy version,
recomputes its artifact hash, and preserves the recorded ledger sequence. It produces
the same current-use result only when required exact custody is present and valid.

Reconciliation may rebuild a disposable projection or complete a verified idempotent
effect already represented by an intact ledger entry. It MUST NOT append substitute
membership authority, repair a damaged link, or infer missing authority from a
projection.

## 8. Failure, Quarantine, And Recovery

The following fail closed for the affected scope or artifact:

- malformed JSONL, duplicate or non-monotonic sequence, or artifact-hash mismatch;
- unknown ledger/schema/operation version;
- idempotency collision;
- missing exact catalog, Context Sheet, nomination, validation, link, or structural
  event custody;
- broken successor or merge/split lineage;
- projection that disagrees with replayed authority.
- malformed, missing, future-dated, or ambiguous membership-ledger write lease
  metadata.

The service MUST preserve the ledger bytes and all referenced authority. It may expose
a quarantine/reconciliation result and rebuild only disposable projections. Unaffected
scopes and independently replayable artifacts remain available.

No recovery path may truncate, rewrite, compact, silently skip, or reverse-copy the
membership ledger. A new corrective action requires a later lawful ledger artifact.

## 9. Coexistence And Migration

This is a new Phase X authority domain. It MUST NOT alter, dual-write, rename, or
reinterpret existing interpretive, publication, catalog, or Context Sheet ledgers.

Historical association data remains outside this ledger until a separately authorized
migration contract classifies its source custody and explicitly records each lawful
membership artifact. Absence from the new ledger is not evidence that a legacy
association is false, current, or safe to use.

## 10. Required Runtime Proof Before Implementation Closure

1. A structurally valid nomination appends exactly once and survives service restart.
2. Same idempotency identity and same artifact returns the original entry without a
   second append.
3. Same idempotency identity with different immutable content refuses without append.
4. A malformed or hash-mismatched entry quarantines the affected replay scope and does
   not mutate source authority.
5. The interpretive and DNM publication ledgers remain byte-identical after membership
   intake and replay.
6. Replay reconstructs nomination, validation, link, successor, impact, and current-use
   state from membership authority, not from a projection.
7. Missing catalog or Context Sheet custody cannot be repaired from a graph, dossier,
   database row, or UI state.
8. Rebuilding a damaged membership projection does not append a new authority entry.

## 11. Stop Boundary

This contract does not authorize:

- creation of the ledger, routes, writers, tables, migrations, or projections;
- automatic nomination or semantic validation;
- catalog, Context Sheet, dossier, governance, or publication mutation;
- migration of historical associations;
- UI changes.

Each requires a separately authorized slice with the proof named above.

## 12. Status

Runtime persistence and replay ownership are **ENTERED**. Production behavior remains
unchanged.
