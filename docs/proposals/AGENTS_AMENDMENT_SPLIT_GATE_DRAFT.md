# Proposed AGENTS.md Amendment: Split Terminal Gate (DRAFT, INACTIVE)

**Status:** Both Claude and Codex concur on this text (2026-09-25); no unresolved objections from either reviewer. **Still not in force.** Nothing in `AGENTS.md` has changed, and agents must keep following the current Terminal Gate until this is activated, which requires all of Section 12's prerequisites plus Chris's explicit approval.
**Drafted:** 2026-09-21 by Claude, from the design discussion with Chris and Codex's independent review.
**Amended:** 2026-09-25, folding in Codex's ten corrections (worktree-baseline review, evidence binding for uncommitted work, revalidation before dispatch, `NEEDS_HUMAN_ACTION` as an `ESCALATE` subtype, a narrowed external-impact trigger, a stricter repeated-failure rule, an explicit reviewer evidence burden, protected verdict records, queue invalidation on contract change, and a Work Board separated from the Register) plus four tightenings from Claude (runner-captured proof output, hash-bound uncommitted verdicts, cited authorization clauses, and contract-version binding for queue invalidation). Both agents' full reviews are in the session record; this file states only the resulting text.
**Effect if adopted:** replaces human approval after every proven slice with independent verification, and reserves human authority for decisions.

## 1. Problem

The Terminal Gate stops every slice for human authorization. Chris cannot verify code, so the approval carries no assurance and slows the work. Chris's real authority is over authority, policy, scope, contract conflicts, and risk. Those must stay human. Verifying that a slice was built as declared and proven as claimed does not need to.

## 2. Two gates instead of one

| Gate | Question | Decided by |
|---|---|---|
| **Verification gate** | Was this slice built as declared, proven as claimed, and documented truthfully? | An independent reviewer agent (automated) |
| **Decision gate** | Should the project take this direction, accept this risk, or change this rule? | Chris |

The verification gate never decides direction. The decision gate is never skipped for the triggers in Section 4.

## 3. Verification gate

