# C0.6.7 Upgrade, Replay, And Release Hardening Plan

Last updated: 2026-07-09

Status: active implementation plan

## Purpose

Translate `PHASE_C0_6_7_UPGRADE_REPLAY_AND_RELEASE_HARDENING_BRIEF.md` into a bounded execution order.

The brief remains authoritative for:

1. phase purpose,
2. locked product decisions,
3. scope and non-goals,
4. release exit criteria.

This plan answers the narrower question:

```text
What should be implemented next, in what order, and what proof closes v1.0?
```

## Entry Boundary

`C0.6.7` begins only after `C0.6.6` is closed enough that operator flow no longer blocks release-hardening proof.

That means:

1. queue states are readable,
2. lifecycle actions are operator-usable,
3. successor-revision flow is stable enough to test repeatedly,
4. history and technical details no longer hide core workflow truth,
5. publication bootstrap and guided publication flow are no longer developer-only.

## Phase Goal

Move from:

```text
workflow works in host
```

to:

```text
release boundary is resilient and replay-safe
```

The implementation target is:

```text
install
upgrade
replay
rebuild
restart
recover
freeze capability posture
```

`C0.6.7` is not a feature-expansion phase. It is a release-hardening phase.

The core question is not:

```text
Can the governed lifecycle happen?
```

It is:

```text
Can the governed lifecycle survive install, upgrade, replay, restart, rebuild, and recovery while preserving the same operator-visible truth?
```

## Governing Release Principles

### 1. Canonical authority must remain distinct from projections

Every persisted artifact must be classified by authority role.

Allowed roles:

```text
canonical source
portable ledger
operational projection
derived projection
host metadata
packaged/runtime artifact
proof-only artifact
```

Release hardening must not treat all persisted files as equal authority.

SQLite may be an operational authority projection, but it is not automatically the only source of truth. Derived projections must be rebuildable or safely invalidated.

### 2. Replay must preserve operator-visible truth

Replay and restart must preserve more than raw database rows.

They must preserve the truth visible to the operator:

1. queue status,
2. selected revision state,
3. review state,
4. subject decision state,
5. current active memory,
6. publication history,
7. lawful actions,
8. blocked actions,
9. technical identifiers,
10. evidence bindings.

A replay that restores records but regresses labels, queue state, or available actions is not release-safe.

### 3. Upgrade must fail before corruption, not after

Unsafe upgrade, stale projection, missing ledger, malformed event, version mismatch, or unrecoverable reference gaps must fail before mutation when possible.

Release behavior must avoid:

```text
silent repair
silent deletion
false active memory
false publication state
false available action
```

### 4. Historical records are immutable

History preservation is a system-wide invariant.

Individual actions should not describe themselves as “preserving history” unless the action has a special, non-obvious historical consequence. Otherwise, the UI may imply other actions can rewrite history.

### 5. Unsupported flows must not appear supported

Every capability must be classified before release.

Allowed release posture classes:

```text
ordinary operator flow
admin/proof flow
developer-only flow
unsupported/deferred flow
deprecated/hidden flow
```

No UI route should imply a capability is product-ready when it remains developer-only, experimental, or unsupported.

## Execution Slices

## C0.6.7A: Portability Inventory And Upgrade Contract

Status: pending

### Goal

Lock exactly what must survive upgrade and replay before implementation widens into migration work.

### Required Work

1. inventory persisted governed-memory artifacts,
2. identify every ledger and projection that participates in replay,
3. classify each artifact by authority role,
4. define additive migration expectations for each store,
5. document exact cross-stream references that must remain stable,
6. define acceptable vs unacceptable identifier churn,
7. define version compatibility posture,
8. define rollback and downgrade posture.

### Artifact Classification Requirements

Each artifact must be assigned one of:

```text
canonical source
portable ledger
operational projection
derived projection
host metadata
packaged/runtime artifact
proof-only artifact
```

The inventory must identify whether the artifact is:

1. required for replay,
2. required for runtime operation,
3. rebuildable from canonical state,
4. disposable,
5. proof-only,
6. unsafe to partially restore.

### Upgrade Contract Requirements

For every governed-memory artifact, define:

1. file or table location,
2. owner component,
3. authority role,
4. schema or format version,
5. replay domain,
6. migration behavior,
7. additive-only expectations,
8. rollback implications,
9. corruption handling,
10. proof case.

### Version And Rollback Posture

`C0.6.7A` must explicitly answer:

1. whether schema downgrade is supported,
2. whether rollback requires restoring a pre-upgrade snapshot,
3. which files and ledgers must be restored together,
4. what happens if code version and data version do not match,
5. whether newer data with older code fails safely,
6. whether older data with newer code migrates or refuses clearly.

### Proof Gate

`C0.6.7A` closes when:

1. one authoritative inventory exists,
2. every persisted artifact is assigned to a replay domain,
3. every persisted artifact is classified by authority role,
4. no required upgrade behavior remains implicit,
5. rollback and downgrade posture are documented,
6. version-mismatch behavior is specified.

## C0.6.7B: Upgrade, Replay, And Rebuild Implementation

Status: pending

### Goal

Implement or tighten the runtime behavior needed for additive migration, replay, projection rebuild, and safe refusal.

### Required Work

1. add any missing additive migration path,
2. guarantee replay consumes all governed ledgers in deterministic order,
3. rebuild projections from canonical state rather than stale UI residue,
4. preserve hash-bound records and reference integrity,
5. fail loudly on unrecoverable reconciliation gaps,
6. add or verify upgrade/replay preflight checks,
7. ensure stale derived projections are discarded or rebuilt, not trusted,
8. verify replay does not create false active memory,
9. verify replay does not create false available actions,
10. verify replay does not erase blocked-action truth.

### Replay Ordering Requirements

Replay order must be deterministic and documented.

At minimum, replay must account for:

1. structural authority records,
2. interpretive governance ledger,
3. review and subject-disposition records,
4. immutable revision lineage,
5. publication policy ledger,
6. qualification records,
7. authorization records,
8. publication records,
9. supersession and withdrawal records,
10. follow-up review records,
11. derived queue/projection state.

If any domain is not replayed directly, the plan must state whether it is rebuilt, ignored, or deprecated.

### Preflight Requirements

Before mutation or migration, the system should be able to report:

```text
ready to upgrade
blocked from upgrade
backup required
schema mismatch
ledger missing
projection stale
reference gap
unsupported version
```

Preflight must refuse unsafe states before migration begins where possible.

### Fail-Closed Requirements

The implementation must fail closed for:

1. missing ledger,
2. malformed ledger event,
3. stale projection,
4. orphaned publication record,
5. missing source revision,
6. mismatched policy hash,
7. missing active-memory target,
8. unsupported data version,
9. unresolved memory scope,
10. invalid cross-stream reference.

Expected behavior:

```text
No silent repair.
No silent deletion.
No false active memory.
No false publication state.
No false available action.
```

### Proof Gate

`C0.6.7B` closes when:

1. replay from migrated state restores the same operator-visible truth,
2. corrupted or missing references fail deterministically,
3. no silent record loss occurs,
4. upgrade preflight refuses unsafe states before migration begins,
5. stale derived projections are rebuilt or discarded,
6. active-memory truth is derived from replayed canonical state,
7. queue state and available actions match replayed authority state.

## C0.6.7C: Release Proof Matrix

Status: pending

### Goal

Prove the hard release paths instead of only the happy-path fresh install.

### Required Work

1. prove fresh install,
2. prove governed pre-`v1.0` upgrade,
3. prove restart after publication and revision activity,
4. prove projection rebuild after replay,
5. prove packaged host parity,
6. prove rollback / recovery instructions are real and usable,
7. prove version-mismatch and fail-closed behavior,
8. prove operator-visible state matches canonical replay state,
9. prove bad-state handling does not mutate live authority silently.

