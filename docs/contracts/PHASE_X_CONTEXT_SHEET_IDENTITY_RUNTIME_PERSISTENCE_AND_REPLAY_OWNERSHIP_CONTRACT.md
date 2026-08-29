# Phase X: Context Sheet Identity Runtime Persistence And Replay Ownership Contract

**Version:** 0.2.0
**Status:** ENTERED - runtime persistence, replay ownership, failure boundaries, and
the bounded read-only creation-identity resolver are normative; additional writers,
routes, migrations, projections, and UI remain unauthorized.
**Parent:** `PHASE_X_CONTEXT_SHEET_ANCHOR_IDENTITY_AND_LIFECYCLE_CONTRACT.md`

## 1. Problem

The Context-Sheet Anchor Identity and Lifecycle contract assigns sheet creation, alias
history, anchor resolution, merge, split, redirect, retirement, restoration, replay, and
reconciliation to the server-side Context Sheet Identity service. It explicitly leaves
schemas, tables, APIs, services, migrations, and event ledgers unauthorized.

The Membership Link runtime contract now requires exact persisted Context Sheet
merge/split custody before `IMPACT_DECIDE` can lawfully append a membership impact
decision. No durable Context Sheet lifecycle authority store currently exists for that
reference to resolve against.

Reusing the Membership Link ledger would make identity lifecycle an effect of
membership organization. Reusing interpretive governance or publication ledgers would
merge sheet identity authority with unrelated proposal, disposition, or publication
authority. A mutable projection, graph edge, title table, or UI state would make replay
unable to distinguish lawful identity lifecycle from derived convenience state.

This contract establishes the durable Context Sheet Identity authority ledger and replay
ownership boundary before any runtime writer or route exists.

## 2. Governing Authority

The Context-Sheet Anchor Identity and Lifecycle contract remains the authority for
sheet identity, type-specific anchor bases, unresolved state, aliases, resolution,
merge, split, redirect, retirement, restoration, concurrency, replay, and ordinary
clarity boundaries.

Existing authority domains retain their jurisdiction:

- Memory Catalog authority owns governed event identity, citations, and lifecycle;
- `context-sheet-membership-ledger.jsonl` owns membership nomination, validation, link,
  successor, impact, and reconciliation artifacts only;
- `interpretive-governance-ledger.jsonl` owns interpretive proposal, review, and
  disposition history;
- `dnm-publication-ledger.jsonl` owns continuity publication lifecycle;
- dossier authority owns accepted claim graphs and rendered dossier revisions.

The Context Sheet Identity ledger owns only the durable record of lawful Context Sheet
identity and lifecycle artifacts and their service-local ordering. It does not own
source meaning, catalog event truth, membership relationship authority, dossier
synthesis, publication, retrieval scoring, or UI organization.

## 3. Durable Store And Lifecycle Owner

For each authenticated Shardwright storage root, the authoritative Context Sheet
Identity store is:

```text
<shardwright-storage-root>/context-sheet-identity-ledger.jsonl
```

The server-side **Context Sheet Identity service** is the sole writer and replay owner
for this ledger. Browser code, models, retrieval, RAG indexes, UI state, direct database
editing, membership code, and dossier code MUST NOT append or rewrite it.

The ledger is append-only. Each accepted line is one immutable canonical ledger entry.
Most operations append one artifact. Sheet creation is explicitly two linked entries:
one immutable `context-sheet-record-v1` entry and one `context-sheet-creation-event-v1`
entry that references that exact record. No other operation may use an implicit bundle
or mixed one-artifact/two-artifact model.

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

`artifact` is the exact schema-bound Context Sheet identity or lifecycle artifact.
`artifactHash` is the hash of that canonical artifact payload. `sequence` is a strictly
increasing positive integer within this ledger. The entry does not embed or copy catalog,
membership, governance, publication, or dossier records: those remain exact references
inside the artifact.

## 4. Lawful Operations

