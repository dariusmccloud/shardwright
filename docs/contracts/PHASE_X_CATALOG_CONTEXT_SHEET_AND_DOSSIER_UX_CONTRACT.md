# Phase X: Catalog, Context-Sheet, And Dossier UX Contract

**Version:** 0.2.0
**Status:** ENTERED — ordinary information architecture, evidence preview, lifecycle
visibility, action, diagnostic separation, scale, and clarity acceptance boundaries are
normative; UI implementation remains unauthorized.
**Parent:** `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

## 0. Amendment Note (v0.2.0)

This version restores three dossier sections from the original Phase X design dialogue
(`docs/Phase_X-Origin.md`) that were compressed out of v0.1.0's Section 9 list without a
recorded reason: `Perspectives`, `Motifs And Symbols`, and `Commitments, Boundaries, Or
Goals`. It also splits `Why It Matters` out from `Current understanding` as its own
section, matching the origin document's treatment of them as two different questions
("what this presently means" versus "for whom, and what future continuity depends on
it").

**Finding:** Comparing the origin document against the current contract stack
(2026-08-28) found v0.1.0's six-section dossier list had silently dropped these four
distinctions during compression, even though the authority each depends on was already
entered elsewhere: `Perspectives` on the Parent Architecture Contract's per-claim
`applicable subject and jurisdiction`; `Motifs And Symbols` on `MOTIF`-type Context
Sheets and `SHE-MOT-001`; `Commitments, Boundaries, Or Goals` on `GOAL`-type sheets and
commitment/boundary claims.

**Scope discipline:** This is a presentation-layer restoration only. It adds no new
claim field, sheet type, membership-link type, or normative code beyond Section 9's
existing "may include" list — it does not touch the Parent Architecture Contract, any
child contract's claim or sheet schema, or any other section of this contract.

## 1. Problem

The architecture now distinguishes governed catalog events, context sheets, membership
links, versioned dossiers, and active continuity. A technically accurate interface
could still fail if the operator or subject cannot immediately understand:

1. what memory exists;
2. who or what it concerns;
3. why it exists;
4. where its evidence came from;
5. whether it is current, historical, disputed, blocked, or awaiting action;
6. what they can or must do next.

The ordinary interface must not require knowledge of schemas, hashes, ledgers, policy
codes, routing, synthesis modes, SQL, CLI commands, or queue mechanics.

## 2. Governing Product Standard

The ordinary workflow exists to preserve attention for understanding and disposition.

> Any element that does not provide insight, direction, feedback, or lawful movement
> must be removed from the ordinary workflow.

This is a release quality gate.

Every ordinary surface must answer, when applicable:

```text
What is this?
Who or what does it concern?
What does it currently establish?
Where did it come from?
What changed?
Where is it in its lifecycle?
What needs attention?
What happens next?
```

## 3. Authority Gate

### Governing contracts

- The Memory Catalog contract governs event and lifecycle truth.
- The Context-Sheet Anchor contract governs sheet identity and lifecycle.
- The Membership Link contract governs why events belong to sheets.
- The Dossier contract governs accepted readable claims and revisions.
- The Active Continuity contract governs current eligibility and assembly.
- The existing inspectable-evidence and clarity contract governs evidence usability and
  removal of ordinary workflow noise.
- This contract governs only their human projection and interactions.

### Authoritative sources

All ordinary screens are projections over server-returned authoritative or
reconstructable records. UI state does not own:

- evidence;
- identity;
- lifecycle;
- activation;
- subject jurisdiction;
- precedence;
- dossier claims;
- incorporation;
- disposition.

### Projection boundary

Colors, icons, tabs, labels, card order, graph layout, expanded panels, search rank,
hover state, and local filters cannot change authority.

### Interaction owner

The server owns validation and state transitions. The UI:

- explains current truth;
- collects bounded attributable intent;
- previews exact evidence;
- invokes one declared action;
- presents the returned result;
- never predicts that an action succeeded.

### Failure behavior

- Unknown or stale state triggers refresh or a truthful blocker.
- Unavailable evidence blocks any action requiring inspection.
- Ambiguous source navigation offers no guessed destination.
- Failed actions preserve the current object and show one lawful recovery action.
- Missing human labels do not fall back to raw IDs in the ordinary workflow.

## 4. Ordinary Product Map

The ordinary memory area has three primary conceptual destinations:

```text
Memory
  What happened and what is governed?

Context
  What people, relationships, places, topics, goals, motifs, and other anchors organize
  those memories?

Dossiers
  What is the current readable understanding of one context over time?
