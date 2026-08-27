# Phase X: Memory Catalog And Context Sheet Schema Suite Contract

**Version:** 0.1.0
**Status:** ENTERED — schema jurisdiction and compatibility boundaries are normative;
JSON Schema artifacts and implementation remain unauthorized.
**Semantic parent:** `PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md`
**Architectural parent:**
`PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`
**Closure evidence:**
`PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_DOCUMENTATION_CLOSURE_REPORT.md`

## 1. Problem

The parent-and-child contract stack names the records, events, projections, manifests,
and results required to turn governed event memory into usable continuity. It does not
yet establish one machine-schema boundary across those artifacts.

Without that boundary, independently authored schemas could:

- use display labels as identity;
- embed one authoritative record inside another and create duplicate authority;
- represent event history as mutable projection state;
- accept unresolved or cross-scope references;
- treat model output as a validated record;
- silently reinterpret old records after a validator change;
- use incompatible version rules across artifact families;
- erase unknown fields or states during replay;
- permit a newer writer to produce data an older reader misreads as valid;
- make migration and benchmark artifacts look like governed memory.

## 2. Target Result

Future schema artifacts form one closed, versioned suite with:

```text
one shared envelope
+ one canonical identity grammar
+ typed immutable references
+ explicit authority class
+ artifact-specific payload validation
+ deterministic hashes
+ declared compatibility
+ fail-closed cross-record validation
```

The suite describes records. It does not grant permission to create them.

## 3. Authority Gate

### Governing contracts

The parent architecture and its entered child contracts govern the meaning and
lifecycle of every schema family. This contract governs representation and
compatibility only.

### Authoritative source

Existing evidence, governance, publication, revision, and audit ledgers remain the
authority for governed memory and its lifecycle. A schema-valid downstream artifact
does not become authoritative merely because it is structurally valid.

### Projection boundary

- Events record accepted actions or decisions.
- Immutable records register durable identities and accepted state.
- Projections are rebuildable views.
- Manifests close exact derivation inputs and outputs.
- Results and reports record evaluation or reconciliation outcomes.
- Nominations and requests create obligations or candidates, not accepted authority.

No schema may collapse these classes.

### Lifecycle owner

The service named by each child contract owns creation, validation, mutation through
successor events, replay, reconciliation, and recovery. JSON Schema validation owns
shape only.

### Mechanism reused

The suite reuses:

- the existing Phase X discovery schema conventions under
  `docs/architectural-memory/schemas/discovery/`;
- canonical evidence and source identities;
- existing governance and publication identities;
- immutable event and hash-bound manifest patterns;
- reconciliation rather than silent repair;
- versioned policy and contract bindings.

### Jurisdiction fit

Each artifact listed in Section 8 is required by an entered child contract. This
contract adds no new semantic product.

### Failure behavior

Unknown required versions, invalid hashes, unresolved mandatory references,
cross-scope bindings, authority-class mismatch, stale optimistic writes, or incompatible
reader/writer combinations MUST refuse. Replay defects MUST quarantine the affected
projection or derived artifact while preserving authoritative inputs.

## 4. Closed Artifact Classes

Every schema declares exactly one class:

| Class | Meaning | Authority limit |
|---|---|---|
| `AUTHORITY_REGISTRATION` | Registers an already-governed artifact in a downstream product | Cannot create upstream governance |
| `EVENT` | Records an accepted lifecycle action or decision | Authority limited to its governing service and scope |
| `IMMUTABLE_RECORD` | Durable identity and hash-bound accepted content | Changes require successor events or revisions |
| `NOMINATION` | Candidate association, request, or proposed action | Never accepted authority |
| `MANIFEST` | Closed derivation input/output set | Proves custody, not semantic truth |
| `PROJECTION` | Rebuildable current or historical view | Never the sole authority |
| `RESULT` | Validation, reconciliation, or execution outcome | Cannot mutate the evaluated subject |
| `REPORT` | Aggregated benchmark, migration, or release evidence | Cannot hide critical failure or create memory |

No artifact may declare several primary classes.

## 5. Shared Envelope

Every suite artifact MUST contain a common envelope with:

```text
schemaId
schemaVersion
artifactClass
artifactId
memoryScopeId
createdAt
producer
contractBindings[]
policyBindings[]
payloadHash
```

Where applicable it also contains:

```text
revision
predecessorRef
idempotencyKey
causationRef
correlationId
authorityBasisRefs[]
sourceManifestRef
validationProfileRef
```

The envelope is structural metadata. It cannot replace artifact-specific custody,
jurisdiction, evidence, or lifecycle fields.

## 6. Canonical Identity And Reference Grammar

### Canonical identity

