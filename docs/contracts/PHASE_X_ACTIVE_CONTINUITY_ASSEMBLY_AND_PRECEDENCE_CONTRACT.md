# Phase X: Active Continuity Assembly And Precedence Contract

**Version:** 0.1.0
**Status:** ENTERED — activation, salience, precedence, sheet projection, request
assembly, budget, manifest, replay, and refusal boundaries are normative; schemas and
implementation remain unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 1. Problem

The parent architecture separates activation, retrieval salience, and conflict
precedence and defines current continuity as an accepted dossier plus eligible recent
governed deltas. It does not yet specify:

- which authority may activate or deactivate material;
- whether salience may affect truth or lifecycle;
- how an override differs from high priority;
- how superseded, corrected, narrowed, disputed, and historical claims assemble;
- how newly governed events participate before dossier refresh;
- how one event avoids duplicate appearance after incorporation;
- how token limits select or refuse material;
- how retrieval influences one request without changing active continuity;
- what exact manifest makes injection reproducible;
- how stale, ambiguous, or conflicting state fails.

Without these rules, a high similarity score could act like publication, a priority
setting could silently override a subject's meaning, or token trimming could retain a
broad claim while dropping the qualification that made it truthful.

## 2. Governing Distinctions

```text
Activation
Whether governed material is eligible for ordinary current continuity in its declared
scope and jurisdiction.

Retrieval salience
How strongly eligible material competes for attention or token budget.

Conflict precedence
An explicit governed relationship that changes which exact claim governs within a
named scope, jurisdiction, and effective interval.

Sheet active projection
The rebuildable current continuity representation for one context sheet.

Request assembly
The exact bounded selection of eligible sheet projections and claim bundles for one
model request or product operation.

Injection
Delivery of an accepted request assembly to a configured prompt boundary. Injection is
a transport effect, not authority.
```

The chain is:

```text
governed lifecycle and activation
-> exact precedence resolution
-> current sheet projection
-> query-specific retrieval and salience
-> deterministic request assembly
-> bounded injection
```

Relevance may change request assembly. It cannot change activation or precedence.

## 3. Authority Gate

### Governing contracts

- Existing governance and publication ledgers govern current continuity lifecycle.
- The Memory Catalog contract governs catalog activation projection and current-active
  resolution.
- The Membership Link contract governs event-to-sheet eligibility.
- The Dossier contract governs accepted claims and incorporation.
- Existing Architectural RAG contracts establish that retrieval has no authority
  effect.
- This contract governs assembly after those authorities resolve.

### Authoritative sources

1. Portable governance and publication ledgers own activation-relevant lifecycle.
2. Explicit governed precedence events own supersession, override, correction, and
   narrowing relationships.
3. Accepted dossier revisions own incorporated current claims.
4. Catalog lifecycle, accepted links, and incorporation events own eligible active
   deltas.
5. Salience-setting events or versioned policy own salience only.
6. Projection and assembly manifests own reproducible derivation, not memory authority.

### Projection boundary

These are projections and cannot create authority:

- embeddings;
- query similarity;
- reranker output;
- salience;
- token rank;
- graph centrality;
- current sheet projection;
- request assembly;
- cached prompt text;
- injection order;
- model response.

### Lifecycle owner

```text
Existing governance services
  lifecycle, activation, and governed precedence events

Precedence resolver
  exact claim-target matching and effective-scope resolution

Sheet projection service
  active dossier plus eligible unincorporated deltas

Retrieval service
  query-relevant candidate selection among eligible projections

Assembly service
  claim-bundle selection, deterministic budget enforcement, manifest, refusal

Injection adapter
  transport of one accepted assembly to one declared host boundary
```

### Failure behavior

- Missing lifecycle or activation authority excludes or quarantines material.
- Ambiguous precedence blocks the affected claim bundle.
- Multiple incompatible current claims remain disputed or block according to policy.
- Stale dossier, catalog, link, or incorporation revisions refuse assembly.
- Mandatory bundles that exceed budget produce an explicit incompatibility refusal.
- Injection failure does not mutate authority or mark content inactive.

## 4. Activation

Closed activation states:

```text
ACTIVE
Eligible for ordinary current continuity within declared scope, jurisdiction, and
effective interval.

DORMANT
Retained and governable but excluded from ordinary current continuity.

BLOCKED
Potentially relevant, but current lifecycle, dispute, safety, custody, or jurisdiction
prevents ordinary continuity use.

UNRESOLVED
Activation cannot be determined from complete authority.
```

