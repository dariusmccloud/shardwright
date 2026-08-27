# Phase X: Versioned Dossier Claim Graph And Revision Contract

**Version:** 0.1.0
**Status:** ENTERED — claim graph, authority classification, synthesis readiness,
revision, meaningful delta, incorporation, replay, and refusal boundaries are
normative; schemas and implementation remain unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 1. Problem

The system can now identify governed catalog events, stable context sheets, and exact
membership links. It still lacks the contract that turns those records into a readable,
evolving dossier without:

- replacing immutable events with generated prose;
- creating new meaning outside governance;
- hiding contradictions;
- presenting historical state as current;
- rewriting a dossier in place;
- generating a new revision for every small event;
- treating a model's confidence as readiness;
- losing which events were or were not incorporated;
- making manual edits an authority bypass;
- producing prose that cannot be reproduced or audited.

## 2. Governing Distinctions

```text
Dossier basis
The exact closed set of catalog and membership-link revisions eligible for one
synthesis decision.

Claim graph
Structured, individually traceable propositions and their support, limitation,
contradiction, temporal, jurisdiction, and lineage relationships.

Rendered dossier
Human-readable prose and organization produced from an accepted claim graph.

Restatement
A bounded presentation of meaning already governed by the cited catalog claims.

New synthesis
A cross-event interpretation, relationship, motif meaning, causal conclusion, or other
proposition not already governed by its cited catalog claims.

Meaningful delta
A material change to governed or supportable dossier meaning, state, contradiction,
jurisdiction, or necessary organization.

Incorporation
An explicit decision about whether one eligible catalog-link revision is represented
in, pending for, blocked from, or irrelevant to one dossier revision.
```

The required separation is:

```text
governed catalog events
-> accepted membership links
-> closed dossier basis
-> candidate claim graph
-> code-owned claim validation
-> governance for any new synthesized meaning
-> accepted claim graph
-> rendered dossier revision
```

Readable prose is never the first or only authoritative record.

## 3. Authority Gate

### Governing contracts

- The Memory Catalog contract governs event identity and lifecycle.
- The Context-Sheet Anchor contract governs sheet identity and jurisdiction.
- The Membership Link contract governs why each event belongs to the sheet.
- Existing interpretive governance contracts govern newly proposed meaning.
- The parent architecture governs dossier revision classes and current-continuity
  separation.
- This contract governs dossier basis, claims, readiness, revisions, and incorporation.

### Authoritative sources

1. Catalog claims own previously governed event meaning.
2. Accepted membership links own event-to-sheet relationships.
3. Existing governance ledgers own any newly governed synthetic claim.
4. Dossier-basis closure events own the exact synthesis input.
5. Accepted claim-graph events own the validated structured dossier revision.
6. Render events own the human presentation derived from that graph.
7. Rendered prose, headings, ordering, and layout remain projections.

### Projection boundary

The following do not create governed meaning:

- model-generated prose;
- dossier title;
- section heading;
- chronology inferred from display order;
- model confidence;
- retrieval score;
- graph centrality;
- repeated wording;
- human edit text;
- revision class nomination.

### Lifecycle owner

```text
Dossier readiness service
  basis eligibility, closure, policy, contradiction, jurisdiction, and delta decision

Dossier synthesis worker
  candidate claim graph and candidate rendering only

Claim validator
  exact claim support, limitations, conflict, temporal, and authority classification

Existing governance service
  disposition of any new synthesized meaning

Dossier registrar
  accepted immutable revision, incorporation decisions, render custody, replay
```

### Failure behavior

- Incomplete or stale basis remains not ready.
- Unsupported claims refuse the candidate revision.
- New ungoverned synthesis routes to governance or remains pending.
- Unhandled contradiction blocks acceptance.
- Render mismatch refuses publication of the dossier revision.
- Failed refresh preserves the current accepted revision and pending governed deltas.
- No failure mutates catalog events, membership links, or prior dossier revisions.

## 4. Dossier Identity

One context sheet has one dossier lineage per declared dossier profile and jurisdiction.