`artifactId` is opaque, immutable, and unique within its declared identity namespace.
Display titles, human citations, filenames, model labels, timestamps, and hashes are
not primary identity.

### Typed reference

Every reference binds:

```text
artifact type
artifact identity
exact revision or immutable hash, when required
memory scope
expected authority class
```

A bare string identifier is insufficient where type, scope, revision, or class affects
meaning.

### Scope

Every durable artifact belongs to exactly one memory scope. A cross-scope reference
requires an explicit portable authority or import binding allowed by the governing
child contract.

### Human locator

Human citations and aliases remain stable lookup handles. They do not become canonical
identity and may not be recycled.

## 7. Hash And Canonicalization Boundary

Each schema family MUST declare:

- the canonical serialization used for hashing;
- fields included in the payload hash;
- fields excluded as transport or storage metadata;
- normalization rules, if any;
- whether ordered collections are semantically ordered;
- the exact algorithm identifier and version.

Hash equality proves byte-level canonical payload equality under a declared algorithm.
It does not prove semantic equivalence, shared authority, or lawful deduplication.

## 8. Required Schema Families

### 8.1 Catalog and citation

```text
memory-catalog-record-v1
memory-catalog-registration-event-v1
memory-citation-namespace-v1
memory-citation-allocation-event-v1
memory-catalog-lineage-link-v1
memory-catalog-projection-v1
memory-catalog-reconciliation-result-v1
```

### 8.2 Context-sheet anchor lifecycle

```text
context-sheet-record-v1
context-sheet-creation-event-v1
context-sheet-alias-event-v1
context-sheet-anchor-resolution-event-v1
context-sheet-merge-event-v1
context-sheet-split-event-v1
context-sheet-redirect-v1
context-sheet-retirement-event-v1
context-sheet-restoration-event-v1
context-sheet-lifecycle-projection-v1
context-sheet-reconciliation-result-v1
```

### 8.3 Typed membership links

```text
context-sheet-membership-nomination-v1
context-sheet-membership-validation-event-v1
context-sheet-membership-link-v1
context-sheet-membership-successor-event-v1
context-sheet-membership-impact-decision-v1
context-sheet-membership-reconciliation-result-v1
```

### 8.4 Dossier claims and revisions

```text
dossier-basis-closure-v1
dossier-synthesis-run-v1
dossier-claim-graph-v1
dossier-claim-validation-event-v1
dossier-meaningful-delta-decision-v1
dossier-incorporation-event-v1
dossier-render-v1
dossier-revision-registration-event-v1
dossier-reconciliation-result-v1
```

### 8.5 Active continuity

```text
memory-activation-event-v1
memory-salience-event-v1
memory-precedence-event-v1
memory-precedence-resolution-v1
active-claim-bundle-v1
context-sheet-active-projection-v1
continuity-assembly-request-v1
continuity-assembly-manifest-v1
continuity-injection-audit-v1
continuity-assembly-reconciliation-result-v1
```

### 8.6 Migration

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

### 8.7 Benchmark governance

Benchmark schemas MUST cover the fixture, scenario/assertion registry, semantic and UX
gold, candidate configuration, benchmark profile, raw attempt, deterministic
evaluation, human adjudication, critical-occurrence verification, candidate and
integrated-journey reports, release report, and selection decision required by the
benchmark contract.

Existing discovery benchmark artifacts MUST be referenced or compatibly extended;
they must not be redefined under a second identity.

## 9. Cross-Record Validation

JSON Schema validation is necessary but insufficient. A server-owned suite validator
MUST verify:

1. referenced artifacts exist at the required revision;
2. hashes match canonical payloads;
3. scopes and jurisdiction bindings are compatible;
4. authority classes are permitted for the referencing field;
5. event predecessors and optimistic revisions are current;
6. manifests are closed and contain no unresolved required member;
7. projections trace to replayable accepted events;
8. model-authored nominations have not been promoted without an accepted validation
   event;
9. lifecycle states are permitted by the governing contract;
10. unknown mandatory enum values or versions fail closed.

Validation has no authority to invent a missing reference or choose among conflicting
authoritative records.

## 10. Version And Compatibility Model

Schema identity uses a stable family name and explicit major version. The schema file
also carries an immutable content hash.

Compatibility is directional and declared:

```text
writer version -> reader version -> ACCEPT | PRESERVE_ONLY | REFUSE
```

- `ACCEPT`: the reader understands every authority-bearing field and invariant.
- `PRESERVE_ONLY`: the reader may store and relay the artifact losslessly but cannot
  project, act on, or rewrite it.
- `REFUSE`: the reader cannot safely accept the artifact.

No reader may silently drop unknown fields. No compatibility claim may be inferred
only because structural validation passes.

## 11. Schema Evolution

### Non-breaking evolution

