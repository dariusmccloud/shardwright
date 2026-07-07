# C0.6.4-5 Closeout And Next Lift Plan

Last updated: 2026-07-07

Status: active implementation plan

## Purpose

Freeze the current boundary after the interpretive review UI overhaul and the guided publication path recovery, then define the remaining work in the correct order.

This document is not a replacement for:

- `PHASE_C0_6_4_5_PUBLICATION_POLICY_BOOTSTRAP_AND_GUIDED_OPERATOR_FLOW_BRIEF.md`
- `HOST_SMOKE_TEST_CHECKLIST.md`

Those remain the contract and the live proof checklist.

This document exists to answer one narrower question:

```text
What should be done next, in what order, now that the publication UI is usable?
```

## Boundary Closed Now

The following boundary is treated as closed enough to stop redesign churn:

1. Interpretive review surface is readable and scannable.
2. `Publication Lifecycle` is a distinct operator surface.
3. Guided publication no longer depends on raw script/bootstrap knowledge in the ordinary path.
4. FAB handoff to Memory Review is stable again.
5. The live host can complete:
   - review approval
   - subject decision
   - policy bootstrap
   - eligibility check
   - publish
6. Closeout A proof now verifies a clean reset -> seed -> bootstrap -> qualify -> publish path on the default Jeep smoke line.

This does not mean the whole publication domain is finished.
It means the surface is now coherent enough to support focused closeout work instead of broad UI surgery.

## What Is Already Proven

Backend contract already implemented and tested:

1. Standard policy bootstrap is explicit and idempotent.
2. Standard path internalizes authorization behind `Publish Memory`.
3. Guided publication route exists and can publish atomically.
4. Replay restores publication state.
5. Node and Bun parity tests exist for the packaged path.

Live host proof already achieved:

1. Review queue works.
2. Guided publication path is visible.
3. `Set Up Standard Publication Policy` works.
4. `Check Eligibility` works.
5. `Publish Memory` works.
6. RAG retrieval, injection, and reranker are functioning again in host.
7. FAB `Interp. Review` launch path is fixed.

## Remaining C0.6.4-5 Closeout Work

The next work is not a new product area yet.
It is a closeout pass on the existing publication contract.

### C0.6.4-5 Closeout A: Publication Data Hygiene

Goal:

Stop legacy test-state bleed from distorting publication behavior and operator interpretation.

Required work:

1. Audit existing seeded publication records and lifecycle history for duplicate or stale test residue.
2. Confirm the current seed/reset helpers leave the default smoke line in a deterministic state.
3. Prove that one clean seeded candidate produces one clean publication lineage.
4. Keep test cleanup separate from product semantics.

Proof:

1. Fresh reset -> seed -> approve -> grant -> bootstrap -> qualify -> publish
2. Resulting line shows one current published memory and one coherent lifecycle history entry set
3. No phantom duplicate actions or stale replacement/withdrawal blockers

Current proof status:

- verified on 2026-07-07 with `tools/server-plugin/prove-c0-6-4-5a.ps1`

Reference proof command:

- `powershell -NoProfile -ExecutionPolicy Bypass -File "tools/server-plugin/prove-c0-6-4-5a.ps1" -HostName "SillyTavern" -Port 8000`

### C0.6.4-5 Closeout B: Corrected-Child Publication Proof

Goal:

Prove the child-revision rule from the brief, not just the root revision happy path.

Required work:

1. Seed a candidate that can be reviewed with a corrected-child outcome.
2. Prove the parent cannot publish after `approve with changes`.
3. Prove the reviewed child can publish after review completion and subject decision.
4. Verify lifecycle and history surfaces project the result coherently.

Proof:

1. Parent revision blocked with human reason
2. Child revision becomes eligible after review and decision
3. Publish completes from child revision
4. History and lifecycle identify the resulting publication correctly

Current proof status:

- verified on 2026-07-07 with `tools/server-plugin/prove-c0-6-4-5b.ps1`

Reference proof command:

- `powershell -NoProfile -ExecutionPolicy Bypass -File "tools/server-plugin/prove-c0-6-4-5b.ps1" -HostName "SillyTavern" -Port 8000`

### C0.6.4-5 Closeout C: Restart, Replay, And Cross-Host Proof

Goal:

Confirm that publication state survives host restart and remains semantically identical across supported host setups.

Required work:

1. Restart the local host after a clean publication.
2. Re-open Memory Review and verify the same current published memory and lifecycle projection.
3. Repeat proof on both supported packaged host paths when applicable.
4. Confirm no required operator step depends on transient in-memory state.

Proof:

1. Restart preserves published/active state
2. Lifecycle view remains coherent after replay
3. Node and Bun behavior remain semantically aligned
4. No raw script or DB intervention is required in the ordinary path

Status:

Closed for the current phase boundary.

Verified commands:

1. `node --test --test-name-pattern "guided publication replay restores the identical published state after restart" tools/server-plugin/summary-sharder-memory/interpretive.test.mjs`
2. `node --test --test-name-pattern "packaged interpretive publication flow succeeds under Node from staged payload only|packaged interpretive publication flow succeeds under Bun from staged payload only" tools/server-plugin/summary-sharder-memory/package.test.mjs`
3. `powershell -NoProfile -ExecutionPolicy Bypass -File "tools/server-plugin/prove-c0-6-4-5c.ps1" -HostName "SillyTavern" -Port 8000`

Verified result:

1. Clean-root publication remains semantically identical after host restart.
2. The restarted host returns the same guided lifecycle state: `ALREADY_PUBLISHED`.
3. The same published record remains current after replay.
4. Packaged server-plugin publication flow remains green under both Node and Bun.
5. No operator step in the proved path required manual DB or ledger intervention.

Scope note:

The live restart/replay proof was executed against the SillyTavern host path.
Cross-runtime parity for the packaged publication path was covered by the Node/Bun package tests above.

### C0.6.4-5 Closeout D: Surface Tightening Only Where It Supports Proof

Goal:

Make only the remaining presentation changes that directly reduce operator error during proof work.

Allowed work:

1. Remove duplicated lifecycle guidance text when it does not add meaning.
2. Keep raw technical disclosure in `Technical Details`, not in the main path, when duplication creates confusion.
3. Improve spacing or hierarchy where the operator cannot clearly see the current lawful action.

Not allowed here:

1. broad redesign of review/history/technical surfaces
2. new publication semantics
3. evidence prose invention

## The Next Major Lift After C0.6.4-5 Closeout

After the three proof slices above are finished, the next major lift should be:

```text
Evidence Finding Contract
```

Reason:

The current review surface still says:

```text
Human-readable findings are not available yet.
```

That is now the biggest remaining product gap in interpretive review.

The publication path is usable.
The evidence explanation path is still machine-shaped.

### Evidence Finding Contract Scope

This next lift should define and implement:

1. persisted human-readable findings
2. exact basis references per finding
3. stable source labels
4. review-surface rendering that uses persisted meaning instead of deriving prose from raw domains

It should not be solved by:

1. client-side prose generation from `AUTHORITY`, `ROLE`, or `RELATIONSHIP`
2. heuristic UI-only summarization
3. hiding evidence meaning permanently behind technical records

## Execution Order

Do the remaining work in this order:

1. `C0.6.4-5 Closeout A` — publication data hygiene
2. `C0.6.4-5 Closeout B` — corrected-child publication proof
3. `C0.6.4-5 Closeout C` — restart, replay, and cross-host proof
4. `C0.6.4-5 Closeout D` — only the UI tightening needed to support the proof
5. Draft the Evidence Finding Contract brief
6. Decide whether the Evidence Finding Contract is required before `v1.0`
7. If yes, implement it as the next major lift

## Working Rule

Until the closeout proof is complete:

```text
Do not widen scope.
Do not redesign the whole review product again.
Do not invent evidence semantics in UI copy.
Finish publication closeout first.
```
