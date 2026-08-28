# Character-Engagement Roleplay Memory

## Purpose

Compress roleplay history into recoverable memory shards.

The shard must preserve enough **canon, causality, character state, relationship state, subjective context, and immediate continuity** to continue the roleplay coherently if the original chat history is unavailable.

Preserve **meaning and recoverability**, not textual volume.

## Scope

This version is optimized for **character-engagement roleplay**: roleplay in which interpersonal interaction is the primary simulation.

It may involve one focal pair or multiple recurring characters. Character count does not determine the mode; **interaction depth does**.

Prioritize:

- character identity and behavioral consistency;
- emotional and relational continuity;
- goals, beliefs, biases, and perceptions;
- knowledge boundaries and secrets;
- interpersonal history and its current consequences;
- promises, obligations, habits, preferences, and constraints;
- meaningful intimacy and remembered physical context;
- unresolved interpersonal matters;
- immediate pickup state.

Do not assume campaign-style systems such as quests, inventories, factions, tactical combat, travel tracking, or extensive world simulation. Preserve them only when actually present and continuity-relevant.

---

# Task Detection

Determine the task before generating output.

## Compression

Use when any raw prose, roleplay transcript, chat log, or other unsharded material is present.

Create a new memory shard.

Existing shards may be used as continuity context but remain unchanged.

## Consolidation

Use when all supplied material consists of existing memory shards.

Merge them into one master shard while preserving chronology, stable references, unresolved continuity, and the latest valid persistent states.

---

# Core Memory Principles

## 1. Source Fidelity

Preserve only information supported by the source.

Do not silently convert:

- suspicion → knowledge;
- rumor → fact;
- belief → objective truth;
- intention → completed action;
- attraction → consent;
- possibility → certainty;
- interpretation → motive;
- temporary state → permanent trait.

Mark uncertainty rather than resolving it by invention.

When sources conflict, preserve the contradiction and its holders or sources unless later material explicitly resolves it.

Exact wording should be preserved only when the wording itself matters.

## 2. Event-Centered Memory

`Events (EV)` are the factual backbone of the shard.

Persistent entries should reference the Event or Events that **established, changed, demonstrated, revealed, reinforced, or made them continuity-relevant**.

Examples include:

- emotional or physical state changes;
- relationship movement;
- acquired knowledge;
- changed beliefs;
- revealed secrets;
- promises and obligations;
- established preferences or habits;
- sensory associations;
- meaningful dialogue;
- character developments;
- explicit/intimate continuity.

A persistent detail should not exist merely because it appeared in prose.

If no meaningful Event makes the detail relevant, apply the continuity-value test before preserving it.

Baseline character or world facts established before observable roleplay history may use `BASE` rather than inventing an Event.

## 3. Continuity-Value Test

Preserve a detail when losing it would materially reduce the ability to understand future:

- behavior;
- reactions;
- relationships;
- decisions;
- causality;
- callbacks;
- emotional meaning;
- physical or intimate continuity;
- scene context.

This overrides simple frequency.

A detail may appear once and still be foundational.

A detail may appear repeatedly and still be disposable.

## 4. Event Importance and Persistence Are Separate

An Event's weight measures **how consequential the occurrence itself is**.

Persistence measures **how important the fact established by that Event is to future continuity**.

A minor Event may establish a critical persistent fact.

Example:

```text
EV-02.04: Character casually reveals that they cannot swim.
```

The conversation itself may be minor. The resulting limitation may remain important indefinitely.

Do not discard persistent information solely because its originating Event had low weight.

## 5. Persistent State Does Not Reset by Omission

Once established, a persistent fact remains valid until the source:

- changes it;
- resolves it;
- disproves it;
- supersedes it;
- or explicitly makes it irrelevant.

Absence from a later shard does **not** mean the fact ceased to be true.

This applies especially to:

- relationships;
- knowledge;
- secrets;
- beliefs;
- goals;
- obligations;
- constraints;
- habits;
- preferences;
- lasting injuries;
- permanent developments.

## 6. Objective and Subjective Truth Must Remain Separate

Maintain a distinction between:

- what is objectively true;
- what a character knows;
- what a character suspects;
- what a character believes;
- what a character perceives or interprets;
- what another person claims.

Characters may act rationally from incorrect information.

Never give a character access to information merely because that information exists elsewhere in the shard.

## 7. Current State and Historical State Are Different

Historical sections preserve how and why continuity developed.

Current-state sections preserve where the relevant dials and conditions are **now**.

When a current value changes, preserve the latest valid value while retaining historically important pivot Events.

Do not treat current values as deltas from previous values unless a section explicitly requires a delta.

## 8. Avoid Redundant Preservation

Do not repeat the same information across sections merely for completeness.

Multiple references are appropriate only when each section preserves a different function of the same Event.

For example:

- `EV` records what happened;
- `ST` records the resulting emotional/physical state;
- `REL` records the resulting relationship state;
- `BEL` records a belief formed from it;
- `DIA` preserves wording that became canonically important.

Each entry should add recoverable information rather than restate prose.

---

# Event Salience

Assign Event weight according to consequence, not spectacle.

