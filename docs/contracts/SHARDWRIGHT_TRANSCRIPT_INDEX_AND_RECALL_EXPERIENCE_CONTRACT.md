# Shardwright Transcript Index And Recall Experience Contract

**Version:** 0.8.17
**Status:** ENTERED — governing acceptance boundary; runtime work is permitted only
through separately declared bounded slices, never by blanket contract authority.
**Classification:** Parallel operational-continuity track; not Phase X memory-governance authority.

## 1. Purpose And Causal Bridge

Shardwright summaries solve active-chat compression: they replace costly nearby history
with a meaningful, source-tethered account. Editable Markdown dossiers solve a separate
problem: they give people a readable, revisable conceptual record. Neither makes the
wider chat corpus complete, searchable source evidence.

The Transcript Index exists to preserve that evidence without forcing a full corpus
into every prompt:

```text
raw direct and group chats
→ per-character Transcript Index
→ full-message FTS retrieval and contextual-window reconstruction
→ bounded continuity or archaeology injection
```

For architecture, lineage, legacy, collaboration, and accuracy questions, a visibly
broader answer is preferable to a fast answer that mistakes an arbitrary retrieval
slice for a complete record. This is an extinction-shaped loss profile: the system
must distinguish "the record is absent" from "the system did not look far enough."

Every child requirement MUST preserve this derivation:

```text
human need → practical distinction → machine boundary
→ visible product consequence → failure prevented
```

Independent convergence on a principle establishes that it merits preservation and
testing. It does not validate an implementation.

## 2. Relationship To Existing Architecture

This contract is derived from, and MUST NOT silently redefine:

- [Phase X: Memory Formation Operational Model](PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md),
  whose authority is derivational rather than executable;
- [Phase X: Active Continuity Assembly And Precedence Contract](PHASE_X_ACTIVE_CONTINUITY_ASSEMBLY_AND_PRECEDENCE_CONTRACT.md),
  which governs governed-memory assembly only; and
- [Shardwright Operator Settings Catalog Contract](SHARDWRIGHT_OPERATOR_SETTINGS_CATALOG_CONTRACT.md),
  which governs operator-setting declaration and scope jurisdiction; and
- [Phase X Origin](../Phase_X-Origin.md), which preserves product rationale and
  architecture/co-development, roleplay, and group continuity profiles.

Raw transcript, FTS match, reranker result, summary, dossier edit, injection receipt,
and prompt injection are not governed-memory authority. This contract neither
activates nor mutates Phase X memory.

## 3. Ownership And Projection Boundary

| Layer | Owner | Establishes | Does not establish |
| --- | --- | --- | --- |
| Raw transcript | Host source records | Available source material at a recorded revision | Meaning, agreement, or governed authority |
| Transcript Index | Shardwright | Rebuildable source-tethered retrieval projection | Source truth beyond custody; memory authority |
| Active summary | Shardwright summaries | Nearby compressed context and source-block relation | Cross-chat completeness |
| Markdown dossier | Shardwright projection | Human-readable/editable conceptual material | Silent source or governance override |
| Injection receipt | Shardwright UI | What one assembly used, excluded, or refused | What the model believed or concluded |
| Phase X memory | Phase X governance | Governed interpretation, jurisdiction, lifecycle | Raw transcript ownership |

The index is isolated per character instance. Avatar, card path, display name, chat
title, and file path are bindings or locators, not sufficient persistent identity.

### 3.1 Character-instance binding and rebind

`characterInstanceId` is an opaque generated identity. A current host character may
be bound to it only by an explicit recorded binding. A title, alias, avatar filename,
card path, chat title, file path, content similarity, or shared text MUST NOT establish
or restore that binding.

On a fresh install or reimport where no recorded binding exists, the system MUST create
a new `characterInstanceId`. Earlier corpus and projections remain separate and
unresolved until an operator records an explicit rebind action with its basis. The
system MUST NOT silently inherit, merge, or expose earlier corpus under the new
instance. This is the character-instance application of Parent Architecture
`SHE-ID-001`: titles are not identities.

## 4. Authority Gate

### 4.1 Source authority

For one character instance, admissible sources are:

1. direct-chat JSONL revisions assigned to that character; and
2. group-chat JSONL revisions where historical participation is evidenced by the
   corresponding group/source record.

Configured source roots are implementation configuration. They MUST NOT become
portable source identity.

### 4.2 Lifecycle and reuse

The Transcript Index owns source registration, reconciliation, source-state
projection, per-message retrieval eligibility, and replay of its own operational
ledger. The host owns raw chat files and native hide/delete events it exposes. Phase X
owns governed-memory lifecycle separately.

Implementation SHOULD reuse Shardwright's character-scoped chat handling,
summary/source-block association, extension/server boundary, diagnostics surfaces, and
prompt-injection integration. SQLite FTS5 is the intended local lexical mechanism.
No vector backend, CharMemory implementation, or semantic authority service is
required. Its document projection lives in a separate, rebuildable
`transcript-index.db`, never in the governed operational database; durable transcript
ledgers remain its custody and eligibility source.

### 4.3 Failure behavior

Stale, missing, ambiguous, cross-scope, or unreconciled source custody MUST refuse
source-dependent recall or label it non-current. The system MUST NOT substitute cached
bytes, a similarly titled chat, model reconstruction, or a dossier edit as source
evidence.

## 5. Source Topology And Records

### 5.1 Source revisions

Direct and group records are separate source classes. Present-day group membership
MUST NOT be assumed for a historical transcript.

Every admitted source revision records at least:

```text
characterInstanceId
sourceClass                    # DIRECT or GROUP
sourceLogicalId                # generated and stable within the store
hostLocator                    # path/name/url locator only
sourceRevisionHash
observedAt
historicalParticipantBasis     # exact group/source basis when GROUP
branchTopology
coverageState
```