Initial allowed operations are closed:

| Operation | Stored artifact | Authority limited to |
| --- | --- | --- |
| `CREATE_RECORD` | `context-sheet-record-v1` | immutable sheet record and initial anchor basis |
| `CREATE_EVENT` | `context-sheet-creation-event-v1` | server-owned creation event that references the exact sheet record |
| `ALIAS` | `context-sheet-alias-event-v1` | attributable alias or title history |
| `RESOLVE` | `context-sheet-anchor-resolution-event-v1` | governed transition from unresolved lead to canonical anchor, or merge-review routing |
| `MERGE` | `context-sheet-merge-event-v1` | governed assertion that two or more sheets share one canonical anchor |
| `SPLIT` | `context-sheet-split-event-v1` | governed partition of an overbroad sheet into distinct anchors or jurisdictions |
| `REDIRECT` | `context-sheet-redirect-v1` | lookup consequence of a lawful lifecycle event |
| `RETIRE` | `context-sheet-retirement-event-v1` | removal from ordinary active organization without deletion or identity denial |
| `RESTORE` | `context-sheet-restoration-event-v1` | restoration from retirement after revalidation |
| `RECONCILE` | `context-sheet-reconciliation-result-v1` | diagnostic rebuild/quarantine result only |

An unknown operation, artifact class, schema identity, or schema version MUST refuse
before append. The ledger MAY store a valid refusal/defer/quarantine artifact where its
governing schema allows it; it MUST NOT manufacture an accepted artifact to explain a
failure.

## 5. Minimum Unblocking Path

Implementation MUST proceed incrementally. The first lawful runtime slice is only:

```text
CREATE_RECORD + CREATE_EVENT admission and fresh-process read-back
```

That slice proves the ledger exists, the Context Sheet Identity service owns both
creation writes, and a created sheet can be reconstructed from durable authority rather
than a projection. The creation request is exact-once only when both linked entries are
already present with the same canonical content hashes; a partial pair quarantines the
affected scope and MUST NOT be silently repaired by appending the missing half.

Only after creation custody is proven may a later slice implement:

```text
MERGE and SPLIT lifecycle-event admission and replay
```

Only after exact merge/split custody is proven may Membership Link `IMPACT_DECIDE`
resume. `IMPACT_DECIDE` MUST bind an exact `context-sheet-merge-event-v1` or
`context-sheet-split-event-v1` ledger entry by hash; it MUST NOT bind a schema-shaped
placeholder, lifecycle projection, graph edge, title change, or UI state.

### 5.1 Bounded Creation-Identity Read

The Identity service MAY expose one read-only resolver for an exact Context Sheet
creation record:

```text
GET /context-sheet-identity/:contextSheetId?memoryScopeId=<scope-id>
```

The resolver MUST require the exact `contextSheetId` and `memoryScopeId`, read only
from the Context Sheet Identity ledger, and return the immutable creation-record
fields already admitted by `context-sheet-record-v1`. It MAY include an explicit
`lifecycleCoverage: CREATION_RECORD_ONLY` marker so consumers cannot mistake the
result for a complete current-lifecycle projection.

Unknown or scope-mismatched identity MUST refuse without mutation. Malformed,
hash-invalid, or otherwise unreplayable Identity ledger custody MUST fail closed using
the existing Identity replay errors. The resolver MUST NOT infer a title, alias,
identity, lifecycle state, redirect, merge, split, retirement, or restoration from
membership links, catalog records, graph state, database rows, or UI state.

This slice does not authorize alias/title-history resolution, complete lifecycle
projection, catalog-record summary resolution, or ordinary UI behavior. Those require
their own bounded contracts and proofs.

## 6. Write Admission And Idempotency

Before append, the Context Sheet Identity service MUST:

1. authenticate and resolve the Shardwright storage root;
2. validate the artifact against its recorded canonical schema, contract, and policy
   version;