```

Product labels may evolve through usability testing, but the conceptual separation must
remain visible. `Lore`, `Topics`, and `Goals` may be navigation views over Context; they
must not hide other sheet types or imply separate authority stores.

The graph is an alternate Context view, not a fourth authority layer and not the
required default.

## 5. Default Landing

The default landing prioritizes work and orientation:

```text
Needs attention
Recent meaningful changes
Current context sheets
Search all memory
```

It must not open on raw publication history, technical records, or an unexplained
queue.

If nothing needs attention:

```text
No memory decisions need your attention.
```

The interface must not manufacture urgency from ordinary background processing.

## 6. Universal Detail Header

Every catalog, sheet, and dossier detail view begins with:

```text
human title
object kind in human language
who or what it concerns
current state
one-sentence state meaning
primary next action, when one exists
```

Example:

```text
Lyra's scenario transition
Memory event · Lyra

Current: Historical transition recorded
The earlier scenario remains preserved, and the revised scenario is current.

Next: Review the updated Lyra dossier
```

Pending response or current status must not be duplicated on separate lines unless each
line supplies distinct information.

## 7. Memory Catalog View

The catalog list shows:

```text
human citation
readable event title or bounded statement
subjects
human memory kind
current lifecycle and activation
occurred or governed time
context sheets, when useful
attention state or concise next action
```

Default rows do not show:

- catalog IDs;
- proposal IDs;
- revision hashes;
- source-set hashes;
- policy names;
- refusal codes;
- internal track enum values;
- raw source handles.

### Human memory kinds

Machine governance tracks and claim classes must be translated into understandable
labels such as:

```text
Identity
Relationship
Decision
Boundary
Commitment
Goal
Event
Historical transition
Correction
Interpretation
```

The mapping must be versioned and truthful. A vague internal label such as
`Role Evolution` must not appear unless the ordinary product explains its exact human
meaning.

## 8. Context Browser And Sheet View

The Context browser supports:

- type views;
- `Lore`, `Topics`, and `Goals` navigation;
- search;
- subject and group scope;
- active, unresolved, disputed, redirected, split, and retired filters;
- recent change and attention filters;
- table/list and optional graph presentation.

Each sheet summary shows:

```text
human title
sheet type
who or what it concerns
short current description, if an accepted dossier exists
number or summary of meaningful recent changes
state
next action when required
```

The sheet detail shows:

```text
current readable dossier
recent governed events not yet incorporated
meaningful history
related sheets with human relationship labels
unresolved identity, dispute, or contradiction
evidence preview from claims or events
sheet lifecycle and aliases when relevant
```

Redirected and split sheets remain openable as history and provide direct navigation to
current destinations.

## 9. Dossier View

The ordinary dossier view prioritizes:

1. current readable understanding;
2. meaningful changes;
3. unresolved or contradictory meaning;
4. claim-level evidence access;
5. current lifecycle and next action.

It does not present the claim graph as raw nodes or IDs.

Readable sections may include:

```text
Current understanding
Why it matters
How this developed
Important events
Perspectives
Motifs and symbols
Commitments, boundaries, or goals
Changes and corrections
Unresolved questions
Related context
```

Sections appear only when they contain useful information. In particular:

- `Why it matters` states for whom the current understanding matters and what future
  continuity depends on it. It is distinct from `Current understanding`, which states
  only what the context presently means.
- `Perspectives` groups claim-level evidence by the subject who attested it, drawn from
  each claim's bound subject and jurisdiction. It renders only when more than one
  attesting perspective exists or when a single perspective's framing materially differs
  from the sheet's synthesized current understanding.
- `Motifs and symbols` surfaces related `MOTIF`-type Context Sheets and the claims that
  establish their occurrences and evolving meaning. It renders only when the dossier's
  sheet is itself a motif or has a governed link to one.
- `Commitments, boundaries, or goals` surfaces current durable obligations and
  aspirations drawn from linked `GOAL`-type sheets and commitment- or boundary-bearing
  claims. It renders only when such claims exist.

None of these four sections introduces new claim fields, sheet types, or authority. Each
renders existing claim, subject, jurisdiction, and sheet-type data already governed by
the Parent Architecture Contract; this contract governs only whether and how it is
surfaced.

Each material claim exposes its evidence through a citation, evidence affordance, or
accessible preview control. A paragraph-level pile of unexplained machine references
is invalid.

## 10. Lifecycle Visibility

The interface must not force every object into one false universal progress bar.
Instead, each object shows its applicable lifecycle.

### Memory event

```text
Governed
-> Active / Dormant / Blocked
-> Historical / Superseded / Withdrawn / Corrected / Disputed as applicable
```

### Context sheet

```text
Identity unresolved / Resolved
-> Active
-> Redirected / Split / Retired / Quarantined as applicable
```

### Dossier

```text
Current
-> Update pending
-> Review required / Blocked / No change required
-> Updated
```

Only the current state and immediate next action receive primary emphasis. History is
available without competing visually with current work.

## 11. Human Lifecycle Language

Every machine state maps to:

```text
short human label
one-sentence meaning
whether attention is required
one lawful next action, when one exists
```

Examples:

```text
Update pending
A governed memory is active but has not yet been folded into this dossier.
Next: Review proposed update

