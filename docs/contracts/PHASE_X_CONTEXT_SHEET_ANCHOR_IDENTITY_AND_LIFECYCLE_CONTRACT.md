# Phase X: Context-Sheet Anchor Identity And Lifecycle Contract

**Version:** 0.1.0
**Status:** ENTERED — anchor identity, alias, resolution, merge, split, redirect,
retirement, replay, and refusal boundaries are normative; schemas and implementation
remain unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 1. Problem

The parent architecture defines context sheets as stable semantic anchors that organize
governed catalog events. It does not yet specify:

- what makes two sheets the same or different;
- which fields establish identity and which are merely display labels;
- how unresolved entities and manually seeded sheets behave;
- whether models or similarity may create, merge, or split anchors;
- how relationship and group anchors bind participants;
- how a mistaken merge is repaired without rewriting history;
- what redirects and retirement mean;
- how restart and replay reproduce the same anchor graph.

Without these rules, a title change could silently change identity, similar people
could be merged, one relationship could collapse into another, or a retired sheet
could disappear with its evidence.

## 2. Governing Distinctions

```text
Context sheet
A durable organizational record for one semantic anchor in one memory scope.

Canonical anchor
The stable identity the sheet concerns, established by code-owned or governed identity
resolution.

Display title
Human-readable presentation. It may change without changing identity.

Alias
An attributable alternate label linked to one anchor under a declared scope and time.

Unresolved anchor
A durable, source-bound identity lead that has not lawfully resolved to a canonical
anchor.

Merge
A replayable decision that two sheet identities refer to one canonical anchor.

Split
A replayable decision that one sheet improperly combined two or more anchors.

Redirect
A durable lookup rule from a non-current sheet identity to its lawful successor.

Retirement
Removal from ordinary active organization without deletion, merge, or denial of
historical existence.
```

These are separate:

```text
title change != alias creation != identity resolution
merge != redirect != retirement
split != deletion
similarity != identity
```

## 3. Authority Gate

### Governing contracts

- The Phase X capture vocabulary contract governs unresolved participant leads and
  prohibits model-authored canonical identity.
- The Memory Catalog contract governs immutable governed event identity and lifecycle.
- The parent architecture governs sheet types, scope, jurisdiction, and projection
  boundaries.
- This contract governs context-sheet anchor identity and lifecycle.

### Authoritative sources

1. Existing host and account bindings own known local participant identity where their
   governing contracts apply.
2. Governed entity-resolution records own identity resolutions that are not canonical
   host metadata.
3. Context-sheet creation events own sheet identity and initial anchor basis.
4. Alias events own attributable alternate labels.
5. Merge, split, redirect, and retirement events own sheet lifecycle changes.
6. Titles, search indexes, clusters, embeddings, and graph positions are projections.

### Projection boundary

The following cannot establish identity:

- display title;
- avatar or character-card filename alone outside its governed host binding;
- model-nominated actor or subject;
- shared name;
- text similarity;
- embedding distance;
- co-occurrence;
- context-sheet membership;
- dossier prose;
- graph proximity;
- operator convenience.

### Lifecycle owner

The server-side Context Sheet Identity service owns:

```text
sheet creation
anchor resolution
alias validation
merge and split admission
redirect creation
retirement and restoration
deduplication
cycle refusal
replay and reconciliation
```

Models and browser clients may submit nominations or attributable requests. They cannot
append authoritative lifecycle events.

### Failure behavior

- Ambiguous identity remains unresolved.
- Conflicting anchor bindings quarantine the affected sheet.
- Similarity-only merge requests refuse.
- Merge or redirect cycles refuse without mutation.
- Split requests lacking exact partition evidence remain pending or require review.
- Broken lifecycle replay quarantines affected sheets and preserves all prior records.
- Failure never reassigns catalog evidence heuristically.

## 4. Closed Context-Sheet Type Vocabulary

The parent vocabulary is:

```text
ENTITY
RELATIONSHIP
GROUP
PLACE
OBJECT
TOPIC
GOAL
PROJECT
MOTIF
RITUAL
ERA
```

The type is identity-relevant. Changing a sheet from one type to another requires an
explicit replacement or split decision; editing a label is insufficient.

`Lore`, `Topics`, and `Goals` remain navigation views and cannot be stored as canonical
sheet types.

## 5. Sheet Identity

Each context sheet has an immutable `contextSheetId`.

Creation binds:

```text
contextSheetId
memoryScopeId
sheetType
anchorState
canonicalAnchorId or unresolvedAnchorLeadId
anchorJurisdiction
creationBasis
createdBy
createdAt
creationEventId
identityPolicyVersion
```

