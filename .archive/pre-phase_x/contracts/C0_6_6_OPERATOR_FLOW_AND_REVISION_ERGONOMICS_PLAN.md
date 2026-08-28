# C0.6.6 Operator Flow And Revision Ergonomics Plan

Last updated: 2026-07-09

Status: active implementation plan

## Purpose

Translate the now-stable governed review and publication surface into an operator flow that is efficient, legible, and revision-safe in ordinary host use.

This plan does not reopen the underlying review, publication, or evidence contracts.

It follows two already-landed boundaries:

1. `C0.6.4-5` guided publication is implemented and host-proven.
2. `C0.6.5` evidence-finding persistence and review rendering are implemented on this branch.

The modal now has four believable jurisdictions:

```text
Review
History
Publication Lifecycle
Technical Details
```

The next lift is to make those jurisdictions work cleanly for repeated real use.

## Current Progress Snapshot

Implemented on this branch already:

1. queue state projection now distinguishes `Pending approval`, `Pending decision`, `Approved`, `Ready for publication`, and `Published`,
2. completed-state wording no longer leaves published records speaking like stalled gate states,
3. history now separates review, decision, and publication event projections with provenance behind disclosure,
4. current publication is included in publication history,
5. parent revisions blocked by newer children now project direct `Open Latest Revision` navigation,
6. published records now project `Create Revision` / successor-revision flow instead of implying in-place editing,
7. duplicate selection bleed from reused request identifiers is covered by helper-layer tests.

The remaining work is narrower than the original plan:

1. finish end-to-end host proof for repeated published-memory successor / replacement / withdrawal flows on clean lines,
2. close any remaining queue-selection or tab-navigation polish gaps that still surface in live use,
3. keep lifecycle and technical surfaces dense but scannable without re-opening broad UI redesign.

## Why This Is Next

The remaining problems are no longer foundational contract gaps.

They are now mostly:

1. completed-state wording,
2. queue semantics,
3. revision ergonomics,
4. lifecycle navigation,
5. history readability.

That is the right moment to stop redesigning data contracts and tighten operator flow.

## Phase Goal

Make the governed memory workflow usable without scripts or interpretation of engine-shaped state language once a host is seeded and running.

The implementation target is:

```text
find the right memory
understand its current state
take the next lawful action
revise it safely when needed
```

## Locked Scope

This lift covers:

1. queue filtering and queue-state projection,
2. completed-state and pre-publication wording cleanup,
3. direct revision-from-memory workflow,
4. direct navigation to the latest actionable revision,
5. readable lifecycle history for current and prior publication events.

This lift does not cover:

1. redesigning evidence-finding semantics again,
2. replacing exact technical detail with hidden inference,
3. adding broad admin tooling unrelated to ordinary operator flow,
4. reopening publication policy contract design.

## Locked Product Decisions

### 1. Published records are not edited in place

If a published memory needs to change, the operator creates a new revision and republishes through the governed path.

```text
published memory
-> create revision
-> review
-> subject decision
-> publication replacement
```

### 2. Approved is a first-class queue state

The queue must expose `Approved` as a distinct filterable state between completed review and lifecycle completion.

Minimum queue filters after this lift:

```text
Pending approval
Pending decision
Approved
Ready for publication
Published
```

### 3. Completed publication must stop speaking gate language

Pre-publication:

```text
readiness
eligibility
publish next
```

Post-publication:

```text
published
active / replaced / withdrawn
publication history
policy and audit
```

Do not lead completed records with stale gate-state wording such as "ready", "unqualified", or "unauthorized" when the record is already published and active.

### 4. History leads with events, not provenance

History should answer:

```text
what happened
when it happened
who did it
```

Expandable provenance remains available, but does not lead the scan path.

### 5. Revision ergonomics must be explicit

Ordinary operators must be able to:

1. create a revision from a published memory,
2. open the latest child revision when a parent is blocked by immutable lineage,
3. withdraw a pending replacement,
4. open the current active memory,
5. open publication history for the same memory line.

## Implementation Slices

### C0.6.6A: Queue Semantics And State Grammar

Status: complete on this branch

Goal:

Make queue filters and top-line state labels match the real operator workflow.

Required work:

1. add `Approved` as a first-class filter,
2. verify queue cards map to true operator states rather than broad legacy labels,
3. separate pre-publication statuses from post-publication statuses,
4. tighten completed-state review wording so published records do not still read as pending.

Proof gate:

1. approved-but-unpublished items appear under `Approved`,
2. granted-and-eligible items appear under `Ready for publication`,
3. published records appear under `Published`,
4. no completed published record still renders as `Decision pending` or equivalent stale gate language.

### C0.6.6B: History Timeline Cleanup

Status: complete on this branch

Goal:

Render review, decision, and publication events as readable timeline entries before any technical provenance is expanded.

Required work:

1. rewrite history cards to lead with event summary and timestamp,
2. keep provenance available behind disclosure,
3. include the current publication event inside publication history rather than treating history as "everything except current",
4. avoid duplicated event cards for the same action path.

