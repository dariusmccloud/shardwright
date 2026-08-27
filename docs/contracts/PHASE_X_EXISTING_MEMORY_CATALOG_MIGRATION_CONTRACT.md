# Phase X: Existing Memory Catalog Migration Contract

**Version:** 0.1.0
**Status:** ENTERED — inventory, classification, additive registration, citation,
cutover, rollback, replay, quarantine, and proof boundaries are normative; migration
implementation and execution remain unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 1. Problem

The existing implementation contains governed proposals, review history, published DNM
records, lifecycle events, saved shards, evidence envelopes, architectural authority,
operational projections, and RAG projections. The new Memory Catalog architecture must
adopt lawful existing memory without:

- treating every persisted artifact as equal authority;
- republishing or redisposing old records;
- changing existing identities or hashes;
- turning open proposals or shards into governed memory;
- converting structural authority into interpretive continuity;
- creating duplicate catalog records or citations on rerun;
- losing withdrawn, superseded, disputed, or historical records;
- inventing evidence for older records;
- changing the current active memory as a side effect;
- making rollback or downgrade appear safe when it is not.

## 2. Migration Law

```text
Migration preserves authority.
Migration does not create authority.

Migration registers lawful governed artifacts.
Migration does not reinterpret legacy content.

Migration is additive.
Original portable ledgers remain immutable and replayable.
```

The target result is equivalent operator-visible truth plus new catalog capability.

## 3. Authority Gate

### Governing contracts

- Existing portability and upgrade contracts govern source artifacts, replay domains,
  additive migration, rollback, and fail-closed recovery.
- Existing governance and DNM lifecycle contracts govern proposal, disposition,
  publication, supersession, withdrawal, contest, and delta truth.
- The Memory Catalog contract governs registration and citation.
- Context-sheet, membership, dossier, and active-continuity contracts govern later
  derived layers.
- This contract governs classification and custody transfer into the catalog
  architecture.

### Authoritative sources

```text
Canonical chat and source records
  source truth

interpretive-governance-ledger.jsonl
  proposal, review, disposition, delegation, and synthesis authority

dnm-publication-ledger.jsonl
  publication, supersession, withdrawal, and delta lifecycle authority

promotions/promotion-journal.jsonl
  structural promotion authority in its separate jurisdiction

catalog migration events
  registration and citation effects only
```

SQLite, snapshots, caches, rendered shards, vector collections, graph state, and UI
state remain projections or evidence artifacts according to their existing contracts.

### Projection boundary

Migration inventories and reports, proposed mappings, dry-run results, progress,
estimated counts, display titles, inferred context sheets, dossier drafts, and vector
matches do not create authority.

### Lifecycle owner

The server-side Migration Coordinator owns:

```text
exclusive migration lease
authority watermark
inventory
classification
dependency validation
dry run
idempotent catalog registration
citation allocation
projection rebuild
cutover
verification
rollback eligibility
audit and reconciliation
```

Existing services continue to own their original ledgers and records.

### Failure behavior

- Missing or malformed authority refuses the affected domain.
- Hash or identity conflict quarantines the record.
- Incomplete source custody blocks active projection for affected material.
- Unknown artifact classification remains preserved and unmigrated.
- Partial commit remains resumable or roll-backable according to the migration phase.
- No failure deletes or mutates original portable ledgers.

## 4. Migration Unit And Watermark

One migration run binds:

```text
migrationRunId
host and storage-root identity
source data-version profile
target contract and schema profile
memory scopes included
governance-ledger identity and frozen watermark
publication-ledger identity and frozen watermark
promotion-ledger identity and frozen watermark when inventoried
canonical source corpus snapshot or stable revision boundary
migration policy version
code artifact identity
startedAt
```

The watermark closes the migration input. Events appended after it are processed by
normal compatible ingestion or a successor catch-up run; they cannot appear
opportunistically during the frozen run.

## 5. Artifact Classification

Every discovered artifact receives exactly one migration class:

