# Proposed AGENTS.md Amendment: Split Terminal Gate (DRAFT, INACTIVE)

**Status:** Draft for review by Chris and Codex. **Not in force.** Nothing in `AGENTS.md` has changed, and agents must keep following the current Terminal Gate until this is activated (Section 12).
**Drafted:** 2026-09-21 by Claude, from the design discussion with Chris and Codex's independent review.
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

After implementation and proof, a reviewer **other than the implementer** (Codex reviews Claude's slices and the reverse), in a fresh context, checks the slice against its own declaration and records a verdict bound to the exact commit and tree hash reviewed.

The reviewer verifies:

- the exact required proof ran, with the command and result recorded, and it exercises the declared boundary;
- the diff stays inside the declared scope (in-scope and out-of-scope paths);
- governing and tracking documents were reconciled, each recorded as Updated, Already current, or Intentionally unchanged;
- the Register row and the slice record agree;
- claims in the report are no stronger than the recorded proof.

Verdicts:

- **PASS:** independent review completed. Permits the next slice **from the approved queue only** (Section 6).
- **FAIL:** a correctable defect. The slice returns to the implementer under the existing failed-proof rules. It does not go to Chris.
- **ESCALATE:** a decision is required, or review is impossible. The chain stops and a decision brief is filed for Chris.

**What PASS never authorizes:** creating or amending a contract, a migration, a destructive or overwriting action, a change to a keystone structure, or scope expansion. Only Chris can.

## 4. Classifying findings: FAIL versus ESCALATE

Most anomalies are defects, not decisions. Sending every anomaly to Chris would recreate the bottleneck.

**FAIL (correctable; back to the implementer):**

- proof cannot be reproduced, is flaky, incomplete, or does not exercise the declared boundary;
- tests are vacuous, mocked, or disconnected from production code;
- implementation and proof commit or tree hashes do not match;
- dirty or unrelated worktree changes are present;
- generated artifacts and canonical sources disagree;
- diff exceeds the declared scope but stays within the declared jurisdiction;
- a required reconciliation is missing, or a Register row overstates the recorded proof;
- the report claims more than the evidence shows.

**ESCALATE (decision or impossibility; to Chris):**

- the Authority Gate cannot be satisfied, or governing authority is unclear;
- the work needs a new or amended contract, or a contract conflicts with another or with observed behavior;
- the slice would widen scope beyond its declared jurisdiction;
- a keystone structure (schema, persistence, lifecycle, replay, identity) is touched with no governing contract;
- security, privacy, external-network, or user-data impact appears;
- migration, backfill, deletion, overwrite, or recovery behavior is involved;
- the same proof fails twice, or implementer and reviewer disagree;
- the reviewer believes the code is correct but cannot establish that it is contract-correct;
- the reviewer's independence or evidence custody cannot be established;
- the slice depends on an unrecorded assumption;
- **human action is needed:** a visual or UI check, a browser or tool permission, or approval only Chris can give. This is its own state (`NEEDS_HUMAN_ACTION`), shown on the Work Board with exactly what to look at.

## 5. Risk classes

| Class | Examples | Review path |
|---|---|---|
| **Ordinary** | Uses an existing contract; no authority, persistence, schema, or user data touched; exact automated proof | Verification gate |
| **Integration** | Crosses a runtime, host, or service boundary; browser or live proof required | Verification gate plus recorded live proof; may need `NEEDS_HUMAN_ACTION` |
| **Keystone** | Authority, ownership, persistence, lifecycle, replay, projection, schema, failure policy | Always a decision gate for the contract; verification gate for execution only |

The implementer proposes the class in the slice declaration. The reviewer may raise it, never lower it.

## 6. Approved queue and the Work Board

PASS permits the next slice only if Chris **already approved** it. A "candidate next slice" named in a report is advisory and authorizes nothing.

- The Delivery Register gains a **Work Board** at the top with: Needs you; Running or in review; Queued (approved, in order); On the table but not yet scoped; Recently done.
- Only Chris adds, approves, reorders, or removes queue entries. Agents may propose.
- Register rows stay the authority for workstream status and stay short. Each links to a per-slice **slice record** that holds the detail (Section 7).

## 7. Slice record

One file per slice, linked from its Register row and Work Board entry:

- slice ID, declaration location, risk class;
- exact commit and tree hash reviewed;
- in-scope and out-of-scope paths;
- exact proof command, result, timestamp, and environment;
- runtime or browser proof required versus done;
- governing documents checked and each reconciliation result;
- reviewer identity and model or session, verdict, timestamp;
- unresolved items and review debt.

The after-action report also carries:

- **Plain-language brief for Chris:** what was done, what it supports, the expected outcome, and what (if anything) is needed from Chris.
- **Recommended next slice:** and **Why:** advisory only.

## 8. Reviewer unavailable

A reviewer can be unavailable (usage limits, tool failure). Default: **halt.** Nothing advances unreviewed.

`SELF_REVIEW_DEFERRED` is allowed only for slices that are ordinary-risk, reversible, use an existing contract, touch none of authority, persistence, lifecycle, replay, schemas, migrations, security, or user data, and have exact automated proof. It goes on a **review-debt ledger**, is labeled in the Register, and cannot be release-closed until independently reviewed. Keystone or ambiguous work never uses it.

## 9. Design Review gate

A separate, periodic gate that asks "is the plan itself sound, and what have we missed?"

- **When:** before a workstream's implementation is queued, at phase boundaries, and before each new phase.
- **Output:** decision briefs on the Work Board, each with options, evidence, reversibility, cost of switching later, and a recommendation.
- **Rules:** live research with dated sources, not model memory; sort choices into reversible (projection-only) and one-way (schemas, ledger formats, identity); argue against the current plan first; label findings Verified, Reported, or Inferred; never change a contract, code, or the Register itself.
- **Guard against novelty bias:** every recommendation states the cost of being wrong and the cost of switching later.

## 10. Enforcement

`AGENTS.md` is a convention that agents follow. It does not stop anything. Enforcement needs an **orchestration layer** (a runner script) that:

1. starts an implementing agent on the next approved slice;
2. starts the other agent as reviewer when the slice finishes;
3. reads the verdict, bound to the tree hash;
4. starts the next slice only on a valid PASS, sends FAIL back, and stops on ESCALATE with a decision brief;
5. halts if the reviewer is unavailable (Section 8).

Hooks are advisory reminders, not authority. The layer is bypassable if someone launches an agent by hand. That limit is accepted and stated.

## 11. What stays unchanged

Slice Declaration; Authority Gate; Change Discipline; Proof Standard; Governing Document Reconciliation Gate; the Post-Change Report (extended by Section 7); and Chris's authority over policy, scope, authority, and contracts.

**Accepted residual risk:** a second agent may share the implementer's blind spots (both accept the same wrong contract reading, a passing test proves the wrong behavior, or the Register was edited to look complete). Cross-agent review reduces this and does not remove it. Mitigations: exact-proof requirements, adversarial reviewer prompts, commit-bound evidence, and a sampling audit by Chris or a third reviewer (rate to be set by Chris).

## 12. Activation prerequisites

Do **not** replace the Terminal Gate until all of these exist. Activating early would let agents read "PASS permits the next slice" with nothing enforcing the review.

1. Delivery Register restructured: Work Board, short rows, slice records, an approved queue seeded by Chris.
2. Verdict and slice-record file formats defined and tested.
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
> An independent reviewer must then issue `PASS`, `FAIL`, or `ESCALATE`, bound to the exact commit and tree reviewed. `PASS` permits the next slice only if it is already in the approved queue. `FAIL` returns the work under the failed-proof rules. `ESCALATE` stops for a human decision. A `PASS` never authorizes a new or amended contract, a migration, a destructive action, a keystone change, or scope expansion.
>
> Human authorization remains mandatory for authority uncertainty, contract creation or amendment, contract conflict, scope expansion, keystone structures, unresolved reviewer disagreement, and security, migration, destructive, or external-state effects.
>
> If no independent reviewer is available, stop. Do not self-approve, except as `SELF_REVIEW_DEFERRED` for the narrow class in Section 8 of the amendment proposal.

## 14. Open questions

1. Sampling audit rate, and who performs it.
2. Where the approved queue lives: Register Work Board, a separate file, or both.
3. Runner form and location (script in `tools/`, launched by Chris or scheduled).
4. Whether `NEEDS_HUMAN_ACTION` items may be pre-approved in bulk (for example the browser skill), so they do not interrupt every run.
5. Who owns the review-debt ledger.
6. Whether the Design Review gate has a fixed cadence or only the triggers in Section 9.