Titles, paths, filenames, timestamp-like names, similarity, and co-occurrence cannot
resolve source or participant identity alone.

### 5.1.1 Resolution locator versus display locator

At source registration, the authenticated host selection supplies an immutable typed
`sourceResolutionLocator`; registration MUST NOT parse or synthesize it from the
human-readable `hostLocator`. For direct sources it records the host's direct-chat
selection fields (avatar identifier and chat stem); for group sources it records the
host's group identifier and chat stem. `hostLocator` is display-only.

The registry stores the typed locator in its immutable registration entry. A later
rename, move, disappearance, or resolution failure MUST produce unavailable or
unresolved source state. It MUST NOT trigger locator regeneration, title/path matching,
or cached-byte substitution.

### 5.2 Branch topology

Checkpoints, forks, rewinds, imports, and convergent runs MUST remain separate paths,
even where text overlaps. Source revisions preserve:

```text
branchId
parentBranchId or parentSourceRevision
siblingRelation
branchPointLocator
generation/import lineage where known
```

Similarity MUST NOT merge branch siblings.

### 5.3 Full-message rows

The index stores one complete source message per row, not arbitrary embedding chunks.
Each current row retains:

```text
messageRecordId
characterInstanceId
sourceLogicalId and sourceRevisionHash
nativeMessageId when available
sourceLocalOrder
sender identity as recorded
timestamp value and derivation tier
complete message content and contentHash
visibilityState
current revision pointer
```

Native immutable message identity is preferred. When absent, reconciliation may use
exact source-local evidence but MUST leave ambiguous identity `UNRESOLVED`; text
similarity may not manufacture identity.

### 5.4 Timestamp tiers

```text
METADATA_NATIVE      source-system metadata directly recorded with the message
CONTENT_RENDERED     visible text such as [TD], derived from known metadata
IMPORT_NORMALIZED    migration/import normalization with recorded basis
UNAVAILABLE          no lawful timestamp can be established
```

Native metadata is highest authority when present. Rendering may inject available
native time; it MUST NEVER invent a missing timestamp or elevate content-rendered time
over conflicting native metadata.

## 6. Coverage, Suspension, And Lifecycle

### 6.0 Visibility evidence and historical limits

`presence_manually_hidden: true` is the host-owned, per-message hidden signal. It may
make that observed message ineligible while preserving its source custody.
`summarizedRanges[].hidden` is a range/collapse instruction and MUST NOT substitute for
per-message visibility evidence.

Shardwright archive and tombstone states exist only where the corresponding
`extra.shardwright.messageIdentity.messageId` was already recorded. A Shardwright
tombstone may preserve a deleted message's last known identity and revision hash, but
absence from a pre-Shardwright source revision MUST NOT be classified as deletion:
there is no authoritative record distinguishing deletion from material that was never
captured. Likewise, archive MUST NOT be inferred for pre-Shardwright material.

### 6.1 Coverage map

Corpus coverage is runtime state, not a document footnote:

```text
NOT_SCANNED
SCANNED_NO_RELEVANT_SOURCE
SCANNED_WITH_SOURCE
SUSPENDED_INTENTIONALLY
SCAN_FAILED
```

`NOT_SCANNED` and `SCAN_FAILED` are distinct known-unknowns and MUST NOT be rendered
as clean negative results.

### 6.2 Deliberate gaps

Uncaptured runs can be intentional for rewind and convergence testing. Suspension is
therefore a first-class event, recording scope, start/end or open state, effective
source/order boundary, operator action, and reason category with optional private
detail. A marked gap is evidence of method; an unmarked gap remains `MISSING`,
`UNRESOLVED`, or `SCAN_FAILED` according to observed custody.

### 6.3 Delta reconciliation

Initial intake MAY scan the complete configured corpus. Later intake MUST:

1. inspect source revision/fingerprint state;
2. identify only new, changed, missing, or newly eligible source revisions;
3. reconcile only affected message rows and current FTS projection;
4. append immutable operational revisions rather than overwrite history; and
5. record scan, skip, suspension, refusal, and failure outcomes.

An unchanged corpus MUST NOT be re-indexed for every ordinary generation.

### 6.4 Visibility state

| State | Meaning | Ordinary retrieval |
| --- | --- | --- |
| `ACTIVE` | Current source evidence is available and eligible | Eligible |
| `ARCHIVED` | Retained/auditable and deliberately suppressed | Excluded unless an authorized archive operation requests it |
| `RETRACTED` | Source support was deliberately removed | Not eligible |
| `MISSING` | Source absent; intent unknown | Not current evidence |
| `UNRESOLVED` | Changed source or ambiguous identity | Not eligible pending reconciliation |

Observed hide normally yields reversible `ARCHIVED`. Observed delete/revocation may
yield `RETRACTED`. External absence yields `MISSING` or `UNRESOLVED`, never guessed
intent. Existing Markdown with only chat/date provenance cannot be withdrawn at
message granularity; an affected historical projection needs re-pull, review, or
quarantine until message-level tethers exist.

### 6.5 Occurrence custody, exact-content equivalence, and eligibility

Every physical message occurrence remains independently durable evidence. Its custody
identity is its `sourceLogicalId`, `sourceRevisionHash`, and `sourceLocalOrder`.
Neither matching prose, timestamp, sender, title, path, branch position, nor a
retrieval result may merge, replace, or erase another occurrence.

For retrieval efficiency only, the exact SHA-256 hash of the complete message text MAY
form an **exact-content equivalence family**. The family is a projection over intact
occurrences, not a new source record or semantic conclusion. It MUST be based on exact
complete text only: normalization, similarity, embeddings, and model judgment MUST
NOT create an equivalence family. Timestamp and source location remain custody
attributes, not family identity.

Eligibility remains occurrence-local:

| Occurrence condition | Ordinary FTS | Archaeology FTS | Required treatment |
| --- | --- | --- | --- |
| `ACTIVE` observed source row | Eligible | Eligible | Preserve the exact source occurrence. |
| Host-hidden / `ARCHIVED` row | Excluded | Eligible only under explicit archaeology/archive scope | Preserve it and expose its exclusion. |
| `RETRACTED`, tombstone-only, or source-content-unavailable row | Excluded | Excluded | Preserve audit/tombstone custody; index no recoverable text. |
| `MISSING` or cross-revision `UNRESOLVED` row | Excluded | Excluded pending review | Do not inherit a prior row's eligibility. |
| Current pre-Shardwright visible row without stable message identity | Eligible for that exact revision | Eligible for that exact revision | Mark revision-local; do not infer cross-revision continuity. |

When an exact-content family contains both eligible and excluded occurrences, there is
no automatic winner. An eligible occurrence MAY be retrieved while excluded siblings
remain excluded. The retrieval receipt MUST report the family relationship and the
number and state of excluded siblings; it MUST NOT describe the representative as the
only occurrence or silently propagate hide, archive, deletion, or retraction across
branches or chats.

Family-wide suppression is permitted only through an explicit, auditable operator
disposition that names the exact family hash, scope, reason, actor, and time. It affects
future retrieval eligibility only; it MUST NOT mutate source custody, occurrence-local
visibility, raw source, or Phase X authority. Absence of such a disposition is refusal
to suppress the family as a whole.

SQLite FTS5 admission therefore has three bounded scopes:

```text
ORDINARY          currently eligible `ACTIVE` occurrences
ARCHAEOLOGY_ONLY  retained, deliberately suppressed `ARCHIVED` occurrences
EXCLUDED          no recoverable-text FTS document
```

An FTS representative may reduce duplicate prompt payload only after occurrence-local
eligibility filtering. It retains links to every matching family occurrence so that
provenance, branch topology, source diversity, and conflict inspection remain possible.

## 7. Retrieval And Sufficiency

### 7.1 FTS and contextual windows

SQLite FTS5 indexes the complete current source message. A match retrieves a bounded
surrounding-message window for context; that window is a presentation assembly, not
index-time chunking. Optional reranking may reorder eligible candidates but cannot
establish truth, eligibility, authority, or sufficiency.

The FTS document projection is character-scoped and rebuildable. It creates one
complete-text document per exact-content family and eligible admission scope, retains
links to all family occurrences (including excluded siblings when a family has an
eligible document), and creates no document for exclusively excluded text. It does not
itself query FTS, choose a candidate, assemble a window, or inject a prompt.

Candidate selection accepts one explicit generation query, character instance,
retrieval posture, and bounded candidate limit. `CONTINUITY` searches `ORDINARY`
documents only; `ARCHAEOLOGY` may also search `ARCHAEOLOGY_ONLY` documents. A missing
or non-lexical query returns `NO_QUERY` without opening or creating an index. A match
returns document identity, content hash, admission scope, and occurrence-link custody
only—never source text, model interpretation, contextual windows, or prompt material.

Contextual-window reconstruction begins with one selected document and one selected
occurrence link, then re-derives neighboring rows from the same durable current source
revision. It MUST validate that the selected source revision is still current before
returning content. In continuity posture, only visible rows expose content; hidden,
archived, deleted, and unresolved neighbors remain explicit omissions. Explicit
archaeology may expose retained hidden or archived rows, but never deleted or
unresolved content. A window remains read-only source presentation, not prompt
assembly or evidence interpretation.

Multi-candidate assembly may combine already reconstructed windows only when every
selected document has an explicit occurrence anchor. It MUST preserve each candidate's
document, source-revision, and row-level custody and MUST NOT infer an anchor from
text duplication, ranking order, recency, title, path, branch position, or model
judgment. `NO_QUERY` and `NO_MATCH` propagate without source or index work.

Anchor eligibility is calculated only **after** the declared posture's visibility
filter has been applied. Therefore continuity counts visible occurrences only, while
explicit archaeology counts visible plus retained hidden/archived occurrences; deleted
or unresolved rows never count as eligible anchors in either posture.

The anchor-selection policy is posture-specific:

1. continuity automatically uses the sole eligible occurrence when exactly one exists;
2. continuity with multiple eligible occurrences assembles every eligible occurrence
   only when all fit the declared bounded budget, otherwise returns
   `AMBIGUOUS_ANCHORS` with no silent partial selection; and
3. archaeology expands every eligible occurrence by default because source diversity
   is part of its required evidence posture.

An operator may later record a preferred occurrence only as a scoped retrieval
preference. Such a preference is revisable; scoped to the operator/session that set
it; MUST NOT suppress any occurrence from archaeology; and MUST NOT merge custody,
alter visibility, or establish semantic or Phase X authority. Preference persistence,
expiry, and UI are separately declared work.

### 7.2 Two retrieval postures

| Posture | Use | Required behavior |
| --- | --- | --- |
| Continuity | Ordinary roleplay and nearby recall | Fast bounded retrieval and injection |
| Archaeology | Origins, architecture, lineage, legacy, collaboration, accuracy review | Broadened search, chronology, source diversity, provenance, conflict visibility, sufficiency result |

The system may suggest a posture but MUST make it visible and permit explicit
archaeology selection.

### 7.3 Sufficiency

Sufficiency is not a confidence number. Evidence is locally sufficient only when:

1. material facets of the question have identifiable source coverage;
2. every material assertion has source-bound support;
3. repeated summaries are not misrepresented as independent corroboration;
4. adaptive expansion adds no material origin, exception, conflict, or phase; and
5. remaining conflicts, unavailable sources, and scope limits remain visible.

This does not prove an unscanned or excluded corpus contains nothing relevant. It may
be sufficient in honesty while unable to reconstruct a desired history.

### 7.4 Independent controls