Only governed lifecycle or a separately authorized activation event may change
activation. Catalog presence, dossier inclusion, retrieval, manual priority, or model
selection cannot.

For the currently evidenced v1 path:

```text
valid published ACTIVE continuity
-> ACTIVE

SUPERSEDED or WITHDRAWN
-> DORMANT

DELTA_PENDING
-> existing current record remains active unless an explicit governing event changes it

CONTEST_REOPENED
-> activation consequence follows the governing contest policy; contest alone is not
   silently treated as inactive
```

## 5. Retrieval Salience

Closed salience states:

```text
LOW
STANDARD
HIGH
```

Salience may be assigned to an eligible catalog record, context sheet, dossier claim,
or bounded claim bundle under a versioned policy.

Salience affects:

- ranking among otherwise eligible candidates;
- optional token allocation;
- retrieval frequency;
- proactive surfacing when policy permits.

Salience does not affect:

- evidence truth;
- activation;
- subject jurisdiction;
- lifecycle;
- conflict precedence;
- correction;
- supersession;
- independent corroboration count.

Manual salience changes and policy-derived salience are attributable, replayable, and
separate from memory edits.

## 6. Conflict Precedence

Closed precedence relationships:

```text
SUPERSEDES
A later governed claim replaces a named earlier claim within explicit scope.

OVERRIDES
A governing rule or higher-order authority controls a named target claim within
explicit jurisdiction and conditions without asserting the target never existed.

CORRECTS
A governed claim establishes that a named prior claim was inaccurate.

NARROWS
A governed successor limits a named prior claim to a smaller supported scope.
```

Each precedence event binds:

```text
precedenceEventId
relationship type
source claim and exact revision
target claim and exact revision
scope
jurisdiction
effective interval
authority basis
reason
createdAt
policy and contract versions
```

A generic `OVERRIDE` priority is prohibited. `HIGH` salience cannot create
`OVERRIDES`.

### Resolution effects

```text
SUPERSEDES
Use successor as current; preserve predecessor as historical.

OVERRIDES
Apply controlling claim only inside named conditions; preserve target outside them and
as history.

CORRECTS
Use corrected claim as current truth; mark prior claim corrected and historical.

NARROWS
Use narrowed claim; do not retain unsupported breadth in active continuity.
```

Precedence never deletes evidence or prior accepted revisions.

## 7. Precedence Resolution

Resolution occurs before salience ranking.

For each candidate claim:

1. resolve exact lifecycle and activation;
2. load exact incoming and outgoing precedence events;
3. validate target identity, jurisdiction, scope, and time;
4. reject stale or cyclic precedence;
5. compute current, historical, controlled, corrected, narrowed, or disputed effect;
6. retain required lineage for explanation;
7. emit one deterministic resolution record.

Cycles, two incompatible controlling claims, missing targets, or incomparable
jurisdictions produce:

```text
PRECEDENCE_DISPUTED
```

They are not resolved by timestamp, salience, model score, title, or insertion order.

## 8. Atomic Claim Bundles

Assembly selects atomic claim bundles, not independent prose fragments.

A bundle contains:

```text
primary accepted claim
required subject and jurisdiction labels
required temporal qualification
required limiting claims
required contradictory or dispute state
required correction/evolution/precedence lineage
human citations and source-preview bindings
bundle identity and token count
```

If removing a qualifier, limitation, contradiction, or lineage note would materially
change meaning, it is mandatory within the bundle.

The assembler may include or exclude an optional bundle. It may not truncate a bundle
into a misleading claim.

## 9. Sheet Active Projection

For one context sheet:

```text
current eligible accepted dossier revision
+ eligible ACTIVE governed catalog-link revisions not incorporated into that dossier
- claims and entries excluded by exact lifecycle, activation, precedence, or current-use
```

Eligible delta states:

```text
UNINCORPORATED
SELECTED_FOR_REVISION
```

`INCORPORATED` is represented through the dossier and cannot also appear as a delta.
`NO_DOSSIER_CHANGE_REQUIRED` may remain available as supporting evidence but is not a
new active delta. `BLOCKED` is excluded from ordinary continuity and remains visible in
diagnostics or review.

The sheet projection binds:

```text
contextSheetId and exact revision
dossierRevisionId and hash, if any
included dossier claim identities
included delta catalog and link revisions
incorporation snapshot
activation snapshot
precedence resolution records
jurisdiction
projection policy
assembly-ready claim bundles
projection manifest and hash
createdAt
```