After implementation and proof, a reviewer **other than the implementer** (Codex reviews Claude's slices and the reverse), in a fresh context, checks the slice against its own declaration and records a verdict bound to the exact evidence reviewed (Section 3a).

The reviewer verifies:

- the exact required proof ran, with the command and result recorded, and it exercises the declared boundary. The reviewer inspects the **actual proof output or reproducible artifact** the runner captured (Section 3a), never the implementer's summary of it alone;
- the diff stays inside the declared scope (in-scope and out-of-scope paths), measured against the worktree manifest (Section 3a), not against "the tree is clean";
- governing and tracking documents were reconciled, each recorded as Updated, Already current, or Intentionally unchanged;
- the Register row and the slice record agree;
- claims in the report are no stronger than the recorded proof;
- where a finding is waived as "already authorized by an existing contract" (Section 4), the reviewer cites the specific clause, not just the contract's name.

Verdicts:

- **PASS:** independent review completed. Permits the next slice **from the approved queue only** (Section 6).
- **FAIL:** a correctable defect. The slice returns to the implementer under the existing failed-proof rules. It does not go to Chris.
- **ESCALATE:** a decision is required, or review is impossible. The chain stops and a decision brief is filed for Chris.

**What PASS never authorizes:** creating or amending a contract, a migration, a destructive or overwriting action, a change to a keystone structure, or scope expansion. Only Chris can.

## 3a. Evidence binding (worktree baseline, not a clean tree)

Both agents routinely have other unrelated work in progress in the same tree. Requiring a clean worktree would make the gate unworkable, and a dirty tree is not itself a defect (Codex's correction 1).

Instead, review binds to a **slice-bound change manifest**:

```text
baseline tree/worktree fingerprint
+ declared in-scope paths
+ declared out-of-scope paths
+ post-slice fingerprints
```

- Unrelated changes present at baseline or introduced by other work during the slice window may remain; the manifest proves they are unchanged relative to baseline, so they are not part of what is reviewed.
- Review binds to either: (a) a commit and tree hash, once work is committed, or (b) a baseline/post-slice worktree manifest with per-file hashes, for review that happens before a commit. The workflow is not forced to commit earlier than it is ready to (Codex's correction 2).
- **Proof capture is the runner's job, not the implementer's.** The runner executes the declared proof command directly and records its exit code and output (or a reproducible artifact location) at execution time, so the reviewer inspects what actually ran rather than a transcript the implementer typed up (closes the gap in the reviewer's evidence burden, Codex's correction 7, tightened by Claude).
- **Verdict records are hash-bound.** A verdict (and its slice record) is written once and referenced by a content hash. Any later edit is a different hash and is visibly not the reviewed version — including for uncommitted work, where the record itself is not yet protected by a commit (Codex's correction 8, tightened by Claude to also cover the pre-commit case).

## 3b. Revalidation before dispatch

A valid `PASS` can go stale if files change after review and before the next slice starts. Before the runner starts the next slice, it checks:

```text
reviewed worktree/tree fingerprint == fingerprint at dispatch time
```

If they differ, the verdict is invalid and the slice returns to review. This does not require a new full review cycle by default; it requires the runner to detect the mismatch and route back to the reviewer (Codex's correction 3).

## 4. Classifying findings: FAIL versus ESCALATE

Most anomalies are defects, not decisions. Sending every anomaly to Chris would recreate the bottleneck.

**FAIL (correctable; back to the implementer):**

- proof cannot be reproduced, is flaky, incomplete, or does not exercise the declared boundary;
- tests are vacuous, mocked, or disconnected from production code;
- the reviewed evidence (commit/tree hash, or worktree manifest per Section 3a) does not match what was declared;
- an in-scope path changed outside the declared change, per the worktree manifest — not merely "the tree is dirty" (correction 1: unrelated pre-existing or concurrent changes outside the declared paths are not a defect);
- generated artifacts and canonical sources disagree;
- diff exceeds the declared scope but stays within the declared jurisdiction;
- a required reconciliation is missing, or a Register row overstates the recorded proof;
- the report claims more than the evidence shows.

**Repeated-failure rule:** a proof failing does not by itself create a decision point. It counts toward the `ESCALATE` "fails twice" trigger below only when all of these match the prior failure: the same proof, the same declared slice, the same failure class, and no revised diagnosis has been accepted in between. Two unrelated or transient failures do not compound (Codex's correction 6).

**ESCALATE (decision or impossibility; to Chris):**

- the Authority Gate cannot be satisfied, or governing authority is unclear;
- the work needs a new or amended contract, or a contract conflicts with another or with observed behavior;
- the slice would widen scope beyond its declared jurisdiction;
- a keystone structure (schema, persistence, lifecycle, replay, identity) is touched with no governing contract;
- the external effect (network call, data leaving the system, a new integration) is **not already authorized by an existing contract** (cited by clause, not just by name — see Section 3) **or** materially changes data, privacy, security, or custody boundaries. Routine calls an existing contract already authorizes do not escalate on their own (narrowed per Codex's correction 5 from the original blanket "external-network or user-data impact");
- migration, backfill, deletion, overwrite, or recovery behavior is involved;
- the same proof fails twice under the Repeated-failure rule above, or implementer and reviewer disagree;
- the reviewer believes the code is correct but cannot establish that it is contract-correct;
- the reviewer's independence or evidence custody cannot be established;
- the slice depends on an unrecorded assumption;
- reviewed evidence went stale before dispatch and revalidation (Section 3b) found a mismatch;
- the source or execution environment's identity is ambiguous (which install, which chat corpus, which runtime);
- a dependency version changed during the slice (the concrete case found in practice: a Similharity fork silently missing a route the client calls);
- a required external artifact (a repository, a plugin, a service) has disappeared;
- a queued slice depends on a contract that was superseded or changed since queue approval (see Section 6a, `STALE_REVIEW`);
- the implementation is within its declared scope, but the reviewer finds that scope itself unsafe;
- the slice relies on a rollback or recovery path that has not itself been proven (for example, a contract whose own exit condition requires a bootstrap/recovery proof that has not yet run);
- the change would alter default behavior for existing users/data, not only for new instances;
- **human action is needed:** a visual or UI check, a browser or tool permission, or approval only Chris can give. This is `ESCALATE / NEEDS_HUMAN_ACTION`, a subtype of `ESCALATE`, not a parallel verdict (Codex's correction 4). It must state: the exact action Chris must take, the expected observation, and what result permits continuation. It is shown on the Work Board with exactly what to look at.

## 5. Risk classes

| Class | Examples | Review path |
|---|---|---|
| **Ordinary** | Uses an existing contract; no authority, persistence, schema, or user data touched; exact automated proof | Verification gate |
| **Integration** | Crosses a runtime, host, or service boundary; browser or live proof required | Verification gate plus recorded live proof; may need `NEEDS_HUMAN_ACTION` |
| **Keystone** | Authority, ownership, persistence, lifecycle, replay, projection, schema, failure policy | Always a decision gate for the contract; verification gate for execution only |

The implementer proposes the class in the slice declaration. The reviewer may raise it, never lower it.

## 6. Approved queue and the Work Board

PASS permits the next slice only if Chris **already approved** it. A "candidate next slice" named in a report is advisory and authorizes nothing.

- The **Work Board** is a **separate file**, linked from the Delivery Register, not a section inside it (Codex's correction 10: the Register is already large and status-oriented; mixing in live operational queue state risks the queue being mistaken for governing authority). It carries: Needs you; Running or in review; Queued (approved, in order, each with the contract version/hash it depends on — see Section 6a); On the table but not yet scoped; Recently done.
- Only Chris adds, approves, reorders, or removes queue entries. Agents may propose.
- Register rows stay the authority for workstream status and stay short. Each links to a per-slice **slice record** that holds the detail (Section 7).

## 6a. Queue invalidation on contract change

A queued, approved slice depends on the governing contract(s) named in its declaration. If a depended-on contract changes (version or content) after the slice was queued, the queue entry does not survive automatically.

- At approval time, the Work Board entry records the version or hash of every contract the slice declares as governing.
- If any of those changes before the slice is dispatched, the entry's state becomes `STALE_REVIEW` and it is pulled from the runnable queue until re-reviewed against the current contract text.
- This applies even to a slice that already has a `PASS`: a changed authority boundary invalidates a prior approval (Codex's correction 9).

## 7. Slice record

One file per slice, linked from its Register row and Work Board entry. Once written, a slice record is **append-only or hash-bound**: it is not edited in place after its verdict is recorded, so an implementer cannot alter a recorded proof or a failed verdict after the fact (Codex's correction 8). For work reviewed before a commit exists, the record's own content hash is what later gets referenced from the eventual commit, so a pre-commit edit is still detectable (Claude's tightening).

- slice ID, declaration location, risk class;
- exact evidence reviewed: commit and tree hash, or worktree baseline/post-slice manifest with per-file hashes (Section 3a);
- the governing contract(s) this slice depends on, with the version or hash recorded at approval time (Section 6a);
- in-scope and out-of-scope paths;
- exact proof: command, **exit code**, **captured output or artifact location**, environment/runtime version, and relevant input fixture or hash — not only a result summary (Codex's correction 7);
- runtime or browser proof required versus done;
- governing documents checked and each reconciliation result;
- reviewer identity and model or session, verdict, timestamp;
- unresolved items and review debt.

The after-action report also carries:

- **Plain-language brief for Chris:** what was done, what it supports, the expected outcome, and what (if anything) is needed from Chris.
- **Recommended next slice:** and **Why:** advisory only.

## 8. Reviewer unavailable

A reviewer can be unavailable (usage limits, tool failure). Default: **halt.** Nothing advances unreviewed.

`SELF_REVIEW_DEFERRED` is allowed only for slices that are ordinary-risk, reversible, use an existing contract, touch none of authority, persistence, lifecycle, replay, schemas, migrations, security, sync, external files, identity, UI state, or user data, and have exact automated proof. Keystone or ambiguous work never uses it. In addition (Codex's additions to reviewer-availability rules):

- it requires the explicit policy authorization already recorded in this contract (this section) — it is never invoked ad hoc;
- it creates a visible review-debt item on the **review-debt ledger**, labeled in the Register;
- a release, or any keystone slice, cannot close while review debt remains;
- a self-review must never silently become an ordinary `PASS` — it is always labeled `SELF_REVIEW_DEFERRED` until an independent reviewer confirms it.

Concretely: because it touches persistence and sync by definition, no slice implementing the Sync Store and Multi-Instance contract could ever qualify for `SELF_REVIEW_DEFERRED`, regardless of how small the change looks.

## 9. Design Review gate

A separate, periodic gate that asks "is the plan itself sound, and what have we missed?"

- **When:** before a workstream's implementation is queued, at phase boundaries, and before each new phase.
- **Output:** decision briefs on the Work Board, each with options, evidence, reversibility, cost of switching later, and a recommendation.
- **Rules:** live research with dated sources, not model memory; sort choices into reversible (projection-only) and one-way (schemas, ledger formats, identity); argue against the current plan first; label findings Verified, Reported, or Inferred; never change a contract, code, or the Register itself.
- **Guard against novelty bias:** every recommendation states the cost of being wrong and the cost of switching later.

## 10. Enforcement

`AGENTS.md` is a convention that agents follow. It does not stop anything. Enforcement needs an **orchestration layer** (a runner script) that:

1. loads the approved queue and starts an implementing agent on the next approved, non-`STALE_REVIEW` slice;
2. executes the slice's declared proof command itself and captures its exit code and output (Section 3a), so the reviewer inspects the runner's capture, not the implementer's report;
3. starts the other agent as reviewer when the slice finishes;
4. reads the verdict, bound to the evidence in Section 3a;
5. **revalidates before dispatch** (Section 3b): re-fingerprints the tree and refuses to start the next slice if it no longer matches what was reviewed;
6. starts the next slice only on a valid, non-stale PASS, sends FAIL back, and stops on ESCALATE (including `NEEDS_HUMAN_ACTION`) with a decision brief;
7. halts if the reviewer is unavailable (Section 8).

Hooks are advisory reminders, not authority. The layer is bypassable if someone launches an agent by hand. That limit is accepted and stated.

## 11. What stays unchanged

Slice Declaration; Authority Gate; Change Discipline; Proof Standard; Governing Document Reconciliation Gate; the Post-Change Report (extended by Section 7); and Chris's authority over policy, scope, authority, and contracts.

**Accepted residual risk:** a second agent may share the implementer's blind spots (both accept the same wrong contract reading, a passing test proves the wrong behavior, or the Register was edited to look complete). Cross-agent review reduces this and does not remove it. Mitigations: exact-proof requirements, adversarial reviewer prompts, commit-bound evidence, and a sampling audit by Chris or a third reviewer (rate to be set by Chris).

## 12. Activation prerequisites

Do **not** replace the Terminal Gate until all of these exist. Activating early would let agents read "PASS permits the next slice" with nothing enforcing the review.

1. Delivery Register restructured to short status rows only; a separate **Work Board** file created and linked from it (Section 6); slice records; an approved queue seeded by Chris.
2. Verdict and slice-record file formats defined and tested, including the hash-bound/append-only property (Section 7) and the worktree-manifest evidence format (Section 3a).
3. The runner exists and has been tested, including halt-on-unavailable and refuse-without-PASS.
4. Both CLIs are installed, logged in, and callable headless. **Status 2026-09-21:** Claude Code is on PATH; Codex CLI is not on PATH (a copy is bundled inside the VS Code extension).
5. A pilot over a few real slices, reviewed by Chris, before the rule becomes permanent.
6. Chris explicitly approves activation.

## 13. Proposed replacement text for the Terminal Gate

> ## Terminal Gate
>
> > Naming a candidate next slice does not authorize it.
>
> Once the required proof succeeds, record the already-observed proof result, stop investigative and modification tools, do not inspect auxiliary material without cause, and do not pursue adjacent findings.
>
> An independent reviewer must then issue `PASS`, `FAIL`, or `ESCALATE` (including the `NEEDS_HUMAN_ACTION` subtype), bound to the exact evidence reviewed — a commit and tree hash, or a baseline/post-slice worktree manifest with per-file hashes when review happens before a commit. The reviewer inspects the runner-captured proof output directly, not a summary of it. `PASS` permits the next slice only if it is already in the approved queue and that queue entry is not `STALE_REVIEW`. The runner revalidates the reviewed evidence immediately before dispatch and refuses to proceed on a mismatch. `FAIL` returns the work under the failed-proof rules; a repeated failure only counts toward escalation when it is the same proof, the same slice, and the same failure class. `ESCALATE` stops for a human decision. A `PASS` never authorizes a new or amended contract, a migration, a destructive action, a keystone change, or scope expansion.
>
> Human authorization remains mandatory for authority uncertainty, contract creation or amendment, contract conflict, scope expansion, keystone structures, unresolved reviewer disagreement, a governing contract changing under an approved queue entry, and security, migration, destructive, or external-state effects not already authorized by clause in an existing contract.
>
> If no independent reviewer is available, stop. Do not self-approve, except as `SELF_REVIEW_DEFERRED` for the narrow class in Section 8 of the amendment proposal, which never applies to keystone or ambiguous work and never closes a release while it remains open.

## 14. Open questions

1. Sampling audit rate, and who performs it.
2. ~~Where the approved queue lives.~~ **Resolved:** a separate Work Board file, linked from the Register (Section 6, Codex's correction 10).
3. Runner form and location (script in `tools/`, launched by Chris or scheduled).
4. Whether `NEEDS_HUMAN_ACTION` items may be pre-approved in bulk (for example the browser skill), so they do not interrupt every run.
5. Who owns the review-debt ledger.
6. Whether the Design Review gate has a fixed cadence or only the triggers in Section 9.
7. Exact manifest/fingerprint mechanism for Section 3a (per-file hash list, `git diff` against a stashed baseline, or something else) — an implementation detail, not a design decision, but needs to be picked before the runner can be built.
8. Whether `STALE_REVIEW` (Section 6a) requires a full re-review or only a check that the change doesn't touch what the slice depends on.
