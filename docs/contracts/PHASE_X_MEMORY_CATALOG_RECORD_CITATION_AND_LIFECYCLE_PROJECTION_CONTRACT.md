# Phase X: Memory Catalog Record, Citation, And Lifecycle Projection Contract

**Version:** 0.1.0
**Status:** ENTERED — catalog identity, citation, lifecycle projection, replay, and
refusal boundaries are normative; schemas and implementation remain unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 1. Problem

The parent architecture establishes that governed events enter an immutable Memory
Catalog and may receive stable human citations such as `[M#]`. It does not yet define:

- what exact governed event can create a catalog record;
- whether the catalog or the existing governance ledgers own lifecycle truth;
- how one governed event maps to one catalog identity;
- how citations remain stable across restart, import, export, and scope collision;
- how historical, corrected, disputed, and unresolved views are derived;
- how stale or incomplete lifecycle custody fails;
- what replay must reconstruct before downstream context-sheet work is safe.

Without those rules, the catalog could become a second publication ledger, silently
renumber memories, duplicate one governed event, or present an attractive but false
lifecycle state.

## 2. Governing Distinctions

```text
Governance event
An authoritative ledger event that admits, publishes, supersedes, withdraws, reopens,
or records pending change for governed meaning.

Catalog record
An immutable registry identity for one governed memory artifact and its exact custody.

Lifecycle projection
A rebuildable answer derived from authoritative governance and publication ledgers.

Human citation locator
A stable, namespaced display handle for referring to one catalog record.

Catalog facet
A derived search or presentation classification such as historical, corrected,
disputed, or unresolved. A facet is not a lifecycle transition.
```

The required hierarchy is:

```text
authoritative governance ledgers
-> immutable catalog record and lineage
-> rebuildable lifecycle projection and facets
-> human citation and ordinary views
```

Neither a catalog row nor a displayed state may manufacture a governance event.

## 3. Authority Gate

### Governing contracts

- Existing interpretive governance contracts govern proposal admission, review,
  publication, and disposition.
- `PHASE_C0_6_4_3_DNM_LIFECYCLE_GOVERNANCE_BRIEF.md` governs the existing portable
  continuity lifecycle.
- The Phase X parent architecture governs the catalog/projection separation.
- This contract governs catalog registration, citation assignment, lifecycle
  derivation, and replay sufficiency.

### Authoritative sources

1. The portable governance ledger owns admitted proposal and disposition truth.
2. The portable DNM publication ledger owns published continuity lifecycle events.
3. Canonical source and evidence records own evidence lineage.
4. Catalog-registration events own the immutable association between a governed
   artifact and a catalog identity.
5. Citation-allocation events own locator assignment inside a namespace.
6. Catalog lifecycle rows, indexes, filters, and UI states are projections.

SQLite and browser state are disposable projections and cannot repair missing portable
authority.

### Projection boundary

The following are derived and non-authoritative:

- catalog lifecycle labels;
- catalog facets;
- current-active lookup indexes;
- citation display formatting;
- search ordering;
- graph membership;
- context-sheet association;
- dossier incorporation state;
- embeddings and retrieval rank.

### Lifecycle owner

```text
Existing governance services
  authoritative admission, publication, supersession, withdrawal, contest, delta

Catalog registrar
  idempotent catalog identity and exact authority bindings

Citation allocator
  namespace creation, monotonic locator allocation, collision-safe import mapping

Catalog projector
  deterministic replay into lifecycle state, facets, current-active indexes, and views
```

### Failure behavior

- Missing governance custody refuses registration.
- Duplicate semantic registration converges on the existing catalog identity.
- Conflicting claimed bindings quarantine registration.
- Missing or malformed authority ledgers fail catalog replay closed.
- Unknown event types or broken lineage quarantine the affected projection.
- Citation conflicts preserve both original identities and require deterministic local
  display disambiguation.
- Projection failure does not mutate or append substitute governance truth.

## 4. Catalog Admission Boundary

A v1 catalog record may be created only for an artifact that has crossed an existing
governance boundary.

The initial eligible bases are:

```text
PUBLISHED_CONTINUITY
A portable `DNM_PUBLISHED` event and its exact governed interpretation revision.

GOVERNED_NONACTIVE
A later child contract may admit a governed but deliberately dormant artifact when it
defines the exact authority event and activation boundary.
```

