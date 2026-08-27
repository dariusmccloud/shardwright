# C0.6.5 Evidence Finding Implementation Plan

Last updated: 2026-07-07

Status: active implementation plan

## Purpose

Translate `PHASE_C0_6_5_EVIDENCE_FINDING_CONTRACT_BRIEF.md` into a bounded execution order for implementation.

This plan does not redefine the contract.
The brief remains authoritative for:

1. phase purpose,
2. required product decisions,
3. non-goals,
4. proof expectations,
5. exit criteria.

This document answers the narrower question:

```text
What should be implemented next, in what order, and how will we prove it?
```

## Current Progress Snapshot

Completed on this branch:

1. `C0.6.5A` canonical finding schema,
2. `C0.6.5B` candidate assembly and persisted storage,
3. `C0.6.5C` review-surface rendering from persisted findings.

What remains open for this phase:

1. document closeout evidence from the implemented compatibility behavior,
2. keep the host smoke checklist aligned with the finished contract,
3. choose the next post-`C0.6.5` lift without widening back into redesign.

## Boundary Entering This Phase

The current publication and review surface is now stable enough to support the next lift.

Closed enough for `C0.6.5`:

1. review, history, publication lifecycle, and technical details now have believable jurisdictions,
2. the guided publication path is host-usable,
3. standard publication bootstrap is explicit and idempotent,
4. RAG retrieval, injection, and reranker host proof are restored,
5. the remaining primary product gap is evidence meaning, not publication operability.

This means the next major lift should not widen back into publication redesign.

## Phase Goal

Implement persisted evidence findings so the review surface can render human-readable evidence meaning without browser invention.

The implementation target is:

```text
persist the meaning
or
admit that the meaning is unavailable
```

## Locked Working Rules

These rules come directly from the brief and govern all implementation slices.

1. Findings are first-class persisted records.
2. Findings do not replace exact source bindings.
3. The browser may project persisted findings only.
4. Raw domains such as `AUTHORITY`, `ROLE`, and `RELATIONSHIP` must never be converted into prose client-side.
5. Missing findings must remain explicit and truthful.
6. Technical identifiers remain available, but they do not lead the human reading path.

## Execution Order

Implement `C0.6.5` in these bounded slices.

### C0.6.5A: Canonical Finding Schema

Status: complete

Goal:

Lock the persisted evidence finding contract before changing candidate assembly or UI rendering.

Required work:

1. Define the canonical finding payload shape.
2. Define allowed role vocabulary.
3. Define allowed support/status vocabulary.
4. Define exact basis-reference requirements.
5. Define validation behavior for malformed or partial findings.
6. Define replay-safe serialization rules.

Primary repo touchpoints:

1. server-plugin persistence and schema handling,
2. candidate/review record validators,
3. contract-focused tests.

Proof gate:

1. valid finding persists and reloads identically,
2. malformed finding fails deterministically or is quarantined deterministically,
3. Node and Bun preserve the same semantic payload.

### C0.6.5B: Candidate Assembly And Storage

Status: complete

Goal:

Get findings into the persisted candidate/revision path without relying on browser-only reconstruction.

Required work:

1. Accept or assemble findings during proposal/candidate construction.
2. Validate exact `basisRefs` before admission.
3. Persist `sourceLabel` and role alongside each finding.
4. Preserve source bindings separately from the findings.
5. Define the no-findings fallback path as an explicit persisted state, not a UI guess.

Primary repo touchpoints:

1. synthesis/proposal assembly path,
2. interpretive candidate persistence,
3. replay/load paths,
4. admission tests.

Proof gate:

1. candidate with findings survives admission and replay,
2. candidate without findings remains valid only through the intended fallback path,
3. no review view requires browser synthesis to explain a finding.

### C0.6.5C: Review Surface Rendering

Status: complete

Goal:

Render persisted findings in the `Review` tab while keeping technical bindings exact and separate.

Required work:

1. Project readable findings in the main evidence surface.
2. Show exact basis references adjacent to each finding or behind a compact disclosure.
3. Keep the missing-finding fallback truthful and stable.
4. Keep technical source identities in `Technical Details`.
5. Avoid duplicating the same meaning across `Review`, `History`, and `Technical Details`.

Primary repo touchpoints:

1. `ui/modals/management/interpretive-review-modal.js`,
2. `ui/styles/interpretive-review.css.js`,
3. any evidence projection helpers shared by the modal.

Proof gate:

1. operator can understand why the memory is supported from the `Review` tab,
2. basis refs are inspectable,
3. `Technical Details` still exposes exact bindings,
4. no prose is generated from domains alone.

### C0.6.5D: Historical / Compatibility Strategy

Status: complete

Goal:

Keep older artifacts stable while allowing newer records to render persisted findings.

Implemented:

1. historical rows with non-canonical persisted finding state now reopen through the truthful fallback path.
2. mixed-generation records now replay with stable evidence-finding semantics after restart.
3. packaged Node and Bun paths now prove identical evidence-finding semantics for finding-bearing candidates.
4. no destructive migration is required for ordinary host use.

Primary repo touchpoints:

1. replay/load paths,
2. historical record projection,
3. compatibility tests,
4. optional migration scaffolding if approved later.

Proof gate:

1. old records still render truthfully,
2. new records render findings,
3. mixed records remain stable after restart and replay,
4. no destructive migration is required for ordinary host use.

## Next Major Lift

`C0.6.5` should now move into closeout, not another evidence-contract slice.

The next major lift after `C0.6.5` is:

```text
C0.6.6 Operator Flow And Revision Ergonomics
```

See:

```text
docs/archive/pre-phase_x/contracts/pre-phase_x/C0_6_6_OPERATOR_FLOW_AND_REVISION_ERGONOMICS_PLAN.md
```

Reason:

The evidence-finding contract is now implemented and compatibility-proofed locally.
The remaining primary product risk is no longer persisted meaning.
It is operator flow:

1. queue semantics,
2. completed-state wording,
3. revision-from-published-memory ergonomics,
4. readable lifecycle history,
5. safe replacement / withdrawal navigation.

That work should now be handled as a bounded product-flow lift rather than as another publication-contract redesign.

## Implementation Order Inside Each Slice

For every slice, follow this sequence:

1. contract/update tests first,
2. persistence or assembly implementation,
3. replay verification,
4. UI projection only after payload behavior is stable,
5. host proof only after local tests pass.

This keeps the browser from becoming the place where semantics are invented or debugged.

## Required Proof Matrix

`C0.6.5` does not close without all of the following.

### 1. Fresh candidate with findings

Expected:

1. human-readable finding renders in `Review`,
2. basis refs are inspectable,
3. exact bindings remain visible in `Technical Details`,
4. restart preserves the same rendered meaning.

### 2. Candidate with multiple finding roles

Expected:

1. primary and supporting findings remain distinct,
2. ordering is stable,
3. basis refs stay attached to the correct finding,
4. replay preserves role separation.

### 3. Candidate with bound evidence but no findings

Expected:

1. truthful fallback is shown,
2. browser does not invent prose,
3. exact bindings remain inspectable,
4. restart preserves the fallback path.

### 4. Malformed finding payload

Expected:

1. deterministic refusal or quarantine,
2. exact refusal reason is recorded,
3. replay does not silently coerce or repair the payload.

### 5. Historical / mixed-generation records

Expected:

1. old records remain readable,
2. new records show findings,
3. mixed loads remain stable across restart,
4. no host script is required for ordinary viewing.

### 6. Node / Bun parity

Expected:

1. persisted finding semantics match,
2. replay behavior matches,
3. fallback behavior matches,
4. proof results remain equivalent across supported packaged hosts.

Status:

1. legacy-state fallback proved in `interpretive.test.mjs`,
2. mixed-generation replay proved in `interpretive.test.mjs`,
3. packaged Node / Bun parity proved in `package.test.mjs`.

## Out Of Scope During C0.6.5

Do not widen this phase into:

1. another publication lifecycle redesign,
2. generalized evidence summarization,
3. browser-generated semantic prose,
4. RAG redesign,
5. backfilling all historical records unless a separate migration decision is approved.

## Files To Align After Implementation Begins

These documents should be updated from the implemented contract, not ahead of it:

1. `docs/archive/pre-phase_x/operational/HOST_SMOKE_TEST_CHECKLIST.md`
2. completion report for `C0.6.5`
3. any product-facing closeout or rollout summary that references evidence findings

Until then, the brief and this implementation plan are the authority.

## Recommended Next Action

Close `C0.6.5` as implemented and shift branch effort to the host-proof lift above.

Reason:

The schema, storage, review projection, and compatibility boundary are now in place.
The remaining risk is operational proof and cross-host stability, not missing evidence-finding semantics.

## Working Rule

During `C0.6.5`:

```text
Do not let the UI guess what the evidence means.
Persist the meaning, validate it, replay it, then render it.
```