The identity key is:

```text
memory scope
+ sheet type
+ canonical anchor identity
+ jurisdiction discriminator when required
```

For an unresolved sheet, the temporary deduplication key additionally binds the exact
source lead, source revision, and unresolved-participant basis. Resolution never
rewrites the original creation event.

Two sheets with the same title are not necessarily the same. Two sheets with different
titles may resolve to the same anchor only through an admitted merge or resolution.

## 6. Type-Specific Anchor Bases

### Entity

An `ENTITY` anchor binds one canonical semantic entity. The entity may be a person,
character, institution, or other independently identifiable participant according to
the entity-governance contract.

### Relationship

A `RELATIONSHIP` anchor binds:

```text
ordered or normalized participant identities
relationship jurisdiction
relationship kind when identity-distinguishing
directionality or symmetry rule
```

For symmetric relationships, participant ordering is canonicalized. For directional
relationships, reversing participants creates a different anchor unless the governing
relationship kind declares equivalence.

The relationship sheet does not grant either participant authority over the other's
self-subject meaning.

### Group

A `GROUP` anchor binds a governed group identity, not merely a current participant
list. Membership may change without replacing the group when the group's identity
persists. An ad hoc collection without stable identity remains unresolved or a view.

### Place and object

`PLACE` and `OBJECT` anchors bind scope-qualified semantic identities. A shared-world
place must not merge with an external-world place merely because names match.

### Topic

A `TOPIC` anchor binds one bounded subject of discussion. Topic identity is conceptual,
but it remains scope- and jurisdiction-qualified. Semantic overlap may create typed
relationships between topics; it does not automatically merge them.

### Goal

A `GOAL` anchor binds:

```text
goal subject or subjects
goal proposition
jurisdiction
temporal or lifecycle identity
```

A materially revised goal may be a successor state of one goal or a distinct goal. The
governing evidence and lifecycle decision determine which; wording similarity does not.

### Project

A `PROJECT` anchor binds a stable undertaking and its scope. Project phases normally
remain within one anchor unless a governed split establishes independent undertakings.

### Motif

A `MOTIF` anchor binds a recurring symbol and its governed contextual jurisdiction. The
parent recurrence and meaning requirements still apply.

### Ritual

A `RITUAL` anchor binds a recurring intentional practice. Repeated incidental behavior
does not establish a ritual.

### Era

An `ERA` anchor binds a bounded historical period under an explicit timeline or
transition basis. Overlapping eras are lawful and do not imply identity.

## 7. Anchor States

```text
UNRESOLVED
A source-bound lead exists, but canonical anchor identity is not established.

RESOLVED
The sheet binds one canonical anchor.

DISPUTED
Material admissible identity bases conflict.

QUARANTINED
Custody, scope, or lifecycle integrity cannot currently be reconstructed.
```

`UNRESOLVED` is a lawful durable state. It is not permission to guess.

An unresolved sheet may accumulate eligible leads for resolution, but it cannot:

- establish canonical entity identity;
- merge with a resolved sheet;
- support an active dossier claim that assumes the unresolved identity;
- bridge memory scopes;
- establish another subject's jurisdiction.

## 8. Sheet Lifecycle States

```text
ACTIVE
Current organizational sheet for its anchor.

REDIRECTED
Lookups resolve to one named current sheet after lawful merge or replacement.

SPLIT
The sheet remains historical and redirects only through an explicit partition map.

RETIRED
Excluded from ordinary active organization without asserting identity equivalence or
deleting history.

QUARANTINED
Lifecycle or authority cannot be reconstructed safely.
```

Anchor state and sheet lifecycle state are independent. A disputed active sheet and an
unresolved retired sheet are both representable.

## 9. Creation Paths

### Automatic nomination

Accumulating governed catalog entries may nominate:

- a new sheet;
- association with an existing sheet;
- possible alias;
- possible identity match;
- possible split or merge review.

Automatic output creates a durable nomination only. It does not create a resolved
anchor or lifecycle event.

### Manual seed

An attributable subject or operator may request a sheet around selected governed
material. The request binds the requester, proposed type, proposed title, intended
anchor, selected basis, scope, and time.

A manual seed may create:

- a resolved sheet when the anchor is already established by canonical metadata or a
  governed identity record;
- an unresolved sheet when the anchor is not established;
- a refused request when scope or jurisdiction is unlawful.

The requester cannot force identity, another subject's meaning, or a merge.

## 10. Titles And Aliases