## 10. Dossier-Lag Rule

Newly governed active events must not wait for the next dossier synthesis to
participate in continuity.

An eligible unincorporated delta may enter the sheet projection when:

- the catalog record is active;
- the membership link is accepted and current;
- its claim authority is already governed;
- scope and jurisdiction match;
- contradiction and precedence are resolved or truthfully represented;
- the event is not blocked;
- its exact revision is absent from the dossier incorporation manifest.

When a later dossier incorporates it:

```text
prior projection
  dossier R1 + delta M42

later projection
  dossier R2 incorporating M42

result
  M42 appears exactly once through R2
```

## 11. Request Assembly

One request assembly binds:

```text
assemblyRequestId
host and memory scope
active participant and subject context
authorized context-sheet candidates
query or operation purpose
applicable jurisdiction
tokenizer identity
hard token budget
reserved host and response budgets
retrieval and salience policy versions
precedence policy version
sheet projection revisions
createdAt
```

The request assembly is ephemeral in use but its accepted manifest is durable for
audit and reproduction.

## 12. Retrieval Boundary

BananaBread, Similharty, or another authorized retrieval service may:

- identify potentially relevant active sheets;
- rank eligible claim bundles;
- suggest historical context when the operation permits it;
- surface possible contradictions for already governed resolution.

Retrieval cannot:

- activate dormant material;
- bypass blocked or unresolved state;
- create precedence;
- select material from an unauthorized scope;
- suppress mandatory contradiction or limitation;
- turn historical evidence into current meaning;
- make a model response memory authority.

Intentional historical research may retrieve dormant material into a clearly labeled
non-active evidence view. It is not ordinary active continuity injection.

## 13. Deterministic Ordering

After eligibility and precedence resolution, bundles are ordered by:

```text
1. mandatory operation class
2. jurisdiction and subject applicability
3. retrieval salience
4. query relevance
5. temporal policy
6. stable context-sheet identity
7. stable claim-bundle identity
```

Exact scoring formulas and weights require benchmark governance. Ties must resolve by
stable identities, never arrival order or runtime-specific iteration.

Changing retrieval results may change optional request content. It cannot change the
underlying sheet projection.

## 14. Budget Enforcement

Budgets are tokenizer-specific and profile-governed.

The assembly profile freezes:

```text
tokenizer and version
hard host context limit
reserved system, conversation, tool, and response budgets
maximum continuity budget
mandatory-bundle policy
optional-bundle ordering
per-sheet and per-subject bounds
historical-context bounds
overflow behavior
```

Budget processing:

1. calculate exact bundle token counts;
2. include every mandatory bundle;
3. if mandatory bundles exceed the continuity budget, refuse with
   `PROJECTION_BUDGET_INCOMPATIBLE`;
4. add optional bundles in deterministic order while each complete bundle fits;
5. record every included and excluded bundle with reason;
6. never truncate canonical citations, qualification, contradiction, or precedence
   lineage from an included bundle.

Numeric defaults remain unauthorized until benchmark evidence freezes them.

## 15. Assembly Outcomes

```text
ASSEMBLED
One valid bounded manifest is ready for transport.

EMPTY_LAWFUL
No eligible active continuity applies to this request.

REFUSED_SCOPE
Requested material crosses an unauthorized memory scope.

REFUSED_JURISDICTION
Subject or claim jurisdiction is incompatible.

REFUSED_STALE_INPUT
One or more source projections changed during assembly.

REFUSED_PRECEDENCE_DISPUTE
Current claim effect cannot be resolved lawfully.

PROJECTION_BUDGET_INCOMPATIBLE
Mandatory truthful bundles cannot fit.

QUARANTINED_CUSTODY
Authority or replay custody is incomplete.
```

No outcome changes memory authority.

## 16. Assembly Manifest

Every accepted assembly preserves:

```text
assembly identity
request identity and purpose
host, scope, participants, and jurisdiction
tokenizer and budget profile
retrieval query and reproducible retrieval inputs
sheet projection identities and hashes
included bundle identities, order, and token counts
excluded candidate identities and reasons
activation snapshots
precedence resolution identities
salience and relevance inputs
rendered injection text and hash
injection adapter and target boundary
policy, contract, code, and schema versions
createdAt
```

The manifest proves what was used and why. It does not claim that rerunning a
nondeterministic vector backend will reproduce identical ranking without the recorded
candidate and score inputs.

