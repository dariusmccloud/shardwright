# C0.6.7D Capability Freeze And Release Closeout

> Historical freeze notice (2026-07-13): This document records the capability posture at `C0.6.7D`. It is superseded for current release planning by `C0_8_0_CURRENT_CAPABILITY_MATRIX.md`. In particular, `C0.6.5`, `C0.6.9`, and `C0.75` are now complete; saved Architectural-shard proposal creation and exact Review opening are proven; direct source navigation and no-script supported admin recovery remain open.

## Purpose

`C0.6.7D` freezes the actual `v1.0` product boundary after upgrade/replay/restart hardening.

This is not a feature wishlist. It is the release contract for what:

- is supported as an ordinary operator flow,
- is supported as an admin/proof flow,
- remains developer-only,
- is intentionally deferred or unavailable for `v1.0`,
- and has been deprecated or hidden from the ordinary path.

## Evidence Basis

Primary proof and contract sources:

- `docs/archive/pre-phase_x/contracts/pre-phase_x/PHASE_C0_6_7_UPGRADE_REPLAY_AND_RELEASE_HARDENING_BRIEF.md`
- `docs/archive/pre-phase_x/contracts/pre-phase_x/C0_6_7_UPGRADE_REPLAY_AND_RELEASE_HARDENING_PLAN.md`
- `docs/archive/pre-phase_x/contracts/pre-phase_x/C0_6_7C_OPERATOR_VISIBLE_TRUTH_REPORT.md`
- `docs/archive/pre-phase_x/contracts/pre-phase_x/C0_6_6_OPERATOR_FLOW_AND_REVISION_ERGONOMICS_PLAN.md`
- `docs/archive/pre-phase_x/operational/HOST_SMOKE_TEST_CHECKLIST.md`
- `tools/server-plugin/summary-sharder-memory/interpretive.test.mjs`
- `tools/server-plugin/summary-sharder-memory/upgrade.test.mjs`
- `tools/server-plugin/summary-sharder-memory/package.test.mjs`

`C0.6.7C` already proved the following release-hardening truths:

- published truth survives restart without drifting,
- corrected-child publication survives replay and restart,
- replacement publication can enter pending-delta,
- the prior publication is marked superseded,
- the replacement can then be withdrawn,
- replay preserves no-active-record truth after withdrawal,
- replay restores pre-replay governed state if a later replay domain fails mid-sequence,
- replay fails closed on malformed or incomplete publication state,
- packaged publication remains semantically aligned under Node and Bun.

## Release Decision

Release disposition:

```text
v1.0 authorized with documented limitations
```

Reason:

- the governed review and publication lifecycle is operational for ordinary host use,
- replay/restart/upgrade hardening is proven,
- packaged parity is proven,
- but several capabilities remain intentionally non-ordinary, incomplete, or deferred and must not be misrepresented as first-class operator support.

## Capability Classes

### 1. Supported Ordinary Operator Flow

These are the supported host-usable `v1.0` operator paths.

#### Review and queue operation

Operators can:

- open `Interp. Review`,
- work from queue entries,
- use queue filters for:
  - `Pending approval`
  - `Pending decision`
  - `Approved`
  - `Ready for publication`
  - `Published`
- switch between participant cards within a revision,
- inspect:
  - `Review`
  - `History`
  - `Publication Lifecycle`
  - `Technical Details`.

#### Review and subject decision recording

Operators can:

- submit reviewer approvals and corrections,
- submit subject decisions,
- move a candidate from review completion into publication readiness through the host UI.

#### Standard publication bootstrap and guided publication

Operators can:

- explicitly initialize the standard governed publication policy,
- run publication readiness / eligibility checks,
- publish an eligible revision through the guided host flow,
- rely on internalized authorization rather than a separate human authorization step in the ordinary path.

Ordinary operator action model:

```text
bootstrap policy if absent
-> check publication readiness
-> publish memory
```

#### Published-memory follow-on work

Operators can:

- inspect the current published memory,
- inspect publication history,
- create a governed child revision from a published memory,
- open the latest actionable child revision when a parent is blocked by newer reviewed wording,
- work replacement / pending-delta publication flows,
- withdraw a pending replacement,
- inspect the resulting active/superseded/withdrawn truth in host UI.