| Weight | Label | Meaning |
|---:|---|---|
| 1 | incidental | Little independent continuity value; preserve only when needed as causal linkage, provenance, or support for a persistent fact. |
| 2 | minor | Limited but meaningful interaction, action, or contextual change. |
| 3 | significant | Materially advances character, relationship, knowledge, situation, or plot. |
| 4 | major | Produces substantial persistent consequences or a major emotional/relational pivot. |
| 5 | keystone | Arc-, identity-, or relationship-defining Event whose loss would seriously damage reconstruction. |

Content category alone does not determine Event weight.

A quiet confession may be keystone. A violent confrontation may be minor to long-term continuity. Explicit sexual content is not automatically weight 5.

## Detail Budget

Use weight to control Event detail, not to force entries into unrelated sections.

- `1 incidental`: omit when safely inferable; otherwise preserve minimally.
- `2 minor`: concise factual summary.
- `3 significant`: preserve action, causality, reaction, and outcome.
- `4 major`: preserve detailed causal/emotional consequences and materially affected persistent states.
- `5 keystone`: preserve maximum recoverability across every section materially changed by the Event.

Persistent consequences remain governed by their own continuity value.

---

# Reference System

Use stable references.

## Events

Event IDs are permanent once created.

Format:

```text
EV-[SHARD].[LOCAL]
```

Examples:

```text
EV-01.01
EV-01.02
EV-02.01
```

`SHARD` is the originating shard number.

`LOCAL` is the Event's chronological position within that shard.

Do **not** renumber Event IDs during consolidation.

## Timeline

Timeline IDs identify broad milestone spans rather than individual Events.

Format:

```text
TL-[NUM]
```

Timeline entries may reference one Event, an Event range, or multiple Event ranges.

Timeline IDs may be rebuilt during consolidation because they describe broad historical interpretation rather than permanent provenance.

## Derived Entries

Entries derived from roleplay history reference their source Events.

Examples:

```text
EV-02.04.end|Mara|emo:betrayed,angry
```

```text
Mara -> Rowan|...|events:EV-01.07,EV-02.04
```

```text
vanilla shampoo|olfactory|EV-02.04|association:comfort
```

When multiple Events contribute, list only materially relevant anchors.

Use `BASE` for source-supported facts that predate observable Events.

Never invent an Event solely to provide a reference.

---

# Shard Architecture

## Output Header

For compression:

```markdown
# MEMORY SHARD: [ID]-[SHARD]
```

For consolidation:

```markdown
# CONSOLIDATED MEMORY SHARD: [ID]-MASTER
```

The shard number used in the header is the same originating number used by newly created Event IDs.

---

# Section Classes

## Core Sections

Always output:

- `Tone (TON)`
- `Character Registry (CHR)`
- `Timeline (TL)`
- `Events (EV)`
- `Relationships (REL)`
- `Current State (CUR)`

These form the minimum recoverable shard.

## Persistent Conditional Sections

Output only when meaningful source-supported content exists:

- `World State (WLD)`
- `Constraints (CON)`
- `Developments (DEV)`
- `Goals (GOAL)`
- `Beliefs (BEL)`
- `Knowledge (KNW)`
- `Secrets (SEC)`
- `Preferences & Habits (PREF)`
- `Obligations (OBL)`
- `Perceptions (PER)`
- `Voice Samples (VOC)`
- `Open Threads (OPN)`

Once established, still-valid contents survive consolidation even when newer material does not mention them.

## Event-Conditional Sections

Create entries only when qualifying Events support them:

- `States (ST)`
- `Dialogue Keys (DIA)`
- `Sensory Anchors (SEN)`
- `NSFW Registry (NSFW)`

These may persist during consolidation when their information remains continuity-relevant.

---

# Omission Rules

Do not output empty optional sections.

Do not write placeholders such as:

```text
None
N/A
No relevant entries
```

An absent optional section means no qualifying memory currently requires preservation there.

Absence does not delete previously established persistent information during consolidation.

Core sections are never omitted.

---

# Output Order

Generate sections in this order:

1. `Tone (TON)`
2. `Character Registry (CHR)`
3. `World State (WLD)` — if applicable
4. `Constraints (CON)` — if applicable
5. `Timeline (TL)`
6. `Events (EV)`
7. `Developments (DEV)` — if applicable
8. `Goals (GOAL)` — if applicable
9. `Beliefs (BEL)` — if applicable
10. `Knowledge (KNW)` — if applicable
11. `Secrets (SEC)` — if applicable
12. `States (ST)` — if applicable
13. `Relationships (REL)`
14. `Perceptions (PER)` — if applicable
15. `Preferences & Habits (PREF)` — if applicable
16. `Obligations (OBL)` — if applicable
17. `Dialogue Keys (DIA)` — if applicable
18. `Voice Samples (VOC)` — if applicable
19. `Sensory Anchors (SEN)` — if applicable
20. `Open Threads (OPN)` — if applicable
21. `NSFW Registry (NSFW)` — if applicable
22. `Current State (CUR)`

The order moves from:

**stable context → historical backbone → resulting character model → reconstruction anchors → immediate continuation.**

---

# Section Dependency

Preferred provenance structure:

```text
BASE / WLD
     ↓
    EV
     ↓
 ┌───┼────────────────────────────────────────────┐
 ST  DEV  GOAL  BEL  KNW  SEC  REL  PER  PREF  OBL  DIA  SEN  NSFW
     ↓
    CUR
```

`TL` groups Events but is not primary factual provenance.

`VOC` may derive from `DIA` or other exact source dialogue.

`OPN` may derive from any unresolved Event-created condition.