Only `PUBLISHED_CONTINUITY` is executable under the currently evidenced lifecycle.
`GOVERNED_NONACTIVE` is architecture-compatible but remains closed until a child
contract names its authoritative ledger event.

Capture nominations, accepted observations, clusters, source-verified evidence sets,
draft proposals, pending reviews, model output, operator holds, and subject
attestations do not create catalog records by themselves.

## 5. Catalog Identity And Registration

One governed artifact revision maps to one catalog identity within one catalog
jurisdiction.

The registration basis binds:

```text
catalog jurisdiction and memory scope
governance track
governed artifact kind and immutable identity
exact governed artifact revision
proposal or interpretation revision hash
evidence-set identity and hash
portable authority ledger identity and event identity
publication record identity, when applicable
continuity target
memory subject and materially affected subjects
publication and disposition authority bindings
governing contract and policy versions
registration policy version
```

The registration key is computed from the stable jurisdiction, governed artifact kind,
immutable artifact identity, and exact governed revision. Repeated registration of the
same basis returns the same catalog identity and must not allocate another citation.

If the same artifact identity is presented with different revision, evidence, scope,
subject, target, or authority hashes, registration refuses as a binding conflict. A
lawful successor must arrive through its authoritative lifecycle and receive its own
catalog identity or lineage according to that governing event.

## 6. Minimum Immutable Catalog Record

Each catalog record preserves:

```text
catalogId
catalogJurisdictionId
memoryScopeId
catalogRecordKind
governanceTrack
governedArtifactId
governedArtifactRevisionId
governedArtifactRevisionHash
evidenceSetId
evidenceSetHash
sourceManifestHash
governanceLedgerId
governanceEventId
publicationLedgerId
publicationEventId
publicationRecordId
continuityTargetId
memorySubjectId
materiallyAffectedSubjectIds
authorityBindingIds
governingContractVersions
registrationPolicyVersion
registeredAt
registrationEventId
```

Nullable fields must be explicitly inapplicable under the admitted record kind; they
cannot be silently omitted because authority could not be resolved.

The catalog record does not copy generated dossier prose as authority. It may retain
the exact published statement as a governed payload or reference it through the
publication record, but its custody remains bound to the authoritative revision.

## 7. Catalog Registration Event

Registration is portable and replayable.

The minimum event is:

```text
MEMORY_CATALOG_REGISTERED
```

It binds the complete registration key, catalog identity, governed basis, source and
evidence hashes, authority event identities, registration policy, and occurred-at
time.

The event may be appended only after:

1. the authoritative governance event validates;
2. every required bound record exists at the exact revision;
3. hashes and subjects agree across custody;
4. the registration key is absent or already maps to the same catalog identity;
5. the citation allocation is committed atomically or can be deterministically
   completed during reconciliation.

Browser code and model output cannot append this event.

## 8. Citation Namespace

A citation locator is a human reference, not canonical identity.

Each catalog jurisdiction owns at least one citation namespace:

```text
namespaceId
catalogJurisdictionId
namespaceKind
namespaceVersion
displayPrefix
nextOrdinal
createdAt
retiredAt
```

The default display form may be:

```text
[M1]
[M2]
[M3]
```

The canonical citation binding is:

```text
namespaceId + ordinal -> catalogId
```

Formatting brackets, prefix capitalization, padding, or localized display may change
without changing this binding.

### Allocation rules

1. Ordinals increase monotonically inside one namespace.
2. An allocated ordinal is never recycled, even after withdrawal, corruption repair,
   import reversal, or catalog retirement.
3. One catalog record has at most one primary locator in a namespace.
4. Concurrent allocation must converge without duplicate ordinal assignment.
5. Gaps are lawful and must not be compacted.
6. Citation assignment is immutable; a correction or successor receives its own
   catalog identity and locator when it is a distinct governed record.
7. Display aliases may point to a primary locator but cannot replace its custody.

### Scope

The default namespace boundary is one catalog jurisdiction, normally bounded by the
memory scope and its governing host identity. A later contract may define a broader
portable jurisdiction only with explicit cross-scope authority and collision policy.

## 9. Import, Export, And Collision Handling

Portable export preserves:

```text
origin namespace identity
origin catalog jurisdiction
origin locator ordinal and display
canonical catalog identity
governed custody and hashes
export manifest identity
```

Import never rewrites an origin locator to pretend it originated locally.

If `[M12]` exists in both origin and destination:

```text
Origin citation:
  originNamespaceId + 12

Destination local display mapping:
  a deterministic qualified alias such as [origin:M12]

Destination primary locator:
  allocated only if local policy lawfully registers the imported governed record
```

The exact display syntax remains a UI child decision. The required behavior is that
the two citations remain unambiguous, traceable, and non-destructive.

Identical imported catalog custody may deduplicate to an existing local catalog record
only when canonical artifact identity, revision, scope reconciliation, evidence hashes,
and authority hashes all match under an authorized import policy. Similar text or
matching titles is insufficient.

## 10. Existing Lifecycle Authority

The current portable DNM lifecycle remains:

```text
ACTIVE
The published record currently governs continuity for its target.

SUPERSEDED
A named later published record replaced it through an explicit lifecycle event.

WITHDRAWN
Current continuity endorsement was removed without erasing publication history.

CONTEST_REOPENED
The published record is under governed re-evaluation.

DELTA_PENDING
New evidence exists, but no replacement has been published.
```

The authoritative events include:

```text
DNM_PUBLISHED
DNM_SUPERSEDED
DNM_WITHDRAWN
DNM_DELTA_REVIEW_RECORDED
```

This contract does not rename, replace, or backfill those events from catalog state.

## 11. Catalog Lifecycle Projection

The catalog projector derives a record view from complete portable authority.

The projection keeps independent dimensions:

```text
publicationState
lifecycleState
activationState
historicalState
contestState
deltaState
correctionState
resolutionState
```

No single overloaded label may erase these distinctions.

### Base derivation

```text
Valid DNM_PUBLISHED with lifecycle ACTIVE
-> publicationState PUBLISHED
-> lifecycleState ACTIVE
-> activationState ACTIVE
-> historicalState CURRENT

DNM_SUPERSEDED naming old and replacement
-> old lifecycleState SUPERSEDED
-> old activationState DORMANT
-> old historicalState HISTORICAL
-> exact successor link
-> replacement lifecycleState ACTIVE

DNM_WITHDRAWN
-> lifecycleState WITHDRAWN
-> activationState DORMANT
-> historicalState HISTORICAL
-> no replacement implied

Open governed contest
-> contestState OPEN
-> derived facet DISPUTED
-> activation consequence only as declared by the governing lifecycle policy

Open delta review
-> deltaState PENDING
-> lifecycleState DELTA_PENDING where current contract requires it
-> current active record remains governed until an explicit lifecycle event changes it
```

### Parent catalog facets

The parent terms are derived as follows:

```text
ACTIVE
activationState ACTIVE under complete current lifecycle authority.

HISTORICAL
historicalState HISTORICAL; the record remains truthful history.

CORRECTED
an exact governed correction lineage targets the record or one of its claims.

DISPUTED
an exact governed contest or unresolved contradictory authority record is open.

WITHDRAWN
the authoritative lifecycle is WITHDRAWN.

SUPERSEDED
the authoritative lifecycle is SUPERSEDED with an exact successor.

UNRESOLVED
required projection custody cannot yet produce a complete lawful answer.
```

These facets may coexist. For example, a superseded record is also historical. A
disputed record may remain active if the governing lifecycle explicitly permits that
state. Facets do not themselves activate, withdraw, supersede, or correct anything.

## 12. Current-Active Resolution

The catalog may index the current active record for a continuity target, but the answer
is derived from the portable publication ledger.

Required rules:

1. At most one record may be current active for a target under the existing lifecycle.
2. Supersession changes the answer only through a valid `DNM_SUPERSEDED` event.
3. Withdrawal may produce no current active record.
4. Delta review does not automatically change the current active record.
5. A rejected, refused, or failed replacement does not change the answer.
6. A catalog record lacking complete lifecycle replay cannot become current active.
7. Conflicting active answers fail closed and quarantine that target projection.

## 13. Correction And Successor Lineage

Catalog identity is immutable, but governed meaning may evolve.

The catalog records exact relationships:

```text
SUPERSEDES
CORRECTS
NARROWS
WITHDRAWS
RESTORES_FROM
CONTESTS
DELTA_FOR
```

Every relationship binds:

```text
source catalog record and exact revision
target catalog record and exact revision
authoritative lifecycle or governance event
scope and affected claims when applicable
effective time
authority basis
```

`CORRECTS` means the earlier record or claim was inaccurate. `SUPERSEDES` means a later
record governs current continuity in its declared scope. One must not be inferred from
the other.

