# Phase X: Context-Sheet Membership Link Contract

**Version:** 0.1.0
**Status:** ENTERED — nomination, validation, correction, contradiction, lineage,
replay, and refusal boundaries are normative; schemas and implementation remain
unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 1. Problem

The catalog now has governed records, and context sheets have stable anchors. The
system still needs to determine whether and how one catalog event belongs on one
context sheet.

Without an exact membership-link contract:

- similarity could silently become evidence;
- a statement attributed to Jeep could become direct evidence that Jeep said it;
- a historical event could be presented as current state;
- one event could be duplicated to inflate corroboration;
- a contradiction could be hidden as ordinary topic relevance;
- merge or split could rewrite old links;
- an operator correction could become an unsupported semantic override;
- dossier synthesis could cite a sheet association with no reproducible basis.

## 2. Governing Distinctions

```text
Catalog record
The immutable governed event or meaning.

Context sheet
The stable semantic anchor around which continuity is organized.

Membership link
A claim-level, typed assertion that one exact catalog revision is relevant to one exact
context-sheet anchor in a declared way.

Nomination
A reversible suggestion that a link may be supported.

Validation
A code-owned decision that the proposed link type, claims, scope, jurisdiction, and
basis satisfy the governing contract.

Correction
An immutable successor decision that changes, narrows, disputes, or removes a prior
link from current use without erasing it.
```

A link is not:

- a copy of the catalog event;
- proof that two anchors are identical;
- authority to activate a memory;
- authority to change catalog lifecycle;
- proof of every claim in a dossier;
- an embedding edge;
- graph layout.

## 3. Authority Gate

### Governing contracts

- The Capture Observation RFC governs exact source claims, actors, subjects,
  attributions, antecedents, and uncertainty.
- The Memory Catalog child contract governs the linked governed record.
- The Context-Sheet Anchor contract governs the linked anchor and sheet lifecycle.
- The parent architecture governs the initial link vocabulary and jurisdiction.
- This contract governs link nomination, validation, correction, and replay.

### Authoritative sources

1. The exact catalog revision owns the governed event meaning.
2. The exact context-sheet revision owns the anchor and jurisdiction.
3. Catalog evidence and claim bindings own what the event supports.
4. Membership-link validation events own accepted catalog-to-sheet relationships.
5. Membership-link successor events own corrections and current-use changes.
6. Retrieval results, candidate clusters, graph edges, and UI grouping are
   projections or nominations.

### Projection boundary

The following may nominate but cannot validate a link:

- embeddings;
- reranker scores;
- keyword or title match;
- co-occurrence;
- graph proximity;
- dossier prose;
- model confidence;
- same speaker or subject alone;
- current UI selection;
- another membership link.

### Lifecycle owner

The server-side Membership Link service owns:

```text
nomination intake
exact target resolution
type-specific validation
claim-basis validation
jurisdiction checks
deduplication
successor and removal decisions
merge/split remapping admission
replay and reconciliation
```

### Failure behavior

- Unsupported nominations refuse or remain nominated.
- Ambiguous anchors remain unresolved.
- Unresolved antecedents remain explicit.
- Jurisdiction mismatch refuses.
- Contradictions cannot be downgraded to ordinary relevance.
- Missing catalog or sheet revisions quarantine the affected link.
- Failure preserves catalog records, sheets, prior links, and correction requests.

## 4. Closed Link Vocabulary

```text
DIRECT
The governed catalog claim directly concerns the context sheet's canonical anchor.

ATTRIBUTED
The catalog claim records an eligible attribution concerning the anchor. It proves the
attribution occurred, not that the attributed antecedent is true or resolved.

INTERPRETIVE
The governed catalog claim supports a bounded interpretation associated with the sheet
but does not directly establish the anchor or all broader sheet meaning.

HISTORICAL
The catalog claim establishes an earlier state, transition, origin, or lineage
relevant to the sheet.

CONTRADICTORY
The catalog claim materially conflicts with a named catalog claim, dossier claim, or
governed state associated with the sheet.
```

These types are not mutually exclusive in principle. One catalog-sheet pair may have
separate links of different types when each has a distinct claim basis. A single link
must use exactly one type.

## 5. Type-Specific Qualification

### Direct

`DIRECT` requires:

- a resolved context-sheet anchor;
- one or more exact governed catalog claims;
- an exact identity or subject/action/object relationship to that anchor;
- compatible memory scope and jurisdiction;
- no unresolved attribution standing in for direct evidence.