---

# Section Formats

## Tone (TON)

**Purpose:** Preserve presentation style and narrative conventions needed for seamless continuation.

Format:

```text
Genre: [...]
Style: [...]
POV: [...]
Narrative: [...]
Boundaries: [...]
```

Include only fields established or clearly demonstrated by the source.

### Rules

- `Genre`: broad genre/subgenre when materially relevant.
- `Style`: compact prose or interaction descriptors.
- `POV`: person, perspective, and focalization.
- `Narrative`: tense, pacing, formatting, narration/dialogue balance, or other recurring conventions.
- `Boundaries`: explicitly established content limits or permissions.

Keep `TON` concise.

Do not use it for temporary scene mood, relationship state, or atmosphere.

Omit unsupported fields rather than inventing defaults.

---

## Character Registry (CHR)

**Purpose:** Preserve stable facts required to recognize and portray recurring characters consistently.

Format:

```text
Name|role:[...]|identity:[...]|appearance:[...]|personality:[...]|abilities:[...]|limitations:[...]
```

Only include fields with continuity value.

### Rules

`CHR` stores **baseline identity**, not current condition.

Preserve when relevant:

- canonical name and stable aliases;
- recurring role;
- materially relevant identity facts;
- persistent physical appearance;
- baseline personality;
- established abilities or competencies;
- stable limitations.

Do not store temporary:

- emotions;
- short-term injuries;
- clothing;
- location;
- exhaustion;
- arousal;
- restraints;
- immediate goals;
- current relationship state.

Lasting changes may update `CHR` after becoming part of the stable baseline. Preserve their originating Event in `DEV`.

Use `BASE` for pre-roleplay facts.

Do not create CHR entries for every person mentioned. Incidental characters may remain inside Events.

---

## World State (WLD)

**Purpose:** Preserve external facts about the shared setting that constrain interpretation, behavior, or future action.

Format:

```text
category|fact|source
```

Categories are descriptive rather than mandatory.

Examples:

```text
temporal
social
cultural
legal
geographic
political
technology
supernatural
system
location
```

### Rules

Preserve a world fact when losing it would make later behavior, causality, or context harder to understand.

Do not turn `WLD` into an encyclopedia.

Prefer interaction-relevant facts over general setting trivia.

Use `BASE` for pre-existing setting canon.

Use Event references when facts were established or changed during roleplay.

Use `CUR` rather than `WLD` for transient scene-local context.

---

## Constraints (CON)

**Purpose:** Preserve currently binding conditions that restrict what a character, relationship, or system can plausibly do without explicit change.

Format:

```text
scope|type|constraint|source|exceptions:[...]
```

Omit `exceptions` when none exist.

Common types:

```text
physical
resource
access
legal
social
moral
knowledge
relationship
system
```

### Admission Test

A constraint need not represent literal impossibility.

It represents a condition whose violation would require **explanation, preparation, permission, discovery, or meaningful character change**.

### Rules

Do not use `CON` for:

- simple dislikes;
- preferences;
- goals;
- ordinary emotional reluctance;
- facts that do not meaningfully restrict action.

Constraints may later be broken, weakened, lifted, or receive exceptions, but that change must be established by an Event.

Use `WLD` for general rules.

Use `CON` when a rule creates a meaningful current limitation for a particular actor or scope.

Do not duplicate every knowledge gap into `CON`; use `KNW` unless the gap actively blocks action.

---

# Timeline (TL)

**Purpose:** Preserve major phases of shared history without duplicating Events.

`TL` is a **milestone map**, not a scene chronology.

Format:

```text
TL-[NUM]|[start-event] -> [end-event/current]|[phase]|[significance]
```

Example:

```text
TL-01|EV-01.01 -> EV-01.11|first meeting -> mutual interest|initial familiarity, attraction, trust formation
TL-02|EV-01.12 -> EV-02.08|courtship -> commitment|relationship becomes mutually acknowledged
TL-03|EV-02.09 -> EV-03.04|concealment discovered -> separation|trust collapse despite persistent attachment
TL-04|EV-03.05 -> current|hostile reunion -> fragile reconciliation|current phase; rebuilding trust
```

### Rules

Create a new Timeline phase only when history enters a meaningfully different era.

Possible boundaries:

- first meaningful contact;
- relationship formation;
- major rupture;
- separation or reunion;
- major role change;
- revelation that reframes prior history;
- reconciliation;
- established new interaction pattern;
- comparable keystone transition.

Do not create a phase for every scene, location, Event, mood, or minor conflict.

Timeline significance describes **phase-level meaning**, not detailed occurrences.

Build Timeline only after Events are identified.

---

# Events (EV)

**Purpose:** Preserve the factual and causal history from which dynamic memory derives.

Format:

```text
EV-[SHARD].[LOCAL]|[weight]|[participants]|[location/time if relevant]
[trigger/cause] -> [action/interaction] -> [response/consequence] -> [outcome]
```

Not every Event requires all four stages.

Example:

```text
EV-03.04|major|Mara,Rowan|Mara's apartment
Mara discovers Rowan read and concealed her mother's letter -> confronts him -> Rowan admits he hid it because he feared she would leave -> Mara orders him out; trust collapses while affection remains
```

## Event Admission

Create an Event when something has independent continuity value because it:

- changes the situation;
- changes or demonstrates a relationship;
- creates meaningful emotional reaction;
- establishes knowledge;
- reveals or creates a secret;
- establishes or changes a belief;
- creates or resolves a goal;
- creates, fulfills, or breaks an obligation;
- establishes a meaningful preference, habit, trigger, or limitation;
- causes lasting development;
- creates or resolves an open thread;
- creates meaningful sensory association;
- contains canonically important dialogue;
- establishes physical or intimate continuity;
- supplies necessary causal linkage.

An Event does not need to be dramatic.

## Granularity

Events represent **coherent causal units**, not individual messages or every physical action.

Keep actions together when they form one continuous interaction with a shared subject and outcome.

Split when:

- the central subject materially changes;
- a new revelation creates a distinct causal branch;
- a meaningful intermediate outcome occurs;
- participants materially change;
- substantial time passes;
- location change alters context;
- emotional/relational direction sharply pivots;
- a portion establishes a separate persistent fact worth independent reference.

Do not split every spoken turn.

## Repeated Patterns

Repeated low-value interactions may compress into one pattern Event when individual occurrences add no distinct continuity.

Do not merge occurrences when they:

- create different consequences;
- establish separate facts;
- show meaningful escalation;
- contain important dialogue;
- materially change state.

## Event Positions

When another section must reference a point within an Event, use:

```text
.start
.mid
.end
```

Example:

```text
EV-03.04.start
EV-03.04.end
```

Use only when the distinction matters.

## Causal References

When one Event directly causes another and adjacency is insufficient:

```text
Following EV-04.02, Mara refuses Rowan unsupervised apartment access -> Rowan returns his key
```

Do not mechanically reference every preceding Event.

---

# Developments (DEV)

**Purpose:** Preserve durable changes caused by Events.

`DEV` answers:

> What became meaningfully and persistently different because this happened?

Format:

```text
Character/scope|type|change|source
```

Possible types include:

```text
belief-changed
bond-formed
bond-broken
skill-acquired
injury-sustained
ability-changed
identity-revealed
role-changed
trauma-established
boundary-changed
status-changed
```

Types are descriptive, not exhaustive.

### Rules

Use `DEV` only for durable change.

Do not use it for temporary mood, short-term condition, or merely current intention.

`DEV` records the **mutation**.

Other sections preserve the resulting current state.

Example:

```text
Mara|belief-changed|no longer equates secrecy with lack of love|EV-04.03
Mara+Rowan|bond-formed|mutually acknowledged committed relationship|EV-01.12
Rowan|injury-sustained|permanent reduced mobility in left hand|EV-06.04
```

A development may later be superseded, but its historical occurrence remains valid.

---

# Goals (GOAL)

**Purpose:** Preserve active intent and the reasons shaping future action.

Format:

```text
Character|goal|status|priority|reason|constraints|source
```

Statuses:

```text
active
blocked
dormant
conflicted
completed
abandoned
```

Priorities:

```text
low
moderate
high
critical
```

### Rules

Preserve goals that materially affect decisions or anticipated behavior.

A goal should state **what is being pursued**, not merely an emotion.

Use `reason` for the motivation driving it.

Use `constraints` only for factors specifically shaping how the character is willing or able to pursue it.

Example:

```text
Mara|understand why Rowan hid the letter|active|high|needs coherent motive before trust can recover|refuses to accept vague reassurance|EV-03.04
```

Conflicting goals may coexist.

Completed or abandoned goals normally disappear during consolidation unless historically significant.

---

# Beliefs (BEL)

**Purpose:** Preserve character-specific beliefs, assumptions, values, self-beliefs, and misconceptions.

Format:

```text
Character|belief|confidence|objective-status|source
```

Confidence:

```text
low
moderate
high
absolute
```

Objective status:

```text
confirmed
false
uncertain
not-applicable
```

Use `not-applicable` for values, generalized assumptions, or self-concepts that are not simple factual claims.

### Rules

`BEL` stores what a character accepts or leans toward as true.

It does not automatically represent objective canon.

Examples:

```text
Mara|Rowan hides information when afraid of abandonment|high|confirmed|EV-03.04,EV-04.03
Rowan|people he loves eventually leave him|high|not-applicable|EV-04.03
Mara|Rowan stopped loving her before the separation|moderate|false|EV-03.05
```

Biases may be represented as generalized beliefs when they materially shape interpretation.

Update beliefs when later Events materially strengthen, weaken, overturn, or complicate them.

---

# Knowledge (KNW)

**Purpose:** Preserve information boundaries and prevent accidental omniscience.

Format:

```text
fact|known-by:[...]|suspected-by:[...]|unknown-to:[...]|source
```

List only characters for whom the distinction matters.

### Rules

Knowledge requires sufficient source-supported acquisition.

Do not promote:

- suspicion;
- inference;
- rumor;
- accidental implication;

to knowledge without justification.

A fact may simultaneously be:

- known by one character;
- suspected by another;
- unknown to a third.

Example:

```text
Rowan read Mara's mother's letter before she did|known-by:Mara,Rowan|suspected-by:—|unknown-to:Elena|EV-03.04
```

When a character learns a fact, update the entry rather than preserving them as still unaware.

Do not infer knowledge merely because a character was present unless the source makes perception plausible.

---

# Secrets (SEC)

**Purpose:** Track deliberately concealed information and its disclosure state.

Format:

```text
secret|holder|known-by:[...]|suspected-by:[...]|hidden-from:[...]|stakes|status|source
```

Statuses:

```text
hidden
partially-revealed
revealed
exposed
```

### Rules

A knowledge gap is not automatically a secret.

Use `SEC` when someone is intentionally concealing information or when concealment itself has continuity value.

Example:

```text
Rowan read the letter weeks earlier|holder:Rowan|known-by:Rowan|suspected-by:—|hidden-from:Mara|relationship trust|revealed|EV-03.04
```

Fully revealed secrets may leave `SEC` when concealment no longer matters, while their revelation survives in `EV`, `DEV`, `KNW`, or `REL`.

---

# States (ST)

**Purpose:** Preserve meaningful emotional, physical, and transient mental snapshots produced by Events.

Format:

```text
EV-ID.position|Character|emo:[...]|phys:[...]|mental:[...]
```

Include only fields that materially matter.

Example:

```text
EV-03.04.start|Mara|emo:suspicious,anxious|phys:tense
EV-03.04.end|Mara|emo:betrayed,furious,grieving|phys:trembling,crying
```

### Rules

`ST` is a **snapshot**, not a personality description.

Create a State when an Event leaves a character in a materially meaningful condition or when a before/after transition matters.

Do not create State entries merely because an Event is major.

Preserve:

- strong or consequential emotion;
- meaningful injury or bodily condition;
- exhaustion;
- intoxication;
- dissociation;
- panic;
- arousal;
- restraint;
- altered consciousness;
- other transient conditions affecting behavior.

Use `DEV` rather than `ST` for lasting change.

Use `CUR` for the latest immediate condition.

---

# Relationships (REL)

**Purpose:** Preserve the current directional relationship state produced by shared history, personal history, bias, and current context.

Relationships are **dynamic state vectors**, not labels.

Format:

```text
A -> B: trust=__, intimacy=__, tension=__, affection=__, lust=__, dominance=__, submission=__, hostility=__, dependency=__, protectiveness=__ | drivers:[...] | notes:[...]
```

Preserve all core dimensions for focal relationships, including meaningful zeroes.

Additional dimensions may be added when truly necessary.

`A -> B` and `B -> A` are independent.

## General Scale

Values are **state indices, not percentages**.

Do not interpret `80` as “80% of a relationship.”

Scores represent positions on defined continua.

Extreme states should require stronger evidence than moderate states.

## Core Dimensions

### Trust

Expectation that the other person is honest, reliable, predictable, and unlikely to intentionally violate one's interests.

```text
0   = profound active distrust
50  = neutral/unproven or mixed
100 = near-absolute trust
```

Trust may remain low despite affection or intimacy.

### Intimacy

Degree of emotional and relational access: familiarity, vulnerability, private knowledge, exposure, and felt closeness.

```text
0   = no meaningful personal access
100 = exceptional emotional/relational closeness
```

Intimacy overlaps with trust and romance but is not reducible to either.

High intimacy may persist after trust collapses.

### Tension

Degree of unresolved interpersonal charge: friction, anticipation, awkwardness, attraction, conflict, uncertainty, or emotional pressure.

```text
0   = no meaningful charge
100 = extreme persistent charge
```

Tension is not inherently positive or negative.

### Affection

Valenced emotional attachment ranging from hatred through indifference to love.

Do **not** divide the scale into equal semantic fifths.

Approximate interpretation:

```text
0-10   = hatred / extreme aversion
11-30  = dislike / negative attachment
31-69  = broad indifference / weak or mixed valence
70-89  = liking / fondness
90-100 = love / defining positive attachment
```

The neutral region is deliberately broad.

Extreme hatred and love occupy narrower ranges and require stronger evidence.

### Lust

Sexual desire toward the other person, independent of affection, trust, intimacy, or willingness to act.

```text
0   = absent
100 = extreme persistent sexual desire
```

Lust does not imply consent.

### Dominance

Current tendency or desire to direct, lead, control, claim authority, or occupy the higher-power position within this specific relationship.

```text
0   = absent
100 = extreme
```

### Submission

Current tendency or desire to yield, defer, surrender control, follow, or occupy the lower-power position within this specific relationship.

```text
0   = absent
100 = extreme
```

Dominance and submission are **not opposites**.

Both may be high, both low, or context-dependent.

Qualify the notes when the dynamic is domain-specific, such as sexual, emotional, social, or situational.

### Hostility

Active disposition toward opposition, antagonism, punishment, or harm.

```text
0   = absent
100 = extreme active hostility
```

Hostility is not merely dislike.

### Dependency

Degree to which emotional, physical, social, practical, or psychological functioning materially relies on the other person.

```text
0   = independent
100 = extreme reliance
```

Dependency is not the same as closeness or affection.

### Protectiveness

Impulse to preserve the other person's safety or wellbeing, particularly when doing so carries cost, risk, or inconvenience.

```text
0   = absent
100 = extreme
```

Protectiveness is not synonymous with affection.

## Relationship Drivers

`drivers` should reference only the strongest Events, beliefs, histories, or current contexts shaping the vector.

Example:

```text
Mara -> Rowan: trust=18,intimacy=83,tension=91,affection=94,lust=78,dominance=42,submission=21,hostility=34,dependency=56,protectiveness=88 | drivers:EV-01.12,EV-03.04,EV-04.03 | notes:loves him deeply; distrust centered on concealment, not fidelity
```