## 17. Injection Boundary

Only an `ASSEMBLED` manifest may be injected.

The adapter verifies:

- manifest and rendered-text hashes;
- host and memory scope;
- active session boundary;
- configured injection mode;
- stale projection guard;
- token limit;
- no blocked or dormant bundle;
- no duplicate bundle.

Injection success or failure is recorded separately from assembly. A successful
injection does not create a memory event. A failed injection does not change
activation, salience, or precedence.

## 18. Replay And Reconciliation

Replay order is:

```text
1. governance, publication, and activation authority
2. Memory Catalog lifecycle
3. context sheets and membership links
4. accepted dossier revisions and incorporation
5. precedence events and resolution
6. salience events
7. sheet projections
8. request assembly and injection audit
```

Replay reconstructs:

- activation state;
- salience settings;
- precedence relationships and disputes;
- sheet projections;
- dossier-versus-delta deduplication;
- claim bundles;
- accepted assembly manifests;
- injection outcomes;
- blocked, refused, empty, and quarantined results.

Reconciliation may rebuild projections and indexes from complete authority. It cannot
infer activation or precedence from cached prompts, vector stores, latest timestamps,
or expected model behavior.

## 19. Ordinary Product Projection

Ordinary UI should answer:

```text
What is active now?
What changed recently?
What remains historical?
Is anything disputed or blocked?
Why was this memory included?
What lawful action is available?
```

Human labels:

```text
Active
Used in current continuity.

Dormant
Preserved but not used automatically.

High relevance
More likely to be selected; does not change authority.

Supersedes
This later governed claim is current in the stated scope.

Update pending
This governed event is active but not yet folded into the dossier.
```

Technical views may expose scores, manifests, hashes, policy versions, and token
accounting.

## 20. Normative Requirements

### ACP-SEP-001 — Three dimensions remain independent

Activation, retrieval salience, and conflict precedence MUST remain separately stored,
authorized, replayed, and displayed.

### ACP-ACT-001 — Only governed authority changes activation

Catalog presence, dossier inclusion, retrieval, salience, model output, UI selection,
or injection MUST NOT activate or deactivate memory.

### ACP-ACT-002 — Lifecycle mapping is explicit

Active, superseded, withdrawn, delta-pending, and contest-reopened states MUST derive
activation only through the governing lifecycle policy.

### ACP-SAL-001 — Closed salience vocabulary

Salience MUST use `LOW`, `STANDARD`, or `HIGH` and MAY affect ranking or optional budget
only.

### ACP-SAL-002 — Salience is not authority

Salience MUST NOT establish evidence, activation, jurisdiction, precedence, correction,
supersession, or corroboration.

### ACP-PRE-001 — Precedence is exact

Every `SUPERSEDES`, `OVERRIDES`, `CORRECTS`, or `NARROWS` event MUST bind exact source
and target claims, scope, jurisdiction, time, authority, and version.

### ACP-PRE-002 — Generic override priority is prohibited

No priority or salience setting MAY create an override. `OVERRIDES` MUST be an explicit
governed relationship with bounded conditions.

### ACP-PRE-003 — Precedence resolves before retrieval

Current claim effect MUST be resolved before salience and relevance ranking.

### ACP-PRE-004 — Conflict fails closed

Cyclic, stale, missing-target, or incompatible precedence MUST become disputed and MUST
NOT be resolved by timestamp, score, title, arrival order, or model choice.

### ACP-BUN-001 — Claims assemble atomically

Every included claim MUST retain required jurisdiction, time, limitation,
contradiction, correction, and precedence material as one atomic bundle.

### ACP-BUN-002 — Optional exclusion cannot distort meaning

The assembler MAY omit a complete optional bundle but MUST NOT truncate an included
bundle into materially broader or misleading meaning.

### ACP-PRJ-001 — Sheet projection has exact basis

Every sheet active projection MUST bind exact dossier, catalog, link, incorporation,
activation, precedence, policy, and claim-bundle revisions.

### ACP-PRJ-002 — Dossier lag does not hide governed deltas

Eligible active governed events not yet incorporated MUST participate as explicit
deltas when they pass Section 10.

### ACP-PRJ-003 — Incorporated events appear once

After dossier incorporation, the same catalog-link revision MUST disappear from active
delta representation and remain represented exactly once through the dossier.

### ACP-RET-001 — Retrieval selects only eligible material

Retrieval MAY rank active eligible bundles but MUST NOT activate dormant material,
bypass blocked state, bridge unauthorized scope, or create precedence.