### Required Proof Scenarios

`C0.6.7C` must include proof for all scenarios below.

## 1. Fresh Install

Expected:

1. ordinary governed workflow is usable,
2. no bootstrap step silently fails,
3. no replay step silently fails,
4. packaged verification remains green,
5. standard publication bootstrap works without scripts,
6. publication can be completed through the UI.

Proof must show:

1. host startup,
2. plugin health,
3. memory scope availability,
4. standard policy availability,
5. review flow,
6. publication flow,
7. restart stability.

## 2. Pre-`v1.0` Governed Upgrade

Expected:

1. additive schemas migrate safely,
2. all governed ledgers replay,
3. no candidate meaning is lost,
4. no review meaning is lost,
5. no qualification meaning is lost,
6. no authorization meaning is lost,
7. no publication meaning is lost,
8. no active-memory truth is lost.

Proof must show:

1. pre-upgrade data,
2. migration/preflight result,
3. post-upgrade replay result,
4. operator-visible state,
5. technical state,
6. no silent loss.

## 3. Restart And Projection Rebuild

Expected:

1. current active memory remains identical,
2. history remains identical,
3. blocked actions remain identical,
4. lawful actions remain identical,
5. queue state does not regress into stale labels,
6. technical identifiers remain stable,
7. derived projections are rebuilt from canonical state.

Proof must compare before and after:

1. active memory,
2. selected revision state,
3. queue status,
4. review state,
5. subject decision state,
6. publication status,
7. available actions,
8. blocked actions,
9. history,
10. technical identifiers.

## 4. Lifecycle Completeness

Expected:

1. publish works,
2. successor revision works,
3. replacement works,
4. withdrawal works,
5. follow-up review behavior is either proven or explicitly deferred,
6. replay preserves the resulting state,
7. recovery preserves the resulting state.

Proof must include:

1. clean root publication,
2. successor revision from published memory,
3. review of successor,
4. grant of successor,
5. publication replacement,
6. publication history,
7. current-memory update,
8. prior-memory historical preservation,
9. restart/replay parity.

## 5. Corrected Child Revision Path

Expected:

1. proposal approved with changes creates immutable child revision,
2. parent cannot be published when corrected child is required,
3. child enters review,
4. child receives required review and subject decision,
5. child publishes successfully,
6. lineage remains intact,
7. replay preserves parent/child truth.

Proof must include:

1. parent proposal,
2. approve-with-changes action,
3. child revision creation,
4. child review,
5. child subject decision,
6. child publication,
7. parent blocked or historical state,
8. lineage after restart.

## 6. Version-Mismatch Handling

Expected:

1. newer data with older code fails safely,
2. older data with newer code migrates additively or refuses clearly,
3. unsupported schema versions produce clear failure,
4. no partial mutation occurs after refusal.

Proof must include at least one intentional mismatch case.

## 7. Bad-State / Fail-Closed Handling

Expected:

1. missing ledger fails clearly,
2. malformed ledger event fails clearly,
3. stale projection is rebuilt or refused,
4. orphaned publication record fails clearly,
5. missing source revision fails clearly,
6. mismatched policy hash fails clearly,
7. missing active-memory target fails clearly.

Proof must show:

```text
no silent repair
no silent deletion
no false active memory
no false available action
```

## 8. Packaged Host Parity

Expected:

1. SillyTavern and SillyBunny produce semantically equivalent results,
2. Node and Bun runtime behavior matches where required,
3. packaged payload contains required files,
4. manifest verification passes,
5. no development-only path is required.

Proof must include:

1. Node host result,
2. Bun host result,
3. semantic comparison,
4. package manifest verification.

## 9. Operator-Visible Truth

Expected:

Replay/restart must preserve:

1. queue status,
2. selected revision state,
3. current memory,
4. publication history,
5. lawful actions,
6. blocked actions,
7. technical identifiers,
8. evidence bindings,
9. review history,
10. subject decision state.

Proof must include screenshots or structured reports sufficient to verify the operator-visible truth.

### Proof Gate

`C0.6.7C` closes when:

1. every required release scenario has a passing proof artifact,
2. host parity is semantic, not cosmetic,
3. replay and restart produce the same active-memory truth,
4. bad-state handling fails closed,
5. version mismatch behavior is proven,
6. ordinary operator flow requires no scripts, raw JSON, or internal policy knowledge.

## C0.6.7D: Capability Freeze And Release Closeout

Status: pending

### Goal

Freeze what `v1.0` supports and what it intentionally does not support.

### Required Work

1. document supported ordinary operator flows,
2. document supported admin / proof flows,
3. document developer-only flows,
4. document explicitly unavailable or deferred capabilities,
5. document deprecated or hidden flows,
6. remove or demote ambiguous unofficial routes where needed,
7. produce the closeout decision on whether `v1.0` is actually authorized.

### Capability Classes

Every capability must be assigned one of:

```text
ordinary operator flow
admin/proof flow
developer-only flow
unsupported/deferred flow
deprecated/hidden flow
```

### Ordinary Operator Flows

These are expected to work without scripts, raw JSON, API knowledge, or internal policy vocabulary.

Candidate examples:

1. open Memory Review,
2. review pending memory,
3. record review response,
4. record context-owner decision,
5. approve with changes,
6. publish approved memory,
7. create successor revision,
8. publish replacement,
9. view current memory,
10. view publication history.

### Admin / Proof Flows

These may be productized but are not ordinary daily actions.

Candidate examples:

1. standard policy bootstrap,
2. packaged verification,
3. replay report,
4. recovery report,
5. technical detail inspection,
6. proof matrix execution.

### Developer-Only Flows

These may exist but must not be mistaken for supported product UI.

Candidate examples:

1. manual policy seeding,
2. direct API payload construction,
3. raw ledger manipulation,
4. test fixture injection,
5. debug-only migration commands,
6. source-level proof harness execution.

### Unsupported / Deferred Flows

These must be explicit.

Candidate examples:

1. full custom publication policy editor,
2. advanced policy comparison UI,
3. arbitrary downgrade support,
4. automatic interpretation from unsupported evidence types,
5. source navigation when no resolver exists,
6. local model autonomous governance decisions.

### Deprecated / Hidden Flows

These must either be removed, hidden, or clearly marked.

Candidate examples:

1. raw machine-policy action paths,
2. stale architectural-mode-only routes,
3. unsupported publication actions,
4. ambiguous follow-up review actions if semantics remain unresolved.

### Release Closeout Decision

`C0.6.7D` must end with one of:

```text
v1.0 authorized
v1.0 blocked
v1.0 authorized with documented limitations
```

The decision must cite the proof matrix and capability posture.

### Proof Gate

`C0.6.7D` closes when:

1. no major capability remains in an ambiguous partially-supported state,
2. release closeout can point to a concrete capability posture,
3. unsupported flows are not mistaken for product promises,
4. developer-only flows are identified and separated,
5. the repo can state whether `v1.0` is ready or blocked.

## Required Proof Matrix

`C0.6.7` does not close without all of the following.

## 1. Fresh Install

Expected:

1. ordinary governed workflow is usable,
2. no bootstrap or replay step silently fails,
3. packaged verification remains green,
4. standard publication setup requires no scripts,
5. publication can be completed from the UI.

## 2. Pre-`v1.0` Governed Upgrade

Expected:

1. additive schemas migrate safely,
2. all governed ledgers replay,
3. no candidate, review, qualification, authorization, or publication meaning is lost,
4. derived projections are rebuilt or discarded,
5. operator-visible truth remains intact.

## 3. Restart And Projection Rebuild

Expected:

1. current active memory remains identical,
2. history remains identical,
3. blocked or lawful actions remain identical,
4. queue state does not regress into stale labels,
5. technical identifiers remain stable,
6. evidence bindings remain stable.

## 4. Lifecycle Completeness

Expected:

1. publish works,
2. successor revision works,
3. replacement works,
4. withdrawal works,
5. replay and recovery preserve the resulting state,
6. lifecycle history remains complete and readable.

## 5. Corrected Child Revision Path

Expected:

1. approve with changes creates an immutable child revision,
2. parent and child publication eligibility are correctly distinguished,
3. child can complete review and publish,
4. lineage survives replay and restart.

## 6. Version Mismatch

Expected:

1. newer data with older code fails safely,
2. older data with newer code migrates or refuses clearly,
3. unsupported schema versions do not partially mutate live state.

## 7. Fail-Closed Bad-State Handling

Expected:

1. missing ledgers fail clearly,
2. malformed ledgers fail clearly,
3. stale projections are rebuilt or refused,
4. orphaned records fail clearly,
5. missing source references fail clearly,
6. mismatched hashes fail clearly,
7. no false active memory is created.

## 8. Packaged Host Parity

Expected:

1. SillyTavern and SillyBunny produce semantically equivalent results,
2. Node and Bun behavior matches for governed operations,
3. packaged manifests verify required files,
4. no development-only path is required.

## 9. Capability Posture Freeze

Expected:

1. supported flows are explicit,
2. admin/proof flows are explicit,
3. developer-only flows are explicit,
4. unsupported flows are explicit,
5. deprecated or hidden flows are explicit,
6. no UI path suggests unsupported capability as ready.

## Suggested Work Order

1. finish `C0.6.6` host-proof gaps that would invalidate release proof,
2. complete `C0.6.7A` inventory and upgrade contract,
3. implement `C0.6.7B` replay / rebuild tightening,
4. run `C0.6.7C` release proof matrix,
5. close `C0.6.7D` capability freeze and release decision.

## Implementation Notes

### Keep C0.6.7 Narrow

Do not use `C0.6.7` to introduce broad new memory features.

Allowed work:

1. hardening,
2. replay,
3. upgrade,
4. rebuild,
5. restart,
6. recovery,
7. capability freeze,
8. documentation needed to prove release posture.

Disallowed unless required for release proof:

1. new interpretation types,
2. new evidence classes,
3. full custom policy editor,
4. speculative local-model governance,
5. major UI redesign,
6. nonessential workflow expansion.

### Preserve Product / Technical Separation

Human UI should remain centered on:

```text
what happened
what is true now
what can be done next
what is blocked and why
```

Technical details should retain:

```text
canonical IDs
hashes
ledger events
policy bindings
schemas
raw enums
source references
```

### Prefer Refusal Over Ambiguous Success

If a state cannot be safely replayed, migrated, or reconstructed, the system must refuse clearly.

The release boundary should prefer:

```text
blocked with proof
```

over:

```text
apparently working but semantically uncertain
```

## Exit Standard

`C0.6.7` is complete when:

1. `v1.0` is no longer a floating target,
2. upgrade and replay behavior are explicitly proven,
3. lifecycle recovery is proven, not assumed,
4. packaged-host parity is evidenced,
5. supported and unsupported release capabilities are frozen,
6. developer-only flows are identified,
7. version-mismatch behavior is defined and proven,
8. rollback / recovery posture is documented,
9. operator-visible truth survives replay and restart,
10. bad-state handling fails closed,
11. the repo can state, with proof, whether `v1.0` is ready or blocked.

## Final Closeout Question

At the end of `C0.6.7`, the repo must be able to answer:

```text
Can a user install, upgrade, operate, replay, restart, recover, and understand the governed memory system without developer-only knowledge?
```

If yes:

```text
v1.0 may be authorized.
```

If no:

```text
v1.0 remains blocked, and the blocking capability must be named.
```