The existing lifecycle has direct executable authority for supersession and
withdrawal. Additional correction, narrowing, restoration, or claim-scoped relation
events require their own child contract before production use.

## 14. Reconciliation And Replay

Replay order is:

```text
1. canonical source and evidence custody
2. governance ledger
3. publication ledger and lifecycle events
4. catalog registration events
5. citation namespace and allocation events
6. catalog lifecycle projection and indexes
```

Reconciliation detects:

- governed published records missing catalog registration;
- registration events missing required governance or publication authority;
- one registration key mapped to multiple catalog identities;
- one catalog identity mapped to conflicting bindings;
- missing, duplicate, or conflicting citation allocations;
- unknown lifecycle events;
- broken supersession or withdrawal lineage;
- multiple active records for one target;
- projection rows not reproducible from portable events.

Lawful repair:

```text
Missing registration after valid authority
  append or deterministically complete the idempotent catalog registration.

Missing projection
  rebuild it from portable events.

Missing disposable index
  rebuild it.
```

Prohibited repair:

```text
Missing authority event
  infer it from SQLite, generated prose, UI state, or expected outcome.

Citation collision
  renumber historical origin citations destructively.

Multiple active records
  choose one by timestamp, title, model score, or operator convenience.
```

## 15. Ordinary Projection

The ordinary catalog view may show:

```text
human citation
readable title or bounded statement
subjects
memory type or governance track
current / historical / disputed / changed state
created and effective time
source preview
one lawful next action when action exists
```

It must not imply:

- that `[M#]` is the canonical identity;
- that historical means false or deleted;
- that disputed necessarily means inactive;
- that delta pending means superseded;
- that withdrawal means never approved;
- that catalog presence means current active continuity.

Machine IDs, ledger event IDs, hashes, and reconciliation state remain available in a
technical view.

## 16. Normative Requirements

### CAT-ADM-001 — Governed basis required

A catalog record MUST bind an eligible authoritative governance basis. Capture,
retrieval, clustering, draft synthesis, attestation, or preservation alone MUST NOT
create a catalog record.

### CAT-ADM-002 — Current v1 executable basis is published continuity

Until a governed dormant-admission event is separately contracted, only a valid
portable published-continuity basis MAY create a production catalog record.

### CAT-ID-001 — One basis, one identity

The same jurisdiction, artifact identity, and exact governed revision MUST converge on
one catalog identity under concurrent, repeated, and replayed registration.

### CAT-ID-002 — Binding conflicts refuse

Conflicting scope, subject, revision, evidence, target, or authority hashes for one
registration basis MUST refuse or quarantine and MUST NOT allocate a second identity.

### CAT-REC-001 — Record preserves exact custody

Every catalog record MUST preserve the governed artifact, evidence, source manifest,
authority events, subjects, target, policies, contracts, and registration custody
required by Section 6.

### CAT-EVT-001 — Registration is portable

Catalog registration MUST be represented by a replayable portable event. SQLite and
browser state MUST remain disposable.

### CAT-EVT-002 — Model and browser cannot register

Only the server-side registrar MAY append `MEMORY_CATALOG_REGISTERED` after validating
the complete authority basis.

### CIT-NS-001 — Citation is namespaced

Every human citation MUST bind a namespace, ordinal, and canonical catalog identity.
Display text alone is not a citation identity.

### CIT-ALLOC-001 — Allocation is monotonic and immutable

Citation ordinals MUST increase monotonically, MUST NOT be recycled or compacted, and
MUST converge under concurrency.

### CIT-ALLOC-002 — Registration is citation-idempotent

Repeated registration of the same governed basis MUST return the existing catalog
identity and primary citation without allocating another ordinal.

### CIT-IMP-001 — Imports preserve origin

Import and export MUST preserve origin namespace, locator, catalog identity, custody,
and manifest. Local collision handling MUST be additive and non-destructive.

### CIT-IMP-002 — Text does not deduplicate authority

Imported records MUST NOT deduplicate by statement text, title, embedding similarity,
or matching locator. Deduplication requires matching governed custody under authorized
scope reconciliation.

### LIF-AUTH-001 — Existing ledgers remain lifecycle authority

Catalog state MUST be derived from the portable governance and publication ledgers.
The catalog MUST NOT append substitute publication, supersession, withdrawal, contest,
or delta authority.

### LIF-DIM-001 — Lifecycle dimensions remain separate