A title is the preferred current display label. It is not part of canonical identity.

An alias event binds:

```text
contextSheetId
alias text
alias kind
language or locale when applicable
scope and jurisdiction
effective interval
source or attributable actor
reason
event identity and time
```

Initial alias kinds are:

```text
FORMER_NAME
ALTERNATE_NAME
DISPLAY_VARIANT
SELF_IDENTIFIED_NAME
IMPORTED_NAME
HISTORICAL_LABEL
```

A quoted name, nickname, filename, or model suggestion may nominate an alias. Only a
validated alias event creates one.

Changing the preferred title appends a title-selection event. It preserves earlier
titles as history when policy allows; it never changes `contextSheetId` or
`canonicalAnchorId`.

## 11. Identity Resolution

Resolution requires:

```text
unresolved sheet and exact revision
governed identity-resolution basis
resolved canonical anchor identity
scope and jurisdiction match
affected alias decisions
catalog-link impact analysis
decision actor or code-owned policy
policy version
event identity and time
```

The event family is:

```text
CONTEXT_SHEET_ANCHOR_RESOLVED
```

Resolution may discover that a resolved sheet already exists for the same identity key.
In that case, the system must route to explicit merge review rather than silently
attaching the unresolved sheet's history to the existing sheet.

## 12. Merge

Merge asserts that two or more context sheets concern one canonical anchor in the same
identity jurisdiction.

Minimum basis:

```text
source sheet identities and exact revisions
shared resolved canonical anchor
compatible type, scope, and jurisdiction
complete catalog-link and dossier impact manifest
alias reconciliation
selected surviving current sheet identity
merge authority and rationale
policy version
event identity and time
```

The event family is:

```text
CONTEXT_SHEETS_MERGED
```

Effects:

1. One sheet remains `ACTIVE`.
2. Other source sheets become `REDIRECTED` to it.
3. All source identities and history remain addressable.
4. Catalog membership links are not rewritten in place; successor link records may
   target the surviving sheet while prior links remain historical.
5. Dossiers require an explicit successor process.
6. Redirect lookup is deterministic and acyclic.

Required refusals:

- similarity-only basis;
- unresolved or conflicting canonical anchors;
- incompatible sheet types without a separately governed transformation;
- cross-scope or jurisdiction mismatch;
- merge into a retired or quarantined target;
- redirect cycle;
- stale source revision;
- incomplete impact manifest.

## 13. Split

Split asserts that one sheet improperly combined distinct anchors or semantic
jurisdictions.

Minimum basis:

```text
source sheet identity and exact revision
two or more target sheet identities and anchor bases
reason for distinct identity
partition map for aliases, catalog links, claims, and dossier history
explicit unresolved bucket for material that cannot be assigned
split authority and rationale
policy version
event identity and time
```

The event family is:

```text
CONTEXT_SHEET_SPLIT
```

Effects:

1. The source sheet becomes `SPLIT`.
2. Target sheets become or remain `ACTIVE`.
3. The source remains historically addressable.
4. Each old catalog link receives an explicit successor assignment, remains
   unresolved, or is disputed; no link is silently copied to every target.
5. Dossier claims follow an explicit claim partition and successor process.
6. Unassignable material remains visible.

Required refusals:

- no evidence of distinct anchors or jurisdictions;
- targets that recreate the same identity key;
- incomplete partition;
- silent evidence duplication;
- stale source revision;
- split or redirect cycle.

## 14. Redirects

A redirect is a lookup consequence of a lawful merge, split partition, or explicit
replacement. It is not independent proof of identity.

Every redirect binds:

```text
source sheet
target sheet or partition rule
authoritative lifecycle event
effective time
reason
```

Rules:

1. Redirect chains are flattened only as a projection; historical hops remain
   replayable.
2. A redirect must terminate at an active sheet or an explicit unresolved partition.
3. Self-redirects and cycles refuse.
4. A split source cannot have one unconditional target unless the split decision
   explicitly proves every lookup maps there.
5. Retired sheets do not automatically redirect.

## 15. Retirement And Restoration

Retirement means the sheet should no longer appear in ordinary active organization.
It does not mean:

- deleted;
- false;
- merged;
- superseded;
- withdrawn catalog evidence;
- stripped of citations or dossier history.

The event family is:

```text
CONTEXT_SHEET_RETIRED
```

It binds the sheet, exact revision, reason, actor or policy basis, impact on active
views, time, and event identity.

Restoration creates:

```text
CONTEXT_SHEET_RESTORED
```