The lineage key binds:

```text
contextSheetId
dossierProfileId
memory scope
jurisdiction partition
language or presentation locale when semantically relevant
```

Each immutable revision binds:

```text
dossierId
dossierRevisionId
parentRevisionId
contextSheetId and exact sheet revision
dossier profile and policy versions
basisClosureId and basis hash
claimGraphId and graph hash
renderId and render hash
revisionClass
meaningfulDeltaDecisionId
incorporation manifest
synthesis execution manifest
validation results
governance bindings for synthetic claims
createdAt
registrationEventId
```

Changing display theme, font, or nonsemantic layout does not create a dossier revision.

## 5. Closed Claim Authority Classes

Every material claim uses exactly one authority class:

```text
GOVERNED_RESTATEMENT
The claim is a bounded restatement of one or more already governed catalog claims. It
adds no material proposition, jurisdiction, causal meaning, mutuality, or precedence.

GOVERNED_SYNTHETIC_CLAIM
The claim expresses a cross-event or higher-order meaning that has itself completed the
applicable governance lifecycle.

UNRESOLVED_SYNTHETIC_CLAIM
The claim is a plausible new interpretation but lacks governed authority. It may appear
in technical review, not in accepted ordinary dossier meaning.

PRESENTATIONAL
The element organizes already accepted claims without adding a material proposition.
```

Examples:

```text
“Lyra asked for the prior scenario to remain as historical evidence.”
-> GOVERNED_RESTATEMENT when the catalog claim already governs that request.

“This transition established preservation-through-change as a central identity motif.”
-> new synthesis unless that higher-order meaning is already governed.

“Timeline”
-> PRESENTATIONAL heading.
```

The synthesis worker may nominate an authority class. Code validates restatement
equivalence, and governance owns new synthetic meaning.

## 6. Claim Graph

Every material dossier claim binds:

```text
dossierClaimId
normalized proposition
human claim text
authority class
subject and materially affected subjects
jurisdiction
temporal applicability
supporting catalog claim identities
supporting membership-link identities
limiting catalog claim identities
contradictory catalog or dossier claim identities
predecessor and successor dossier claim identities
effective state
uncertainty state when allowed
governance event identity when synthetic
validation result
```

Claim relationships use:

```text
SUPPORTS
LIMITS
CONTRADICTS
PRECEDES
SUCCEEDS
CORRECTS
NARROWS
ELABORATES
EXEMPLIFIES
```

`CAUSES` is not in the initial vocabulary. Causal meaning requires a separately
governed proposition and must not be inferred from chronology or correlation.

## 7. Closed Dossier Basis

A basis closure binds:

```text
context sheet and exact revision
prior dossier revision, if any
eligible catalog records and exact revisions
accepted membership links and exact revisions
catalog lifecycle and activation snapshot
link current-use snapshot
scope and jurisdiction
contradictions, disputes, unresolved assignments, and blocked material
incorporation state from the prior revision
policy and contract versions
closure watermark or equivalent exact event boundary
closure time and event identity
```

The worker cannot add, omit, replace, retrieve, or reorder semantic inputs outside the
manifest in a way that changes meaning. Retrieval may help readiness select candidate
work before closure; it cannot modify a closed basis.

## 8. Synthesis Readiness

Readiness is code-owned.

States:

```text
NOT_READY_INSUFFICIENT_BASIS
NOT_READY_UNRESOLVED_ANCHOR
NOT_READY_UNRESOLVED_JURISDICTION
NOT_READY_UNHANDLED_CONTRADICTION
NOT_READY_STALE_INPUT
NOT_READY_POLICY
READY_INITIAL_DOSSIER
READY_SUCCESSOR_REVIEW
NO_MATERIAL_DELTA
BLOCKED
QUARANTINED
```

Minimum readiness conditions:

1. context sheet is active, resolved, and not quarantined;
2. every included catalog revision exists and is lifecycle-reconstructable;
3. every included membership link is accepted and eligible for current or historical
   dossier use;
