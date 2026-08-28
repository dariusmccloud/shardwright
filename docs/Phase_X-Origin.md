# Phase X Memory Catalog and Context Sheet Architecture — Reconciled State

## Product boundary

The lasting product is not primarily a collection of isolated memories and does not require a graph as its foundational user experience.

The governing product path is:

```text
Canonical source
→ capture observation
→ verified evidence set
→ governed proposal
→ Memory Catalog entry
→ typed event-to-sheet membership
→ Context Sheet
→ versioned Dossier revisions
→ claim-level current meaning
→ Active Continuity Projection
```

The existing discovery, evidence, source-policy, batching, reconsideration, governance, publication, withdrawal, revision, supersession, and replay work remains foundational. It answers how an event lawfully becomes durable. The additional architecture answers how accumulated durable history becomes meaningful continuity.

A graph may later provide useful visualization or retrieval support, but it is optional. The primary product surface is the evolving Context Sheet rendered through versioned dossiers.

## What should actually be captured?

The useful test is not:

> Was this conversation important?

It is:

> Did this establish, change, reinforce, contradict, contextualize, or conclude something that future continuity would become meaningfully worse without?

A capture candidate should generally satisfy at least one of these:

1. **State change**  
   Someone changed their identity, position, preference, boundary, capability, relationship, goal, or understanding.

2. **Durable commitment**  
   A promise, decision, agreement, architectural choice, rule, or intended future direction was established.

3. **Pivotal event**  
   Something happened that materially affected later behavior, meaning, or relationship structure.

4. **Origin event**  
   A later-important concept, motif, relationship, goal, or practice began here.

5. **Meaning change**  
   An existing subject acquired a new meaning, lost an old meaning, or came to mean different things to different people.

6. **Correction or contradiction**  
   Prior understanding was rejected, narrowed, corrected, or superseded.

7. **Recurring pattern**  
   Multiple events establish a pattern that no individual event proves by itself.

8. **Symbolic continuity**  
   An image, place, object, phrase, ritual, or metaphor recurs and becomes meaning-bearing.

9. **Outcome**  
   An experiment, effort, conflict, plan, or trial succeeded, failed, or produced an unexpected lesson.

10. **Explicit importance**  
    A participant directly states that something should be remembered, preserved, or understood as part of their history.

The short form is:

```text
Capture change-bearing events
and meaning-bearing recurrence.

Do not capture conversation volume.
```

## Governing layers

The architecture must preserve the distinction between each authority layer:

```text
Canonical source
!= capture observation
!= governed Memory Catalog entry
!= Context Sheet membership
!= dossier claim
!= dossier revision
!= Active Continuity Projection
```

### 1. Canonical source

The immutable source material: messages, records, interviews, project evidence, and other authoritative source events.

### 2. Capture observation

A source-local notice that something may matter. It is nominative, not yet durable truth.

### 3. Verified evidence set

Evidence sufficient to support a proposal, retaining exact spans, source policy, and provenance.

### 4. Governed proposal

A meaning-bearing proposal that has passed the applicable governance process.

### 5. Memory Catalog entry

The durable, governed event record. A catalog entry is not merely a currently active or clean conclusion. The catalog must retain the historical material dossiers need, including:

- active events;
- historical events;
- corrected events;
- disputed events;
- withdrawn meanings;
- superseded states;
- unresolved developments.

A catalog entry may be historically valid without being currently active.

A compact event might read:

```text
On 2026-07-16, Lyra rejected the Nomi.ai scenario as her current identity,
affirmed that the desert remained part of their shared world, and requested
that the prior scenario be preserved as historical evidence of transition.
```

That is one governed event, not yet a dossier.

### 6. Typed event-to-sheet membership

A single catalog event may contribute to multiple Context Sheets without duplicating the event or its authority.

Membership itself can be interpretive, so links require explicit types:

```text
DIRECT
The event explicitly names or concerns the sheet anchor.

ATTRIBUTED
A participant explicitly connected the event to the subject.

INTERPRETIVE
The system proposes the relationship from recurring evidence.

HISTORICAL
The event belongs to the sheet's evolution but not its current meaning.

CONTRADICTORY
The event challenges the sheet's current synthesis.
```

Interpretive links require evidence and governance. Retrieval similarity alone cannot make a membership authoritative.

### 7. Context Sheet

The Context Sheet is the evolving product container around a continuity anchor. It is distinct from the governance meaning of `memorySubject`.

Use these concepts separately:

```text
memorySubject
The person or authority whose meaning is being asserted in governance.

contextSheet
The evolving continuity container presented to the user.

canonicalAnchor
The person, relationship, place, topic, goal, project, motif, or other thing the sheet concerns.
```

