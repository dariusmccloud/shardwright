# Slice Declaration: Runner FAIL Return (Work Board entry 19)

**Status:** Approved in principle by Chris, 2026-09-26 (pilot report decision: "Runner fix first"). This declaration needs Codex's review before implementation. Codex implements; Claude reviews.
**Origin:** [STEP4_PILOT_REPORT.md](STEP4_PILOT_REPORT.md), "Open gaps", items 1 to 3, plus the 100 ms test timeouts.

## Slice declaration

**Problem:**
- A FAIL verdict ends the run (`runner.js`: `state: 'FAIL', nextAction: 'IMPLEMENTER'`), so a person must relaunch the runner for every further round.
- A new round's implementer is not told what the reviewer found: `renderRolePrompt` gives it only the queue entry and the declaration.
- The runner discards the implementer's reply unless the agent was unavailable.
- Several runner tests allow proofs 100 ms, so they fail intermittently on a busy Windows machine.

**Evidence:**
- Pilot launches 2 to 4 each needed a relaunch by Chris after one FAIL or refusal.
- The launch-2 implementer reply was lost, so its cause was unknowable until the launcher captured replies.
- Intermittent `PROOF_TIMEOUT` failures moved between runner tests 22, 27, 28, 31, 32 and the approval-clock test across today's runs.

**Governing contract:** [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md):
- §10 item 6 ("sends FAIL back");
- §4, the Progress rule, Escalation standard and Checkpoint pause, all set by Chris on 2026-09-26.

**Target result:**
1. **FAIL goes back automatically.** Within one run, a recorded FAIL dispatches the next round's implementer for the same slice, then proof, then review, as rounds do today. The loop ends on PASS (move to the next slice), ESCALATE (existing decision flow), any existing halt condition, or the checkpoint.
2. **Findings travel with the round.** A round-N implementer prompt (N > 1) includes the previous round's verdict body verbatim, clearly labelled as the reviewer's findings to address. The findings are treated as task data under the same untrusted-data instruction the prompt already carries.
3. **Checkpoint pause.** After round 5 on one slice completes with FAIL, and before round 6 is dispatched, the runner stops with state `CHECKPOINT_PAUSED` and a mechanical brief. For each round, the brief gives the round number, verdict, and verdict body (the body states the proof evidence, as the reviewer prompt requires); it also gives the round count. If any round's verdict cannot be read or verified, the brief says so for that round rather than omitting rounds. *Corrected 2026-09-26 during Claude's round-1 review: the original text also listed each round's proof exit code, but ledger rows do not carry proof results, and adding them would change the ledger format, which is outside this slice.* The number 5 is a queue setting, `checkpointRounds`, defaulting to 5.
   - **Resuming** uses the existing re-approval pattern: an approval record dated after the pause allows another `checkpointRounds` rounds.
   - The agents' joint assessment and recommendation (§4) are added by the agents at a pause. This slice does not automate them.
4. **Implementer replies are kept.** Every implementer reply is archived under `docs/slices/<sliceId>/proof/implementer-r<round>-<sha256>.response.txt`, next to the existing prompt archive, whatever the outcome.
5. **Test timeouts.** Runner tests that give proofs or agents a 100 ms limit where timing is not what they test get a limit that tolerates a slow process start (at least 5 s). Tests that deliberately exercise timeouts keep short limits.

**In scope:** `tools/slice-runner/runner.js`, `tools/slice-runner/cli-adapter-common.js` (prompt), `tools/slice-runner/runner.test.mjs`, `tools/slice-runner/cli-adapters.test.mjs`. `tools/pilot/run-step4-pilot.mjs` only if a new runner state needs reporting.

**Out of scope:**
- the review backlog's behaviour;
- ESCALATE handling beyond the checkpoint's reuse of the re-approval pattern;
- automatic commits;
- the agents' checkpoint assessment;
- activating the split gate or editing `AGENTS.md`;
- the plugin; group C.

**Authority Gate (runner lifecycle and failure policy):**
- **Governing contract:** amendment §4 and §10 as above.
- **Authoritative source:** the verdict ledger (`ledger.js`), unchanged. Rounds are counted from ledger rows, not from memory.
- **Projection:** the checkpoint brief is derived from ledger rows and verdict files, never stored as authority.
- **Lifecycle owner:** `runQueue`.
- **Mechanism reused:** the existing round numbering (`latest.row.round + 1`), the existing re-approval check used for ESCALATE resume, the existing prompt archive.
- **Failure behaviour:** unchanged halts stay halts. The loop never retries a round whose verdict was refused (`VERDICT_INVALID`, `VERDICT_BINDING_MISMATCH`) or unrecorded.

**Proof required (tests, fake agents only; no live model calls):**
- a FAIL then a PASS completes in one run, and the round-2 implementer prompt contains round 1's verdict body;
- five FAILs pause with `CHECKPOINT_PAUSED` before round 6, and the brief lists all five rounds;
- a re-approval dated after the pause resumes at round 6, and one dated before it does not;
- an implementer reply is archived for every round, including a failed one;
- a refused verdict still halts, without retrying;
- `checkpointRounds` in the queue is honoured and validated as a positive integer;
- the full runner suite passes from the repository root and from `tools/slice-runner` in three consecutive runs.

**Stop condition:** proof passes, Claude's review is PASS, Codex commits, and the commit is revalidated. Activation remains a separate step: Chris's decision is already recorded, so it follows once this slice is done.