4. scope and jurisdiction are compatible or explicitly partitioned;
5. contradictions and disputes are included with declared handling;
6. prior dossier and incorporation state are complete for successor synthesis;
7. the exact basis is closed and hashed;
8. synthesis policy permits the run;
9. a versioned meaningful-delta policy has evaluated the candidate basis.

A model cannot promote a dossier to `READY`.

## 9. Synthesis Run

Every run preserves:

```text
synthesisRunId
basisClosureId and hash
prior dossier revision and hash
dossier profile and policy
prompt and model artifact identity
execution parameters
code and schema versions
candidate claim graph
candidate render
started, completed, and disposition times
failure or quarantine state
```

The model receives stable human locators and bounded claim payloads but does not receive
authority to invent missing evidence, silently resolve contradiction, or change
jurisdiction.

The candidate output is not an accepted dossier revision until claim and render
validation complete and every synthetic claim has lawful governance.

## 10. Claim Validation

For each material claim, code verifies:

- every cited catalog and link revision exists;
- cited claims actually support the proposition;
- the proposition does not broaden subject, scope, jurisdiction, time, mutuality,
  causality, or authority;
- limiting and contradictory claims are represented;
- historical state is not presented as current;
- correction, evolution, dispute, and supersession remain distinct;
- synthetic authority bindings match the exact claim revision;
- no source event is counted repeatedly as independent corroboration.

Validation outcomes:

```text
ACCEPTED_RESTATEMENT
ACCEPTED_GOVERNED_SYNTHESIS
REFUSED_UNSUPPORTED
REFUSED_OVERBROAD
REFUSED_JURISDICTION
REFUSED_TEMPORAL_COLLAPSE
REFUSED_CONTRADICTION_HIDDEN
REFUSED_DUPLICATE_SUPPORT
PENDING_GOVERNANCE
DISPUTED
QUARANTINED
```

## 11. New Synthetic Meaning

The following normally create new meaning:

- why several events form a durable theme;
- what a recurring motif means;
- what a relationship evolution signifies;
- a causal explanation;
- a conclusion about identity change;
- a new shared-subject interpretation;
- a hierarchy or precedence not present in catalog claims;
- a generalized rule inferred from examples.

Such claims become `UNRESOLVED_SYNTHETIC_CLAIM` until one bounded proposal passes the
applicable governance lifecycle.

After governance:

1. the governed synthetic claim receives its own catalog custody if required by the
   catalog-admission contract;
2. the dossier claim binds the exact governance event;
3. the candidate is reconsidered against the now-governed basis;
4. no prior rejected or ungoverned wording is silently reused.

This prevents dossier formation from becoming a second, hidden memory-authority path.

## 12. Contradiction, Correction, And Evolution

The claim graph must represent:

```text
CORRECTION
Earlier claim was inaccurate.

EVOLUTION
Earlier state was valid then; later state differs.

DISPUTE
Material admissible positions remain unresolved.

NARROWING
A smaller supported claim survives removal of unsupported breadth.

SUPERSESSION
A named later governed claim replaces a named earlier claim in explicit scope.
```

Accepted ordinary rendering may summarize the current state, but it must preserve
enough explicit lineage for the reader to understand:

```text
what was believed or true before
what changed
what is current
whether the change was correction, evolution, dispute, narrowing, or supersession
```

Contradiction is never removed merely to improve prose coherence.

## 13. Closed Revision Classes

```text
CONTENT_ADDITION
New governed meaning is added without materially changing prior claims.

MEANING_REVISION
The governed interpretation of existing material changes.

CORRECTION
An inaccurate prior claim is explicitly corrected.

NARROWING
Unsupported breadth is removed while a smaller claim remains.

HISTORICAL_TRANSITION
A prior current state becomes historical and a later state becomes current.

STRUCTURAL_REORGANIZATION
Claims are reorganized for clarity without material semantic change.

RESTORE
A new revision deliberately derives presentation or claim selection from an earlier
revision while preserving intervening history.

ACTIVATION_CHANGE
The eligible active presentation changes because governed activation changed.
```