### 2. Supported Admin / Proof Flow

These are supported, but they are not ordinary operator paths.

#### Proof and reset scripts

- `tools/server-plugin/seed-interpretive-candidate.ps1`
- `tools/server-plugin/reset-interpretive-smoke-storage.ps1`
- `tools/server-plugin/prove-c0-6-4-5a.ps1`
- `tools/server-plugin/prove-c0-6-4-5b.ps1`
- `tools/server-plugin/prove-c0-6-4-5c.ps1`
- `tools/server-plugin/prove-c0-6-7c.ps1`
- `tools/server-plugin/prove-c0-6-7c-fresh-install.ps1`
- `tools/server-plugin/prove-c0-6-7c-corrected-child.ps1`
- `tools/server-plugin/prove-c0-6-7c-rollback-recovery.ps1`

#### Upgrade and replay administration

- `GET /upgrade/preflight`
- `POST /upgrade/replay`
- packaged parity and replay proof execution under Node and Bun

These flows are supported for admin, recovery, proof, and release validation purposes.

### 3. Developer-Only Flow

These capabilities exist in the implementation surface but are not part of the ordinary product contract.

#### Raw policy / route surfaces

- raw publication-policy management outside the guided UI path,
- raw delegation-policy management,
- raw synthesis-policy and synthesis-run route usage,
- direct route driving of review/publication state outside the host workflow.

#### Rebuild / projection maintenance surfaces

- `/rebuild/candidate/*`
- `/rebuild/promotion/*`

These remain implementation and recovery tools, not normal end-user workflow.

### 4. Unsupported / Deferred For v1.0

The following are not part of the `v1.0` ordinary product claim.

#### Proposal creation from saved evidence as a guaranteed host-only path

The repo still documents a fallback where queue creation may require:

- a seed script, or
- an equivalent proof/admin route

when a host entry point is absent or unsuitable for the proof path.

So `v1.0` does **not** claim:

```text
saved evidence -> ordinary host-only proposal creation
```

as a fully closed boundary.

#### Human-readable persisted evidence findings

The review surface still truthfully reports when only bound source records exist and readable findings are unavailable.

`v1.0` does **not** claim persisted, human-readable evidence findings for every candidate.

#### Direct source navigation from review evidence

The review surface can point operators to `Technical Details`, but it does not yet provide first-class direct navigation from every bound evidence reference to its exact source target.

#### No-script host-admin repair and replay

Upgrade/replay/recovery are proven, but not productized as a no-script ordinary host-admin UI flow.

### 5. Deprecated / Hidden From The Ordinary Path

The following behavior is intentionally removed or demoted from the ordinary operator model.

#### Separate human authorization as a visible ordinary operator step

`v1.0` ordinary publication uses:

```text
eligibility check
-> internalized authorization safeguard
-> publish
```

It does **not** present standalone authorization as a required human governance action in the main operator path.

#### Ambiguous multi-surface publication control

The release posture keeps one primary publication action path and demotes duplicate or confusing lifecycle controls where possible.

## v1.0 Product Statement

The supported `v1.0` claim is:

```text
An operator can review a governed candidate, record reviewer and subject decisions,
bootstrap the standard publication policy when absent, publish an eligible memory,
inspect current and historical publication truth, create a governed child revision
from a published memory, and manage replacement/withdrawal truth through the host UI,
with restart/replay/upgrade preserving the same operator-visible state.
```

The unsupported `v1.0` claim is:

```text
Every evidence-backed proposal can be generated host-only from saved evidence without
admin/proof support, every evidence item has a persisted human-readable finding,
and every bound source can be navigated directly from the review surface.
```

## Release-Gating Closeout For D

`C0.6.7D` closes when:

1. this capability boundary is documented,
2. the smoke checklist distinguishes release-gating work from deferred/admin-only work,
3. UI posture does not contradict this boundary,
4. release closeout can point to one clear `v1.0` support statement.

## Next Major Lift After C0.6.7D

The next major lift should focus on productizing what is still deferred rather than widening the raw route surface.

Priority order:

1. host-usable proposal generation from saved evidence
2. direct source-navigation affordances from review evidence and technical references
3. persisted human-readable evidence finding contract
4. remaining high-value lifecycle ergonomics once the above become first-class