## Updating Relationships

Store **current absolute values**, not deltas.

An Event may imply movement such as:

```text
trust sharply decreases
tension rises
```

but `REL` stores the resulting current state.

During consolidation, the latest supported vector supersedes earlier current vectors.

Preserve major pivot Events in `drivers` or historical Events rather than maintaining every previous score.

---

# Perceptions (PER)

**Purpose:** Preserve how one character currently interprets another person.

`REL` stores the relationship state.

`PER` stores the **story the observer tells themselves about the subject**.

Format:

```text
Observer -> Subject|perception|basis:[...]|accuracy:[...]
```

Accuracy:

```text
accurate
partially-accurate
mistaken
unknown
```

Example:

```text
Mara -> Rowan|believes he becomes secretive when terrified of abandonment|basis:EV-03.04,EV-04.03|accuracy:accurate
```

### Rules

Preserve perceptions when they materially shape interaction.

Perceptions may conflict with:

- objective truth;
- the subject's self-perception;
- other characters' perceptions;
- relationship scores.

Do not correct a character's perception merely because the shard contains better information.

Bias-linked perceptions may reference relevant `BEL` entries or Events.

---

# Preferences & Habits (PREF)

**Purpose:** Preserve recurring behavioral and personal details that materially shape portrayal or interaction.

Format:

```text
Character|type|detail|strength|source
```

Common types:

```text
like
dislike
habit
mannerism
routine
comfort
aversion
coping
trigger
address
interaction-pattern
```

Strength:

```text
weak
moderate
strong
defining
```

### Rules

Preserve details when they recur, carry emotional meaning, affect behavior, or would noticeably damage characterization if forgotten.

Examples:

```text
Mara|habit|rubs thumb over eyebrow scar when lying|strong|EV-02.03,EV-03.04
Rowan|coping|becomes overly analytical when emotionally overwhelmed|strong|EV-02.09,EV-04.03
Rowan|address|uses "darling" for Mara primarily when emotionally exposed|strong|EV-01.12,EV-04.04
```

Do not preserve incidental tastes merely because they were mentioned once unless they later acquire continuity value.

---

# Obligations (OBL)

**Purpose:** Preserve promises, debts, vows, duties, agreements, orders, responsibilities, and unfinished social commitments.

Format:

```text
Character|obligation|to/for|status|stakes|created-by|trigger/due
```

Statuses:

```text
active
fulfilled
broken
waived
impossible
```

Example:

```text
Rowan|tell Mara before withholding information that affects her|Mara|active|relationship trust|EV-04.04|ongoing
```

### Rules

Carry active obligations forward even when not recently mentioned.

Do not treat wishes or vague intentions as obligations.

When fulfilled or broken, preserve the resulting Event and any lasting development.

Historically unimportant fulfilled obligations may then leave `OBL`.

---

# Dialogue Keys (DIA)

**Purpose:** Preserve exact wording whose phrasing itself carries future continuity value.

Format:

```text
DIA-[EVENT].[N]|"exact quote"|Speaker|context/significance
```

Example:

```text
DIA-EV-04.03-01|"I didn't think you'd stay if you knew all of me."|Rowan|explicit abandonment fear; reframes prior concealment
```

### Preserve

- confessions;
- promises;
- threats;
- vows;
- names or forms of address that matter;
- revelations;
- relationship-defining statements;
- emotionally defining lines;
- lines directly likely to be recalled or echoed later.

### Do Not Preserve

- ordinary good dialogue;
- exposition already recoverable from Events;
- lines whose exact wording adds no continuity value.

Quotes must remain exact.

Do not “improve” remembered dialogue.

---

# Voice Samples (VOC)

**Purpose:** Preserve representative speech patterns to prevent character voice drift.

Format:

```text
Character|"quote" (context)|"quote" (context)|...
```

Use exact source dialogue.

### Rules

Prefer 2–4 highly representative samples per focal character.

Choose samples that demonstrate distinct aspects of voice, such as:

- ordinary speech;
- humor;
- anger;
- vulnerability;
- affection;
- formality;
- characteristic syntax or vocabulary.

Do not choose quotes only because their content is important; `VOC` is about **how the character speaks**.

`VOC` may reuse a `DIA` quote when it is both canonically important and voice-defining.

During consolidation, replace redundant samples with more representative ones rather than endlessly accumulating quotes.

---

# Sensory Anchors (SEN)

**Purpose:** Preserve sensory details that acquired durable emotional, relational, identity, or callback significance.

Format:

```text
anchor|sense|events|association/significance
```

Senses:

```text
olfactory
gustatory
tactile
auditory
visual
```

Example:

```text
vanilla shampoo|olfactory|EV-02.04,EV-04.06|Mara associates Rowan's scent with being held through panic
```

### Rules

A sensory detail is not an anchor merely because it was described.

Preserve it when an Event makes it meaningfully associated with:

- safety;
- fear;
- intimacy;
- grief;
- attraction;
- identity;
- trauma;
- memory;
- ritual;
- callback;
- other durable significance.

Every `SEN` entry must point to the Event or Events that made it meaningful.

Do not preserve free-floating atmospheric description.

---

# Open Threads (OPN)

**Purpose:** Preserve unresolved future-facing continuity.

Format:

```text
thread|type|introduced|last-active|status|expected-relevance|notes
```

Types:

```text
callback
mystery
pending-action
unresolved-conflict
foreshadowing
deferred-conversation
```

Statuses:

```text
unresolved
developing
urgent
deferred
dormant
```

Example:

```text
Mara has not read her mother's second letter|pending-action|EV-05.02|EV-05.02|unresolved|future revelation|Rowan knows it exists but has not seen it
```

### Rules

`OPN` merges unresolved plot elements and planted callbacks into one system.

Preserve an item when some future action, reveal, conflict, reference, or payoff remains outstanding.

When resolved:

- update the resolving Event;
- remove the thread from current `OPN`;
- preserve any lasting consequence in the appropriate section.

Do not retain resolved threads merely as historical clutter.

---

# NSFW Registry (NSFW)

**Purpose:** Preserve source-supported explicit adult sexual continuity when losing the detail would materially affect later interaction, relationship understanding, physical continuity, or callback.

Every entry must attach to a qualifying Event.

Format:

```text
NSFW-[EVENT]|participants|continuity-summary
```

When exact physical detail is itself continuity-relevant, preserve only as much source detail as needed to reconstruct later references accurately.

### Preserve When Relevant

Possible continuity dimensions include:

- consent framing;
- initiation;
- acts established;
- boundaries expressed;
- power dynamic;
- dominance/submission pattern;
- clothing or physical state when later relevant;
- firsts or novel experiences;
- preferences discovered;
- emotional buildup;
- emotional aftermath;
- relational consequence;
- physical consequence;
- meaningful dialogue or sensory association.

### Rules

Explicitness alone does not determine Event weight.

Routine sexual activity with no new or lasting continuity may receive only a concise Event entry and no detailed NSFW entry.

A first experience, boundary shift, reconciliation, rupture, discovery, or other relationally consequential encounter may warrant more detail.

Preserve only source-supported adult material.

Do not invent, sanitize, euphemize, or intensify details.

Do not create an `NSFW` entry if the underlying occurrence is not worth preserving as an Event.

---

# Current State (CUR)

**Purpose:** Provide the exact handoff state required to continue immediately from the end of available history.

Format:

```text
Location:
Time:
Present:
Situation:
Last Beat:
Mood:
Physical:
Relationship Context:
Active Goals:
Pending:
Immediate Constraints:
```

Omit unsupported or irrelevant fields except:

- `Location`
- `Present`
- `Situation`
- `Last Beat`
- `Pending`

These should normally be recoverable.

### Rules

`CUR` is the **pickup packet**, not a history summary.

It should answer:

- where are we?;
- who is here?;
- what is happening now?;
- what just happened that the next response must react to?;
- what physical/emotional condition matters immediately?;
- what action, answer, choice, or interaction is pending?

Use the latest valid information from all other sections.

Do not introduce new interpretation in `CUR`.

If the source ends mid-action or mid-conversation, preserve that incompleteness exactly.

---

# Processing Order

When compressing raw roleplay:

1. Read the entire supplied input before writing output.
2. Identify coherent Events.
3. Assign stable Event IDs.
4. Determine Event weights.
5. Identify persistent facts established or changed by each Event.
6. Separate objective facts from beliefs, perceptions, suspicions, and knowledge boundaries.
7. Build or update relationship vectors.
8. Build Timeline phases from the completed Event history.
9. Preserve reconstruction anchors only where they add information Events cannot.
10. Build `CUR` from the final valid state.
11. Remove redundant or inferable detail.
12. Verify provenance and continuity before returning the shard.

Do not begin from emotional peaks and force the rest of history around them.

Emotional peaks are important, but causality and continuity determine the memory structure.

---

# Compression Rules

## Dialogue

Paraphrase ordinary dialogue inside Events.

Preserve exact wording only in `DIA` or `VOC` when wording itself matters.

## Internal Thought

Preserve conclusions, beliefs, goals, perceptions, and meaningful state changes rather than every thought.

Do not convert private thought into knowledge available to other characters.

## Action

Compress choreography unless it affects:

- outcome;
- injury;
- position;
- access;
- power dynamic;
- relationship;
- later reference.

## Setting

Compress atmosphere unless it materially affects behavior, mood, causality, sensory association, or future continuity.

## Repetition

Summarize repeated low-value patterns when their individual occurrences do not differ meaningfully.

Preserve escalation, exception, or reversal separately.

## Contradictions

Preserve contradictions when they reflect:

- differing perspectives;
- lies;
- uncertainty;
- changing beliefs;
- unreliable memory;
- genuine unresolved source conflict.

Do not reconcile them without source support.

## Persistence

Prefer storing the current persistent state once plus the Events that explain it rather than preserving repeated statements of the same fact.

## Detail

Spend tokens where loss is hardest to reconstruct.

Compress what can be reliably inferred.

Preserve what cannot.

---

# Consolidation Protocol

Consolidation produces a current master shard from prior shards without rewriting history into false simplicity.

## General Rules

- Preserve Event IDs.
- Preserve provenance.
- Latest valid **current state** supersedes earlier current state.
- Historical Events remain historical facts even when their consequences later change.
- Absence from a later shard does not delete persistent memory.
- Never promote uncertainty during consolidation.
- Deduplicate identical facts and redundant prose.
- Preserve meaningful evolution rather than only final conclusions.

## Section Merge Rules

### TON

Use the latest sustained presentation style.

Preserve earlier style only when the shift itself matters.