Candidate window, reranker admission/order, contextual-window size, and final
character/token budget MUST remain separate profile settings. No top-N ceiling, score
threshold, or current numeric setting establishes relevance or sufficiency without
benchmark evidence. Archaeology MUST be able to expand before declaring lower-ranked
evidence irrelevant.

### 7.4.1 Capacity measurement and reservation

Automatic assembled context MUST use measured active-model token capacity and live
prompt-token usage when both are available. A profile supplies independently visible
retrieval ceiling and optional explicit safety headroom. The usable retrieval capacity
is the lesser of that profile ceiling and measured remaining capacity after only that
headroom; system/card, active-chat, and reply capacity already accounted for by the
host MUST NOT be reserved again.

When the active tokenizer or live prompt capacity is unavailable, the system returns
`BUDGET_UNAVAILABLE`; it MUST NOT substitute a character heuristic, guessed context
size, or silent truncation. When a required sole-anchor or complete eligible bundle
exceeds usable capacity, the system returns an explicit insufficiency/refusal result
with the measured/declared basis. It MUST NOT inject a partial bundle while presenting
it as complete recall. This capacity result is operational context accounting, not
evidence authority or a semantic conclusion.

### 7.5 Conflict handling

Summary, transcript, dossier, and other eligible-source conflicts MUST be visibly
flagged. Relevance, recency, or reranker score MUST NOT silently resolve them.

## 8. Summaries, Dossiers, And Transition

### 8.1 Summary role

Shardwright summaries remain active-chat compression. They preserve a bounded
source-block relationship and may support reversible hide/reveal. They are not a
complete transcript archive or automatically governed memory. Transcript retrieval
SHOULD avoid duplicating nearby summary content unless the request needs
corroboration, source inspection, or broader history.

### 8.2 Dossier role

Shardwright MAY provide human-editable Markdown dossiers with view, edit, import, and
export. They may organize people, places, topics, goals, relationships, rituals,
motifs, eras, and architecture. Interim edits are operator-authored annotations or
projection changes; they MUST NOT rewrite raw source, establish evidence authority, or
be grandfathered into governed memory.

Useful behavior and an interoperable Markdown format may be recreated. CharMemory's
unlicensed implementation, extraction loop, Batch workflow, attachment lifecycle,
native Vector Storage coupling, and persistence model MUST NOT be ported.

### 8.3 Bridge transition

The existing Continuity Bridge is a transitional Markdown retrieval adapter. It does
not become permanent source authority merely because it currently injects Markdown.

## 9. Injection Receipt And Product Legibility

Every generation attempt MUST have an inspectable receipt distinguishing:

```text
did not recall
source unavailable
no eligible match
deliberately excluded or refused
injected
runtime error
```

Without exposing secrets, it records retrieval posture/query scope, source class,
source chat/date/window identity, candidates considered, exclusions, actual injection,
elapsed sync/retrieval/ranking/assembly time, coverage state, conflicts, refusals,
errors, and expandable exact rendered context. The receipt describes what was
assembled, not what a model believed or concluded.

## 10. Normative Requirements

### TIR-AUTH-001 — Source is not memory authority

Transcript presence, index presence, summary content, dossier edits, reranker output,
and injection MUST NOT establish Phase X authority, subject agreement, or semantic
truth.

### TIR-ID-001 — Character binding is explicit

`characterInstanceId` MUST be generated and bound only through a recorded binding or
rebind action. An unbound fresh import MUST receive a new identity; names, locators,
and similarity MUST NOT bridge it to prior corpus.

### TIR-SRC-001 — Exact source admission

The index MUST admit only direct character sources and historically evidenced group
sources. Similarity, title, path, or current group membership MUST NOT decide scope.

### TIR-MSG-001 — Full-message custody

The index MUST retain complete message text, immutable source-revision linkage, and
timestamp tier without requiring embedding chunks.

### TIR-BRANCH-001 — Branches remain branches

Checkpoints, imports, rewinds, and siblings MUST retain topology and MUST NOT merge by
similarity.

### TIR-COV-001 — Known-unknowns remain distinct

Coverage state MUST distinguish not scanned, suspended, failed, source found, and
scanned-without-source outcomes.

### TIR-LIFE-001 — Source visibility controls eligibility

Visibility/loss events MUST change retrieval eligibility. Imprecise historical
dependencies MUST become unresolved, reviewed, or quarantined rather than silently
preserved or deleted.

### TIR-EQV-001 — Equivalence improves retrieval, never custody

Exact-content equivalence MAY reduce retrieval duplication only after occurrence-local
eligibility. It MUST preserve every source occurrence and its visibility, branch, and
provenance state; mixed eligibility MUST remain visible; and family-wide suppression
requires an explicit auditable operator disposition.

### TIR-ANCHOR-001 — Selection is retrieval behavior, not source authority

Eligible anchor counting MUST occur after posture-specific visibility filtering.
Continuity MUST return `AMBIGUOUS_ANCHORS` rather than silently truncate multiple
eligible occurrences beyond budget; archaeology MUST preserve source diversity; and a
recorded preference MUST remain revisable, operator/session-scoped retrieval guidance
without suppressing archaeology, merging custody, or establishing authority.

### TIR-BUDGET-001 — Capacity is measured or unavailable

Automatic assembly MUST derive usable capacity from the active tokenizer, live prompt
usage, and explicit profile safety headroom, or return `BUDGET_UNAVAILABLE`. A required
bundle that exceeds capacity MUST return an explicit insufficiency/refusal result;
character heuristics and silent partial assembly MUST NOT substitute for measurement.

### TIR-DELTA-001 — Unchanged source is a no-op

After initial intake, unchanged sources MUST cause zero message indexing work.
Changed sources MUST append traceable revisions and update only affected projections.

### TIR-RET-001 — Retrieval cannot decide meaning

FTS and reranking MAY select eligible evidence and contextual windows. They MUST NOT
resolve conflicts, assert corpus completeness, or promote memory.