Examples:

```text
Lyra directly states a self-boundary
-> DIRECT link to Lyra

Chris and Jeep explicitly adopt an architecture decision
-> DIRECT link to the named architecture topic or project

Chris says “Jeep proposed X”
-> not DIRECT evidence that Jeep proposed X
```

### Attributed

`ATTRIBUTED` requires:

- an exact governed attribution claim;
- canonical local speaker preserved;
- attributed actor or subject represented as resolved or explicitly unresolved;
- antecedent state recorded as `RESOLVED`, `UNRESOLVED`, `UNAVAILABLE`, or
  `DISPUTED`;
- no conversion of local attribution into antecedent truth.

If the original antecedent later resolves, the `ATTRIBUTED` link remains truthful
history. A separate successor or additional link may record the newly governed direct
basis.

### Interpretive

`INTERPRETIVE` requires:

- a governed interpretive claim, not merely raw topical similarity;
- exact supporting catalog claim bindings;
- named subject and jurisdiction;
- bounded proposition explaining the relevance to the anchor;
- limiting and contradictory evidence when applicable.

An interpretive link cannot expand the catalog event beyond its governed meaning.

### Historical

`HISTORICAL` requires:

- an exact earlier state, transition, origin, predecessor, or effective interval;
- a stated relationship to the sheet's history;
- temporal qualification;
- preservation of current-versus-historical distinction.

Historical linkage does not reactivate a dormant, withdrawn, or superseded catalog
record.

### Contradictory

`CONTRADICTORY` requires:

- the contradicting catalog claim;
- at least one exact contradicted target claim or governed state;
- the material dimension of conflict;
- jurisdiction and temporal overlap analysis;
- conflict state and any governing disposition.

Different times, jurisdictions, perspectives, or scopes are not automatically
contradictory. They may represent evolution, parallel viewpoints, or non-overlapping
claims.

## 6. Link Identity And Minimum Record

Each accepted link has an immutable `membershipLinkId`.

The semantic deduplication key binds:

```text
catalogId and exact catalog revision
contextSheetId and exact anchor revision
link type
normalized linked catalog claim identities
normalized target claim identities when applicable
jurisdiction
temporal scope
validation policy version
```

Minimum accepted record:

```text
membershipLinkId
catalogId
catalogRevisionId
catalogClaimIds
contextSheetId
contextSheetRevisionId
canonicalAnchorId
linkType
targetClaimIds
claimBasisHash
scope and jurisdiction
temporalApplicability
antecedentState when attributed
contradictionDimension when contradictory
validationState
validationMethod
governingPolicyVersion
createdFromNominationId
validatedBy
validatedAt
validationEventId
successorLinkId
supersedesLinkId
currentUseState
```

The record references the catalog entry; it never copies it into a second authority
record.

## 7. Nomination

A nomination binds:

```text
nomination identity
catalog and exact revision
candidate context sheet and exact revision
proposed link type
proposed catalog and target claims
proposed jurisdiction and time
reason
origin: deterministic rule, model, retrieval, subject, or operator
retrieval or model diagnostics when applicable
created at
```

Nomination states are:

```text
PENDING_VALIDATION
DEFERRED_UNRESOLVED_ANCHOR
DEFERRED_MISSING_CLAIM_BASIS
REFUSED
CONSUMED
```

A nomination is auditable but cannot participate in dossiers or active continuity as
an accepted relationship.

## 8. Validation Methods

Closed initial validation methods:

```text
DETERMINISTIC_CANONICAL_BINDING
Exact catalog metadata and resolved anchor identity satisfy a declared link rule.

GOVERNED_CLAIM_BINDING
The governed catalog claim explicitly binds the anchor, proposition, jurisdiction, and
relationship required by the link type.

HUMAN_ASSISTED_REVIEW
An attributable person supplies or corrects a candidate basis; code revalidates the
result under the same rules.
```

Human assistance cannot declare an unsupported link valid. Model judgment may be part
of a governed interpretive claim upstream, but model output is not itself a membership
validation method.

Validation decisions:

```text
ACCEPTED
REFUSED_UNSUPPORTED
REFUSED_TYPE_MISMATCH
REFUSED_SCOPE_MISMATCH
REFUSED_JURISDICTION_MISMATCH
REFUSED_STALE_REVISION
REFUSED_DUPLICATE
DEFERRED_UNRESOLVED_ANCHOR
DEFERRED_UNRESOLVED_ANTECEDENT
DISPUTED
QUARANTINED
```