```text
REGISTER_CATALOG
Lawful published continuity with complete portable authority.

PRESERVE_GOVERNANCE_ONLY
Governed proposal, review, disposition, or other governance history that is not an
eligible catalog memory.

PRESERVE_EVIDENCE_ONLY
Canonical source, shard, envelope, observation, or finding that supports discovery or
governance but is not memory authority.

PRESERVE_SEPARATE_AUTHORITY
Structural or other authority governed outside interpretive continuity.

REBUILD_PROJECTION
Disposable operational, retrieval, graph, index, or UI projection.

DEFER_FUTURE_ADMISSION
Potentially useful governed artifact whose catalog-admission event kind is not yet
contracted.

QUARANTINE
Artifact whose claimed authority, identity, evidence, scope, hash, or lineage cannot be
validated.

IGNORE_EPHEMERAL
Lock, temp, cache, or other nonsemantic runtime artifact.
```

Classification is code-owned and recorded with exact reason and source.

## 6. Required Existing-Artifact Mapping

| Existing artifact | Migration class | Required treatment |
|---|---|---|
| Valid published DNM record and lifecycle | `REGISTER_CATALOG` | Register once from exact portable ledger custody |
| Superseded published DNM | `REGISTER_CATALOG` | Preserve citation, historical state, and successor lineage |
| Withdrawn published DNM | `REGISTER_CATALOG` | Preserve historical publication and dormant state |
| Delta-pending published DNM | `REGISTER_CATALOG` | Preserve current lifecycle without inventing replacement |
| Contest-reopened published DNM | `REGISTER_CATALOG` | Preserve contest and activation consequence from governing policy |
| Open, rejected, deferred, or revised proposal | `PRESERVE_GOVERNANCE_ONLY` | Remain in governance lifecycle; no catalog registration |
| Subject disposition, delegation, qualification, authorization | `PRESERVE_GOVERNANCE_ONLY` | Preserve exact authority history and bindings |
| Canonical chat messages and source records | `PRESERVE_EVIDENCE_ONLY` | Keep exact addressability and revisions |
| Narrative or architectural shards | `PRESERVE_EVIDENCE_ONLY` unless separately governed | Do not promote from rendered content |
| Evidence envelopes, findings, manifests | `PRESERVE_EVIDENCE_ONLY` | Retain exact bindings and inspectability |
| Structural decisions and promotion records | `PRESERVE_SEPARATE_AUTHORITY` | Keep structural jurisdiction; do not convert to DNM |
| SQLite operational rows | `REBUILD_PROJECTION` | Validate against ledgers, then rebuild |
| Vector chunks and collections | `REBUILD_PROJECTION` | Recreate only from newly eligible sources |
| Existing UI state and caches | `IGNORE_EPHEMERAL` | Do not use as semantic migration input |
| Governed dormant artifact without contracted catalog event | `DEFER_FUTURE_ADMISSION` | Preserve; no invented registration |
| Orphaned or hash-conflicting record | `QUARANTINE` | Preserve and explain; exclude from active projection |

## 7. Preflight Inventory

Before any write, preflight records:

- every required ledger and version;
- byte length, event count, and integrity hash;
- every stable cross-stream identity;
- memory scopes and subjects;
- every published DNM record and lifecycle state;
- every current-active answer by continuity target;
- every proposal and disposition state;
- source and evidence resolvability;
- operational rows without portable authority;
- duplicate or conflicting identities;
- unsupported event or schema versions;
- projected registration, citation, quarantine, and deferral counts.

Preflight outcome:

```text
READY
READY_WITH_QUARANTINE
BLOCKED_UNSUPPORTED_VERSION
BLOCKED_MISSING_AUTHORITY
BLOCKED_INTEGRITY
BLOCKED_SCOPE
```

`READY_WITH_QUARANTINE` is allowed only when quarantined material is not required to
derive another record's lawful active state.

## 8. Dry Run