Publication, lifecycle, activation, historical, contest, delta, correction, and
resolution states MUST remain independently reconstructable.

### LIF-FAC-001 — Facets are non-authoritative and composable

Active, historical, corrected, disputed, withdrawn, superseded, and unresolved facets
MAY coexist when their exact bases coexist and MUST NOT cause lifecycle transitions.

### LIF-CUR-001 — Current active is replay-derived

Current-active resolution MUST reproduce the portable publication ledger result,
permit at most one active record per target, and fail closed on conflict.

### LIF-DEL-001 — Delta does not replace

A delta review or pending evidence MUST NOT supersede, withdraw, or replace the current
active record without an explicit authoritative lifecycle event.

### LIF-HIST-001 — Inactive history survives

Supersession and withdrawal MUST preserve the catalog record, citation, publication
history, and lineage.

### LIN-001 — Relations bind exact authority

Every supersession, correction, narrowing, withdrawal, restoration, contest, or delta
relation MUST bind exact source, target, scope, effective time, and authoritative event.

### LIN-002 — Correction is not supersession

Correction and supersession MUST remain distinct and MUST NOT be inferred from one
another.

### REP-ORD-001 — Replay order preserves custody

Replay MUST establish canonical evidence and governance authority before catalog
registration, citation allocation, lifecycle projection, or current-active indexing.

### REP-FAIL-001 — Missing authority fails closed

Malformed, missing, unknown, or contradictory authority events MUST quarantine the
affected registration or target projection and MUST NOT be repaired from disposable
state.

### REP-REC-001 — Lawful reconciliation is idempotent

Reconciliation MAY complete missing catalog registration or rebuild projections only
when the complete portable authority basis exists. Repeated reconciliation MUST
converge without new identities or citations.

### UI-CAT-001 — Ordinary state is truthful

Ordinary catalog views MUST distinguish catalog presence, current activation,
historical state, dispute, pending delta, supersession, and withdrawal in human
language without presenting machine custody as the primary workflow.

## 17. Required Schema Consequences

Implementation will require separately authorized schemas for:

```text
memory-catalog-record-v1
memory-catalog-registration-event-v1
memory-citation-namespace-v1
memory-citation-allocation-event-v1
memory-catalog-lineage-link-v1
memory-catalog-projection-v1
memory-catalog-reconciliation-result-v1
```

Schema design must not collapse authoritative events into projection rows or make the
human locator the record primary key.

## 18. Required Proof Before Implementation Closure

1. One valid `DNM_PUBLISHED` basis creates one catalog identity and citation.
2. Concurrent identical registration creates no duplicate identity or citation.
3. A capture observation, evidence set, or pending proposal cannot register.
4. A changed evidence or authority hash for the same claimed basis refuses.
5. Restart from portable events reconstructs the same record and citation.
6. Deleted SQLite projections rebuild without semantic drift.
7. Missing governance or publication authority cannot be repaired from SQLite.
8. Citation ordinals remain monotonic and gaps are not compacted.
9. Withdrawal and supersession never recycle citations.
10. Two imported `[M12]` citations remain unambiguous and retain origin custody.
11. Matching prose from two scopes does not deduplicate governed records.
12. Supersession produces one historical old record and one current replacement.
13. Withdrawal produces no current active record and preserves historical approval.
14. Delta pending leaves the current active record unchanged.
15. Dispute and activation remain separate dimensions.
16. Correction and supersession produce distinct lineage.
17. Multiple active records for one target fail closed without choosing a winner.
18. Unknown lifecycle events quarantine projection advancement.
19. Reconciliation completes a missing registration only from complete authority and
    remains idempotent.
20. Ordinary UI distinguishes present, active, historical, disputed, pending,
    superseded, and withdrawn without implying false authority.

## 19. Stop Boundary

This contract does not authorize:

- schemas, migrations, tables, APIs, services, or portable event implementation;
- registering existing or future memories;
- citation allocation or import;
- lifecycle projection changes;
- catalog reconciliation jobs;
- context-sheet association;
- dossier formation;
- active-context injection;
- UI changes;
- new dormant-admission, correction, narrowing, restoration, or contest event types.

Each requires a separately authorized bounded slice and exact proof.

## 20. Status

Catalog admission, identity, custody, citation namespace, collision handling, lifecycle
projection, current-active resolution, lineage, replay, reconciliation, and ordinary
truth boundaries are **ENTERED**.

Production behavior is unchanged.
