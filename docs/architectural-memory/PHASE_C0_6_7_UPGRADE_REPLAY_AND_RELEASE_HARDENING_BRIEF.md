# Phase C0.6.7: Upgrade, Replay, And Release Hardening Brief

Last updated: 2026-07-09

Status: active contract brief

## Purpose

Turn the implicit post-`C0.6.6` release gate into an explicit implementation boundary.

`C0.6.7` exists so `v1.0` means a specific, provable product state instead of a vague finish line.

This phase does not redesign review, publication, or evidence semantics again.
It hardens the already-landed governed lifecycle against upgrade, replay, rebuild, and host drift.

## Problem Statement

By the end of `C0.6.6`, the governed workflow should be operator-usable:

```text
find memory
understand state
take lawful action
revise safely
```

That still does not prove release safety.

`v1.0` remains blocked until the system proves:

1. pre-`v1.0` state survives installation of the final payload,
2. every authority ledger replays without semantic drift,
3. projections rebuild identically after restart,
4. packaged hosts preserve the same meaning,
5. supported and unsupported capability boundaries are frozen.

Without this boundary, `v1.0` remains a label applied to a good-looking system instead of a resilient one.

## Phase Goal

Prove that governed memory survives upgrade and recovery without losing records, changing meaning, or opening unofficial paths.

The implementation target is:

```text
pre-v1 governed install
-> install v1 payload
-> migrate additive schemas
-> replay all ledgers
-> rebuild projections
-> preserve meaning
-> restart cleanly
-> keep capability boundaries intact
```

## Locked Scope

This phase covers:

1. upgrade and replay semantics,
2. additive migration safety,
3. projection rebuild correctness,
4. restart and packaged-host parity,
5. lifecycle completeness proof for published and revised memories,
6. supported / unsupported capability freeze for release.

This phase does not cover:

1. a new review-surface redesign,
2. new evidence-finding semantics,
3. new publication policy semantics,
4. broad admin tooling beyond what release proof requires,
5. speculative new capabilities that are not needed for the release boundary.

## Locked Product Decisions

### 1. `v1.0` is a resilience boundary, not a polish milestone

Release is blocked until upgrade, replay, restart, and recovery are proven.

UI cleanliness may support proof, but it does not close this phase by itself.

### 2. Upgrade must preserve meaning, not just rows

No candidate, disposition, delegation, qualification, authorization, publication, or DNM record may silently disappear or change meaning during upgrade.

Hash-bound records remain authoritative through migration and replay.

### 3. Replay must restore the same operator truth

After restart or rebuild, the operator must see the same:

1. current active memory,
2. review history,
3. publication history,
4. lawful next action,
5. blocked state and reason.

Exact internal identifiers may be regenerated only where the existing contract already permits it.

### 4. Capability boundaries must freeze before release

`v1.0` must explicitly distinguish:

1. supported ordinary operator paths,
2. supported admin / proof paths,
3. unavailable or intentionally deferred paths.

The product must not ship with ambiguous "present but unofficial" routes.

### 5. Lifecycle completeness is part of release-hardening

`v1.0` does not stop at fresh publication.

The release boundary must prove:

1. publish,
2. revise,
3. supersede,
4. withdraw,
5. replay,
6. recover.

## Required Proof Domains

### 1. Authority stream portability

The release boundary must preserve and replay:

1. source corpus,
2. structural authority artifacts,
3. interpretive governance ledger,
4. DNM publication ledger.

### 2. Cross-stream reference integrity

Published DNM must continue to resolve to:

1. exact interpretation revision,
2. exact review and subject disposition,
3. exact qualification and authorization state,
4. exact continuity target.

### 3. Capability-boundary preservation

Release proof must confirm:

1. structural promotion cannot publish DNM,
2. review grant cannot publish automatically,
3. synthesis cannot approve,
4. operator action cannot erase subject ownership,
5. UI cannot invent eligibility.

### 4. Host parity

Where the repo supports multiple packaged/runtime paths, release proof must confirm semantic parity rather than assuming it.

At minimum:

1. restart preserves governed state,
2. packaged verification stays green,
3. Node and Bun do not diverge on persisted meaning.

## Expected Deliverables

`C0.6.7` should produce:

1. one explicit implementation plan for the release-hardening slices,
2. upgrade/replay/rebuild proof artifacts,
3. a frozen supported-capabilities statement,
4. rollback / recovery documentation for the release boundary,
5. a closeout record stating whether `v1.0` is actually authorized.

## Exit Criteria

`C0.6.7` is complete only when all of the following are true:

1. upgrade from a governed pre-`v1.0` installation is proven,
2. replay and rebuild preserve operator-visible truth,
3. fresh install and packaged verification remain green,
4. lifecycle completeness is proven across publish / revise / supersede / withdraw / replay / recover,
5. supported and unsupported capability boundaries are explicit,
6. no ordinary governed operation requires raw DB, CLI, or script intervention,
7. release documentation makes the `v1.0` boundary concrete and auditable.
