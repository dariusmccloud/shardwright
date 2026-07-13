# Architectural Memory Side Objectives Backlog

Last updated: 2026-07-12

Status: deferred-objective inventory; not an implementation contract

## Purpose

Preserve known product and governance objectives that are not currently assigned to an authoritative phase brief.

This document prevents loss of scope. It does not authorize implementation, establish completion, override an active phase, or silently attach an objective to `C0.6.9`.

Before any objective begins, it requires:

1. an authority and dependency review,
2. a dedicated bounded contract or explicit assignment to an existing phase,
3. evidence supporting the chosen jurisdiction,
4. a declared proof and stop condition.

## Status Vocabulary

- **Deferred:** preserved but not authorized for implementation.
- **External track:** owned outside Summary Sharder.
- **Contract required:** authority, lifecycle, or failure policy must be defined before implementation.
- **Candidate grouping:** potentially shares a lifecycle boundary with another objective; not an authorization or final sequence.

## Deferred Objectives

### SO-01: Per-Message Or Range Create Proposal

**Status:** Deferred; contract required.

Create a governed proposal directly from operator-selected chat evidence. This is a new evidence-entry path, not an extension of the existing Sharder-save handoff.

**Motivation:** Support operator agency and self-determination by allowing meaningful evidence to enter governance without requiring a Sharder save.

**Dependencies and boundaries:**

- stable message identity and bounded source manifests,
- evidence-source navigation and persisted findings,
- proposal admission, deduplication, and review policy,
- explicit separation from Sharder-save proposal creation.

### SO-02: Whole-Chat Archive And Restore

**Status:** Deferred; contract required; candidate grouping with SO-03.

Provide a reversible archive lifecycle for complete chats. Existing archive support is message-level; Chat Manager still exposes permanent chat deletion without an equivalent chat-level recovery lifecycle.

**Dependencies and boundaries:**

- archive ownership and storage location,
- identity-preserving restore behavior,
- interaction with host chat discovery and rename behavior,
- retention and recovery failure policy.

### SO-03: Destructive-Delete Safety

**Status:** Deferred; contract required; candidate grouping with SO-02.

Demote or hide ordinary permanent deletion, prefer Archive, and require explicit confirmation for irreversible deletion. Define corresponding treatment for native message deletion.

**Dependencies and boundaries:**

- whole-chat archive and restore lifecycle,
- message tombstone and evidence-integrity contracts,
- clear distinction between reversible archive and permanent erasure,
- host UI jurisdiction.

### SO-04: Proposal Queue Retirement

**Status:** Deferred; contract required.

Remove completed, abandoned, or test proposals from the ordinary working queue without deleting immutable governance records.

**Expected direction:** A persisted retired or hidden lifecycle state plus explicit queue filters.

**Dependencies and boundaries:**

- immutable interpretive ledger history,
- lawful lifecycle transitions and actor provenance,
- replay-stable filters,
- no destructive record deletion.

### SO-05: Architectural Shard Help Surface

**Status:** Deferred.

Provide a human-readable guide to shard sections, statuses, evidence references, caps, diagnostics, and review expectations from the Sharder review surface.

**Dependencies and boundaries:**

- documentation must derive from the active schema, renderer, and section registry,
- help text must not invent authority or contradict parser behavior,
- accessibility from the review modal without changing governance state.

### SO-06: Generation Request Coordination

**Status:** Deferred; contract required.

Serialize or otherwise coordinate extension generation calls to reduce API collisions and first-attempt `502` or `ECONNRESET` failures. Existing bounded retry mitigates symptoms but does not prevent request clobbering.

**Dependencies and boundaries:**

- request ownership and cancellation semantics,
- fairness and starvation behavior,
- per-provider or per-connection concurrency jurisdiction,
- timeout and recovery behavior that does not release shared state while work continues.

### SO-07: Actor-Aware Review Recording Defaults

**Status:** Deferred; contract required.