An additive change may remain within a major version only when:

- old readers safely preserve the new field;
- the field is optional and has no authority-bearing default;
- omission preserves the exact prior meaning;
- canonicalization and hashing behavior remain explicitly compatible;
- fixtures prove round-trip preservation.

### Breaking evolution

A new major version is required when a change:

- alters identity, authority, jurisdiction, or lifecycle meaning;
- makes an optional field required;
- changes an enum's interpretation;
- changes canonicalization or hash coverage;
- changes reference resolution;
- changes default behavior;
- permits a previously refused state;
- makes an old reader produce a materially different projection.

Migration between major versions is an explicit, audited transformation. It cannot
rewrite source evidence or existing governed history.

## 12. Defaults, Nullability, And Enumerations

- Authority-bearing defaults are prohibited.
- Missing, `null`, empty, unknown, unavailable, and inapplicable are distinct states.
- A nullable field MUST state why null is lawful.
- Closed enums MUST fail on unknown values unless the reader is explicitly operating
  in `PRESERVE_ONLY`.
- Open extension values MUST be namespaced and cannot change core authority.
- Timestamps MUST declare format and semantic role; creation time cannot substitute
  for source-event time.

## 13. Idempotency And Concurrency

Event-producing commands MUST bind an idempotency key to the same scope, operation,
subject, and canonical payload. Reuse with different content refuses.

Mutable projections use optimistic version checks. Accepted authority records and
events are append-only. Concurrent conflicting successors remain explicit; a storage
last-write-wins result is never a lawful resolution.

## 14. Replay, Reconciliation, And Quarantine

Replay MUST:

- consume authoritative records and events in a declared deterministic order;
- validate every transition against its recorded schema and policy versions;
- reconstruct identical projection payloads and hashes;
- preserve unknown losslessly under `PRESERVE_ONLY`;
- stop and quarantine the affected derived boundary on an incompatible or corrupt
  record;
- leave unrelated scopes available when isolation is proven.

Reconciliation reports differences. It may rebuild projections from authority but may
not edit authority to make the projection agree.

## 15. Security And Data Minimization

Schemas MUST distinguish ordinary-readable fields from diagnostic custody fields and
sensitive source material. References should replace duplicated source content unless
a governing custody contract requires an immutable embedded snapshot.

Exports and logs MUST preserve required derivation while respecting declared
visibility, subject jurisdiction, and secret-redaction rules. Redaction cannot change
the authoritative stored artifact or its hash without producing a separately identified
redacted projection.

## 16. Normative Requirements

### SCH-ENV-001 — Shared envelope

Every suite artifact MUST satisfy the shared envelope and its artifact-specific schema.

### SCH-CLS-001 — One artifact class

Every artifact MUST declare exactly one primary artifact class and obey its authority
limit.

### SCH-AUT-001 — Shape grants no authority

Schema validity MUST NOT create governed memory, lifecycle authority, accepted
membership, dossier meaning, activation, precedence, or migration approval.

### SCH-IDN-001 — Opaque canonical identity

Canonical identity MUST be opaque and immutable; labels, citations, filenames,
timestamps, and hashes MUST NOT replace it.

### SCH-REF-001 — Typed exact references

Authority-bearing references MUST bind type, identity, scope, expected class, and exact
revision or hash where the governing contract requires it.

### SCH-SCP-001 — Scope isolation

Cross-scope references MUST refuse unless an explicit portable authority or import
binding permits them.

### SCH-HSH-001 — Declared canonical hashing

Every hash-bearing family MUST declare canonical serialization, field coverage,
ordering, normalization, algorithm, and version.

### SCH-HSH-002 — Hashes do not prove meaning

Hash equality MUST NOT establish semantic equivalence, shared authority, or lawful
deduplication.

### SCH-VAL-001 — Two-stage validation

Acceptance MUST require both artifact-schema validation and server-owned cross-record
validation.

### SCH-VAL-002 — Validators cannot repair authority

A validator MUST NOT invent, infer, rewrite, or choose missing or conflicting
authoritative inputs.

### SCH-EVT-001 — Events and projections remain separate

Accepted lifecycle events MUST remain append-only and projections MUST remain
rebuildable from their governing authority.

### SCH-MOD-001 — Model output remains nominated

Model-authored output MUST remain a nomination or bounded result until the governing
server-owned validation and admission event accepts it.

### SCH-VER-001 — Directional compatibility

Every supported writer/reader pair MUST declare `ACCEPT`, `PRESERVE_ONLY`, or `REFUSE`.

### SCH-VER-002 — Unknown data is never dropped

Readers MUST preserve unknown fields losslessly under `PRESERVE_ONLY` or refuse; they
MUST NOT silently discard them.

### SCH-EVO-001 — Breaking meaning requires a major version