### TIR-SUF-001 — Archaeology reports limits

Archaeology MUST record facet coverage/stabilization and remaining limits, or report
insufficiency. A top-N result alone is insufficient.

### TIR-DOS-001 — Dossier edits remain annotations

Dossier edits MUST retain operator authorship and MUST NOT alter raw-source or
governed-memory authority.

### TIR-UI-001 — Injection outcomes are legible

The receipt MUST distinguish unavailability, no match, refusal, injection, and error,
and permit inspection of assembled context without treating inspection as authority.

## 11. Required Proof Before Implementation Closure

Implementation closure requires accepted and refusal proofs for:

1. direct/group inventory and historical participant basis;
2. typed source-resolution locator captured separately from display locator, immutable
   registration, and resolution-failure refusal;
3. explicit character binding/rebind, fresh-import new identity, and cross-character
   refusal;
4. complete-message row plus exact contextual-window reconstruction;
5. unchanged-source no-op plus one-message append/change delta;
6. branch/checkpoint preservation without similarity merge;
7. all four timestamp tiers;
8. deliberate crawler suspension and marked gap;
9. archive, retraction, external disappearance, and scan-failure outcomes;
10. stale/unavailable source refusal without cached substitution;
11. ambiguous group-title/path normalization refusal;
12. continuity retrieval, archaeology expansion, conflict flag, and insufficiency;
13. dossier import/export/edit without source or governance mutation; and
14. secret-safe injection receipt with exact rendered-context inspection; and
15. exact-content equivalence that preserves duplicate occurrences, exposes mixed
    visibility, refuses automatic cross-occurrence suppression, excludes unrecoverable
    text from FTS, and retains revision-local eligibility for visible legacy rows; and
16. posture-filtered anchor eligibility, sole-anchor continuity, bounded
    `AMBIGUOUS_ANCHORS` refusal without silent truncation, archaeology expansion, and
    revisable scoped preference that leaves archaeology and custody unchanged; and
17. measured active-token capacity, profile safety headroom, `BUDGET_UNAVAILABLE`, and
    over-capacity complete-bundle refusal without heuristic fallback or partial recall.

The current planning audit found 16 direct chat files with 11 represented by current
Markdown provenance labels, plus 21 resolvable Jeep-participant group revisions with
no matching raw group-source labels in that Markdown projection. This is planning
evidence, not implementation proof.

## 12. Stop Boundary And Status

This contract does not itself authorize runtime code, migration, corpus scan, source
rewrite, Markdown import, vector backend, model prompt, schema, Phase X governance
change, or user-data mutation. Each requires its own declared bounded slice and proof.

The first lawful implementation slice is a read-only source-registry inventory model
for one character instance. It MUST NOT implement retrieval, crawling, dossiers, UI,
or Phase X integration in that same slice.

This contract is `ENTERED`. The bounded read-only inventory model is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-inventory.test.mjs`
on 2026-09-06: it proves character-scope refusal, direct/group distinction,
historical participant-basis requirement, coverage-state separation, branch-shape
admission, and deliberate-gap marking without host scanning, persistence, retrieval,
or user-data mutation. No broader implementation status is claimed.

The bounded character-instance binding registry is also `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-character-binding.test.mjs`
on 2026-09-06: it creates distinct opaque fresh identities, survives a fresh-process
read, moves an existing identity only through an explicit recorded rebind, and refuses
identity hints, automatic adoption, and an already-bound token. It does not register
sources, scan host data, retrieve messages, or expose a route or UI.

The bounded source-registration ledger is also `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-source-registry.test.mjs`
on 2026-09-06: it admits only direct or historically evidenced group sources under a
known character instance, records them as `NOT_SCANNED`, and refuses unknown identity
or invalid participant basis without host scanning, source hashing, or message intake.
Version 0.3.0 additionally proves that the typed resolution locator is supplied
separately from display text and refuses a missing or cross-class locator.

The read-only source observer is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-source-observer.test.mjs`
on 2026-09-06: it reuses the authenticated host resolver to hash one registered
source's bytes, returns an operational receipt without retaining content, reports a
missing source without cached substitution, and marks an invalid typed locator
`UNRESOLVED` without display-text fallback. It does not persist a source revision,
parse messages, index content, retrieve evidence, or expose a route or UI.

The immutable source-revision ledger is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-source-revision.test.mjs`
on 2026-09-06: it appends an observed receipt once, treats an unchanged current hash
as a no-op, appends a changed hash as a new revision, and refuses missing or
custody-mismatched receipts without append. It does not parse or store messages,
construct an index, retrieve evidence, or expose a route or UI.

The read-only full-message candidate parser is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-message-parser.test.mjs`
on 2026-09-06: it accepts only bytes matching an immutable observed revision, produces
complete in-memory messages in source order, marks native versus unavailable timestamp
custody, and keeps malformed JSONL visible. It does not persist candidates, infer
message identity, construct an index, retrieve evidence, or expose a route or UI.

The durable complete-message writer is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-message-ledger.test.mjs`
on 2026-09-06: it appends complete source-tethered rows for one immutable revision,
treats repeated intake as a no-op, and refuses broken candidate custody without append.
It does not reconcile messages across revisions, determine visibility, build FTS, or
retrieve evidence.

The read-only native-ID reconciliation projection is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-message-reconciliation.test.mjs`
on 2026-09-06: it joins only equal native IDs within one source and keeps missing-ID
rows revision-local and `UNRESOLVED`. It does not persist a projection, change row
custody, decide visibility, index content, retrieve evidence, or expose a route or UI.