Dry run performs complete classification and derives proposed effects without appending
authority events.

It produces:

```text
source artifact -> class -> reason
published DNM -> catalog registration key
catalog identity proposal or deterministic allocation input
citation namespace and proposed ordinal
lifecycle projection
current-active comparison
quarantine and deferral records
projection rebuild plan
cutover eligibility
```

Dry run must prove:

```text
before current active answer
=
after proposed current active answer
```

Any unexplained difference blocks commit.

## 9. Catalog Registration

For each `REGISTER_CATALOG` artifact:

1. replay exact governance and publication authority;
2. validate stable cross-stream references;
3. validate source/evidence custody required by the original contract;
4. compute the catalog registration key;
5. converge on an existing catalog record or append one
   `MEMORY_CATALOG_REGISTERED` event;
6. allocate one citation under Section 10;
7. project lifecycle from original authority;
8. record migration disposition.

Migration does not append a new publication, disposition, supersession, withdrawal,
contest, or delta event.

The catalog registration records:

```text
migrationRunId
source ledger and event identities
original DNM record identity
original interpretation and revision identities
original evidence and authority hashes
registration policy and target contract
migration classification identity
```

## 10. Citation Allocation

Migration creates or selects one namespace per catalog jurisdiction according to the
Catalog contract.

Existing records receive citations in deterministic order:

```text
1. authoritative publication ledger sequence
2. published-at time
3. stable DNM record identity
```

Ledger sequence is primary when available. Ties use stable identity, never database row
order or discovery order.

Rules:

- one migrated catalog record receives one primary citation;
- rerun returns the same citation;
- failed allocations are never recycled;
- new post-watermark records allocate after committed migrated ordinals;
- existing human references, if any, retain their origin namespace and are not silently
  rewritten as new `[M#]` authority.

## 11. Lifecycle Preservation

Migration must preserve these truths exactly:

```text
publication state
ACTIVE / SUPERSEDED / WITHDRAWN / CONTEST_REOPENED / DELTA_PENDING
current-active record by target
supersession lineage
withdrawal history
contest and delta state
historical approval
next lawful action
```

Catalog facets are derived after replay. Migration cannot convert:

- withdrawn into never published;
- superseded into deleted;
- delta pending into replacement;
- contested into automatically inactive;
- rejected replacement into current;
- newest timestamp into precedence.

## 12. Evidence And Source Custody

Migration preserves original evidence requirements.

If exact evidence remains valid:

```text
source verified
-> catalog registration may proceed
-> active projection follows original lifecycle
```

If a published record exists but a required source is unavailable, stale, or
hash-conflicting:

```text
publication history remains preserved
catalog registration may be quarantined or registered as custody-blocked according to
the implementing child schema
active projection must fail closed for the affected claim
ordinary UI explains the missing custody and lawful recovery
```

Migration cannot create a modern evidence preview from generated statement text and
call it original evidence.

Older records that satisfy original authority but lack a newer optional display field
may receive a deterministic readable projection only when that projection introduces
no semantic claim and retains exact source binding.

## 13. Governance-Only Records

Open, rejected, deferred, superseded proposal revisions and their review history remain
available through the existing governance system.

They do not receive Memory Catalog citations merely because migration enumerates them.

If an open lawful proposal is later published:

```text
normal publication event
-> normal catalog registration
```

Migration must not automatically approve, reject, reopen, retire, or publish pending
work.

## 14. Structural Authority Isolation

Structural authority remains separate:

```text
structural decisions and live generations
!=
interpretive continuity catalog
```

Promotion journals and structural records are inventoried and preserved under their
existing owner. They may later serve as eligible governed evidence or receive a
separately contracted catalog record kind. Migration does not convert them into
interpretive DNM records or context-sheet claims.

Shared storage, hashes, subjects, or titles do not merge jurisdictions.

## 15. Context-Sheet And Dossier Posture

Catalog migration is authoritative. Context-sheet and dossier formation remain derived
successor work.