### ACP-RET-002 — Historical retrieval is labeled and non-active

Intentional retrieval of dormant or historical material MUST remain outside ordinary
active continuity and MUST be explicitly labeled.

### ACP-ORD-001 — Ordering is deterministic after retrieval inputs

Assembly ordering MUST use the declared policy and stable identity tie-breakers and
MUST NOT depend on arrival order or runtime iteration.

### ACP-BUD-001 — Budgets are profile-governed

Tokenizer, reserves, continuity budget, mandatory policy, optional ordering, and
overflow behavior MUST be frozen by a versioned benchmarked profile before production.

### ACP-BUD-002 — Mandatory overflow refuses

If complete mandatory bundles do not fit, assembly MUST return
`PROJECTION_BUDGET_INCOMPATIBLE` and MUST NOT truncate or silently omit them.

### ACP-MAN-001 — Assembly custody is exact

Every accepted assembly MUST preserve the inputs, projections, bundles, ordering,
exclusions, scores, budgets, rendered text, target boundary, and versions required by
Section 16.

### ACP-INJ-001 — Only accepted assembly injects

Only a hash-valid, scope-valid, non-stale `ASSEMBLED` manifest MAY be transported to a
host injection boundary.

### ACP-INJ-002 — Injection has no authority effect

Injection success, failure, cache, order, or model response MUST NOT change memory
authority, activation, salience, or precedence.

### ACP-REP-001 — Replay is complete

Replay MUST reconstruct activation, salience, precedence, projections, bundle
deduplication, assemblies, and injection audit without disposable caches or vectors.

### ACP-FAIL-001 — Missing custody fails closed

Missing or contradictory lifecycle, scope, jurisdiction, precedence, incorporation, or
projection custody MUST refuse or quarantine assembly.

### ACP-UI-001 — Ordinary states are understandable

Ordinary UI MUST distinguish active, dormant, historical, high-relevance, superseding,
disputed, blocked, and pending-incorporation states without implying false authority.

## 21. Required Schema Consequences

Implementation will require separately authorized schemas for:

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

Existing lifecycle events may satisfy activation authority without a new activation
event where the mapping is exact. Schemas must not duplicate that authority.

## 22. Required Proof Before Implementation Closure

1. High salience cannot activate a dormant memory.
2. Retrieval score cannot supersede or override a claim.
3. Valid publication lifecycle produces the expected activation state.
4. Delta pending does not silently replace current continuity.
5. Exact supersession selects the successor and preserves historical predecessor.
6. Override applies only within its named conditions.
7. Correction and narrowing produce distinct current meanings.
8. Precedence cycle fails closed without choosing by time or score.
9. Required qualification cannot be dropped from an included claim bundle.
10. Current dossier plus one eligible new governed event produces one explicit delta.
11. After dossier incorporation, that event appears exactly once through the dossier.
12. Blocked or unresolved events do not enter ordinary active projection.
13. Query relevance changes optional assembly but not sheet activation or precedence.
14. Cross-scope retrieval cannot enter assembly.
15. Historical research remains labeled and outside active injection.
16. Stable tie-breakers produce equivalent ordering across supported runtimes.
17. Mandatory overflow refuses without truncation.
18. Optional overflow records deterministic exclusions.
19. Stale projection revision refuses assembly.
20. Only an accepted hash-valid manifest injects.
21. Injection failure leaves all authority unchanged.
22. Restart/replay reconstructs activation, precedence, projection, and accepted
    assembly identically.
23. Missing authority cannot be repaired from vector state or cached prompt text.
24. Ordinary UI explains why content is active, included, historical, disputed, or
    pending without exposing machine custody by default.

## 23. Stop Boundary

This contract does not authorize:

- schemas, tables, APIs, services, events, migrations, or storage;
- activation, salience, or precedence changes;
- sheet projection or request assembly;
- retrieval, reranking, vector, or prompt-injection changes;
- token budgets, scoring weights, thresholds, or model selection;
- cache or host adapter changes;
- ordinary or technical UI;
- migration of existing active continuity.

Each requires a separately authorized child contract, benchmark, implementation slice,
and exact proof.

## 24. Status

Activation, salience, precedence, atomic bundles, sheet projection, dossier-lag deltas,
retrieval, deterministic ordering, budget enforcement, manifests, injection, replay,
and clarity boundaries are **ENTERED**.

Production behavior is unchanged.
