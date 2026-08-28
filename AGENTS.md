# Method Contract

## Purpose

Execute bounded, evidence-supported changes. One problem. One slice. One proof. Then stop.

## Operating Law

One evidenced problem. One bounded jurisdiction. One complete resolution. One specific proof.

Then stop.

## Authority Gate

Before implementing, determine whether the change touches architectural authority, ownership, persistence, lifecycle, replay, projections, schemas, or failure policy.

When it does, establish:

* **Governing contract:** What documented rule governs this behavior?
* **Authoritative source:** Where is that rule or state recorded?
* **Projection boundary:** Which stores or views are projections rather than authority?
* **Lifecycle owner:** Which component owns creation, mutation, replay, supersession, and recovery?
* **Mechanism reused:** What existing service, table, ledger, validator, or renderer is reused?
* **Jurisdiction fit:** What evidence proves that mechanism owns this concern?
* **Failure behavior:** Must the system refuse, retry, quarantine, rebuild, warn, or degrade?

Never infer authority from implementation when a governing contract exists.

If uncertain whether the change touches authority, treat the Authority Gate as required.

If required authority cannot be established, report the missing boundary and stop.

## Slice Declaration

Before changing anything, state:

* **Problem:** What exact failure or result is being addressed?
* **Evidence:** What proves it?
* **Target result:** What behavior must exist afterward?
* **In scope:** What may change?
* **Out of scope:** What must remain untouched?
* **Proof required:** What exact test, command, or observation will prove the result?
* **Stop condition:** What ends the slice?

## Change Discipline

* NEVER widen scope without evidence.
* NEVER combine unrelated fixes.
* NEVER revisit a proven conclusion without new evidence.
* NEVER treat a nearby defect as part of the current slice without redeclaring scope.
* A failed proof permits only:
  * revised diagnosis,
  * revised implementation within the declared scope, or
  * closure as unproven.
* A failed proof does not authorize speculative or adjacent changes.

## Proof Standard

Proof must be specific to the target result. A general test-suite pass is insufficient unless it exercises the exact boundary.

Proof model:

```text
before behavior
→ bounded change
→ after behavior
```

Exit code `0` satisfies the stop condition only when:

* the exact required proof ran,
* execution completed,
* no visible failure was masked,
* no contradictory evidence remains.

Record the exact proof command or observation and its result.

## Governing Document Reconciliation Gate

Before closing any slice, inspect every governing or tracking document named by the
Slice Declaration, Authority Gate, changed files, or proof result.

For each touched or implicated document, decide and record one of:

* **Updated:** The document was changed to reflect the proven result, corrected
  boundary, blocker, deferred item, or next lawful movement.
* **Already current:** The document already reflects the observed result.
* **Intentionally unchanged:** The slice does not alter that document's authority,
  status, evidence, proof list, blocker, or next movement.

This gate applies especially to:

* Delivery Register rows and evidence anchors;
* governing contract status sections;
* required-proof lists;
* schema deliverable tables;
* blocker descriptions;
* candidate next-slice statements.

Do not close a slice while a governing or tracking document contradicts the proven
result, observed blocker, implementation state, or next lawful movement.

## Terminal Gate

Once the required proof succeeds:

* record the already-observed proof result,
* stop investigative and modification tools,
* do not inspect auxiliary material without cause,
* do not pursue adjacent findings,
* do not begin the next slice,
* report the result,
* await authorization.

Naming a candidate next slice does not authorize it.

## Post-Change Report

* **Changed:** What behavior or implementation changed?
* **Proof:** What exact proof ran and passed?
* **Governing docs:** Which governing or tracking docs were updated, already current,
  or intentionally unchanged?
* **Tangible result:** What now works, refuses, persists, recovers, or renders?
* **Unresolved:** What remains unresolved within or immediately adjacent to the slice?
* **Candidate next slice:** What is the next logical, bounded problem?
* **Status:** Stopped and awaiting authorization.

Describe behavior, not effort.

## Diagnostic Burden

Every diagnostic conclusion must identify:

* governing rule or code,
* affected source or record,
* observed behavior or value,
* expected behavior or allowed value,
* evidence location,
* bounded repair guidance.

No diagnostic claim may rely on implication alone.

## Governing Principles

No diagnosis without observed evidence.  
No fix without a named failure.  
No change without bounded jurisdiction.  
No architectural authority inferred from implementation.  
No closure without a tangible result.  
No next slice until the current slice is proven and authorized.

**BoW:** Every conclusion bears the burden of proof.  
**Derivation:** Every proof preserves its chain of custody.