Migration may produce non-authoritative work nominations:

```text
possible known-entity sheet seed
possible topic or project sheet
possible catalog membership link
possible initial dossier basis
```

It cannot automatically accept a sheet identity, membership link, motif, or synthetic
dossier claim unless the corresponding child contract's exact validation and
governance requirements are implemented and separately authorized.

Existing rendered shards or summaries may inform nominations. They cannot become an
accepted dossier merely because their prose resembles the desired output.

## 16. Commit Phases

```text
M0 INVENTORY
Read-only authority inventory and compatibility decision.

M1 DRY_RUN
Complete proposed classification, registration, citation, lifecycle, and comparison.

M2 PREPARE
Acquire exclusive lease, persist migration manifest, prepare additive target stores.

M3 REGISTER
Append idempotent catalog registration and citation events.

M4 REBUILD
Build catalog, lifecycle, and search projections from portable authority.

M5 VERIFY
Compare identities, counts, current-active truth, lineage, citations, and operator
states.

M6 CUTOVER
Atomically select the verified new projection profile.

M7 COMPLETE
Record immutable completion and release the migration lease.
```

Each phase is restartable. Repeated execution converges on the same effects.

## 17. Concurrency And Catch-Up

Migration acquires an exclusive semantic migration lease for commit phases.

Permitted post-watermark events are:

- blocked during a short cutover window; or
- appended to original portable ledgers and processed through a declared catch-up
  boundary after base registration.

They must not be dual-written speculatively to old and new authority paths.

Catch-up binds:

```text
base migration watermark
successor ledger range
normal governing event semantics
catalog registration results
new final watermark
```

## 18. Verification And Cutover

Cutover requires:

- every in-scope artifact classified;
- every eligible record registered once;
- every citation assigned once;
- no unexplained current-active change;
- exact lifecycle and lineage equivalence;
- all quarantine and deferral visible;
- rebuilt projections reproducible;
- source and evidence state truthfully preserved;
- no original authority mutation;
- restart from portable state reproduces the verified result.

The cutover pointer is host metadata, not authority. If it points to an unverified
projection, startup refuses.

## 19. Rollback And Downgrade

### Before new post-cutover authority

Rollback may:

1. stop the new runtime;
2. restore the matching pre-cutover operational projection;
3. retain original portable ledgers and canonical sources;
4. clear only disposable cutover metadata;
5. preserve migration audit and any allocated catalog events as an inactive,
   non-selected additive stream according to implementation policy.

### After new Phase X authority events

An older runtime that cannot interpret new catalog, sheet, link, dossier, activation,
or precedence events must refuse.

Best-effort downgrade is prohibited.

Rollback never:

- deletes newer portable events;
- truncates ledgers;
- restores SQLite without matching ledgers;
- reuses citation ordinals;
- pretends newer governed actions never happened.

Forward recovery or a separately contracted reverse migration is required.

## 20. Quarantine

Every quarantined item records:

```text
artifact identity and location
claimed authority class
exact failure
affected scope, subject, target, and dependents
whether active continuity is blocked
preserved original hashes
lawful recovery options
migration run and time
```

Ordinary language:

```text
Memory preserved but unavailable
The system could not verify its original evidence binding.
Next: Locate the original source or restore the matching backup.
```

Quarantine is not deletion, rejection, withdrawal, or correction.

## 21. Replay And Reconciliation

Replay order:

```text
1. canonical sources
2. interpretive governance ledger
3. DNM publication ledger
4. structural promotion journal in its separate domain
5. migration classification and catalog registration events
6. citation allocation events
7. catalog lifecycle projection
8. later context-sheet, link, dossier, activation, and assembly events
9. disposable indexes and retrieval projections
```

Reconciliation detects:

- eligible published DNM without catalog registration;
- duplicate registration or citation;
- conflicting original and migrated bindings;
- unmapped lifecycle events;
- catalog current-active drift;
- missing source or evidence;
- orphaned operational rows;
- unexpected cross-jurisdiction conversion;
- projection records not reproducible from authority.