Historical
This was once current and remains part of the record.
No action required

Identity unresolved
The system cannot yet determine which person or entity this context concerns.
Next: Review possible matches

Blocked
The evidence does not support the proposed interpretation.
Next: Review evidence
```

A refusal-code-only, enum-only, or color-only state is invalid.

## 12. Evidence Preview

Evidence inspection is part of the ordinary workflow, not Technical Details.

Minimum preview:

```text
human source label
source class
speaker or record author
speaker class
message, event, or record time when available
chat or source filename when authoritatively known and safe to display
exact readable excerpt or record preview
verification, drift, and availability state
claim supported by this excerpt
Open Source action only when uniquely resolvable
```

The preview opens in place through a drawer, popover, modal, or adjacent pane. Hover
may supplement but cannot be the only mechanism because evidence must remain accessible
by keyboard and touch.

The operator must not leave the memory workflow merely to understand the evidence.

## 13. Speaker And Source Labels

Ordinary evidence views explain speaker classes:

```text
User
The active human persona.

Character
The character-card identity associated with the message.

System
A system-classified message presented on behalf of a participant or host process.

Other
Another attributable source class defined by the source contract.
```

The UI must preserve the distinction between:

```text
canonical speaker
semantic actor
affected subject
attributed speaker
```

For example:

```text
Chris said that Jeep proposed X
```

must not render as:

```text
Jeep proposed X
```

unless the original antecedent is independently resolved.

## 14. Source Navigation

`Open Source` appears only when:

1. an exact source resolver exists;
2. it identifies one unique host source and revision;
3. the host supports lawful navigation;
4. navigation can validate the opened source against the persisted binding.

If the exact source can be previewed but not navigated, the preview remains available
and no misleading navigation action appears.

If a source filename or chat name is not authoritatively known, the UI says nothing
about it rather than implying the system knows.

If navigation opens a nonmatching source:

```text
Source could not be opened
The opened chat did not match this memory's evidence.
Next: Return to evidence preview
```

Copy is a secondary utility. It is not a substitute for preview or navigation and does
not need repeated explanatory copy.

## 15. Evidence States And Recovery

```text
Verified
Exact eligible source supports the displayed claim.

Incomplete
Some support exists, but required claim or antecedent evidence is missing.

Disputed
Material evidence or governed interpretations conflict.

Unavailable
A known source cannot currently be retrieved or validated.