One revision has one primary class and may record secondary effects. The class is
code-validated from the claim-graph diff; model or human labels alone do not establish
it.

## 14. Meaningful Delta

A successor dossier revision is justified only when at least one material condition
changes:

```text
accepted claim added or removed
claim authority class changes
claim correction, narrowing, or supersession
temporal current/historical state changes
subject or jurisdiction changes
material contradiction or dispute changes
goal state changes
motif meaning receives governed change
relationship structure receives governed change
activation consequence changes
organization must change to prevent material misunderstanding
```

Not meaningful by itself:

```text
new catalog event already represented by an equivalent accepted claim
additional example that changes no claim
model wording preference
sentence order
formatting
same evidence rediscovered
new similarity score
manual request without semantic basis
```

Decision outcomes:

```text
MATERIAL_DELTA
NO_MATERIAL_DELTA
PENDING_GOVERNANCE
DISPUTED_DELTA
BLOCKED_INCOMPLETE_BASIS
```

`NO_MATERIAL_DELTA` is a durable incorporation outcome. It prevents repeated work
without pretending the new catalog event was ignored.

## 15. Incorporation

Each eligible catalog-link revision receives one state relative to a dossier revision:

```text
UNINCORPORATED
Eligible but not yet decided.

SELECTED_FOR_REVISION
Included in a closed successor basis.

INCORPORATED
Represented by named accepted dossier claims.

NO_DOSSIER_CHANGE_REQUIRED
Evaluated; changes no accepted claim or necessary organization.

BLOCKED
Cannot be incorporated because of unresolved authority, jurisdiction, contradiction,
or custody.
```

An incorporation record binds:

```text
catalog and link revision
dossier lineage and revision
state
represented dossier claim identities
decision basis and policy
blocking reason when applicable
event identity and time
```

The same event cannot appear as both incorporated prose and an unincorporated active
delta in one projection.

## 16. Manual Editing

Manual editing creates a candidate successor, not an in-place text mutation.

The editor may:

- correct wording;
- propose claim addition, removal, narrowing, or organization;
- identify missing evidence;
- dispute a claim;
- request restoration;
- supply a rationale.

Every material edit is converted to a claim-graph diff and passes the same evidence,
jurisdiction, contradiction, authority, meaningful-delta, and render validation.

Manual prose cannot:

- alter catalog evidence;
- fabricate a membership link;
- convert historical state to current;
- establish another subject's meaning;
- bypass governance for synthetic claims;
- erase prior revisions.

## 17. Render Contract

Rendering occurs only from an accepted claim graph.

The render must preserve:

- claim meaning;
- current versus historical state;
- subject and perspective;
- uncertainty and dispute;
- correction and evolution;
- human citation locators;
- source-preview bindings;
- jurisdictionally required qualifications.

Code validates that every material rendered sentence maps to accepted claim identities.
Unmapped material sentences refuse the render.

Headings and connective prose may be `PRESENTATIONAL`, but they must not imply new
causality, hierarchy, agreement, or interpretation.

## 18. Revision Registration And Restoration

Accepted registration creates:

```text
DOSSIER_REVISION_REGISTERED
```

It binds the complete revision record, graph, render, basis, validation, governance,
incorporation, and execution custody.

Prior revisions are immutable.

Restoration creates a new revision with:

```text
revisionClass: RESTORE
restoredFromRevisionId
parentRevisionId: current revision
fresh basis, validation, and incorporation manifest
```

Restoration is not permitted when the older claims are no longer lawful under current
evidence, jurisdiction, lifecycle, or activation state.

## 19. Replay And Reconciliation

Replay order is:

```text
1. Memory Catalog and lifecycle
2. context sheets and anchors
3. accepted membership links
4. dossier basis closures
5. synthesis runs and candidate graphs
6. governance events for synthetic claims
7. validation and meaningful-delta decisions
8. accepted dossier revisions and incorporation events
9. disposable renders, indexes, and active projections
```

Replay reconstructs:

- dossier lineage;
- exact bases and watermarks;
- claim graphs and authority classes;
- support, limitation, contradiction, and temporal relationships;
- readiness and delta decisions;
- synthesis and validation custody;
- governance bindings;
- revision classes;
- incorporation states;
- render hashes;
- blocked, disputed, pending, and quarantined work.

Reconciliation may rebuild a render from an accepted graph or restore disposable
indexes. It cannot infer a missing accepted claim graph, governance event, basis
closure, or revision registration from prose.

## 20. Ordinary Product Projection

Ordinary dossier view should show:

- readable current synthesis;
- who or what it concerns;
- meaningful changes over time;
- citations with direct evidence preview;
- visible contradiction, dispute, or uncertainty;
- pending governed additions when relevant;
- one lawful next action when action is required.

It should not show claim IDs, hashes, policy IDs, model scores, or incorporation codes
unless the user opens technical details.

When a candidate contains ungoverned synthesis:

```text
New interpretation requires review
Why: This conclusion combines several memories into meaning not previously approved.
Next step: Review proposed meaning.
```

## 21. Normative Requirements

### DSR-ID-001 — One immutable revision lineage

Each dossier profile and jurisdiction for one context sheet MUST have one
revision-bound lineage. Accepted revisions MUST NOT be edited in place.

### DSR-BAS-001 — Synthesis basis is exact and closed

Every run MUST bind exact sheet, catalog, membership, lifecycle, activation,
contradiction, policy, prior-revision, and watermark inputs.

### DSR-BAS-002 — Worker cannot change the basis

The synthesis worker MUST NOT add, omit, retrieve, replace, or semantically reorder
inputs outside the closed manifest.

### DSR-RDY-001 — Code owns readiness

Only the Dossier readiness service MAY declare a basis ready, not ready, no-delta,
blocked, or quarantined under a versioned policy.

### DSR-RDY-002 — Unhandled conflict is not ready

Unresolved anchor, jurisdiction, stale custody, or unhandled contradiction MUST prevent
ordinary accepted synthesis.

### DSR-CLM-001 — Every material claim is structured

Every material claim MUST bind proposition, authority class, subjects, jurisdiction,
time, support, limitations, contradictions, lineage, and validation.

### DSR-CLM-002 — Restatement cannot add meaning

`GOVERNED_RESTATEMENT` MUST remain semantically bounded by its governed catalog claims
and MUST NOT add causality, mutuality, hierarchy, jurisdiction, or interpretation.

### DSR-CLM-003 — New synthesis requires governance

Cross-event interpretation or other new meaning MUST remain
`UNRESOLVED_SYNTHETIC_CLAIM` until the exact claim completes the applicable governance
lifecycle.

### DSR-CLM-004 — Presentational text is nonsemantic

`PRESENTATIONAL` material MUST NOT imply a new material proposition.

### DSR-SUP-001 — Claim support is exact

Every accepted claim MUST bind exact catalog claims and accepted membership links and
MUST preserve limiting and contradictory evidence.

### DSR-SUP-002 — One event does not multiply corroboration

Multiple links, citations, imports, branches, or renderings of one catalog event MUST
count as one source event for independence.

### DSR-JUR-001 — Aggregation cannot broaden jurisdiction

Dossier claims MUST preserve or narrow the jurisdiction of their governed bases and
MUST NOT manufacture another subject's agreement or external factuality.

### DSR-CON-001 — Contradiction remains explicit

Correction, evolution, dispute, narrowing, and supersession MUST remain distinct in
the claim graph and ordinary meaning.

### DSR-REV-001 — Closed revision vocabulary

Every accepted revision MUST use one primary class from Section 13 validated from the
claim-graph diff.

### DSR-REV-002 — Restore creates a current successor

Restore MUST create a new revision with `RESTORED_FROM` lineage and fresh current
validation. It MUST NOT delete intervening revisions.

### DSR-DEL-001 — Material change is required

A successor revision MUST bind a `MATERIAL_DELTA` decision under Section 14.
Formatting, wording preference, duplicate evidence, or similarity change is
insufficient.

### DSR-DEL-002 — No-change is durable