Changes to authority, identity, jurisdiction, lifecycle, defaults, canonicalization,
reference resolution, or accepted states MUST create a new major schema version.

### SCH-DEF-001 — No authority-bearing defaults

Defaults MUST NOT manufacture authority, evidence, jurisdiction, lifecycle state,
validation, activation, salience, or precedence.

### SCH-NUL-001 — Absence states remain distinct

Missing, null, empty, unknown, unavailable, and inapplicable MUST remain distinct
where they produce different behavior.

### SCH-IDM-001 — Idempotency is content-bound

Idempotency keys MUST bind scope, operation, subject, and canonical payload and MUST
refuse reuse with different content.

### SCH-CON-001 — Concurrency cannot resolve meaning

Optimistic concurrency MUST detect stale writes; storage ordering or last-write-wins
MUST NOT resolve semantic conflict.

### SCH-RPL-001 — Replay preserves versions

Replay MUST validate records using their recorded schema, contract, and policy
versions and reproduce the same lawful projection hashes.

### SCH-REC-001 — Reconciliation never edits authority

Reconciliation MAY rebuild projections and report defects but MUST NOT edit authority
to force agreement.

### SCH-QAR-001 — Incompatibility quarantines derivatives

Invalid or incompatible records MUST quarantine the affected derived boundary while
preserving authoritative inputs and proven-isolated scopes.

### SCH-SEC-001 — Ordinary and diagnostic data remain classified

Schemas MUST classify ordinary-readable, diagnostic, sensitive, and redacted-projection
fields without changing authoritative custody.

### SCH-XPT-001 — Export preserves derivation and scope

Portable artifacts MUST preserve required identity, versions, references, hashes,
jurisdiction, and derivation without leaking prohibited secrets.

### SCH-TST-001 — Every schema has positive and refusal fixtures

Each schema MUST have at least one valid fixture and fixtures for every authority,
reference, version, and failure boundary material to that artifact.

## 17. Required Proof Before Schema Artifact Closure

1. Every named runtime artifact belongs to exactly one schema family and one primary
   artifact class.
2. Every schema validates a canonical valid fixture.
3. Every authority-bearing reference rejects a missing, wrong-type, wrong-scope,
   wrong-revision, wrong-hash, or wrong-class target as applicable.
4. A structurally valid nomination cannot be read as accepted authority.
5. A projection with no replayable accepted basis refuses.
6. A human citation or title cannot substitute for canonical identity.
7. Hash-identical prose from different governed scopes does not deduplicate.
8. An old reader either losslessly preserves or refuses a new authority-bearing field.
9. A writer/reader matrix proves every declared compatibility state.
10. Changing canonicalization or hash coverage changes the major schema version.
11. Missing, null, empty, unknown, unavailable, and inapplicable fixtures remain
    behaviorally distinct where required.
12. Idempotent replay creates one accepted effect; mismatched key reuse refuses.
13. Concurrent incompatible successors remain explicit and no projection chooses one
    through storage order.
14. Restart reconstructs byte-identical canonical projections and manifest hashes.
15. Corrupt or incompatible derived state quarantines without mutating authority.
16. Reconciliation detects and rebuilds a damaged projection from intact authority.
17. A redacted export remains linked to, but distinguishable from, its authoritative
    source artifact.
18. Existing discovery schemas remain authoritative under their current identities and
    are referenced rather than duplicated.
19. Critical benchmark failure cannot be represented as a passing release report.
20. The complete suite passes repository schema lint, fixture validation, reference
    validation, compatibility, replay, and `git diff --check`.

## 18. Required Child Deliverables

Implementation requires separately authorized slices for:

1. shared envelope and reference definitions;
2. catalog/citation schemas and fixtures;
3. context-sheet anchor schemas and fixtures;
4. membership-link schemas and fixtures;
5. dossier schemas and fixtures;
6. active-continuity schemas and fixtures;
7. migration schemas and fixtures;
8. benchmark schema mapping or extensions;
9. cross-record validator and compatibility matrix;
10. replay, reconciliation, and quarantine proof.

One deliverable's completion does not authorize the next.

## 19. Stop Boundary

This contract does not authorize:

- creation or modification of JSON Schema files;
- runtime validators, routes, services, tables, or event producers;
- storage selection or migration execution;
- benchmark corpus construction or numeric profiles;
- model, prompt, tokenizer, retry, or budget selection;
- UI or production wiring;
- modification of existing discovery schemas;
- release or host verification.

## 20. Status

The Phase X schema-suite envelope, artifact classes, identity, references, hashing,
validation, compatibility, evolution, replay, reconciliation, security, and refusal
boundaries are **ENTERED**.

Production behavior and existing schema artifacts are unchanged.