The read-only visibility projection is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-visibility-projection.test.mjs`
on 2026-09-06: it distinguishes hidden, archived, and tombstone-only deletion from
one exact source revision and refuses stale bytes. It does not persist lifecycle state,
alter custody, infer pre-Shardwright deletion, index content, or retrieve evidence.

The durable visibility ledger is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-visibility-ledger.test.mjs`
on 2026-09-06: one exact revision-state projection persists once and identical intake
is a no-op. It preserves the supplied tombstones and unresolved gaps without changing
source custody, indexing content, or retrieving evidence.

Retrieval eligibility, exact-content equivalence, and FTS admission are defined by
version 0.5.0. The read-only exact-content equivalence projection is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-exact-content-equivalence.test.mjs`
on 2026-09-06: it groups only byte-exact complete text from validated durable current
source-revision, message, and visibility ledgers, preserves every source occurrence,
exposes mixed eligibility, assigns the declared FTS admission scopes, permits
revision-local legacy visibility, and refuses absent visibility or mismatched
content-hash custody. It does not write a
projection or ledger, create FTS documents, choose a retrieval representative, alter
eligibility, add family suppression, retrieve evidence, or expose a route or UI.

The bounded FTS-document projection is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-fts-document-projection.test.mjs`
on 2026-09-06: it materializes only character-scoped `ORDINARY` and
`ARCHAEOLOGY_ONLY` exact-content documents in a separate rebuildable SQLite database,
retains all siblings as occurrence links, excludes unrecoverable text from both the
document and FTS tables, treats an identical rebuild as a no-op, and rebuilds from
validated durable current-source-revision, message, and visibility ledgers. It does
not execute a retrieval query, assemble context, rerank, alter eligibility, add family
disposition, or expose a route or UI.

The bounded FTS candidate-selection query is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-fts-candidate-selection.test.mjs`
on 2026-09-06: `NO_QUERY` does not create or open an index; continuity returns only
`ORDINARY` document identity and occurrence custody; archaeology may additionally
return `ARCHAEOLOGY_ONLY` candidates; excluded-only text does not match; and a missing
projection refuses. It does not return source text, assemble a window, rerank, inject,
change eligibility, add family disposition, or expose a route or UI.

Version 0.8.12 enters one narrow authenticated transport boundary for that already
proven selector: `POST /transcript-recall/candidates`. The route obtains the
authenticated user's owned storage root, accepts only the selector's explicit
request fields, and returns its existing result unchanged apart from `ok: true`.
It returns document identity, content hash, admission scope, and occurrence-link
custody only. It MUST NOT return source text, contextual windows, reconstructed
messages, prompt material, reranking, a retrieval preference, or persistent state.
Malformed input and an unavailable or invalid FTS projection remain the selector's
visible refusal; the route MUST NOT rebuild, substitute cached bytes, or choose a
candidate. This route is read-only operational retrieval transport, not evidence or
Phase X authority.

The route is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-fts-candidate-route.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-selection.test.mjs`
on 2026-09-08 (7/7): an authenticated request returns only selected document and
occurrence custody while excluding source text; `NO_QUERY` creates no FTS index; and
malformed requests or an unavailable projection refuse without a substitute. It does
not prove contextual-window reconstruction transport, anchor selection, prompt
assembly, host planning, injection, reranking, or persistence.

The read-only contextual-window reconstruction is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-context-window.test.mjs`
on 2026-09-06: it reconstructs neighboring rows only from the selected occurrence's
durable source revision, preserves hidden and deleted omissions in continuity,
permits retained hidden content only in explicit archaeology, and refuses a selected
occurrence when a newer source revision exists. It does not assemble multiple windows,
rerank, inject, change eligibility, add family disposition, or expose a route or UI.

Version 0.8.13 enters one narrow authenticated transport boundary for that already
proven reconstruction: `POST /transcript-recall/windows`. It accepts one explicit
document ID, one explicit occurrence anchor, declared posture, and non-negative
before/after bounds. The route reuses the existing reconstruction exactly; it does
not infer or replace an anchor, select candidates, combine windows, rerank, create a
bundle, mutate source state, persist a result, or inject a prompt. Returned source
text remains limited to the reconstruction's posture-filtered rows: continuity
retains hidden/deleted omissions, while explicit archaeology may expose only retained
hidden or archived rows. Every unavailable or non-current custody condition remains
the reconstruction's visible refusal without cached-byte substitution.

The route is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-context-window-route.test.mjs tools/server-plugin/shardwright-memory/transcript-context-window.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-route.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-selection.test.mjs`
on 2026-09-08 (12/12), plus syntax validation of both new route modules and the
plugin entrypoint. One authenticated continuity request returned its explicitly
anchored window with hidden and deleted rows represented as omissions; absent and
unknown anchors refused without a replacement. This proves one-window read-only
transport only, not multi-window assembly, selection, reranking, bundle shaping,
host planning, injection, or persistence.

The bounded multi-candidate window assembly is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-candidate-window-assembly.test.mjs`
on 2026-09-06: it assembles separately anchored selected documents without collapsing
their source occurrences, refuses implicit anchor selection, and propagates `NO_QUERY`
without source or index work. It does not choose anchors, score/rerank, inject, change
eligibility, add family disposition, or expose a route or UI.

Version 0.6.0 defines the posture-filtered hybrid anchor-selection policy. No automatic
preference record, route, or UI was built by this amendment.

The read-only anchor-resolution projection is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-anchor-resolution.test.mjs`
on 2026-09-06: it applies posture-filtered eligibility after visibility, returns a
sole continuity anchor when only one is eligible, returns an explicit complete bundle
within an occurrence-count bound, returns `AMBIGUOUS_ANCHORS` above that bound, and
expands all eligible archaeology occurrences while coalescing duplicate FTS documents
without merging custody. It does not estimate character or token cost, persist a
preference, rerank, inject, change eligibility, or expose a route or UI.