Only missing idempotent effects with complete authority may be completed automatically.

## 22. Migration Report

The immutable completion report records:

```text
source and target profiles
watermarks
artifact counts by class
catalog registrations
citations and namespace
lifecycle counts and current-active comparisons
governance-only and evidence-only counts
separate-authority counts
projection rebuilds
deferrals and quarantines
all refusals
verification commands and results
cutover identity and time
rollback posture
```

The ordinary summary states what moved, what did not, what needs attention, and whether
current continuity changed.

## 23. Normative Requirements

### MIG-LAW-001 — Migration creates no authority

Migration MUST preserve and register existing authority and MUST NOT publish, approve,
dispose, supersede, withdraw, correct, or reinterpret legacy material.

### MIG-WAT-001 — Input is frozen

Every run MUST bind exact ledger and source watermarks. Post-watermark events MUST use a
declared catch-up boundary.

### MIG-CLS-001 — Every artifact is classified

Every discovered artifact MUST receive exactly one class from Section 5 with exact
reason and source.

### MIG-CLS-002 — Authority classes remain distinct

Governance, evidence, structural authority, catalog memory, projections, and ephemeral
state MUST NOT be collapsed during migration.

### MIG-MAP-001 — Published continuity registers

Every valid in-scope published DNM record MUST converge on one catalog record while
preserving exact original governance and lifecycle custody.

### MIG-MAP-002 — Proposals do not become memory

Open, rejected, deferred, or otherwise unpublished proposals MUST remain governance
records and MUST NOT receive catalog authority through migration.

### MIG-MAP-003 — Shards remain evidence unless governed

Rendered shards, summaries, findings, and source records MUST NOT become catalog or
dossier authority merely because they persist.

### MIG-ISO-001 — Structural authority remains separate

Structural decisions and promotion state MUST remain in their governing jurisdiction
and MUST NOT be converted into interpretive continuity.

### MIG-PRE-001 — Preflight is read-only and complete

Preflight MUST inventory authority, identities, lifecycle, active state, sources,
conflicts, versions, and proposed effects before any migration write.

### MIG-DRY-001 — Dry run predicts exact effects

Dry run MUST produce complete classification, registration, citation, lifecycle,
quarantine, and cutover results without appending authority events.

### MIG-ID-001 — Stable identities do not churn

Interpretation, revision, disposition, policy, qualification, authorization, DNM,
target, source, and evidence identities and hashes MUST remain unchanged.

### MIG-REG-001 — Registration is idempotent

Repeated or concurrent migration MUST produce at most one catalog registration per
eligible governed basis.

### MIG-CIT-001 — Citation allocation is deterministic

Existing records MUST receive stable non-recycled citations in declared ledger and
identity order, and rerun MUST preserve them.

### MIG-LIF-001 — Lifecycle truth is equivalent

Publication, activation, current-active, supersession, withdrawal, contest, delta,
history, and next lawful action MUST remain equivalent before and after migration.

### MIG-EVD-001 — Evidence is not fabricated

Migration MUST NOT substitute generated statements, shards, or dossier prose for
missing canonical evidence.

### MIG-EVD-002 — Custody failure blocks active use

Missing, stale, or conflicting required source custody MUST quarantine or block affected
active projection while preserving historical authority.

### MIG-SHE-001 — Derived formation remains nomination-only

Migration MAY nominate sheet, link, and dossier work but MUST NOT accept derived
identity, membership, motif, or synthetic meaning without its owning contract.

### MIG-PHA-001 — Commit is phased and restartable

Inventory, dry run, prepare, register, rebuild, verify, cutover, and complete phases
MUST be separately recorded and idempotently resumable.

### MIG-CON-001 — Commit has exclusive semantic custody

Commit MUST hold an exclusive migration lease or use a proven equivalent that prevents
untracked authority races.