3. verify every required exact reference is structurally complete;
4. enforce the operation-to-schema mapping above;
5. calculate the canonical artifact hash independently from the request
   idempotency key;
6. acquire the Context Sheet identity-ledger write lease or equivalent exclusive append
   guard;
7. recheck the idempotency identity under that guard;
8. append one canonical entry and durably flush it before returning success.

The request idempotency key identifies one attempted operation within one scope. It is
not the artifact content hash. The canonical artifact content is hashed independently.

The request collision key binds at least:

```text
scopeId
operation
artifactSchemaId
idempotencyKey
```

On an existing request collision key, the implementation compares the canonical
artifact hash and any other required content identity fields against the stored entry.
Same key plus same content returns the original entry and MUST NOT append a second
effect. Same key plus different content refuses as an idempotency collision.
Concurrent different lawful lifecycle decisions remain distinct explicit events;
storage order does not select a semantic winner.

For the two-entry creation request, the same request key binds the exact
`CREATE_RECORD` and `CREATE_EVENT` pair. A repeat returns the original pair only when
both entries and both canonical artifact hashes match.

Structural reference completeness is not semantic validation. A valid write proves only
that the artifact was lawfully admitted to the Context Sheet Identity ledger; it does
not prove catalog truth, membership validity, dossier meaning, retrieval relevance, or
ordinary UI readiness.

## 7. Projection Boundary

Any SQLite tables, caches, indexes, graph edges, lookup maps, lifecycle projections,
dossier inputs, or UI lists derived from this ledger are disposable Context Sheet
Identity projections. They may be rebuilt only from the ledger plus exact prerequisite
authority.

No projection may:

- append a Context Sheet identity or lifecycle artifact;
- repair a missing ledger entry;
- infer a missing creation, alias, resolution, merge, split, redirect, retirement, or
  restoration event;
- establish identity from title, name, avatar, similarity, embedding distance,
  co-occurrence, membership links, dossier prose, graph proximity, or operator
  convenience;
- select a lifecycle winner merely because one projection currently points there;
- convert a model nomination, search result, cluster, or graph edge into resolved
  identity.

## 8. Replay And Reconciliation

The Context Sheet Identity service replays identity authority only after replay can
resolve prerequisite host/account bindings, governed entity identity records, and exact
Memory Catalog records needed by the artifacts being replayed.

Context Sheet ledger effects are applied in ascending ledger `sequence`. The operation
classes below describe prerequisite phases, not permission to reorder ledger entries
inside the Context Sheet Identity ledger:

```text
1. canonical host/account and governed entity identities
2. exact governed Memory Catalog records and lifecycle
3. Context Sheet CREATE_RECORD and CREATE_EVENT entries
4. Context Sheet ALIAS entries
5. Context Sheet RESOLVE entries
6. Context Sheet MERGE, SPLIT, REDIRECT, RETIRE, and RESTORE entries
7. Context Sheet RECONCILE entries
8. disposable Context Sheet projections, indexes, dossier inputs, and UI views
```

Prerequisites may delay an entry until its required authority is available. Among
entries eligible for application, ascending ledger sequence is the effect-order
tie-breaker. Ledger sequence governs replayed effect order, not merely stored metadata.

Replay validates each entry using its recorded schema, contract, and policy version,
recomputes its artifact hash, and preserves the recorded ledger sequence. It produces
the same anchor graph, lifecycle state, redirect graph, split partitions, and
deduplication state only when required exact custody is present and valid.

Reconciliation may rebuild a disposable projection or complete a verified idempotent
effect already represented by an intact ledger entry. It MUST NOT append substitute
identity authority, repair a damaged lifecycle event, infer missing authority from a
projection, or use membership links to decide sheet identity.

## 9. Failure, Quarantine, And Recovery

The following fail closed for the affected scope, sheet, or artifact:

- malformed JSONL, duplicate or non-monotonic sequence, or artifact-hash mismatch;
- unknown ledger/schema/operation version;
- idempotency collision;
- missing exact host, entity, catalog, sheet, alias, resolution, merge, split,
  redirect, retirement, restoration, or authority-basis custody;
- unresolved or conflicting canonical anchors where a resolved anchor is required;
- cross-scope, type, or jurisdiction mismatch;
- stale source revisions;
- redirect, merge, or split cycles;
- incomplete merge impact or split partition manifest;
- projection that disagrees with replayed authority.

The service MUST preserve the ledger bytes and all referenced authority. It may expose a
quarantine/reconciliation result and rebuild only disposable projections. Unaffected
scopes and independently replayable artifacts remain available.

Malformed ledger-line recovery has two cases:

1. If trusted framing or metadata can unambiguously associate the malformed record with
   a valid `scopeId`, sheet, or sequence without skipping bytes, guessing record
   boundaries, or relying on corrupted ordering, the service may quarantine that
   affected record or scope under the existing recovery model.
2. If the affected scope cannot be established without skipping bytes, guessing
   boundaries, or trusting corrupted ordering, the entire Context Sheet Identity ledger
   MUST fail closed. Replay MUST NOT continue past the malformed data.

No recovery path may truncate, rewrite, compact, silently skip, or reverse-copy the
Context Sheet Identity ledger. A new corrective action requires a later lawful ledger
artifact.

## 10. Coexistence And Migration

This is a new Phase X authority domain. It MUST NOT alter, dual-write, rename, or
reinterpret existing interpretive, publication, catalog, membership, or dossier
authority stores.

Historical sheet-like labels, lorebook groupings, tags, search clusters, or UI folders
remain outside this ledger until a separately authorized migration contract classifies
their source custody and explicitly records each lawful Context Sheet artifact. Absence
from the new ledger is not evidence that a legacy grouping is false, current, or safe to
use.

## 11. Required Runtime Proof Before Implementation Closure

1. A structurally valid `CREATE_RECORD` + `CREATE_EVENT` creation pair appends exactly
   once and survives service restart.
2. Same request idempotency key and same creation pair returns the original entries
   without a second append.
3. Same request idempotency key with different immutable content refuses without
   append.
4. A malformed or hash-mismatched entry quarantines the affected replay scope and does
   not mutate source authority.
5. The interpretive, publication, catalog, membership, and dossier authority stores
   remain byte-identical after Context Sheet identity intake and replay.
6. Replay reconstructs created sheets from Context Sheet identity authority, not from a
   projection.
7. Lawful merge preserves source sheets, creates exact redirect custody, and leaves
   membership links historical rather than rewritten in place.
8. Lawful split partitions aliases, membership links, and dossier claims or leaves them
   explicitly unresolved; it does not copy all evidence to every target.
9. Similarity-only merge refuses without append.
10. Merge or split with stale sheet revisions refuses without partial mutation.
11. Redirect and lifecycle cycles refuse without partial mutation.
12. Missing Context Sheet lifecycle custody cannot be repaired from membership links,
    graph edges, dossiers, database rows, titles, or UI state.
13. Rebuilding a damaged Context Sheet projection does not append a new authority entry.
14. Membership `IMPACT_DECIDE` can resolve an exact persisted merge/split event only
    after the Context Sheet Identity ledger proves that event custody.

## 12. Stop Boundary

This contract does not authorize:

- creation of the ledger, additional routes, writers, tables, migrations, or
  projections beyond the bounded creation-identity read in Section 5.1;
- model prompts, thresholds, automatic matching, or cluster-based identity decisions;
- entity-resolution implementation outside exact referenced authority;
- Memory Catalog, Membership Link, dossier, governance, or publication mutation;
- migration of historical sheet-like groupings;
- UI changes.

Each requires a separately authorized slice with the proof named above.

## 13. Status

Context Sheet Identity runtime persistence and replay ownership are **ENTERED**.
Production behavior remains unchanged.