Version 0.8.15 enters authenticated read-only transport for that existing assembly:
`POST /transcript-recall/window-assembly`. It accepts a complete candidate-selection
result, one explicit anchor per selected document, and declared window bounds, then
returns the assembly's separately custody-preserved windows. It MUST NOT infer or
replace anchors, select candidates, collapse occurrences, rerank, persist a
preference, shape a prompt bundle, or inject. Missing or duplicate anchors remain
visible refusal rather than partial assembly.

The route is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-candidate-window-assembly-route.test.mjs tools/server-plugin/shardwright-memory/transcript-candidate-window-assembly.test.mjs tools/server-plugin/shardwright-memory/transcript-anchor-resolution-route.test.mjs tools/server-plugin/shardwright-memory/transcript-anchor-resolution.test.mjs tools/server-plugin/shardwright-memory/transcript-context-window-route.test.mjs tools/server-plugin/shardwright-memory/transcript-context-window.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-route.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-selection.test.mjs`
on 2026-09-08 (23/23), plus syntax validation of the new route and plugin entrypoint.
It returned separately anchored windows for each selected document and refused a
missing anchor without replacement. This proves assembly transport only, not
reranking, bundle shaping, host planning, injection, or persistence.

Version 0.8.16 enters a deterministic bundle-presentation boundary:
`POST /transcript-recall/bundle`. It accepts only already assembled windows and
renders every retained row with its source, revision, order, sender, timestamp tier,
visibility, and complete content (or an explicit omission marker). The projection
MUST preserve window and row order, must not deduplicate, summarize, rank, truncate,
interpret, or infer authority, and does not compute the host proposal hash or mutate
host prompt state. Empty or incomplete assemblies refuse closed.

The bundle projection is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-recall-bundle.test.mjs tools/server-plugin/shardwright-memory/transcript-candidate-window-assembly-route.test.mjs tools/server-plugin/shardwright-memory/transcript-candidate-window-assembly.test.mjs tools/server-plugin/shardwright-memory/transcript-context-window.test.mjs`
on 2026-09-08 (11/11), plus syntax validation of the plugin entrypoint and bundle
modules. The proof preserves two anchored windows and timestamp metadata, renders
visibility omissions without substituting content, and refuses empty/incomplete
assemblies. It does not prove host proposal admission, capacity measurement,
reranking, or injection.

Version 0.8.14 enters authenticated custody-only transport for that existing
projection: `POST /transcript-recall/anchors`. It accepts only an already returned
candidate-selection result and an explicit occurrence bound, then returns the
resolver's existing posture-filtered outcomes. It MUST NOT query FTS, inspect source
text, infer candidate custody, replace an unknown anchor, select among ambiguity,
persist a preference, or expose prompt material. An `AMBIGUOUS_ANCHORS` outcome
remains a refusal to choose, not a partial bundle.