It binds the retirement event and revalidates anchor, scope, jurisdiction, redirect,
and conflict state. It appends lifecycle history rather than deleting the retirement.

Retirement is prohibited as a shortcut for resolving identity disputes or hiding
contradictory governed evidence.

## 16. Deduplication And Concurrency

Creation deduplication binds the normalized identity key or unresolved-lead key,
creation policy, and exact basis.

Lifecycle decision deduplication binds:

```text
decision kind
source sheet identities and revisions
target identities when applicable
normalized basis and impact-manifest hash
policy version
```

Concurrent identical decisions converge on one authoritative event. Competing
nonidentical merge, split, redirect, resolution, or retirement decisions serialize
against exact sheet revisions. Stale decisions refuse and must be reconsidered against
the new state.

## 17. Replay And Reconciliation

Replay order is:

```text
1. canonical host and governed entity identities
2. governed Memory Catalog
3. context-sheet creation events
4. alias and title events
5. anchor-resolution events
6. merge, split, redirect, retirement, and restoration events
7. disposable indexes and views
```

Replay must reconstruct:

- every sheet and original creation basis;
- anchor and lifecycle states;
- canonical identities and unresolved leads;
- titles and alias history;
- merges and redirects;
- split partitions and unresolved assignments;
- retirements and restorations;
- deduplication keys and consumed decisions;
- quarantined and disputed states.

Reconciliation may rebuild missing projections or complete an already-authorized
idempotent event effect. It cannot infer missing identity or lifecycle authority from
current titles, links, dossiers, graph shape, or expected UI outcome.

## 18. Ordinary Product Projection

Ordinary views show:

```text
readable title
sheet type
who or what it concerns
active, unresolved, disputed, redirected, split, retired, or quarantined state
helpful alias or former-name context
current destination when redirected
one lawful next action when action exists
```

Examples:

```text
Identity unresolved
Next step: Review possible matches.

Merged into: Lyra
Open current sheet

Split into: Embodiment / Movement / Voice
Review unassigned memories

Retired
No longer used in current organization; history remains available.
```

Machine IDs, hashes, partition manifests, and event custody remain technical.

## 19. Normative Requirements

### CSI-TYP-001 — Closed type vocabulary

Every sheet MUST use one parent type. `Lore`, `Topics`, and `Goals` MUST remain views.

### CSI-ID-001 — Sheet identity is immutable

`contextSheetId` MUST NOT change through title, alias, anchor resolution, merge, split,
redirect, retirement, or restoration.

### CSI-ID-002 — Identity is scope- and type-bound

The identity key MUST bind memory scope, sheet type, canonical anchor, and any required
jurisdiction discriminator.

### CSI-ID-003 — Titles do not establish identity

Matching or changed titles, filenames, avatars, prose, or model labels MUST NOT create,
merge, split, or replace canonical anchors.

### CSI-UNK-001 — Unresolved is durable

Ambiguous source-bound leads MUST remain unresolved or disputed rather than being
heuristically assigned.

### CSI-UNK-002 — Unresolved anchors cannot smuggle authority

An unresolved sheet MUST NOT establish canonical identity, cross-scope linkage,
subject jurisdiction, or active dossier claims that assume resolution.

### CSI-TYPE-001 — Type-specific bases are enforced

Each sheet MUST satisfy the applicable anchor basis in Section 6. Relationship
directionality, group persistence, goal subjects, and contextual jurisdiction MUST
remain explicit.

### CSI-CRE-001 — Automatic creation is nomination-only

Models, clustering, similarity, and accumulated co-occurrence MAY nominate sheet work
but MUST NOT append creation, resolution, merge, split, redirect, or retirement events.

### CSI-CRE-002 — Manual seed does not force identity

A manual seed MUST preserve requester and basis but MUST NOT establish unsupported
identity, another subject's meaning, or a merge.

### CSI-ALS-001 — Aliases are attributable and scoped

Every alias MUST bind kind, scope, jurisdiction, effective interval, and attributable
basis. Alias text alone MUST NOT merge identities.

### CSI-ALS-002 — Title changes preserve history

Preferred-title changes MUST append a replayable event and MUST NOT change sheet or
anchor identity.

### CSI-RES-001 — Resolution requires governed identity

Anchor resolution MUST bind an exact governed identity basis, scope, jurisdiction,
policy, decision, and immutable event.

### CSI-RES-002 — Resolution collision routes to merge review

Resolution to an already represented identity key MUST NOT silently collapse sheets.
It MUST enter explicit merge review.

### CSI-MRG-001 — Merge requires one proven anchor