Only `ACCEPTED` creates a current-use membership link.

## 9. Claim-Level Basis

Every accepted link maps named catalog claims to the relationship being asserted.

The basis must answer:

```text
Which exact governed claim concerns this anchor?
How does it concern the anchor?
Within whose jurisdiction?
At what time?
What does it not establish?
Which contradictory or limiting claims apply?
```

Whole-record relevance is insufficient when only one claim supports the link.

For `CONTRADICTORY`, the basis must name both sides. For `ATTRIBUTED`, it must name the
local attribution claim and antecedent state. For `INTERPRETIVE`, it must name the
bounded proposition rather than rely on topical similarity.

## 10. Scope And Jurisdiction

A link cannot broaden the catalog claim's jurisdiction.

Examples:

```text
Self-subject claim
-> may link to that subject's entity sheet within its self-subject jurisdiction
-> does not establish shared relationship meaning

Shared-subject governed claim
-> may link to the relationship sheet and applicable participant sheets
-> each link retains the shared jurisdiction

Shared-world event
-> may link to shared-world places, objects, motifs, and relationships
-> cannot become an external factual assertion

Operator preservation record
-> may link to a discovery or retention view
-> does not become another subject's interpreted memory
```

Cross-scope links require the separately authorized scope policy and exact eligible
source custody. Similarity never bridges scopes.

## 11. Multiple Links And Non-Duplication

One catalog record may inform several sheets:

```text
one governed commitment
-> DIRECT relationship sheet link
-> DIRECT participant entity links
-> HISTORICAL era link
-> INTERPRETIVE trust-topic link
```

This does not duplicate the catalog record. Dossier and retrieval accounting must use
catalog identity to avoid counting one event as several independent corroborations.

Two links from one catalog record may support different claims, but they remain one
source event for independence and corroboration calculations.

Copied branch ancestors, imported duplicates, or alternate renderings must not inflate
support merely because they produced several link records.

## 12. Contradiction And Evolution

Before accepting `CONTRADICTORY`, validation must test:

- same material proposition;
- overlapping applicable time;
- compatible jurisdiction;
- compatible subject perspective;
- genuinely incompatible truth conditions.

If an earlier state was valid and later changed, the proper relationship is normally
`HISTORICAL` plus explicit lifecycle or successor lineage, not contradiction.

If two subjects lawfully hold different interpretations, both may link to a shared
sheet with preserved perspective. They become contradictory only when the governed
claims make incompatible assertions within the same jurisdiction.

No ordinary link validation resolves the contradiction. Resolution remains with the
applicable governance lifecycle.

## 13. Correction And Successor Semantics

Accepted links are immutable.

Correction events may produce:

```text
LINK_CONFIRMED
No semantic change; the reviewed link remains current.

LINK_RETYPED
A successor link uses a corrected link type.

LINK_NARROWED
A successor retains fewer claims, time, scope, or jurisdiction.

LINK_EXPANDED
A successor adds newly governed claim basis.

LINK_DISPUTED
Current use is suspended or marked disputed according to policy.

LINK_REMOVED_FROM_CURRENT_USE
The historical link remains, but current dossier formation must not use it.

LINK_REMAPPED
A context-sheet merge or split creates an explicit successor target.
```

Removal from current use does not delete the catalog event, context sheet, nomination,
link, or prior dossier derivation.

A human correction request supplies a candidate reason and evidence. The Membership
Link service owns the resulting validation decision.

## 14. Merge And Split Impact

Context-sheet merge and split never rewrite membership links in place.

### Merge

For every current link to a redirected sheet, impact processing records one:

```text
REMAPPED_TO_SURVIVING_SHEET
REQUIRES_REVALIDATION
REMAINS_HISTORICAL_ONLY
DISPUTED
```

Remapping requires type, anchor, claim, jurisdiction, and temporal compatibility with
the surviving sheet.

### Split

Every current link receives:

```text
one exact target successor
multiple explicitly justified target successors
an unresolved assignment
a disputed assignment
historical-only retention
```

No link is copied to all split targets by default.

## 15. Link Lifecycle And Current Use

Validation state and current-use state are independent.

Validation states:

```text
ACCEPTED
REFUSED
DEFERRED
DISPUTED
QUARANTINED
```

Current-use states:

```text
CURRENT
SUPERSEDED
HISTORICAL_ONLY
REMOVED
BLOCKED
```

An accepted link may later become historical-only without becoming false. A disputed
link may remain visible while blocked from dossier synthesis. A superseded link remains
auditable.

## 16. Replay And Reconciliation

Replay order is:

```text
1. governed Memory Catalog
2. context-sheet anchors and lifecycle
3. membership nominations
4. validation events
5. correction and successor events
6. merge/split remapping events
7. disposable indexes, dossier inputs, and graph projections
```

Replay reconstructs:

- nominations and origins;
- accepted and refused decisions;
- exact claim bases;
- type, scope, jurisdiction, and temporal applicability;
- antecedent and contradiction states;
- successor lineage;
- current-use state;
- merge/split assignments;
- deduplication keys;
- disputed, deferred, and quarantined work.

Reconciliation may rebuild projections or complete an already-authorized idempotent
event effect. It cannot infer missing link authority from dossier prose, graph edges,
retrieval results, or expected grouping.

## 17. Ordinary Product Projection

Ordinary UI should explain the relationship, not expose the link machinery.

Examples:

```text
Directly concerns: Lyra

Attributed to Jeep
Original statement not yet located
Next step: Find source

Part of this history
Earlier state; not current

Related interpretation
Why: This event changed how trust was understood

Conflicts with current claim
Review both sources
```

The operator must be able to preview the linked evidence and the bounded reason. Raw
link IDs, hashes, validation codes, and model scores remain technical.

## 18. Normative Requirements

### LNK-TYP-001 — Closed link vocabulary

Every accepted link MUST use exactly one of `DIRECT`, `ATTRIBUTED`, `INTERPRETIVE`,
`HISTORICAL`, or `CONTRADICTORY`.

### LNK-ID-001 — Link identity is immutable and claim-bound

Every accepted link MUST bind exact catalog and sheet revisions, link type, named
claims, jurisdiction, temporal scope, policy, and immutable identity.

### LNK-SEP-001 — Link is not authority duplication

A link MUST reference rather than copy catalog authority and MUST NOT create evidence,
anchor identity, activation, catalog lifecycle, or dossier authority.

### LNK-NOM-001 — Nomination is reversible and non-active

Every nomination MUST preserve its exact origin and basis and MUST NOT participate in
dossier or active continuity as an accepted relationship.

### LNK-NOM-002 — Similarity nominates only

Embeddings, reranking, keywords, co-occurrence, titles, model confidence, and graph
proximity MUST NOT validate a link.

### LNK-VAL-001 — Code owns validation

Only the server-side Membership Link service MAY accept, refuse, defer, dispute, or
quarantine a nomination under a versioned policy.

### LNK-VAL-002 — Human assistance is not override

Human input MAY supply or correct candidate basis but MUST pass the same claim, anchor,
scope, jurisdiction, temporal, and type validation.

### LNK-CLM-001 — Material relationship is claim-level

Every accepted link MUST name the exact governed catalog claims that support the
asserted relationship. Whole-record topical relevance is insufficient.

### LNK-DIR-001 — Direct requires direct governed basis

`DIRECT` MUST bind an exact identity or subject/action/object relationship to the
resolved anchor and MUST NOT substitute attribution or similarity.

### LNK-ATT-001 — Attribution remains attribution

`ATTRIBUTED` MUST preserve canonical speaker, attributed participant, and antecedent
state and MUST NOT establish antecedent truth.

### LNK-INT-001 — Interpretation is bounded

`INTERPRETIVE` MUST bind a governed proposition, exact support, subject, jurisdiction,
and limitations and MUST NOT expand the catalog event's governed meaning.

### LNK-HIS-001 — Historical is temporally qualified

`HISTORICAL` MUST identify the earlier state, transition, origin, or interval and MUST
NOT reactivate inactive catalog authority.

### LNK-CON-001 — Contradiction names both sides

`CONTRADICTORY` MUST bind the conflicting claims, material dimension, temporal overlap,
jurisdiction, perspective, and governing disposition state.

### LNK-CON-002 — Evolution is not contradiction

Different valid times, jurisdictions, or perspectives MUST NOT be labeled
contradictory merely because wording or outcomes differ.

### LNK-JUR-001 — Links cannot broaden jurisdiction