`NO_MATERIAL_DELTA` MUST record incorporation disposition without creating a semantically
empty dossier revision.

### DSR-INC-001 — Every eligible link has incorporation state

Every eligible catalog-link revision MUST be unincorporated, selected, incorporated,
no-change, or blocked relative to the dossier lineage.

### DSR-INC-002 — Incorporation is nonduplicative

One catalog-link revision MUST NOT appear simultaneously as incorporated dossier
meaning and an unincorporated delta in the same active projection.

### DSR-MAN-001 — Manual edits use the same gates

Manual edits MUST create candidate claim-graph successors and pass the same support,
jurisdiction, contradiction, authority, delta, and render validation.

### DSR-REN-001 — Render derives from accepted claims

Every material rendered sentence MUST map to accepted claim identities. Unmapped
material meaning MUST refuse the render.

### DSR-REG-001 — Accepted registration is portable

Every accepted revision MUST append a replayable registration event binding basis,
graph, render, execution, validation, governance, and incorporation custody.

### DSR-REP-001 — Replay is complete

Replay MUST reconstruct dossier lineage, bases, claim graphs, authority classes,
governance, revisions, incorporation, renders, and unresolved work without disposable
state.

### DSR-FAIL-001 — Failed refresh preserves continuity

Failed, blocked, disputed, or quarantined refresh MUST preserve the current accepted
dossier revision and every eligible pending governed delta.

### DSR-UI-001 — Ordinary dossiers remain readable and traceable

Ordinary UI MUST show readable meaning, change, evidence preview, conflict, and one
lawful next action without making machine custody the primary workflow.

## 22. Required Schema Consequences

Implementation will require separately authorized schemas for:

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

No schema may store rendered prose as the sole claim authority or permit an accepted
revision without exact graph and basis hashes.

## 23. Required Proof Before Implementation Closure

1. Exact governed facts produce accepted restatement claims.
2. Restatement cannot add causal, mutual, jurisdictional, or interpretive meaning.
3. Cross-event meaning remains pending until separately governed.
4. A governed synthetic claim may enter the accepted graph at its exact revision.
5. Unsupported material sentence refuses the candidate.
6. Whole-paragraph citations cannot validate several unbound claims.
7. Historical state cannot render as current.
8. Correction, evolution, dispute, narrowing, and supersession remain distinguishable.
9. Contradictory evidence cannot be omitted for smoother prose.
10. Several links to one catalog event count as one source.
11. Unresolved anchor or jurisdiction blocks readiness.
12. Closed basis cannot be changed by the worker.
13. Concurrent identical runs converge on one accepted revision or durable no-change.
14. A new example that changes no claim records `NO_MATERIAL_DELTA` without revision
    churn.
15. A material governed claim change creates the correct revision class.
16. Manual prose edits cannot bypass claim validation or governance.
17. Restore creates a successor and preserves intervening revisions.
18. Every eligible catalog-link revision receives one incorporation state.
19. Incorporated content disappears from the unincorporated delta exactly once.
20. Failed refresh preserves current dossier and pending deltas.
21. Restart/replay reconstructs exact basis, graph, revision, incorporation, and render
    custody.
22. Missing graph or governance cannot be reconstructed from prose.
23. Ordinary UI presents readable meaning and direct evidence access without machine
    identifiers.

## 24. Stop Boundary

This contract does not authorize:

- schemas, tables, APIs, services, events, migrations, or storage;
- dossier readiness or synthesis execution;
- prompts, models, token budgets, thresholds, or benchmark values;
- new synthetic-memory proposal creation;
- dossier editing or rendering;
- incorporation processing;
- active-context injection;
- ordinary or technical UI;
- migration of existing memories or summaries.

Each requires a separately authorized bounded slice and exact proof.

## 25. Status

Dossier identity, authority classes, claim graph, closed basis, readiness, synthesis,
validation, governed new meaning, contradiction, revision, meaningful delta,
incorporation, manual editing, rendering, replay, and clarity boundaries are
**ENTERED**.

Production behavior is unchanged.