Merge MUST bind a shared resolved canonical anchor, compatible type/scope/jurisdiction,
complete impact manifest, exact source revisions, and replayable authority.

### CSI-MRG-002 — Merge preserves all source history

Merged sheets MUST remain addressable and redirected; catalog links and dossiers MUST
use successor records rather than mutation.

### CSI-MRG-003 — Similarity cannot merge

Similarity, co-occurrence, matching titles, embeddings, or model confidence MUST NOT
serve as merge authority.

### CSI-SPL-001 — Split requires explicit partition

Split MUST bind distinct anchor bases and partition aliases, catalog links, claims, and
dossier history, including an unresolved bucket.

### CSI-SPL-002 — Split cannot duplicate evidence silently

Material MUST NOT be copied to every split target without an explicit lawful basis for
each successor relationship.

### CSI-RED-001 — Redirects are exact and acyclic

Every redirect MUST bind an authoritative lifecycle event, terminate lawfully, and
refuse self-reference or cycles.

### CSI-RET-001 — Retirement preserves truth

Retirement MUST preserve sheet identity, evidence links, aliases, dossiers, citations,
and lifecycle history and MUST NOT imply deletion, falsity, merge, or supersession.

### CSI-RST-001 — Restoration appends history

Restoration MUST bind the exact retirement and revalidate current authority. It MUST
NOT erase the retirement event.

### CSI-CON-001 — Concurrent decisions are revision-bound

Identical lifecycle decisions MUST converge. Competing decisions MUST serialize against
exact revisions, and stale decisions MUST refuse without partial mutation.

### CSI-REP-001 — Portable replay is complete

Replay MUST reconstruct sheets, anchors, aliases, resolution, lifecycle, redirect
graphs, split partitions, deduplication, disputes, and quarantine without disposable
state.

### CSI-FAIL-001 — Missing authority fails closed

Missing, malformed, cyclic, stale, or contradictory identity/lifecycle authority MUST
quarantine or refuse the affected operation and MUST NOT be inferred from projections.

### CSI-UI-001 — Ordinary states are human and actionable

Ordinary views MUST explain unresolved, disputed, redirected, split, retired, and
quarantined states and provide one lawful next action when one exists.

## 20. Required Schema Consequences

Implementation will require separately authorized schemas for:

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

No schema may use display title as the primary identity or allow a model-authored event
to bypass server validation.

## 21. Required Proof Before Implementation Closure

1. Same title in two scopes creates no identity merge.
2. Renaming a sheet preserves sheet and anchor identities and records title history.
3. An unknown external participant remains unresolved.
4. Similarity may nominate but cannot resolve or merge an anchor.
5. Manual seed with a known canonical anchor creates one idempotent sheet.
6. Manual seed without a resolved anchor creates an unresolved sheet, not a guessed
   identity.
7. Symmetric relationship participant order deduplicates deterministically.
8. Directional relationship reversal remains distinct where policy requires.
9. A group survives ordinary membership change without identity replacement.
10. Shared-world and external-world places with the same name remain distinct.
11. Resolution collision enters merge review without silent collapse.
12. Lawful merge preserves source sheets, redirects, catalog-link history, and dossier
    history.
13. Similarity-only merge refuses.
14. Merge across incompatible scope, type, or jurisdiction refuses.
15. Split partitions every alias, link, and claim or leaves it explicitly unresolved.
16. Split does not copy all evidence to every target.
17. Redirect and merge cycles refuse without partial mutation.
18. Retirement removes ordinary active visibility but preserves all history.
19. Restoration appends lifecycle history and revalidates current authority.
20. Concurrent identical decisions converge; stale competing decisions refuse.
21. Restart/replay reconstructs the same anchor and redirect graph.
22. Missing authority cannot be repaired from titles, dossiers, links, or graph state.
23. Ordinary UI explains each non-active or unresolved state without machine IDs.

## 22. Stop Boundary

This contract does not authorize:

- schemas, tables, APIs, services, migrations, or event ledgers;
- entity-resolution implementation;
- sheet creation, aliases, merge, split, redirect, retirement, or restoration;
- catalog-link mutation;
- dossier synthesis or revision;
- graph or table UI;
- model prompts, thresholds, or automatic matching;
- migration of existing memories.

Each requires a separately authorized child contract, implementation slice, and exact
proof.

## 23. Status

Context-sheet identity, type-specific anchors, unresolved state, aliases, resolution,
merge, split, redirects, retirement, restoration, concurrency, replay, and ordinary
clarity boundaries are **ENTERED**.

Production behavior is unchanged.