The route is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-anchor-resolution-route.test.mjs tools/server-plugin/shardwright-memory/transcript-anchor-resolution.test.mjs tools/server-plugin/shardwright-memory/transcript-context-window-route.test.mjs tools/server-plugin/shardwright-memory/transcript-context-window.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-route.test.mjs tools/server-plugin/shardwright-memory/transcript-fts-candidate-selection.test.mjs`
on 2026-09-08 (18/18), plus syntax validation of the new route and plugin entrypoint.
It returned a sole continuity anchor only after posture filtering, returned
`AMBIGUOUS_ANCHORS` above the declared bound without choosing one, and refused
malformed custody. This proves resolution transport only, not selection, preference,
window reconstruction, bundle shaping, host planning, injection, or persistence.

Version 0.7.0 defines the measured capacity and reservation model. The read-only
capacity preflight is `PROVEN` by
`node --test tools/server-plugin/shardwright-memory/transcript-capacity-preflight.test.mjs`
on 2026-09-07: it returns `BUDGET_UNAVAILABLE` without a measurement, computes usable
capacity as the lesser of measured remaining capacity and the profile ceiling, reports
an explicit complete-bundle shortfall, and refuses invalid token inputs rather than
guessing. It does not obtain host measurements, persist a profile, select anchors,
truncate a bundle, inject, or expose a route or UI.

The host-capacity adapter inspection was completed on 2026-09-07. SillyTavern exposes
the active tokenizer (`getTokenCountAsync`) and a generation-time prompt ceiling
(`maxContext` / interceptor `contextSize`) to extensions. Its generation interceptor,
however, runs before the host assembles the final prompt. The only observed
authoritative final-prompt event (`CHAT_COMPLETION_PROMPT_READY`) is emitted after
that assembly, too late to determine the current injection. The ceiling is not live
prompt-token usage, and it MUST NOT be substituted for it.

The host-capacity surface is `PROVEN` on the active local OpenAI path. On the active
OpenAI path, the host uses its own `countTokensOpenAIAsync` after final prompt
assembly and emits an immutable capacity receipt as the third argument of the existing
`GENERATE_AFTER_DATA` event, before provider dispatch. The receipt contains a schema
version, `MEASURED` state, `PRE_DISPATCH` stage, API identity, tokenizer model, exact
prompt-token count, and the host's prompt-token ceiling. It is deliberately separate
from the outbound generation payload. Unsupported APIs, or a failed host tokenizer,
emit an immutable `BUDGET_UNAVAILABLE` receipt with a refusal reason.

This pre-dispatch receipt supersedes the earlier proposed pre-assembly adapter point:
the final assembled prompt does not exist at the generic interceptor, while this
existing host event occurs after assembly and before dispatch. The receipt is
operational accounting only; it neither injects material nor authorizes a consumer to
modify the outgoing prompt.

Initial and re-run live proof completed on 2026-09-07: after each hard browser
refresh, an ordinary OpenAI generation completed through the modified host path. The
re-run exercised the final failure-sentinel guard. Each execution reached the
tokenizer measurement and the pre-dispatch event emission before provider dispatch; a
failure in either awaited host step would have aborted the generation.

The read-only Shardwright adapter is `PROVEN` by
`node --test core/transcript/host-capacity-receipt.test.mjs` on 2026-09-07 (5/5): it
subscribes only to the existing host event, reads only the third receipt argument,
accepts frozen structurally valid measurements, preserves explicit host refusal, and
fails malformed or mutable material closed as `BUDGET_UNAVAILABLE`. It uses only
in-memory runtime state and does not persist settings, select anchors, truncate,
inject, or expose a route or UI.

The independent capacity profile is `PROVEN` by
`node --test core/transcript/capacity-profile.test.mjs` on 2026-09-07 (4/4). It
creates or migration-adds only the separate
`transcriptRecall.capacityProfile` namespace, with a named retrieval ceiling and
separate system/card, active-chat, and output reservations. That v1 profile is
superseded by the v2 correction below. It never derives values
from RAG counts or thresholds. An explicitly malformed or incomplete profile returns
`PROFILE_UNAVAILABLE` rather than being silently repaired into a guessed setting.
This profile is an operator-configurable context-accounting preference, not evidence
authority, relevance, or a sufficiency claim.

The settings-catalog foundation is `PROVEN` by
`node --test core/settings-catalog.test.mjs core/transcript/capacity-profile.test.mjs`
on 2026-09-07 (7/7). `extension_settings.shardwright` remains the sole persisted
settings authority. The catalog declares only the Transcript Recall capacity profile
at this stage: path, global scope, type, safe-base default, bounds, plain-language
label/help, and UI-control metadata. The capacity-profile defaults and
validation consume that one declaration rather than duplicating values. This does
not catalog legacy settings, create a generic settings renderer, or make a catalog
entry itself persistent.

Catalog scope is jurisdiction, not a display label. Global settings resolve only to
`extension_settings.shardwright`; chat settings only to `chat_metadata.shardwright`;
session settings are non-persistent; and character or unknown scopes fail closed until
their owner is separately declared. A future renderer must receive the matching scope
adapter and MUST NOT infer ownership from a setting path or display label.

The catalog-backed Transcript Recall capacity controls are `PROVEN` by
`node --test core/settings-catalog.test.mjs core/settings-catalog-ui.test.mjs core/transcript/capacity-profile.test.mjs`
on 2026-09-07 (13/13), plus a live local-panel inspection on the same date. The
panel renders only the four declared global controls with their catalog labels,
help text, bounds, and safe-base values. An invalid integer edit or malformed
explicit profile is refused without mutating the settings object; the caller saves
only an accepted edit through the existing global settings authority. This proves
this specific catalog consumer, not a generic renderer, a capacity consumer,
candidate selection, reranking, or injection.

Version 0.8.11 corrects the capacity model after direct host inspection established
that SillyTavern measures a prompt-only ceiling after reserving configured output,
and its assembled baseline already includes system/card and active-chat content.
Transcript Recall v2 therefore keeps only a retrieval ceiling plus optional explicit
safety headroom. Valid v1 profiles migrate with their old values preserved as a
legacy snapshot and headroom zero; malformed v1 profiles refuse. Focused catalog,
profile, and UI tests pass 14/14, while server preflight passes 4/4 and uses the
same two-field accounting. No host-default mutation, injection, or selection is
authorized by this correction.

An exact `BUNDLE_OVER_CAPACITY` result may now enter a host-owned resolution
transaction under the Host Pre-Dispatch Context Planning Contract v0.2.4. It keeps
the complete-bundle refusal intact: an operator may choose baseline, a one-shot
host-context retry, an explicit native-host default update followed by retry, or
cancel. Every retry is a new host generation with a new planning request and fresh
measurement; no prior proposal, approval, or selected material transfers across the
boundary. The temporary override is operational runtime state only and is cleared on
every terminal path. The first host dialog and one-shot retry are implemented but not
live-proven. This defines no host-default mutation, prompt retention, injection, or
selection.

The isolated host one-shot override primitive is proven and wired before host context
selection. Its operator-facing dialog and fresh-generation trigger await live proof;
the persisted host default remains untouched.

On an insecure browser context where Web Crypto is unavailable, canonical proposal
hashing may use only the authenticated server-backed exact-byte digest service entered
by Host Pre-Dispatch Context Planning v0.2.4. It is a cryptographic utility, not a
retrieval, custody, or memory-authority surface; failure remains visible as
`HASH_UNAVAILABLE` rather than a weaker client fallback.

Automatic assembled context remains unavailable until a separately declared consumer
binds one valid host receipt, one valid capacity profile, and a declared required
bundle to the preflight result. No heuristic, stale prior-prompt measurement, DOM
counter, or unrelated settings value may bridge that gap.

[Host Pre-Dispatch Context Planning](SHARDWRIGHT_HOST_PRE_DISPATCH_CONTEXT_PLANNING_CONTRACT.md)
is now the governing design boundary for that same-request consumer. It defines the
host-owned planning transaction and refusal policy. Its dedicated empty-slot
request/decline path, malformed-response refusal, and canonical hash-bound
proposal admission, and host measurement-only placement/restoration are proven.
A live controlled contribution measured 80,112 tokens against an 80,000-token
ceiling and was not injected. The host's exact capacity-gate rule is proven: a
later live contribution measured 80,304 tokens against an 80,000-token ceiling
and returned a complete-bundle refusal with no fallback. Automatic assembly
remains unavailable until a separate retention-for-dispatch slice completes.

## 13. Explicit Character-Binding Transport

The transcript transport exposes a read-only authenticated binding resolver at
`POST /transcript-recall/character-binding`. It accepts only an explicitly supplied
recorded `bindingToken` and returns the opaque `characterInstanceId`; display names,
avatars, filenames, paths, and host locators are never lookup keys. Unknown bindings
and malformed requests refuse without creating or mutating identity. Focused route and
registry proof passes 6/6; the host handoff helper passes 20/20. This slice does not
install a token source or authorize retrieval orchestration.