### MIG-CUT-001 — Cutover requires equivalence

Cutover MUST refuse on unexplained identity, count, lifecycle, active-state, source,
lineage, citation, quarantine, or replay differences.

### MIG-ROL-001 — Rollback is coordinated

Rollback MUST preserve matching ledgers, canonical sources, migration audit, and
non-recycled citations and MUST NOT restore an isolated database.

### MIG-DWN-001 — Unsupported downgrade refuses

An older runtime MUST refuse newer authority state it cannot interpret and MUST NOT
operate by best effort.

### MIG-QUA-001 — Quarantine is visible preservation

Quarantine MUST preserve original artifacts and explain exact failure, impact, and
lawful recovery without implying deletion or rejection.

### MIG-REP-001 — Replay is authority-ordered

Replay MUST reconstruct original authority before migration effects and derived
projections in the order defined by Section 21.

### MIG-REC-001 — Reconciliation cannot invent missing authority

Only idempotent effects backed by complete portable authority MAY be completed
automatically. Projection state MUST NOT repair missing authority.

### MIG-RPT-001 — Completion is auditable

Every completed run MUST preserve the report in Section 22 and prove whether current
continuity changed.

## 24. Required Schema Consequences

Implementation will require separately authorized schemas for:

```text
memory-migration-run-v1
memory-migration-inventory-item-v1
memory-migration-classification-v1
memory-migration-dry-run-result-v1
memory-migration-phase-event-v1
memory-migration-quarantine-record-v1
memory-migration-catch-up-manifest-v1
memory-migration-verification-result-v1
memory-migration-completion-report-v1
```

Schemas must reference original identities rather than copy and rename them.

## 25. Required Proof Before Migration Closure

1. Complete preflight makes no writes.
2. Every known artifact class maps exactly as Section 6 requires.
3. Valid active, superseded, withdrawn, delta-pending, and contested DNM records each
   register once.
4. Open, rejected, and deferred proposals receive no catalog registration.
5. Shards and evidence envelopes do not become memory authority.
6. Structural records remain outside interpretive catalog authority.
7. Dry run and committed results match exactly.
8. Rerun produces no duplicate catalog identity or citation.
9. Citation allocation is identical across supported runtimes and discovery order.
10. Current-active answer is identical before and after cutover.
11. Supersession, withdrawal, contest, delta, and historical lineage remain identical.
12. Missing evidence cannot be reconstructed from published statement text.
13. Custody-conflicted active memory is preserved and blocked, not silently injected.
14. Existing SQLite may be deleted and rebuilt from portable authority plus migration
    events.
15. Vector collections rebuild without authority effect.
16. Crash during each commit phase resumes idempotently.
17. Post-watermark events process exactly once through catch-up.
18. Conflicting registration or citation quarantines without partial mutation.
19. Cutover refuses every unexplained semantic difference.
20. Coordinated pre-new-authority rollback restores prior operator truth.
21. Older runtime refuses after new Phase X authority exists.
22. Restart/replay reconstructs catalog, citations, lifecycle, quarantine, and current
    continuity identically.
23. Ordinary report explains what moved, what did not, what is blocked, and whether
    continuity changed.
24. No migration path requires manual database or ledger editing.

## 26. Stop Boundary

This contract does not authorize:

- migration schemas, code, routes, commands, leases, events, or reports;
- execution against any existing installation;
- catalog registration or citation allocation;
- database, ledger, source, shard, vector, or configuration mutation;
- context-sheet, link, or dossier formation;
- cutover, rollback, or downgrade;
- UI changes.

Each requires separately authorized implementation and proof slices against disposable
copies before any real data.

## 27. Status

Migration inventory, classification, mapping, dry run, registration, citation,
lifecycle preservation, evidence custody, jurisdiction isolation, phased commit,
catch-up, verification, cutover, rollback, downgrade, quarantine, replay, and reporting
boundaries are **ENTERED**.

Production data and behavior are unchanged.
