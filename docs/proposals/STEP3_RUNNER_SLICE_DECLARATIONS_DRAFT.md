# Step 3 Runner: Draft Slice Declarations

**Status:** Draft. Not queued, not authorized, not started. Written 2026-09-25 by Claude for review by Chris and Codex.
**Parent:** Activation-prerequisites workstream, Step 3 ([AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §10, §12).
**Boundary:** building and testing activation machinery is not the same as activating the split gate. Nothing here changes `AGENTS.md`, and the current Terminal Gate governs all of these slices.

## Preconditions (before 3a starts)

1. Codex's in-progress work is committed or stashed, and the worktree is clean.
2. The working tree is LF-normalized so byte-exact hashing is stable. **Met 2026-09-25:** see [WORKTREE_MANIFEST_FORMAT.md](../templates/WORKTREE_MANIFEST_FORMAT.md), "Current line-ending state" and "History: line-ending policy" (commit `6f90622`; 863/863 tracked files byte-identical). Precondition 1 was also met the same day, when Codex committed all in-progress work.

## Why four slices, not one

The runner combines three independent mechanisms (fingerprinting, tamper detection, control flow) and one external boundary (real CLIs). Each needs its own proof. Combining them would break "one problem, one slice, one proof." Each slice below uses only what the slices before it have already proven.

| Slice | Delivers | Risk class | Depends on |
|---|---|---|---|
| 3a | Worktree manifest module | Ordinary | Preconditions |
| 3b | Verdict ledger module | Ordinary | 3a |
| 3c | Runner control loop, tested with fake agents | Ordinary | 3a, 3b |
| 3d | Real Claude and Codex CLI adapters | Integration | 3c (Codex CLI now on PATH) |

Location for all four: `tools/slice-runner/`, in Node (`v24.21.0` here), with `node --test` tests, matching the server plugin's convention. No new dependencies; `node:crypto`, `node:fs`, and `node:child_process` are enough.

---

## Slice 3a: Worktree manifest module

**Authorized 2026-09-25 by Chris** under the still-active Terminal Gate. Implementer: Codex. Reviewer: Claude, reviewing independently and recomputing the proof. 3b, 3c, and 3d remain unauthorized.

- **Problem:** the split gate binds verdicts to a fingerprint, but no code computes one. The spec exists only as a document.
- **Evidence:** [WORKTREE_MANIFEST_FORMAT.md](../templates/WORKTREE_MANIFEST_FORMAT.md) defines the algorithm; nothing implements it.
- **Target result:** `computeFingerprint(repoRoot, inScopePaths)` returns the per-entry list and the fingerprint pair `(policy hash, manifest hash)` exactly as the spec defines them, and `compareFingerprints(a, b)` returns `MATCH`, `CONTENT_CHANGED`, or `STALE_REVIEW`.
- **In scope:** `tools/slice-runner/manifest.js` and `manifest.test.mjs`.
- **Out of scope:** the ledger, the control loop, CLIs, and every existing project file.
- **Proof required** (`node --test manifest.test.mjs`), each as a named test:
  1. The same tree computed twice gives an identical hash.
  2. Input path order does not affect the hash (sorting is applied).
  3. Changing one byte in an in-scope file changes the hash.
  4. Changing a file outside the declared scope does **not** change the hash.
  5. A declared path that does not exist appears as `MISSING`, and its presence or absence changes the hash.
  6. **Exact serialization (golden test):** a fixture with one `PRESENT`, one `MISSING`, and one empty file produces a byte-for-byte expected serialized string and a known manifest hash written into the test. `MISSING` serializes as `path\t-\tMISSING\t` and an empty file's size as `0`.
  7. An in-scope directory expands recursively; `.git/` is always excluded.
  8. Windows paths are normalized to forward slashes.
  9. **Escaped paths are refused:** `..` escaping the root, an absolute path, a drive-letter path, and a UNC path each make the computation fail with an error; none is silently skipped.
  10. **Links are not followed:** a symlink or junction (inside the repository or pointing outside it) is recorded as a `LINK` entry hashed from its target string, and a linked directory's contents are not walked. If the test environment cannot create links (Windows without the needed permission), the test is reported as skipped with the reason, not passed.
  11. **Policy hash participates in comparison:** same policy and same manifest gives `MATCH`; same policy with changed content gives `CONTENT_CHANGED`; a changed `.gitattributes` gives `STALE_REVIEW` even when the manifest hash is unchanged; a missing `.gitattributes` hashes as `NONE`.
- **Stop condition:** tests 1–9 and 11 pass. Test 10 either passes or is skipped with its reason recorded in the result, and the report states which: "11 of 11 passed" or "10 passed, 1 skipped (reason)", never "11 passed" when one was skipped. A skipped link test leaves link handling unproven on this machine, and that is listed as unresolved. The result is recorded and the slice stops.

## Slice 3b: Verdict ledger module

- **Problem:** the ledger at `docs/verdicts/LEDGER.md` is a format with no code, so tamper detection is still only a convention.
- **Evidence:** Codex's review, correction 1. `LEDGER.md` says "inactive."
- **Target result:** functions to append a ledger row (hashing the verdict file at write time) and to verify a verdict (current file hash compared with the ledger row).
- **In scope:** `tools/slice-runner/ledger.js` and `ledger.test.mjs`. Tests use a temporary directory and never touch the real `docs/verdicts/`.
- **Out of scope:** the real ledger file's content, the control loop, CLIs.
- **Proof required** (named tests):
  1. Append, then verify: `VALID`.
  2. Edit the verdict file after appending: `TAMPERED`, never a new valid verdict.
  3. A verdict with no ledger row: `UNRECORDED`.
  4. A second append for the same slice is refused. Corrections go through addenda.
  5. Existing ledger rows are never rewritten (compare the file's prefix before and after).
  6. `verdict` and `subtype` are separate fields; `NEEDS_HUMAN_ACTION` is accepted only with `verdict: ESCALATE`.
- **Stop condition:** all six pass, the result is recorded, and the slice stops.

## Slice 3c: Runner control loop, with fake agents

- **Problem:** nothing enforces the split gate's dispatch rules.
- **Evidence:** amendment §10 lists seven runner duties; none are implemented.
- **Target result:** a runner that reads a queue, runs an implementer, captures proof itself, runs a reviewer, verifies the verdict against the ledger, revalidates the fingerprint, and dispatches the next slice only on a valid PASS. All agents are **fake scripts** that return scripted results.
- **In scope:** `tools/slice-runner/runner.js`, an agent-adapter interface, the fake adapters, fixture queues, and `runner.test.mjs`.
- **Out of scope:** real CLIs, the real Work Board, and anything that reads or writes project files outside a temporary fixture directory. The runner is never pointed at this repository in this slice.
- **Proof required** (named tests):
  1. **Refuses without PASS:** FAIL returns the slice to the implementer; ESCALATE stops the run with a brief; neither starts the next slice.
  2. **Halts on reviewer unavailable:** the fake reviewer errors or times out, and the run halts with nothing advanced.
  3. **Fingerprint revalidation:** a file changes between PASS and dispatch, and the runner refuses to dispatch and routes back to review.
  4. **STALE_REVIEW:** a governing-contract hash changes after queueing, and the entry is pulled from the queue even if it already has a PASS.
  5. **Tampered verdict:** a verdict edited after its ledger entry is rejected.
  6. **Runner-captured proof:** the recorded exit code and output hash come from the runner's own execution, not from the implementer's report. A fake implementer that claims success while the proof command fails results in FAIL.
  7. **No self-review:** the same adapter cannot be both implementer and reviewer; the runner refuses.
  8. **SELF_REVIEW_DEFERRED** is accepted only for an entry marked ordinary-risk and outside the excluded categories, and it creates a review-debt record.
  9. **Unapproved queue entry:** an entry without an approval record is not dispatched.
- **Stop condition:** all nine pass, the result is recorded, and the slice stops.

## Slice 3d: Real CLI adapters (later, separate authorization)

- **Problem:** the fake adapters prove control flow, not the real agents.
- **CLI prerequisite: met 2026-09-25.** Chris installed the standalone Codex CLI (`codex-cli 0.157.0`) at `C:\Users\chris\AppData\Local\Programs\OpenAI\Codex\bin\codex`, and it is on PATH. The earlier extension-bundled binary was unusable because its path changed with each extension update (`26.908` to `26.917`). Headless sign-in with the ChatGPT plan has not been tested yet; 3d must prove it.
- **Risk class:** Integration. It launches external processes with repository access.
- **Not drafted further** until 3a through 3c are proven.

---

## Open decisions (needed before 3c)

1. **Machine-readable queue.** The runner cannot reliably parse the Markdown Work Board. Recommendation: a JSON queue file (for example `docs/work-queue.json`) that is the runner's source, with the Work Board's Queued table generated from it or checked against it. Only Chris approves entries in either form. 3c uses fixture JSON either way.
2. **Machine-readable verdict fields.** The verdict template is Markdown. Recommendation: a small fenced front-matter block at the top of each verdict file (`slice_id`, `verdict`, `subtype`, `reviewer`, `reviewed_fingerprint`, `policy_hash`), parsed by 3b and 3c. The Markdown body stays for humans.
3. **Proof-output archive location.** Recommendation: `docs/slices/<slice-id>/proof/`, with each captured output stored by hash.
4. **Timeouts.** How long a fake or real reviewer may run before counting as "unavailable." A default is needed for test 3c-2. Recommendation: configurable, 30 minutes default for real agents, seconds for fakes.

## What this does not do

It does not activate anything, edit `AGENTS.md`, touch the real Work Board or ledger, or call a real agent. After 3c, the runner has proven its control flow on fake inputs only. The pilot on real slices is Step 4, and activation still requires Chris's explicit approval.