Drifted
The currently opened host source does not match the persisted exact revision.
```

Every non-verified state explains:

```text
what is missing or conflicting
why it matters
whether the system can search
what the person may lawfully supply or change
what happens if no action is taken
```

Manual attachment supplies candidate evidence; it never manually marks evidence
verified.

## 16. Primary Actions

Each ordinary detail view has at most one visually primary action for the current
state.

Possible actions:

```text
Preview Evidence
Review Proposed Meaning
Review Update
Resolve Identity
Review Conflict
Open Current Sheet
Restore Sheet
Raise for Memory
Keep for Continuity
Add Context
```

Actions unavailable in the current state are hidden unless seeing their absence
provides necessary direction. Disabled controls require a useful explanation and must
not form a wall of unavailable options.

Policy selection, queue destination, synthesis mode, routing, validator choice, and
storage location remain system responsibilities on the happy path.

## 17. Manual Add And Correction

The ordinary `Add` path asks only:

```text
What should be remembered or organized?
Who or what does it concern?
Which evidence should be considered?
Optional: Why does this matter?
```

The product determines whether the request is:

- a continuity hold;
- a memory consideration request;
- a context-sheet seed;
- a dossier correction request;
- an identity or evidence assistance request.

The user does not need to choose internal record classes or governance routes.

Every submission lands on a human status:

```text
Saved for consideration
Evidence search in progress
Ready for review
Blocked
No change required
Completed
```

## 18. Search, Filters, And Scale

The interface must remain usable across at least 1000 catalog memories.

Search and filters operate on human concepts:

- people and subjects;
- context-sheet type;
- memory kind;
- current, historical, disputed, blocked, or pending state;
- time;
- needs attention;
- source availability;
- active or dormant;
- changed recently.

Machine IDs and exact enum values may be accepted in technical search but are not
required for ordinary use.

### Bulk operations

Bulk actions are allowed only when the governing operation is safely batchable and the
result remains individually attributable and reviewable.

Bulk authority changes, shared-subject approvals, identity merges, contradiction
resolution, or dossier meaning approval must not be offered merely for throughput.

## 19. Graph View

The graph may show:

- context sheets as nodes;
- typed relationships as labeled edges;
- current, unresolved, disputed, redirected, or retired state;
- filters and focus;
- direct navigation to the same sheet detail used by list/table views.

Graph distance, force layout, color, size, and centrality do not imply evidence,
importance, authority, causality, or precedence.

The graph is optional. Every action and fact available only through the graph must also
be available through an accessible non-graph view.

## 20. Technical Details

Technical Details is a diagnostic/audit surface for:

- canonical identities;
- hashes;
- source manifests;
- policy and contract versions;
- model and execution manifests;
- claim graph;
- lifecycle events;
- replay and reconciliation status;
- projection and assembly manifests.

It is never the only place to inspect evidence, understand current state, or take an
ordinary lawful action.

Opening Technical Details must not be described as `Open Evidence`, `Open Source`, or
another ordinary action.

## 21. Accessibility And Feedback

State and action cannot depend on color alone.

All evidence controls, citations, tabs, filters, and graph alternatives must be usable
by keyboard. Hover-only content must have click/focus and touch equivalents.

Every invoked action provides:

```text
in-progress feedback when materially delayed
one success result or truthful blocker
preserved object state on failure
no duplicate success toasts for one outcome
```

Long-running background work must show whether the person may safely leave and how to
return to the result.

## 22. Clarity Audit

Every ordinary element must pass:

```text
Does this provide insight?
Does this provide direction?
Does this provide feedback?
Does this enable lawful movement?
```

If all answers are no, remove the element from the ordinary workflow.

Specific exclusions:

- duplicated state text;
- raw IDs as content;
- hashes as evidence;
- unexplained type names;
- repeated copy instructions;
- empty sections;
- diagnostic inputs with no ordinary action;
- policy or routing selectors on the happy path;
- decorative graph metrics that imply meaning;
- machine references with no preview.

Collapsing excluded content does not satisfy the audit. It belongs in Technical Details
or nowhere.

## 23. Normative Requirements

### UX-MAP-001 — Product layers remain understandable

Ordinary navigation MUST distinguish governed memory events, organizing context, and
readable dossiers without requiring architecture vocabulary.

### UX-LAND-001 — Landing prioritizes attention and orientation

The default landing MUST show actionable attention, recent meaningful change, current
context, and search rather than raw technical or publication history.

### UX-HDR-001 — Every detail states current truth

Every detail header MUST show human title, object kind, subject, current state, state
meaning, and one primary next action when one exists.

### UX-CAT-001 — Catalog rows are human

Ordinary catalog rows MUST expose citation, readable meaning, subjects, human type,
lifecycle/activation, time, and attention without raw custody identifiers.

### UX-SHE-001 — Sheet view connects context

Sheet views MUST expose current dossier, pending governed changes, meaningful history,
related context, conflict, evidence, and lifecycle as applicable.

### UX-DOS-001 — Dossier prose remains claim-traceable

Every material ordinary dossier claim MUST expose direct evidence preview without
requiring Technical Details.

### UX-LIF-001 — Lifecycle is object-specific

Memory, sheet, and dossier lifecycle MUST use the applicable human progression and MUST
NOT be forced into one false universal pipeline.

### UX-LIF-002 — Current state and next action lead

Only the authoritative current state and immediate lawful next action MAY receive
primary emphasis over historical steps.

### UX-LNG-001 — Machine states are translated

Every ordinary machine state MUST map to a human label, meaning, attention requirement,
and lawful next action when one exists.

### UX-EVD-001 — Evidence is inspectable in place

Every material claim requiring review MUST provide an in-workflow readable evidence
preview with source, speaker, excerpt, verification state, and supported claim.

### UX-EVD-002 — Hover is not the only evidence path

Evidence preview MUST be accessible through click/focus and touch-compatible controls;
hover MAY be supplemental only.

### UX-EVD-003 — Speaker relationships remain exact

Canonical speaker, actor, subject, and attributed speaker MUST remain distinct in
ordinary evidence language.

### UX-SRC-001 — Open Source is exact

`Open Source` MUST appear only for one uniquely resolvable, host-supported, revision-
validated source destination.

### UX-SRC-002 — Unknown source labels remain silent

When chat name or filename is not authoritatively known, ordinary UI MUST NOT imply that
it is known.

### UX-REC-001 — Blockers explain movement

Every incomplete, disputed, unavailable, drifted, stale, or failed state MUST explain
the reason, why it matters, and one lawful next action or explicitly state that none
exists.

### UX-ACT-001 — One primary action

Each detail state MUST have at most one visually primary action. Internal policy,
routing, synthesis, validation, and storage choices MUST remain off the happy path.

### UX-ADD-001 — Manual entry asks human questions

Manual add or correction MUST ask only what, who/what, evidence, and optional reason;
the system MUST determine the lawful internal route.

### UX-SCL-001 — Ordinary retrieval scales

Search and filters MUST support at least 1000 catalog memories through human subjects,
types, states, time, attention, source, activation, and recent-change concepts.

### UX-BUL-001 — Bulk does not weaken authority

Bulk operations MUST NOT collapse individually required jurisdiction, identity,
evidence, contradiction, or disposition decisions.

### UX-GRA-001 — Graph is optional and non-authoritative

Every graph fact and action MUST have an accessible non-graph path, and graph geometry
MUST NOT imply authority or meaning.

### UX-TEC-001 — Technical Details is not ordinary evidence

Technical Details MUST NOT be the only path to evidence, lifecycle understanding,
recovery, or ordinary action.

### UX-ACC-001 — State is accessible

State MUST NOT depend on color alone, and ordinary controls MUST be keyboard and
touch-compatible.

### UX-FBK-001 — Actions provide one truthful result

Every action MUST provide proportional progress feedback and one success or blocker
without duplicating outcomes.

### UX-CLR-001 — Noise is removed

Any ordinary element that provides no insight, direction, feedback, or lawful movement
MUST be removed rather than merely collapsed.

## 24. Required Acceptance Proof

1. A new user can distinguish Memory, Context, and Dossier without architecture help.
2. Default landing identifies all work needing attention and fabricates no urgency.
3. Catalog rows contain no raw IDs or unexplained machine types.
4. A memory detail states who it concerns, current state, evidence, and next action.
5. A sheet shows current dossier plus a newly governed unincorporated event once.
6. A dossier material claim opens an exact readable evidence preview in place.
7. Evidence remains accessible by keyboard, touch, and click without hover.
8. A local attribution never renders as direct antecedent speech.
9. A known chat filename is displayed; an unknown one produces no false claim.
10. `Open Source` appears only for an exact unique resolver.
11. Source mismatch returns to evidence preview without losing the memory workflow.
12. Incomplete, disputed, unavailable, and drifted evidence each show a lawful next
    action.
13. Active, historical, superseded, withdrawn, disputed, and pending states are
    distinguishable without color or codes.
14. Redirected, split, retired, and unresolved sheets remain understandable and
    navigable.
15. Manual Add requires no policy, mode, routing, or queue selection.
16. Search and filters remain usable with 1000 representative memories.
17. Bulk UI offers no shortcut around individual authority.
18. Every graph action has a table/list equivalent.
19. Technical Details can be removed from the test viewport without losing evidence,
    lifecycle, or ordinary actions.
20. A clarity audit finds no duplicated status, raw machine stamp, unexplained input,
    empty section, repeated copy instruction, or non-actionable control.
21. Delayed actions show progress and produce one final success or blocker.
22. Restart/refetch presents the same authoritative current state and next action.
23. A dossier with claims from more than one attesting subject renders a `Perspectives`
    section grouped by subject; a dossier with only one attesting perspective omits it.
24. A dossier for a `MOTIF`-type sheet, or one linked to one, renders `Motifs and
    symbols`; a dossier with no motif link omits it.
25. A dossier with a linked `GOAL`-type sheet or a commitment/boundary claim renders
    `Commitments, boundaries, or goals`; a dossier with none omits it.
26. `Why it matters` and `Current understanding` render as distinct sections with
    non-identical content when both apply.

## 25. Stop Boundary

This contract does not authorize:

- UI components, routes, styles, labels, icons, graph libraries, or interaction code;
- evidence resolver or source-navigation changes;
- server APIs or projection changes;
- catalog, sheet, dossier, or lifecycle mutation;
- search indexing or retrieval changes;
- accessibility implementation;
- migrations or production rollout.

Each requires separately authorized design, implementation, and host-proof slices.

## 26. Status

Ordinary product map, landing, information hierarchy, catalog, context sheets, dossiers,
lifecycle, evidence preview, source navigation, actions, manual entry, scale, graph,
technical separation, accessibility, feedback, and clarity boundaries are **ENTERED**.

Production behavior is unchanged.