Proof gate:

1. review history reads as event timeline,
2. decision history distinguishes review response vs publication decision,
3. publication history includes current publication and prior withdrawn/replaced events,
4. no technical identifiers are required to understand what happened.

### C0.6.6C: Revision Ergonomics And Navigation

Status: active verification and host-proof cleanup

Goal:

Make post-review and post-publication correction paths explicit and usable.

Required work:

1. keep `Create Revision` from a published memory stable in live host use,
2. preserve lineage into the new revision,
3. keep `Open Latest Revision` stable when parent publication is blocked by a newer child,
4. keep `Withdraw Pending Replacement` stable where lawful,
5. keep direct navigation hooks between current published memory, latest revision, and publication history context-aware and non-disruptive.

Proof gate:

1. operator can create a new revision from an active published memory,
2. parent blocked by child lineage routes to the latest child revision,
3. pending replacement may be withdrawn without damaging the current active memory,
4. replacement publication can proceed from the corrected/latest actionable revision.

### C0.6.6D: Publication Lifecycle Completed-State Cleanup

Status: complete on this branch

Goal:

Make Publication Lifecycle readable in both pre-publication and post-publication states without duplicated or contradictory language.

Required work:

1. remove redundant "already published" messaging,
2. keep one primary completed-state summary,
3. collapse or demote gate details after publication,
4. keep `Policy and Audit` readable but secondary,
5. keep `Technical Details` references in the correct tab rather than bleeding product meaning into audit disclosures.

Proof gate:

1. published active memory shows one clear published-state explanation,
2. no duplicate setup / eligibility / publish forms render,
3. policy content remains accessible but does not dominate completed-state reading,
4. completed lifecycle state remains readable on a normal viewport without hunting through duplicate panels.

## Remaining Real Gaps

The remaining work inside `C0.6.6` is now:

1. prove clean end-to-end successor-revision flow from a currently published memory,
2. prove replacement and withdrawal behavior on clean isolated lines without legacy seeded residue,
3. keep same-view navigation helpers helpful without causing jumpy or confusing viewport movement,
4. tighten any remaining selected-card / selected-tab ambiguity that still appears in live host use,
5. keep dense operator surfaces readable without re-widening into global redesign.

## Required Proof Matrix

This lift does not close without all of the following.

### 1. Approved root revision

Expected:

1. appears under `Approved`,
2. review is complete,
3. publication is not yet complete,
4. next lawful lifecycle action is obvious.

### 2. Ready-for-publication root revision

Expected:

1. appears under `Ready for publication`,
2. lifecycle view exposes the next lawful publication action cleanly,
3. no stale queue label still says only `Approved`.

### 3. Published active root revision

Expected:

1. appears under `Published`,
2. lifecycle copy uses completed-state language,
3. current publication event appears in history,
4. no duplicate published-state warnings or gate instructions render.

### 4. Corrected child revision

Expected:

1. parent routes to `Open Latest Revision`,
2. child revision carries lineage,
3. child can complete review and publication,
4. parent does not remain falsely actionable.

### 5. Post-publication revision creation

Expected:

1. operator can create a revision from a published memory,
2. the new revision enters the governed review path,
3. active published memory remains intact until replacement is published.

### 6. Pending replacement withdrawal

Expected:

1. pending replacement is withdrawable when lawful,
2. current active memory remains active,
3. queue and lifecycle surfaces stop showing the withdrawn replacement as actionable.

## Suggested Work Order

1. close remaining `C0.6.6C` host proof across root, child, replacement, and withdrawal paths
2. close any residual lifecycle-navigation or queue-selection polish gaps surfaced by that proof
3. document the completed operator-flow boundary before starting another major product lift

Reason:

Queue semantics, completed-state cleanup, and most history work are already landed.
The remaining risk is no longer label instability.
It is repeated live-use proof around successor and replacement ergonomics.

## Next Major Lift After C0.6.6

`C0.6.6` should not roll directly into a vague `v1.0` closeout.

The next explicit boundary after `C0.6.6` is:

```text
C0.6.7 Upgrade, Replay, And Release Hardening
```

See:

```text
.archive/pre-phase_x/contracts/pre-phase_x/PHASE_C0_6_7_UPGRADE_REPLAY_AND_RELEASE_HARDENING_BRIEF.md
.archive/pre-phase_x/contracts/pre-phase_x/C0_6_7_UPGRADE_REPLAY_AND_RELEASE_HARDENING_PLAN.md
```

Reason:

Once operator flow is stable, the main remaining release risk is no longer ordinary review usability.
It is release resilience:

1. upgrade safety,
2. replay correctness,
3. projection rebuild stability,
4. restart / packaged-host parity,
5. explicit capability freeze before `v1.0`.

## Exit Standard

`C0.6.6` is complete when:

1. queue filters match real operator workflow,
2. published records read as completed publication, not stalled readiness,
3. history reads as event timeline first and provenance second,
4. published memories can safely spawn new revisions,
5. pending replacements can be managed without scripts,
6. repeated governed publication no longer depends on operator guesswork.