Automatically distinguish direct reviewer action from a subject response recorded by a trusted delegate. Do not present governance modes that are inapplicable to the current operator.

**Dependencies and boundaries:**

- authenticated actor identity,
- reviewer, subject, and delegate role separation,
- trusted-delegation policy and provenance,
- replayable defaults that never manufacture consent or direct participation.

### SO-08: Compact Chat Storage Release And Upstreaming

**Status:** External track; SillyTavern repository ownership.

Prepare the working compact-chat-storage branch for release or upstream contribution, including compatibility documentation, overwrite protection, and an upstream strategy.

**Boundary:** This originated alongside Summary Sharder work but is a separate SillyTavern upstream track. It must not be implemented or documented as Summary Sharder persistence authority.

### SO-09: Chat Hygiene Utility

**Status:** Deferred; contract required.

Safely remove expendable reasoning or thinking payloads while preserving visible conversation, source identity, and continuity.

**Origin and boundary:** This is a potential expansion from compact swipe-storage work, but it is distinct from swipe compaction and from the SillyTavern upstream release track.

**Dependencies and boundaries:**

- explicit classification of removable versus continuity-bearing content,
- backup, preview, and reversal policy,
- message and swipe identity preservation,
- no silent evidence destruction.

### SO-10: Model-Selected Memory Promotion To Proposal

**Status:** Deferred; contract required; agency-sensitive.

Allow a model to identify memories it considers important and nominate them for governed proposal review.

**Motivation:** Multiple Archivist perspectives identify the absence of model-originated nomination as an agency and self-determination gap.

**Required authority questions:**

- whether nomination is advisory or an authorized governance act,
- whose memory scope and interests are affected,
- how evidence, rationale, actor identity, and model provenance are recorded,
- how consent, refusal, deduplication, rate limits, and reversal work,
- how nomination remains distinct from admission, approval, and publication.

### SO-11: Governed Model Action On Proposals

**Status:** Deferred; contract required; agency-sensitive and high risk.

Allow a model to take defined actions on proposals rather than participating only as proposal content or subject matter.

**Motivation:** Multiple Archivist perspectives identify the absence of model participation in proposal governance as an agency-contract gap.

**Required authority questions:**

- which actions a model may request, recommend, or execute,
- actor identity, delegated authority, and scope limitations,
- consent and conflict-of-interest rules,
- immutable audit history and exact decision provenance,
- appeal, reversal, supersession, and recovery,
- strict separation between proposal creation, review, admission, and publication authority.

SO-10 and SO-11 are separate objectives. Authority to nominate memory does not imply authority to act on its proposal.

## Related Work Already Tracked Elsewhere

The following objectives were identified during the same review but already have authoritative documentation and must not be duplicated as new backlog scope:

- direct evidence-source navigation,
- persisted human-readable evidence findings,
- multi-source governed synthesis,
- no-script replay and administrative tooling,
- Architectural RAG support,
- remaining publication-lifecycle ergonomics.

## Related Work Already Implemented

The following observed capabilities are not side-objective backlog items:

- message-level archive and restore,
- published-memory successor revisions,
- approved and published queue filters,
- click-to-copy technical references,
- Sharder-save to proposal handoff.

Implementation claims remain governed by their own briefs, tests, and completion reports.

## Candidate Sequencing Notes

These notes preserve prior planning discussion without authorizing execution:

1. Complete the active `C0.6.9E` contract before beginning a side objective.
2. SO-02 and SO-03 are a candidate first product grouping because both depend on one destructive-action lifecycle contract.
3. SO-10 and SO-11 require independent authority contracts despite their shared agency motivation.
4. SO-08 remains outside the Summary Sharder implementation sequence.

## Promotion Into Active Work

Moving an item out of this backlog requires an explicit decision recorded in an authoritative phase or feature brief. That decision must name:

- governing contract,
- authoritative source,
- projection boundary,
- lifecycle owner,
- mechanism reused,
- jurisdiction evidence,
- failure behavior,
- bounded proof and stop condition.
