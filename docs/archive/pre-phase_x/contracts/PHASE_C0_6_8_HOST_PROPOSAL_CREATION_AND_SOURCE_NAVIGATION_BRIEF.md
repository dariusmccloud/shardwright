# Phase C0.6.8: Host Proposal Creation And Source Navigation Brief

Last updated: 2026-07-09

Status: `PARTIAL` — proposal creation and exact Review opening are complete under the later `C0.6.9` proof; direct source navigation remains open.

Current authority note:

- `C0.6.9` supersedes the proposal-generation and save-to-review proof requirements in this brief.
- `C0.6.8C` direct source navigation remains governed here and is carried into `C0.8.0D`.
- The current release classification is recorded in `C0_8_0_CURRENT_CAPABILITY_MATRIX.md`.

## Purpose

Productize the highest-value work intentionally deferred by `C0.6.7D`:

```text
saved evidence
-> ordinary host-only proposal creation
-> governed review queue
-> direct source inspection from review evidence
```

`C0.6.8` does not reopen publication, replay, or evidence-finding contracts.

It closes the operator gap between:

1. evidence that already exists in warm or cold archive,
2. synthesis/candidate routes that already exist on the server,
3. the missing host workflow that turns that evidence into a governed proposal without scripts or proof-only fallback,
4. the missing direct-navigation affordances from review evidence and technical references.

## Why This Is Next

`C0.6.7D` closed the `v1.0` release boundary and explicitly deferred three product claims:

1. host-usable proposal generation from saved evidence,
2. direct source navigation from review evidence,
3. universal persisted human-readable findings.

The first two are the next practical operator lift.

The third already has a separate contract in `C0.6.5` and should not be widened here unless a new proof gap is discovered.

## Current Repo Reality

The current branch already contains the underlying server primitives:

```text
POST /interpretive/synthesis/policies
POST /interpretive/synthesis/runs
POST /interpretive/synthesis/runs/:synthesisRunId/generate
POST /interpretive/candidates
```

The current branch also already proves:

1. deterministic synthesis can emit grounded proposals,
2. admitted proposals can enter the governed review queue,
3. review, grant, publication, replacement, withdrawal, replay, and upgrade are now host-proven.

What is still missing is the ordinary operator entry path.

Today, that path still depends on one of these anti-goals:

1. a seed script,
2. a proof-only admin route,
3. route choreography the operator should never have to understand.

## Phase Goal

Implement a host-usable proposal workflow that lets the operator:

```text
choose saved evidence
-> generate a governed proposal
-> enter the normal review queue
-> inspect exact source targets directly from the review surface
```

No script, raw JSON, route order, or proof helper should be required for ordinary use.

## Non-Goals

`C0.6.8` does not:

1. redesign publication lifecycle again,
2. replace replay-safe technical bindings with browser inference,
3. widen synthesis into autonomous publication or autonomous review decisions,
4. backfill human-readable findings for every historical candidate,
5. replace exact server routes with a browser-only fake workflow,
6. reopen `C0.6.7` upgrade/replay contracts.

## Locked Product Decisions

### 1. Proposal creation must be host-first

If saved evidence already exists, the operator must be able to create a governed proposal from the host UI.

The ordinary path must not require:

1. `seed-interpretive-candidate.ps1`,
2. direct route invocation,
3. proof-only bootstrap helpers.

Those tools may remain for testing and recovery.
They are not the product path.

### 2. Saved evidence is an explicit operator input

The operator must deliberately choose or confirm the evidence basis.

Minimum supported sources may include:

1. warm archive / RAG-retrievable shard output,
2. local cold archive output,
3. another already-saved host evidence surface that maps to the same canonical archive contract.

The browser must not silently synthesize a proposal from unspecified background state.

### 3. Host proposal generation reuses the existing governed route chain

The host flow should orchestrate the already-lawful server path:

```text
synthesis policy
-> synthesis run
-> generate
-> admitted candidate
```

The UI may wrap that path.
It must not invent a second candidate-creation contract with different semantics.

### 4. Source navigation is direct when resolvable

When an evidence item or technical reference has an exact resolvable target, the review surface should offer a direct navigation affordance.

Examples:

```text
message ref
-> open exact message / source occurrence

structural record ref
-> open exact technical record / bound source row

revision ref
-> open exact revision in the modal
```

If no exact target exists, the UI must fall back truthfully to copyable exact references rather than fake links.

### 5. Human-readable evidence meaning stays under the existing `C0.6.5` contract

`C0.6.8` may consume persisted findings when they exist.

It must not:

1. generate new meaning from raw domains in the browser,
2. redefine the evidence-finding schema,
3. block proposal generation solely because a richer narrative finding is absent, unless an explicit contract change is approved.

## Required Product Decisions

Before implementation closes, `C0.6.8` must lock these operational decisions.

### A. Saved-evidence picker scope

The host must define exactly which saved evidence pools are eligible for proposal generation.

Minimum decision:

```text
warm archive only
or
warm + cold archive
or
saved archive + existing host evidence records
```

The chosen scope must match what the repo can actually resolve and replay safely.

### B. Proposal-generation trigger model

The host must decide whether proposal generation begins from:

1. a dedicated saved-evidence browser action,
2. a queue-adjacent “Create Proposal” entry,
3. an evidence-manager action that hands off into interpretive review.

The operator needs one clear ordinary path, not several partially overlapping entry points.

### C. Navigation targets

For each reference type shown in review or technical details, the brief must distinguish:

```text
resolvable now
-> direct navigation

resolvable later
-> deferred enhancement

not reliably resolvable
-> copy-only exact reference
```

## Scope

`C0.6.8` covers four layers.

### A. Saved-Evidence Admission Contract

Define:

1. which saved evidence sources are eligible,
2. how the operator selects them,
3. what exact payload is frozen for proposal generation,
4. what validation rejects malformed or stale evidence before synthesis.

### B. Host Proposal Workflow

Implement:

1. the ordinary host entry point,
2. host-side orchestration of synthesis policy/run/generate/admit,
3. success routing into the governed review queue,
4. truthful refusal handling when saved evidence cannot produce a lawful proposal.

### C. Direct Source Navigation

Implement:

1. direct navigation from review evidence where a target is resolvable,
2. direct navigation from technical references where a target is resolvable,
3. fallback copy-only behavior where it is not,
4. no dead links.

### D. Host Proof And Replay Safety

Prove:

1. generated proposals from saved evidence survive restart/replay,
2. the admitted candidate matches the persisted proposal path,
3. no script-only step is required in ordinary host use.

## Suggested Implementation Slices

### C0.6.8A: Saved-Evidence Contract And Entry Surface

Implement:

1. the saved-evidence picker scope,
2. host entry affordance for proposal creation,
3. payload freezing for the chosen evidence,
4. validation/refusal projection before synthesis.

Proof:

1. the operator can select eligible saved evidence from the host UI,
2. invalid or stale evidence fails with a plain-language blocker,
3. no proof/admin script is required for ordinary path setup.

### C0.6.8B: Host-Orchestrated Proposal Generation

Implement:

1. host orchestration of synthesis policy/run/generate,
2. ordinary-path candidate admission into the governed queue,
3. refusal and quarantine projection that remains understandable to the operator,
4. route/test parity with the existing deterministic synthesis contract.

Proof:

1. saved evidence produces an admitted governed candidate from host UI only,
2. the resulting candidate appears in the review queue,
3. the candidate remains `NOT_PUBLISHED` / review-governed until ordinary review proceeds.

### C0.6.8C: Source Navigation Affordances

Implement:

1. direct navigation from bound review evidence,
2. direct navigation from technical references where exact targets exist,
3. “open revision” / “open source” actions where already-supported resolvers can be reused,
4. copy-only fallback where no resolver exists.

Proof:

1. at least one message/source-occurrence reference opens directly,
2. at least one structural/technical reference opens directly,
3. unresolved references never render as dead links.

### C0.6.8D: Host Proof, Replay, And Cross-Surface Consistency

Implement and prove:

1. restart/replay preserves the same generated candidate state,
2. queue, review, and technical surfaces agree on the same proposal identity,
3. source-navigation affordances continue to resolve after restart,
4. host-only path remains valid without proof helper routes.

## Required Proof Cases

`C0.6.8` should not close without proving:

1. saved warm-archive evidence can create a governed proposal through the host UI,
2. saved cold-archive evidence can create a governed proposal through the host UI, if cold archive is inside chosen scope,
3. malformed or stale saved evidence fails with:
   - plain-language reason,
   - exact next action,
   - technical refusal code preserved behind disclosure,
4. admitted proposal appears in the ordinary review queue,
5. no publication occurs during proposal generation,
6. restart/replay preserves the same proposal/candidate state,
7. at least one direct source-navigation action works from the review surface,
8. at least one direct source-navigation action works from technical details,
9. unresolved refs remain copyable but non-clickable,
10. no script is required for the ordinary operator path.

## UI Outcome Target

The operator experience after `C0.6.8` should read like this:

```text
Choose saved evidence
-> Generate proposal
-> Review candidate
-> Open exact supporting source if needed
-> Continue governed review
```

Not this:

```text
Find a script
-> seed a candidate
-> guess which route to call
-> inspect only technical IDs
```

## Dependencies

This phase depends on already-landed boundaries:

1. `C0.6.3` bounded synthesis proposal generation and grounding,
2. `C0.6.4-5` publication policy bootstrap and guided operator flow,
3. `C0.6.5` persisted evidence-finding contract,
4. `C0.6.6` operator flow and revision ergonomics,
5. `C0.6.7` replay/restart/upgrade hardening.

## Deferred Beyond C0.6.8

Unless implementation evidence forces escalation, keep these out of scope:

1. universal human-readable findings for every historical candidate,
2. broad admin replay tooling redesign,
3. publication-policy redesign,
4. generalized message/source viewer overhaul beyond the resolvers required for direct navigation,
5. unrelated review-history polish.

## Exit Condition

`C0.6.8` closes when the repo can truthfully claim:

```text
An operator can take saved evidence already present in the host,
generate a governed interpretive proposal without scripts,
open exact supporting sources directly from the review surface where resolvable,
and continue the normal review workflow with replay-safe state.
```