Every link MUST preserve or narrow the catalog claim's scope and jurisdiction and MUST
NOT convert self-subject, shared-subject, shared-world, or external-fact meaning into
another class.

### LNK-MUL-001 — Multiple links do not multiply evidence

Several links from one catalog record MUST remain one source event for corroboration,
independence, and evidence-counting purposes.

### LNK-DED-001 — Identical semantic basis converges

Concurrent or repeated nominations with the same semantic key MUST converge on one
authoritative validation decision and at most one accepted link.

### LNK-SUC-001 — Correction creates a successor

Retyping, narrowing, expansion, dispute, removal, or remapping MUST create immutable
successor lineage and MUST NOT mutate a prior accepted link.

### LNK-REM-001 — Removal does not delete history

Removal from current use MUST preserve the nomination, decision, link, catalog record,
sheet, evidence, and prior dossier derivation.

### LNK-MRG-001 — Merge remapping is revalidated

Links to merged sheets MUST receive explicit impact decisions and MUST NOT be silently
retargeted.

### LNK-SPL-001 — Split assignment is explicit

Every link on a split sheet MUST receive justified successor assignment, unresolved or
disputed status, or historical-only retention. Default copying is prohibited.

### LNK-REP-001 — Portable replay is complete

Replay MUST reconstruct nominations, decisions, claim bases, current use, successors,
and merge/split impact without disposable state.

### LNK-FAIL-001 — Missing authority fails closed

Missing catalog, anchor, claim, jurisdiction, lifecycle, or link-event custody MUST
defer, dispute, quarantine, or refuse and MUST NOT be inferred from projections.

### LNK-UI-001 — Ordinary relationships are explainable

Ordinary UI MUST show the human relationship, evidence preview, limitation or conflict,
and one lawful next action when required without making machine identifiers primary.

## 19. Required Schema Consequences

Implementation will require separately authorized schemas for:

```text
context-sheet-membership-nomination-v1
context-sheet-membership-validation-event-v1
context-sheet-membership-link-v1
context-sheet-membership-successor-event-v1
context-sheet-membership-impact-decision-v1
context-sheet-membership-reconciliation-result-v1
```

No schema may use a retrieval score as validation, omit claim identities, or mutate an
accepted link in place.

## 20. Required Proof Before Implementation Closure

1. Exact direct subject evidence accepts a `DIRECT` entity-sheet link.
2. “Chris said Jeep proposed X” cannot become direct evidence that Jeep proposed X.
3. The same attribution accepts `ATTRIBUTED` with unresolved antecedent state.
4. Resolved antecedent adds or succeeds linkage without rewriting attribution history.
5. Similarity-only topic association remains a nomination.
6. A governed bounded interpretation accepts `INTERPRETIVE` without expanding meaning.
7. Earlier valid state accepts `HISTORICAL` and remains non-current.
8. Genuine same-scope conflict accepts `CONTRADICTORY` naming both claims.
9. Different times, jurisdictions, or perspectives do not become false contradictions.
10. One event links to several sheets without duplicating catalog authority.
11. Several links from one event count as one corroborating source.
12. Cross-scope or jurisdiction-broadening link refuses.
13. Concurrent identical nominations converge on one decision and accepted link.
14. Human correction cannot force unsupported validation.
15. Retyping and narrowing preserve immutable prior links.
16. Removal from current use preserves prior dossier derivation.
17. Merge impact does not silently retarget links.
18. Split assigns each link explicitly and does not copy all evidence by default.
19. Restart/replay reconstructs identical link and current-use state.
20. Missing catalog or anchor authority cannot be repaired from graph or dossier state.
21. Ordinary UI explains direct, attributed, interpretive, historical, and
    contradictory relationships with evidence access.

## 21. Stop Boundary

This contract does not authorize:

- schemas, tables, APIs, services, event logs, or migrations;
- automatic membership nomination or validation;
- retrieval or model changes;
- catalog or context-sheet mutation;
- link correction or remapping;
- dossier synthesis;
- graph, table, or evidence-preview UI;
- migration of existing associations.

Each requires a separately authorized bounded slice and exact proof.

## 22. Status

Membership-link vocabulary, nomination, validation, claim binding, attribution,
interpretation, history, contradiction, jurisdiction, non-duplication, correction,
merge/split impact, replay, and clarity boundaries are **ENTERED**.

Production behavior is unchanged.