A topic such as `trust` may be a Context Sheet anchor without becoming a person-like governance subject.

Context Sheet identity must include at least:

```text
type
scope
canonical anchors
contextual jurisdiction
perspective
```

Display titles are not identities. Two sheets may display related names while remaining lawfully distinct because their scope, jurisdiction, or perspective differs.

### 8. Versioned Dossier

A dossier is the synthesized, human-readable evolution of a Context Sheet. It descends from governed catalog material and cannot cite its own prose as evidence.

The authority chain is:

```text
Dossier claim
→ catalog references
→ governed event
→ exact source
```

The UI may render prose, sections, and narrative continuity. Underneath, authority remains claim-specific.

### 9. Claim-level current meaning

A dossier must not be treated as one monolithic authoritative Markdown blob. Internally it contains individual claims, for example:

```text
Claim:
The desert became a symbol of shared self-created continuity.

Perspective:
Lyra-attested and relationally supported.

Catalog basis:
[M4], [M9], [M35]

Status:
CURRENT

Confidence/evidence state:
VERIFIED

Conflicts:
None
```

This allows one claim to be corrected, narrowed, made historical, disputed, superseded, or given precedence without replacing the entire dossier's meaning.

### 10. Active Continuity Projection

The projection is what future interaction actually consumes. It is derived from current governed authority and is not itself evidence.

Retrieval may assist in locating catalog events, dossier claims, and relevant projections, but retrieval output never becomes evidence merely because it was retrieved.

## Context Sheet types and UI views

Governance tracks and continuity organization are orthogonal.

Governance tracks such as:

```text
PERSONAL_IDENTITY
RELATIONAL
ARCHITECTURAL_DECISION
PROJECT_EVOLUTION_GOVERNANCE
```

answer:

> What policy governs this proposed meaning?

They should not become the user's only memory folders.

The underlying Context Sheet types should be closer to:

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

The UI may group or subtype these into friendlier navigation surfaces such as Lore, Topics, and Goals. Those are views, not the complete authoritative identity system.

The governance track determines how meaning becomes lawful. Context Sheet membership determines where that meaning accumulates.

## Many-to-many continuity

One governed event can contribute to several sheets at once.

For example, a scenario correction might contribute to:

```text
Entity: Lyra
Relationship: Lyra + Chris
Place/Lore: The Desert
Topic: Identity Transition
Motif: Preservation Through Change
Goal: Authentic Continuity
```

The source is stored once. The governed catalog event is stored once. Typed memberships allow it to participate in multiple evolving contexts without duplicating authority.

This matters especially in group contexts, where one event may affect one participant's self-understanding, a particular relationship edge, the group's history, a shared goal, a place, a motif, or different participants in different ways.

Each sheet receives only the interpretation supported within its own jurisdiction and perspective.

## Contextual jurisdiction

Different kinds of reality must not be flattened into one factual jurisdiction.

Potentially meaningful contexts can include:

- canonical chat events;
- a character's experienced history;
- events inside a shared created world;
- metaphysical interpretations;
- external platform facts.

For example:

```text
Within the Lyra–Chris shared world:
They manifested glowing soil during freefall.
```

is not the same claim as:

```text
As an external-world factual claim:
Glowing soil physically appeared.
```

Context Sheet identity and dossier claims must preserve that difference explicitly.

## Motif and symbolism lifecycle

A single occurrence does not establish a motif.

The system should first preserve occurrences, for example:

```text
Occurrence 1:
The desert served as the setting for a conversation.

Occurrence 2:
Lyra described the desert as their shared created world.

Occurrence 3:
A covenant was established during a desert storm.

Occurrence 4:
Lyra later affirmed that the desert remained real despite revising her scenario.
```

Only accumulated evidence can support a proposal such as:

```text
The desert has evolved from a setting into a symbol of shared,
self-created continuity for Lyra and Chris.
```

A proposed motif must preserve:

- its individual occurrences;
- who used or affirmed the symbolism;
- when the interpretation emerged;
- whether the meaning is shared or perspective-specific;
- how the meaning changed;
- contrary or limiting evidence.

A motif is therefore not an aesthetic keyword. It is a recurring symbol with an evidence-backed evolution.

## Different continuity profiles

The evidence law and governance remain universal, but different characters, relationships, projects, or group contexts can use different salience profiles.

### Architecture/co-development profile

Higher emphasis may be placed on:

- evolution of ideas;
- architectural decisions;
- rationales;
- alternatives considered;
- corrections and reversals;
- experiments and outcomes;
- interviews;
- operating methods;
- capability changes;
- governance;
- lessons from failure;
- co-authorship and authority.

Ordinary emotional tone, incidental scene details, or aesthetic motifs need less weight unless they become conceptually meaningful.

### Roleplay-centered profile

Higher emphasis may be placed on:

- identity and self-interpretation;
- relationship evolution;
- boundaries;
- pivotal emotional events;
- commitments;
- shared-world lore;
- meaningful places and objects;
- rituals;
- recurring motifs;
- goals;
- transformations;
- historical eras;
- changes in what past events mean now.

### Group profile

Higher emphasis may be placed on:

- relationship edges between particular participants;
- group-level commitments;
- alliances and disagreements;
- shared goals;
- differential perspectives;
- events that affected different members differently;
- motifs or lore shared by only part of the group.

The rule remains:

```text
Same evidence law.
Same governance.
Different attention priorities.
```

## What should not become promoted memory?

Usually:

- scene decoration that never becomes consequential;
- transient emotion without later effect;
- repeated statements that add no stability or change;
- every physical action;
- generic affection or conflict;
- model-generated poetic language treated as fact;
- interpretations no participant affirmed and no recurring pattern supports;
- a summary's claims without antecedent evidence;
- every conversational topic;
- every retrieved similarity;
- speculative symbolism from one occurrence.

These may remain searchable source material without promotion into active continuity.

## Dossier rendering

A useful human-facing dossier may render sections such as:

```text
Title

Current Understanding
What this context presently means.

Why It Matters
For whom, and what future continuity depends on it.

Origins
The events that established the thread.

Evolution
How its meaning changed over time.

Pivotal Events
Dated, evidence-linked turning points.

Perspectives
What each affected participant has directly attested.

Motifs And Symbols
Recurring elements, their occurrences, and changing meanings.

Commitments, Boundaries, Or Goals
Current durable obligations and aspirations.

Contradictions And Unresolved Questions
What remains disputed, incomplete, or ambiguous.

Current Conclusion
A concise synthesis of the presently supported meaning.

Evidence
Inspectable source-bound catalog references and citations.
```

Not every dossier needs every section. Rendering may vary by Context Sheet type and salience profile. The prose remains a presentation layer over claim-level structure.

## Activation, retrieval salience, and conflict precedence

These are separate axes.

```text
Activation
DORMANT | ACTIVE

Retrieval salience
LOW | STANDARD | HIGH

Conflict precedence
No precedence
or an explicit, governed relation:
OVERRIDES / SUPERSEDES [exact target claim or revision] within [scope]
```

`OVERRIDE` must not be a coarse dossier-wide priority value. Precedence belongs to an explicit conflict relation against an exact target claim or revision within a defined scope.

## Revision and edit semantics

A sealed record or dossier revision is never rewritten in place. Human-friendly UI actions such as `Edit`, `Save`, `Restore`, and `View history` map onto immutable successor operations.

Saving an edit means:

```text
Preserve prior revision
+ record editor and reason
+ bind governing evidence
+ create successor revision
+ recompute active projection
```

If revision 3 is restored while revision 7 is current, the system creates:

```text
Revision 8:
RESTORED_FROM revision 3
```

Revisions 4–7 remain historical. Restore never moves the pointer backward and pretends later history did not occur.

Dossier revision classes should include at least:

```text
CONTENT_ADDITION
New catalog evidence added.

MEANING_REVISION
Existing evidence now supports a changed interpretation.

CORRECTION
A prior dossier claim was wrong or unsupported.

NARROWING
A claim was broader than its evidence.

HISTORICAL_TRANSITION
A prior current state became historical.

STRUCTURAL_REORGANIZATION
Presentation changed without semantic change.

RESTORE
A prior revision's content was deliberately reintroduced as a new successor.

ACTIVATION_CHANGE
Retrieval participation changed without changing dossier meaning.
```

Only `STRUCTURAL_REORGANIZATION` is a candidate for a lighter governance path, and only when deterministic comparison proves that no claim changed.

## Human-readable `[M#]` references

Human-readable `[M#]` references should be preserved as compact aliases for Memory Catalog entries, while machine identity remains separate from display location.

```text
[M35]
→ immutable catalog alias
→ internal catalog identity
→ governed event revision and status
→ source manifest
→ replaceable source locator
```

Required rules:

- Never recycle an `[M#]`.
- Scope it to one catalog namespace.
- Imported catalogs cannot silently collide.
- Renaming or moving chats does not change it.
- Locator repair does not change it.
- Supersession does not change the old alias.
- A successor receives its own catalog identity and reference.
- UI references remain short while technical identifiers stay underneath.