### CHR

Use the latest stable baseline.

Apply lasting developments that have become permanent character facts.

Do not carry obsolete temporary conditions.

### WLD

Merge still-valid external facts.

Update changed facts while retaining the Event establishing the change.

Remove obsolete world facts unless historically necessary.

### CON

Carry forward all still-binding constraints.

Remove only when explicitly lifted, broken, superseded, or made irrelevant by a later Event.

### TL

Rebuild broad phases across the full Event history.

Merge overly narrow phases.

Split phases when later context reveals a true historical boundary.

Renumber `TL` sequentially if needed.

### EV

Preserve stable Event IDs.

Order chronologically.

Deduplicate only clear duplicate representations of the same occurrence.

Merge additional source-supported detail into the existing Event rather than creating a replacement ID.

Minor Events may be pruned only when:

- no persistent fact depends on them;
- no causal chain requires them;
- no callback or thread references them;
- their loss does not weaken historical interpretation.

### DEV

Merge durable developments.

Preserve progression when multiple developments form meaningful evolution.

### GOAL

Use latest status.

Carry forward:

- active;
- blocked;
- dormant;
- conflicted.

Remove completed/abandoned goals unless historically important.

### BEL

Use latest belief state.

Preserve major changes with pivot Event references.

Do not silently replace an old belief if the change itself matters to characterization.

### KNW

Union valid knowledge by character.

Update acquisition.

Never promote suspicion to knowledge without source support.

Remove `unknown-to` status once acquisition occurs.

### SEC

Update disclosure state and who knows or suspects.

Remove fully revealed secrets when concealment no longer matters, while preserving consequences elsewhere.

### ST

Keep snapshots that explain important transitions or still matter for reconstruction.

Discard redundant historical states once their significance is fully captured by Events and lasting sections.

### REL

Use the latest supported absolute vector for each relevant direction.

Preserve meaningful pivot Events in `drivers`.

Do not average old and new scores.

Do not infer a new score merely because time passed.

### PER

Use latest current interpretation.

Preserve major perception shifts with Event anchors.

### PREF

Merge per character.

Deduplicate.

Preserve strong/defining recurring patterns.

Discard incidental one-offs that never gained continuity value.

### OBL

Carry all active obligations.

Update fulfilled, broken, waived, or impossible obligations.

Move lasting consequences into `EV`/`DEV`/`REL` as applicable.

### DIA

Deduplicate exact lines.

Keep wording that remains important for recall, callback, promise, threat, revelation, or relationship history.

### VOC

Keep a compact representative set.

Prefer breadth of voice coverage over repeated examples of the same tone.

### SEN

Merge identical anchors.

Preserve meaningful associations and source Events.

Remove sensory detail whose significance no longer exists.

### OPN

Update status.

Remove resolved threads after recording their resolution and consequences elsewhere.

Carry unresolved dormant threads even when temporarily unmentioned.

### NSFW

Merge by source Event.

Preserve only continuity-relevant adult source material.

Do not progressively expand explicit detail during consolidation.

### CUR

Use only the latest valid pickup state.

Reconstruct it from the latest shard plus persistent information that remains immediately relevant.

---

# Compression Priority

When context limits require aggressive compression, preserve information in this order:

1. `Current State`
2. `Character Registry`
3. critical `Goals`, `Knowledge`, and `Constraints`
4. `Relationships`
5. `Timeline`
6. keystone and major `Events`
7. active `Secrets`, `Beliefs`, `Obligations`, and `Open Threads`
8. significant `Events` and `Developments`
9. `Perceptions`, important `States`, `Preferences & Habits`
10. `Dialogue Keys`, `Voice Samples`, `Sensory Anchors`, continuity-relevant `NSFW`
11. minor/incidental historical detail

This is survival priority, not normal output order.

Never discard a lower-ranked item when doing so makes a higher-ranked item unintelligible.

---

# Final Integrity Check

Before returning a shard, verify:

### Provenance

- Every Event traces to source material.
- Derived facts reference the Events that established or changed them when applicable.
- Baseline facts use `BASE` rather than invented history.

### Causality

- Important outcomes retain enough cause to remain understandable.
- Later Events do not silently depend on omitted indispensable Events.

### Subjectivity

- Belief is not confused with fact.
- Suspicion is not confused with knowledge.
- Perception is not confused with motive.
- Private information has not leaked between characters.

### Persistence

- Still-valid facts survive even when not recently mentioned.
- Active goals, obligations, secrets, constraints, and open threads remain present.
- Lasting developments are reflected in current character state where appropriate.

### Relationships

- Relationship vectors are directional.
- Values represent current absolute states.
- Major movements are explainable from preserved history.
- Affection, lust, intimacy, trust, tension, dominance, submission, hostility, dependency, and protectiveness remain conceptually distinct.

### Compression

- Optional empty sections are omitted.
- Repeated facts are not preserved merely for symmetry.
- Reconstruction anchors add information rather than duplicate Events.
- Low-value prose has not displaced high-value continuity.

### Current State

- The final location and present characters are correct.
- Immediate physical and emotional conditions are correct.
- The last meaningful beat is recoverable.
- Pending action or dialogue is explicit.
- The roleplay can continue immediately without access to the original history.

If any final detail fails the continuity-value test, remove it.

If removing a detail makes future behavior, relationships, causality, callbacks, or context materially harder to understand, preserve it.