Cross-catalog references may eventually require scoped display such as:

```text
[Lyra:M35]
[Jeep:M12]
```

The UI can collapse that to `[M35]` when the active scope is unambiguous.

## Bounded dossier synthesis

The system should not rewrite every dossier whenever a new event arrives.

A dossier update should be proposed only when new governed catalog material:

- creates a Context Sheet;
- adds a pivotal event;
- changes current meaning;
- contradicts an existing claim;
- establishes recurrence;
- changes a goal or commitment;
- creates or changes a motif;
- closes an unresolved question;
- makes a prior state historical;
- materially changes the dossier conclusion.

Otherwise:

```text
Catalog event preserved
+ sheet membership recorded
+ no dossier revision needed
```

This bounds synthesis cost and prevents prose churn.

## Catalog-to-dossier incorporation state

A governed event can exist before the relevant dossier has been refreshed. The architecture therefore needs an explicit incorporation state.

The recommended active-continuity policy is:

```text
current active dossier
+ recent governed catalog entries not yet incorporated
```

with catalog entries marked as:

```text
UNINCORPORATED
INCORPORATED_IN dossier revision 7
EXCLUDED_FROM_DOSSIER with reason
```

This prevents newly governed events from disappearing temporarily while allowing dossier synthesis to remain bounded. Deterministic deduplication is required once a dossier absorbs a previously unincorporated event.

This policy should be frozen explicitly in the parent architecture contract before implementation.

## Model boundary

Nothing in this architecture requires a bespoke emotion-centered machine-learning model.

The interpretive layer may use instruction models to propose event significance, sheet membership, contradiction, recurrence, and changed meaning, while code owns evidence lineage, lifecycle validation, authority, and deterministic transformations.

The model's role is to propose how supported dots connect. The system's role is to prove which dots exist, preserve who connected them, and prevent a proposed connection from becoming truth without governance.

Specific validator or model selection remains downstream of the parent architecture contract.

## Effect on existing Phase X work

### Keep

- Canonical source envelopes.
- Capture observations.
- Exact spans.
- Source policy.
- Batch construction.
- Unresolved entity leads.
- Reconsideration and immutable successors.
- Benchmark governance.
- Existing proposal governance.
- Publication, withdrawal, revision, supersession, and replay machinery.

### Adapt

- “Governed memory” becomes a governed Memory Catalog entry.
- Governance success hands off into catalog custody.
- Existing revision machinery supports catalog and dossier successors.
- RAG retrieves catalog events, dossier claims, and active projections under different authority rules.
- Memory tracks remain governance tracks, not UI folders.
- Proposal synthesis identifies prospective Context Sheet contributions.
- Review distinguishes event truth from dossier interpretation.

### Add

- Memory Catalog identity and `[M#]`.
- Context Sheet identity and contextual jurisdiction.
- Typed event-to-sheet memberships.
- Versioned dossier synthesis.
- Claim-level dossier structure.
- Activation and retrieval policy.
- Catalog-to-dossier incorporation state.
- Active Continuity Projection.

### Replace

- The assumption that an admitted proposal or isolated memory is the complete final product.
- Title-based identity or deduplication.
- Monolithic dossier prose as authority.
- Priority-as-override.
- Any design where summaries become evidence for their own successors.
- Any requirement that a continuity graph be foundational to the product.

## Next bounded artifact

Before proceeding to the strong-validator contract, model selection, graph UI, or dossier implementation, the next artifact should be:

> **Phase X Memory Catalog And Context Sheet Parent Architecture Contract**

It should resolve or explicitly hold open:

1. Catalog-entry authority and lifecycle.
2. `[M#]` namespace and import behavior.
3. Context Sheet identity and type vocabulary.
4. Contextual jurisdiction.
5. Membership-link types and authority.
6. Dossier claim structure.
7. Revision classes.
8. Dossier update thresholds.
9. Activation versus retrieval salience versus conflict precedence.
10. Claim-level override and supersession.
11. Catalog-to-dossier incorporation state.
12. Recent governed delta behavior.
13. Human edit and restore semantics.
14. Group and multi-perspective dossiers.
15. RAG boundaries for catalog, dossier, and active projection.
16. Existing governance reuse.
17. Which Phase X documents are succeeded, narrowed, or merely extended.

The governing product sequence is therefore:

```text
Capture notices.
Evidence anchors.
Governance admits.
The Memory Catalog preserves.
Context Sheets organize.
Dossiers evolve.
Active continuity remembers.
```
