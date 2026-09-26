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
  12. **Delimiter paths refused (collision golden test):** declared paths containing a tab, a line feed, a carriage return, U+001F, or U+007F each make the computation fail with an error. Include the crafted collision case: a single path such as `a<TAB>1<TAB>PRESENT<TAB><64 hex><LF>b`, which would otherwise serialize to the same bytes as two ordinary entries. It must be refused, so no `MATCH` can arise from it. The same validator must run on every filename found while expanding a directory. Windows cannot create such files, so on Windows the expansion case is tested by calling the validator directly, and the report says so; it is not claimed as tested against a real file.
- **Stop condition:** tests 1–9, 11, and 12 pass. Test 10 either passes or is skipped with its reason recorded in the result, and the report states which: "12 of 12 passed" or "11 passed, 1 skipped (reason)", never "12 passed" when one was skipped. A skipped link test leaves link handling unproven on this machine, and that is listed as unresolved. The result is recorded and the slice stops.

**Change after authorization (2026-09-25):** test 12 and the delimiter rule in the spec were added after Chris authorized 3a, at Chris's request, following a CodeRabbit finding that tab or line feed characters in a path could make two different trees serialize identically. Implementation had not started when the change was made.

**Review (2026-09-25): PASS.** Reviewer: Claude. Proof rerun independently: 12 of 12, link test executed (Windows junctions). Golden manifest hash `6fb193f6…8692` reproduced by an independent implementation written from the spec alone. Reviewed fingerprint of the two slice files: policy `e480bb45…f220`, manifest `9513a540…7be0`, identical from both implementations. Findings: one spec-level defect (backslash handling for discovered names), five unstated spec choices, and one missing report disclosure (test 12's Windows expansion case runs through the validator). The first two carry into 3a.1.

## Slice 3a.1: Declared-versus-discovered paths and spec gaps

**Authorized 2026-09-25:** Chris deferred the decision to the reviewer's recommendation, which was to do it. Implementer: Codex (code and tests). Claude amends the spec and reviews. 3b remains unauthorized.

- **Problem:** the spec converted backslashes to `/` for every path, including names found while expanding a directory. On Linux and macOS, a file literally named `a\b` would then serialize the same as `b` inside a directory `a`, so two different trees could compare as `MATCH`. The 3a review also found five behaviors the code chose but the spec did not state, where a second implementation could reasonably differ.
- **Evidence:** 3a review above; `manifest.js:144` passes discovered names through the same backslash conversion as declared paths.
- **Target result:** code matches the amended spec (Path rules, [WORKTREE_MANIFEST_FORMAT.md](../templates/WORKTREE_MANIFEST_FORMAT.md)): backslashes converted only in declared paths; a discovered name containing a backslash refused; a declared path containing a `.git` segment refused (it was silently skipped). The other four behaviors are already implemented and are now stated and tested.
- **In scope:** `tools/slice-runner/manifest.js` and `manifest.test.mjs` (Codex); `docs/templates/WORKTREE_MANIFEST_FORMAT.md` (Claude, done with this declaration).
- **Out of scope:** 3b and later; any other file.
- **Proof required** (`node --test tools/slice-runner/manifest.test.mjs`): all 12 existing tests still pass, plus these named tests:
  13. **Discovered backslash refused:** the path validator, in discovered mode, refuses `a\b`; in declared mode it still converts `a\b` to `a/b`. On Linux or macOS the test also creates a real file named `a\b` and confirms expansion fails. On Windows that real-file step is skipped, with the reason stated in the report, because Windows cannot create such a name.
  14. **`.git` handling:** a *file* named `.git` inside an in-scope directory is excluded; a declared path containing a `.git` segment (for example `tree/.git/config`) fails with an error.
  15. **Overlap:** declaring both `docs` and `docs/a.md` yields exactly one entry for `docs/a.md`, and the same fingerprint as declaring `docs` alone.
  16. **Link prefix:** declaring `link/x.txt`, where `link` is a directory link, yields exactly one `LINK` entry for `link` and reads nothing beyond it. Skipped with a reason if links cannot be created.
  17. **File prefix:** declaring `a.txt/b`, where `a.txt` is a regular file, yields `MISSING` for `a.txt/b`.
- **Stop condition:** tests 1–17 pass, except that tests 10 and 16 may be skipped only with a recorded reason, and test 13's real-file step may be skipped on Windows only with a recorded reason. The report states exact counts (for example "17 of 17 passed" or "16 passed, 1 skipped (reason)") and names every step that ran against the validator rather than a real file. Result recorded; the slice stops.

**Review (2026-09-25): PASS.** Reviewer: Claude. 3a's committed content (`2ab0877`) was first revalidated against the 3a reviewed fingerprint: `MATCH`, byte-identical. 3a.1 proof rerun independently: 17 of 17. Scope limited to the two authorized files. Reviewed fingerprint: policy `e480bb45…f220`, manifest `27d00253…08b1`, identical from the reviewer's separate implementation. Validator-only steps disclosed (test 12's expansion case and test 13's real-file step, both on Windows). Finding: the `.git` match is case-sensitive, so a declared `.GIT/HEAD` is not refused on Windows. The code follows the spec as written; recorded in the spec as a known gap, with a proposed 3a.2 (unauthorized).

**3a.1 committed** as `ba4f0ec` by Codex; revalidated against the reviewed fingerprint (manifest `27d00253…08b1`): `MATCH`.

## Slice 3a.2: Case-insensitive `.git` match

**Authorized 2026-09-25 by Chris.** Implementer: Codex. Reviewer: Claude. Spec amended with this declaration.

- **Problem:** the `.git` match is case-sensitive, so on Windows a declared `.GIT/HEAD` is not refused and reads the real git metadata file.
- **Evidence:** 3a.1 review probe: `computeFingerprint('.', ['.GIT/HEAD'])` returned a `PRESENT` entry instead of an error.
- **Target result:** any segment equal to `.git` regardless of letter case is refused in declared paths and excluded during expansion ([WORKTREE_MANIFEST_FORMAT.md](../templates/WORKTREE_MANIFEST_FORMAT.md), Path rules).
- **In scope:** `tools/slice-runner/manifest.js` and `manifest.test.mjs`.
- **Out of scope:** everything else.
- **Proof required:** tests 1–17 still pass, plus:
  18. **Case variants:** declared `.GIT/HEAD`, `.Git/config`, and `tree/.gIt/x` each fail with `MANIFEST_PATH_GIT_METADATA_DECLARED`. During expansion, an entry named `.GIT` is excluded. On Windows the filesystem stores it as a case-variant name, so create it under that exact name; if the environment cannot, say so in the report. A name that merely contains `.git` (for example `.gitignore`, `x.git`) is **not** affected.
- **Stop condition:** 18 tests pass (tests 10 and 16 may be skipped only with a recorded reason, as before); exact counts and validator-only steps reported; the slice stops.

**Review (2026-09-25): PASS, no findings.** Reviewer: Claude. Proof rerun independently: 18 of 18, 0 skipped; test 18's expansion step used a real `.GIT` directory. The original probe (declared `.GIT/HEAD`) is now refused. An extra probe checked whether the lowercase comparison misses Unicode case variants that Windows might treat as `.git` (the dotless `ı` in `.gıt`, the dotted `İ` in `.GİT`). Windows does not resolve either one to the real `.git` folder, so they are not a bypass here. Scope: the two authorized files only. Reviewed fingerprint: policy `e480bb45…f220`, manifest `75077063…7f27`, identical from the reviewer's separate implementation.

## Slice 3b: Verdict ledger module

**Authorized 2026-09-25 by Chris.** Implementer: Codex. Reviewer: Claude. Starts after 3a.2 is committed. **Amended with the authorization** (reviewer's design decisions, which Chris may overrule): the ledger format, review rounds, and ledger-computed hashes below. The original test 4 ("a second append for the same slice is refused") conflicted with the split gate's own FAIL-then-fix-then-review-again cycle, and is replaced.

- **Problem:** the ledger at `docs/verdicts/LEDGER.md` is a format with no code, so tamper detection is still only a convention.
- **Evidence:** Codex's review, correction 1. `LEDGER.md` says "inactive."
- **Ledger format:** JSON Lines. One JSON object per line, UTF-8, LF line endings, each line terminated by `\n`. Future real location: `docs/verdicts/ledger.jsonl`, which 3b does not create. Row fields: `sliceId` (string), `round` (integer ≥ 1), `verdictPath` (repository-relative, forward slashes), `verdictSha256` (lowercase hex), `verdict` (`PASS` | `FAIL` | `ESCALATE` | `SELF_REVIEW_DEFERRED`), `subtype` (`NEEDS_HUMAN_ACTION` or `null`), `reviewer` (string), `recordedAt` (ISO 8601 UTC).
- **Review rounds:** a slice may be reviewed more than once (FAIL, fix, review again). Each review is its own round and its own verdict file. A slice's current verdict is its highest round.
- **Target result:** `appendVerdict(ledgerPath, repoRoot, row)` reads the verdict file, **computes its SHA-256 itself** (a caller-supplied hash is rejected), validates the row, and appends one line without rewriting anything. `verifyVerdict(ledgerPath, repoRoot, sliceId, round?)` returns `VALID`, `TAMPERED`, `UNRECORDED`, or `LEDGER_CORRUPT`.
- **In scope:** `tools/slice-runner/ledger.js` and `ledger.test.mjs`. Tests use a temporary directory and never touch the real `docs/verdicts/`.
- **Out of scope:** creating the real ledger file, the control loop, CLIs, and the verdict file's own internal format (an open decision for 3c).
- **Proof required** (named tests):
  1. Append, then verify: `VALID`.
  2. Edit the verdict file after appending: `TAMPERED`, never a new valid verdict.
  3. A slice or round with no ledger row: `UNRECORDED`.
  4. **Rounds:** round 1 `FAIL` then round 2 `PASS` both append, and the current verdict is round 2. A duplicate round, a skipped round (1 then 3), and a round 1 appended twice are each refused.
  5. Existing ledger lines are never rewritten: the file's bytes before an append are an exact prefix of its bytes after.
  6. `verdict` and `subtype` are separate fields. `NEEDS_HUMAN_ACTION` is accepted only with `verdict: ESCALATE`; any other `subtype` value, or a verdict outside the four allowed, is refused.
  7. **Hash computed, not trusted:** a row supplied with its own `verdictSha256` is refused. The stored hash equals the SHA-256 of the verdict file's exact bytes at append time.
  8. **Corrupt ledger:** a ledger line that is not valid JSON, or is missing a required field, makes verification return `LEDGER_CORRUPT` for the whole ledger, not a best guess.
- **Stop condition:** all eight pass, the result is recorded, and the slice stops.

**3a.2 committed** as `0e7ae9d` by Codex; revalidated against the reviewed fingerprint (manifest `75077063…7f27`): `MATCH`.

**3b review (2026-09-25): PASS for the slice as declared.** Reviewer: Claude. Proof rerun independently: 8 of 8. Reviewed fingerprint: policy `e480bb45…f220`, manifest `4eeadae0…45df`, identical from both implementations. Scope: `ledger.js` and `ledger.test.mjs` only; `docs/verdicts/ledger.jsonl` was not created. Code matches the declaration. Three reviewer probes, run in a scratch git repository with this project's `.gitattributes`, found gaps that the declaration did not specify:

- **A (high):** a verdict file written with CRLF records `VALID`, but after it is committed and freshly checked out (git normalizes it to LF), verification reports **`TAMPERED`**. Any CRLF-writing editor or agent would produce false tampering alarms.
- **B (medium):** round 2 can reuse round 1's verdict file. The probe edited that file to PASS and appended it as round 2: accepted; the current verdict reads `VALID` and round 1 silently becomes `TAMPERED`. This breaks the declared rule "each review is its own round and its own verdict file," which no test covered.
- **C (low):** if a verdict path later becomes a directory, verification throws `VERDICT_FILE_INVALID` instead of reporting `TAMPERED`.

Accepted limits, documented in [LEDGER.md](../verdicts/LEDGER.md): no write locking (a concurrent duplicate round is detected as `LEDGER_CORRUPT` on the next read, never silently accepted; the runner is single-process); a crash-truncated last line leaves the ledger `LEDGER_CORRUPT` until repaired by hand.

## Slice 3b.1: Ledger hardening

**Authorized 2026-09-25 by Chris** ("let's address the gaps and proceed"). Implementer: Codex. Reviewer: Claude. Builds on 3b (`b1ed2bd`).

- **Problem:** findings A, B, and C above.
- **Target result:**
  - `appendVerdict` refuses a verdict file containing a carriage return (CR) byte (`VERDICT_FILE_LINE_ENDINGS`). The repository policy is LF, so this refuses exactly the files a checkout would rewrite.
  - `appendVerdict` refuses a `verdictPath` already recorded for any slice or round (`VERDICT_PATH_REUSED`). The comparison ignores letter case, because Windows paths do.
  - `verifyVerdict` returns `TAMPERED`, not an exception, when the recorded path is no longer a regular file.
- **In scope:** `tools/slice-runner/ledger.js` and `ledger.test.mjs`.
- **Proof required:** tests 1–8 still pass, plus:
  9. **Line endings:** a verdict containing CRLF is refused at append; a verdict containing a lone CR is refused; an LF verdict is accepted, and after the file passes through a real git commit and checkout in a temporary repository using this project's `.gitattributes`, verification is still `VALID`.
  10. **No file reuse:** appending round 2 with round 1's `verdictPath` is refused; a different slice reusing it is refused; a case variant of it (for example `docs/verdicts/A-r1.md` after `docs/verdicts/a-r1.md`) is refused.
  11. **Non-file path:** after the recorded verdict path is replaced by a directory, verification returns `TAMPERED`.
- **Stop condition:** 11 of 11 pass, counts reported, the slice stops.

**Review (2026-09-25): PASS, no findings.** Reviewer: Claude. Proof rerun independently: 11 of 11. Scope: `ledger.js` and `ledger.test.mjs` only; no real ledger was created. The three original reviewer probes were rerun against the new code: (A) a CRLF verdict is now refused at append with `VERDICT_FILE_LINE_ENDINGS`; (B) reusing round 1's file for round 2 is refused with `VERDICT_PATH_REUSED`, and the edit to round 1 is still caught as `TAMPERED`; (C) a verdict path replaced by a directory now returns `TAMPERED`. Test 9 also acts as a guard on the line-ending policy: it would fail if the project's `.gitattributes` were removed, because checkout would then write CRLF. Reviewed fingerprint: policy `e480bb45…f220`, manifest `7cbc8ad5…97ec`, identical from both implementations.

## Slice 3c: Runner control loop, with fake agents

**Authorized 2026-09-25 by Chris** ("All authorized unless there's a reason I shouldn't"), with one condition: 3c starts only after 3b.1 has passed review and its commit has been revalidated, because the runner depends on the ledger. Implementer: Codex. Reviewer: Claude. **Not included in this authorization:** 3d (not yet declared; Integration risk), the Step 4 pilot, and activation of the split gate.

- **Problem:** nothing enforces the split gate's dispatch rules.
- **Evidence:** amendment §10 lists seven runner duties; none are implemented.
- **Target result:** a runner that reads a queue, runs an implementer, captures proof itself, runs a reviewer, verifies the verdict against the ledger, revalidates the fingerprint, and dispatches the next slice only on a valid PASS. All agents are **fake scripts** that return scripted results.
- **In scope:** `tools/slice-runner/runner.js`, an agent-adapter interface, the fake adapters, fixture queues, and `runner.test.mjs`.
- **Out of scope:** real CLIs, the real Work Board, and anything that reads or writes project files outside a temporary fixture directory. The runner is never pointed at this repository in this slice.
- **Proof required** (named tests):
  1. **Refuses without PASS:** FAIL returns the slice to the implementer; ESCALATE stops the run with a brief; neither starts the next slice.
  2. **Halts on agent unavailable:** a fake reviewer or a fake implementer that errors or exceeds its timeout halts the run with nothing advanced and the slice **not** marked FAIL. A per-slice timeout set in the declaration overrides the default. A run stopped on `ESCALATE` or `NEEDS_HUMAN_ACTION` stays stopped indefinitely: the test confirms no timeout ever advances or cancels a human wait.
  3. **Fingerprint revalidation:** a file changes between PASS and dispatch, and the runner refuses to dispatch and routes back to review.
  4. **STALE_REVIEW:** a governing-contract hash changes after queueing, and the entry is pulled from the queue even if it already has a PASS.
  5. **Tampered verdict:** a verdict edited after its ledger entry is rejected.
  6. **Runner-captured proof:** the recorded exit code and output hash come from the runner's own execution, not from the implementer's report. A fake implementer that claims success while the proof command fails results in FAIL.
  7. **No self-review:** the same adapter cannot be both implementer and reviewer; the runner refuses.
  8. **SELF_REVIEW_DEFERRED** is accepted only for an entry marked ordinary-risk and outside the excluded categories, and it creates a review-debt record.
  9. **Unapproved queue entry:** an entry without an approval record is not dispatched.
- **Stop condition:** all nine pass, the result is recorded, and the slice stops.

**3c review, round 1 (2026-09-25): FAIL.** Reviewer: Claude. Returned to the implementer under the failed-proof rules. Proof rerun independently: 9 of 9; the full slice-runner suite (manifest, ledger, runner) passes 38 of 38. Scope: the four declared files; no fixture leaked into the repository; no real CLI was called. What holds: the runner captures proof itself and the reviewer sees the real exit code; a verdict must match its slice, round, reviewer, fingerprint, and policy hash; timeouts halt without FAIL; human waits never time out; self-review with one adapter is refused; unapproved entries are never dispatched. Reviewer probes, run in temporary fixture repositories, found:

1. **Restart redoes approved work (confirmed).** Run 1 completes a slice with PASS. Run 2 on the same queue calls the implementer again and records round 2. The runner has no memory of approved slices, so revalidation before dispatch (amendment §3b) never applies across runs.
2. **Declared test 4 is partly vacuous.** Its name says "already-passed entry becomes STALE_REVIEW", but it sets a `priorVerdict` field the runner never reads, and no earlier PASS exists in its ledger. The declaration requires recognizing an earlier PASS, which depends on finding 1.
3. **An orphaned verdict file blocks retries (confirmed).** A reviewer document whose front matter parses but whose body contains CRLF is written to `docs/verdicts/<slice>-r1.md`; then the ledger refuses it (`VERDICT_FILE_LINE_ENDINGS`), leaving the file behind. Every retry halts with `EEXIST` until the file is deleted by hand.
4. **An empty `governingContracts` list dispatches (confirmed).** The templates require `AGENTS.md` to be listed as a governing contract, so an entry with none should be refused.
5. **The proof command has no timeout (code reading).** `execFile` runs without a time limit, so a hanging proof hangs the runner indefinitely.
6. **`SELF_REVIEW_DEFERRED` semantics (declaration error).** Test 8 has a *separate* reviewer issue `SELF_REVIEW_DEFERRED`, and the runner accepts it. That is not self-review, and it conflicts with amendment §8, where deferral applies only when the independent reviewer is unavailable. The contradiction originates in this declaration's tests 7 and 8, not in the implementation.

Also noted, not required for round 2: an `ESCALATE` holds the process open indefinitely, so before real use the runner must persist its state and exit rather than wait in memory (3d or pilot concern); `isApproved` checks only that an approval record is present and non-empty, not that Chris made it (known limit from Codex's correction 8; no trusted approval source exists yet).

### 3c round 2 requirements

Same four files. Tests 1–9 still pass, with test 4 rewritten to use a real earlier PASS in the ledger, plus:

10. **Restart awareness:** re-running a queue whose slice already has a VALID latest PASS does not dispatch the implementer. The runner reads that PASS's `reviewed_fingerprint` and `policy_hash` from the verdict file's front matter and compares them with the current tree: `MATCH` skips the slice; `CONTENT_CHANGED` returns `REVIEW_REQUIRED`; `STALE_REVIEW` returns `STALE_REVIEW`. A latest verdict of FAIL re-dispatches the implementer for the next round.
11. **No orphaned verdict files:** a reviewer document the ledger would refuse (for example CR anywhere in it) is rejected before any file is written; if a ledger append fails after the file was written, the file is removed. A clean retry then succeeds.
12. **Governing contracts required:** an entry with an empty or missing `governingContracts` list is refused as `QUEUE_ENTRY_INVALID`.
13. **Proof timeout:** a proof command that runs past its limit is stopped and the run halts with `PROOF_TIMEOUT` (neither PASS nor FAIL). The limit is `proof.timeoutMs` if the entry sets it, otherwise the entry's agent timeout.
14. **No self-review deferral (decided by Chris, 2026-09-25):** `SELF_REVIEW_DEFERRED` is withdrawn (amendment §8). A reviewer document carrying that verdict is refused, whoever authored it, and nothing is recorded. An unavailable reviewer halts the run. The runner writes no review-debt file. Test 8 is rewritten to assert all three. The planned review backlog (amendment §8) is a separate later slice, 3e, and is **not** part of this round.

**3c review, round 2 (2026-09-25): FAIL.** Reviewer: Claude. All round-1 findings are fixed: restart skips a PASS whose recorded fingerprint still matches, returning `REVIEW_REQUIRED` or `STALE_REVIEW` otherwise; bad verdicts are rejected before any file is written, and an orphan is removed if the ledger append fails; empty governing contracts are refused; proof commands time out with `PROOF_TIMEOUT`; `SELF_REVIEW_DEFERRED` is refused with nothing recorded. Test 4 now seeds a real prior PASS. Proof rerun: 14 of 14; full slice-runner suite 43 of 43. Scope: `runner.js` and `runner.test.mjs` changed; nothing leaked into the repository.

**Finding (confirmed by probe, severity high): a restart bypasses the human decision gate.** Run 1: the reviewer returns `ESCALATE / NEEDS_HUMAN_ACTION` and the run stops as `ESCALATED`. Run 2 on the same queue, with no human decision recorded anywhere, dispatched the implementer for round 2 and recorded a PASS; the ledger reads `ESCALATE -> PASS`. The cause: the human wait exists only in memory, and on restart a latest verdict of `ESCALATE` is treated like `FAIL` (next round, re-dispatch). This defeats the amendment's core rule that `ESCALATE` stops for Chris. The declaration's test 10 specified restart behavior after PASS and FAIL only, so the gap is partly in the declaration.

Reconciliation note: Codex reported that amendment §8 still allowed `SELF_REVIEW_DEFERRED`. Verified: the file on disk and at `e777235` says it is withdrawn; the report reflected a read made before that commit. No change needed.

Noted for 3d, not required here: a proof timeout kills only the direct child process. On Windows, a timed-out command that launched its own children (for example `node --test`, which runs test files in child processes) can leave them running.

### 3c round 3 requirement

Same two files (`runner.js`, `runner.test.mjs`). Tests 1–14 still pass, plus:

15. **Escalation survives restart:** if a slice's latest valid verdict is `ESCALATE` (any subtype), a restarted run does not dispatch the implementer or reviewer for it. It returns `AWAITING_DECISION`, naming the slice, the escalated round, and the recorded decision brief, and it dispatches no later queue entries. The slice resumes only when its queue entry's `approvalRecord.recordedAt` is later than the `ESCALATE` ledger row's `recordedAt`, meaning Chris re-approved it after the escalation. The test covers: a restart with no re-approval blocks; a re-approval dated *before* the escalation still blocks; a later re-approval resumes at the next round; and the later queue entry is not dispatched while the slice is blocked.

**3c review, round 3 (2026-09-25): FAIL.** Reviewer: Claude. Proof rerun: 15 of 15; full suite 44 of 44. The escalation gate works: rerunning the round-2 probe with an approval dated before the escalation stops at `AWAITING_DECISION`, with nothing dispatched and the ledger unchanged. Two findings:

1. **Future-dated approval bypasses the gate (confirmed by probe).** The round-2 probe's approval was dated `2026-09-25T18:00:00Z`; the escalation was recorded at the real time, about `17:02Z`. The approval, written before the escalation but dated after it, counted as a re-approval: the restart re-dispatched the implementer and recorded `ESCALATE -> PASS`. The runner trusts the self-declared approval date.
2. **Declared requirement unmet.** Test 15 requires `AWAITING_DECISION` to name the escalated round and include the recorded decision brief. The runner returns only `blockedSliceId`, and the test does not assert either field.

Known limit, unchanged and out of scope: the runner can check an approval's date but not that Chris made it; anything able to edit the queue can add an approval (Codex's correction 8; needs a trusted approval source such as a signature, for the pilot or activation stage).

### 3c round 4 requirement

Same two files. Tests 1–15 still pass, plus:

16. **No future-dated approvals:** an `approvalRecord.recordedAt` later than the runner's current time is invalid. The entry is not dispatched and the result is `UNAPPROVED`, including for an escalated slice, where a future-dated approval never counts as re-approval. The runner accepts an injectable clock (for example a `now` option) so the test is deterministic. Cover: an approval dated one second in the future is refused; an approval dated now or earlier is accepted where otherwise valid; the round-2 probe scenario (approval written before the escalation, dated after it but in the future) stays `AWAITING_DECISION` or `UNAPPROVED`, never dispatched.
17. **`AWAITING_DECISION` is informative:** the result includes the escalated round and the decision brief (the recorded verdict's subtype and body), and test 15 asserts both.

**3c review, round 4 (2026-09-25): PASS.** Reviewer: Claude. Proof rerun: 16 of 16. Requirement 17 is implemented as extra assertions in test 15, so 16 tests cover the 17 numbered requirements. Full suite: 45 of 45. Scope: the four 3c files. Probe results: the round-2 scenario (approval dated `18:00Z`, clock `17:15Z`) is now refused on the first run as `UNAPPROVED`, with nothing dispatched. With an approval honestly dated in the past, a restart after `ESCALATE / NEEDS_HUMAN_ACTION` returns `AWAITING_DECISION` with round 1 and the recorded brief, and dispatches nothing. Reasoning check: an approval that passed an earlier run is necessarily dated before that run started, and therefore before any escalation recorded during it, so a stale approval can never count as a re-approval. What remains is the known limit: a new approval written between runs by anything able to edit the queue. Reviewed fingerprint of the four files: policy `e480bb45…f220`, manifest `c7cd9449…2ab3`, identical from both implementations.

Carried forward to 3d: proof timeouts do not kill child processes; an `ESCALATE` holds the process open waiting in memory (resumption is now safe through the ledger, but a real deployment should exit instead of waiting indefinitely); approvals cannot be attributed to Chris.

**3c committed** as `1dca3af` by Codex; revalidated against the reviewed fingerprint (manifest `c7cd9449…2ab3`): `MATCH`. 3c is done.

---

## Authorization for 3b.2, 3e, and 3d (2026-09-25)

**Authorized by Chris** ("3d/e both approved + ledger cleanup"), **before their declarations were written**. The declarations below were drafted by Claude afterwards. Because Chris approved them unseen, **Codex reviews each declaration before implementing it**, and raises anything it would change. That gives the declarations the same independent check the code gets. Order: 3b.2, then 3e, then 3d. Each starts only after the previous one passes review and its commit is revalidated. Implementer: Codex. Reviewer: Claude. The Step 4 pilot and split-gate activation remain outside this authorization.

## Slice 3b.2: Remove the withdrawn verdict value from the ledger

- **Problem:** `ledger.js` still accepts `SELF_REVIEW_DEFERRED`, which was withdrawn on 2026-09-25 (amendment §8).
- **Target result:** the ledger accepts only `PASS`, `FAIL`, and `ESCALATE`. An append with `SELF_REVIEW_DEFERRED` is refused (`VERDICT_ROW_INVALID`), and an existing ledger line carrying it makes the ledger `LEDGER_CORRUPT`. No real ledger file exists yet, so nothing is lost.
- **In scope:** `tools/slice-runner/ledger.js`, `ledger.test.mjs`. The runner keeps its explicit `SELF_REVIEW_DEFERRED_WITHDRAWN` refusal; it is harmless and gives a clearer reason.
- **Proof:** ledger tests 1–11 still pass (test 6 updated to the three values), plus **12:** append refused and existing-line corruption, both for `SELF_REVIEW_DEFERRED`. The full suite still passes.
- **Risk class:** Ordinary.

**Declaration review (Codex, 2026-09-25):** no changes recommended for 3b.2. For 3e: define how pending entries reach a terminal state and how the active backlog is reconstructed (adopted below as "Resolution and replay"). For 3d: prove least privilege against the real CLIs, not only by the flags (adopted below as the live containment checks).

**3b.2 review (2026-09-25): PASS.** Reviewer: Claude. Proof rerun: 12 of 12; full suite 46 of 46. The diff is the one-line allowed-verdict change plus test 12. Probe: `SELF_REVIEW_DEFERRED`, a lowercase variant, and `"PASS "` with a trailing space are each refused with `VERDICT_ROW_INVALID`; `PASS`, `FAIL`, and `ESCALATE` are accepted. Reviewed fingerprint (`ledger.js`, `ledger.test.mjs`): policy `e480bb45…f220`, manifest `72801c96…76fe`, identical from both implementations.

## Slice 3e: Review backlog

- **Problem:** if the independent reviewer is out of usage, the runner halts, and all work waits, even though the other agent may have usage left (Chris's requirement; amendment §8).
- **Design (amendment §8), with the cap set to 5 by Chris (2026-09-25; raised from the proposed 3 because slices are very small, so 3 would stop early in a long outage; it is one number in the queue file and can be changed at any time):**
  - The backlog is **off unless the approved queue enables it**: a top-level `reviewBacklog: { maxPending: 5 }` in the queue file. Without it, an unavailable reviewer halts exactly as today.
  - **Entry to the backlog:** after implementation, when the proof ran and **exited 0**, the reviewer is unavailable (error, timeout, or `UNAVAILABLE`), and the entry is ordinary-risk and touches none of amendment §8's excluded categories. A failed proof, or an ineligible entry, halts as today.
  - **What the runner records:** it commits only the entry's in-scope paths in the (fixture) git repository, with a message beginning `REVIEW_PENDING <sliceId>`. It appends a line to a runner-owned, append-only `docs/review-pending.jsonl`: `sliceId`, `commit`, `manifestHash`, `policyHash`, `proofOutputHash`, `recordedAt`, and `dependsOn` (the slice IDs already pending before it). It then continues to the next approved entry. A pending slice has no verdict and never counts as PASS.
  - **Cap:** when the pending count reaches `maxPending`, the run halts with `BACKLOG_FULL`.
  - **Validation pass first:** when the reviewer is available and the backlog is not empty, no new slice is implemented. Pending slices are reviewed oldest first, each **at its own commit**: the runner checks it out in a temporary git worktree, recomputes the fingerprint there (it must equal the pending record, otherwise `HALTED` with `PENDING_RECORD_MISMATCH`), and gives the reviewer that commit and fingerprint. The verdict is recorded in the ledger as usual.
  - **Cascade:** if a pending slice gets `FAIL`, every later pending slice whose `dependsOn` includes it becomes `REVIEW_REQUIRED` (reason `ANCESTOR_FAILED`), and the run stops with `FAIL`. `ESCALATE` during validation stops with `AWAITING_DECISION`, as today.
  - **Restart:** a slice with a pending record is not re-implemented; it waits for validation.
  - **Resolution and replay (added after Codex's declaration review):** `docs/review-pending.jsonl` holds two event types, each appended once and never edited:
    - `PENDING`: the fields listed above, plus `event: "PENDING"`.
    - `RESOLVED`: `event: "RESOLVED"`, `sliceId`, `commit` (matching the `PENDING` event), `outcome` (`PASS`, `FAIL`, or `ANCESTOR_FAILED`), `ledgerRound` (the ledger round for `PASS` or `FAIL`; `null` for `ANCESTOR_FAILED`), and `recordedAt`.
    - **When each is written:** after validation records `PASS` or `FAIL` in the ledger, the runner appends `RESOLVED` with that outcome. On `FAIL`, it then appends `RESOLVED / ANCESTOR_FAILED` for every later pending slice that depends on it. `ESCALATE` during validation does **not** resolve anything: the slice and every later one stay pending until Chris's decision, under the existing `AWAITING_DECISION` gate.
    - **After resolution:** a `PASS`-resolved slice is done. It behaves like any recorded PASS, including restart fingerprint checks. A `FAIL`-resolved slice returns to its implementer for the next ledger round, as usual. An `ANCESTOR_FAILED` slice returns to the queue as not done, and is re-implemented and re-reviewed normally after its ancestor passes.
    - **Replay rule:** the active backlog is every `PENDING` event with no later `RESOLVED` for the same `sliceId` and `commit`, in file order. The runner rebuilds it from the file on every start, and keeps no other copy.
    - **Fails closed:** a malformed line, a `RESOLVED` with no matching `PENDING`, a second `RESOLVED` for the same entry, a `PASS`/`FAIL` resolution that disagrees with the ledger's verdict for that round, or a second `PENDING` for a slice that is still pending makes the runner halt with `BACKLOG_CORRUPT`, without guessing.
- **In scope:** `tools/slice-runner/runner.js`, `runner.test.mjs`, and a new `tools/slice-runner/review-backlog.js` if Codex prefers to separate it. Fake agents only; fixture repositories under the OS temp directory, each initialized with `git init`.
- **Proof** (runner tests 1–16 still pass, plus):
  18. Backlog disabled: an unavailable reviewer halts, with no commit and no pending record.
  19. Enabled: an unavailable reviewer on an eligible slice with a passing proof creates one commit containing only in-scope paths and one pending record, and the run continues to the next entry.
  20. Not eligible (keystone, an excluded category, or a failed proof): halts, no pending record.
  21. Cap: the sixth eligible slice with `maxPending: 5` halts `BACKLOG_FULL`, and a queue with a different `maxPending` (for example 2) is honored.
  22. Validation first: with a pending backlog and the reviewer back, the implementer is not called until every pending slice is reviewed, oldest first, each at its own commit (asserted by the commit the reviewer receives).
  23. Pending record mismatch: a pending record whose fingerprint does not match its commit halts `PENDING_RECORD_MISMATCH`.
  24. Cascade: pending A then B (B depends on A); A fails validation, so B becomes `REVIEW_REQUIRED` with `ANCESTOR_FAILED`, and nothing new is implemented.
  25. Restart: a pending slice is not re-implemented on restart.
  26. A pending slice never appears as PASS in the ledger or the run result.
  27. **Resolution and replay:** after validation records PASS for pending A and FAIL for pending B (with C depending on B), the file holds `RESOLVED / PASS` for A, `RESOLVED / FAIL` for B, and `RESOLVED / ANCESTOR_FAILED` for C. A fresh restart replays an empty active backlog. B returns to its implementer at the next round. C is re-implemented only after B passes.
  28. **Escalation keeps the backlog:** `ESCALATE` on pending A leaves A and every later pending slice unresolved, and the restart reports `AWAITING_DECISION`.
  29. **Corrupt backlog file:** each fail-closed case listed under "Resolution and replay" halts with `BACKLOG_CORRUPT`.

**3e review, round 1 (2026-09-25): FAIL.** Reviewer: Claude. Proof rerun: 28 of 28; full suite 58 of 58. Scope: `runner.js`, `runner.test.mjs`, and new `review-backlog.js`. Git ran only in fixture repositories: this repository's `HEAD` (`7c78d5a`) and worktree list are unchanged. Well built: pending commits include only the in-scope paths (`git commit --only`), so other staged changes are not swept in; every git call refuses to run outside the OS temp directory; replay checks dependencies, resolution matching, and ledger agreement. Two findings, both confirmed by probes in fixture git repositories:

1. **The backlog stops working after a restart.** Run 1, during an outage, correctly parked slices `a` and `b` as pending. Run 2 (a restart with the reviewer still unavailable) returned `REVIEW_PENDING / AGENT_UNAVAILABLE` and implemented **nothing**. The runner always attempts validation first and halts when the reviewer is unavailable, so a restart during an outage stops all work. Agent sessions restart frequently, so in practice this defeats the purpose of the backlog (Chris's requirement: the other agent keeps working).
2. **Crash between commit and `PENDING` record (Codex's flagged gap), confirmed.** With the `PENDING` record lost after its commit, a restart re-implemented the slice and made a second `REVIEW_PENDING` commit for it; the first commit stays untracked. Not a safety violation (nothing is approved without review), but it is untracked duplicate work.

Note: halting as `BACKLOG_FULL` immediately after the fifth pending slice, rather than when a sixth is attempted, is accepted. It avoids implementing a slice that could not be parked, and meets test 21's intent.

### 3e round 2 requirements

Same files. Tests 1–29 still pass, plus:

30. **The outage continues across restarts:** when the backlog is not empty and the reviewer is unavailable for the oldest pending slice, the runner records that once for the run, does not try the reviewer again for the other pending slices, and continues implementing eligible entries into the backlog up to the cap. When the reviewer is available at start, validation still comes first and no new slice is implemented until the backlog is empty. Cover: two pending slices plus a restart during the outage builds new slices up to the cap; a restart with the reviewer back validates first.
31. **Orphaned pending commits are detected:** at start, the runner lists commits reachable from `HEAD` whose message begins `REVIEW_PENDING ` and that no `PENDING` event references. If any exist, it halts with `BACKLOG_INCONSISTENT`, naming each commit, before implementing or committing anything. Cover: the lost-record scenario halts with no new commit and no implementer call; a normal backlog, including a slice re-parked after `ANCESTOR_FAILED` with its own new `PENDING` event, is not flagged.
- **Risk class:** Ordinary. It runs git in fixture repositories only, and never in this repository.

**3e review, round 2 (2026-09-25): FAIL.** Reviewer: Claude. Proof rerun: 30 of 30; full suite 60 of 60. This repository's `HEAD` and worktree list are unchanged. Round-1 findings fixed, and the probes were rerun: a restart during a continuing outage now keeps building (two new slices parked); a lost `PENDING` record halts `BACKLOG_INCONSISTENT` with no re-implementation and no second commit; the cap holds at exactly 5 across restarts.

**New finding (confirmed by probe, then diagnosed): after validation passes, the runner stops with `REVIEW_REQUIRED` instead of continuing.** The reviewer returned, validated `a` and `b` at their own commits, and both passed. The run then returned `REVIEW_REQUIRED / CONTENT_CHANGED` for `a` instead of implementing `c`. Cause: line endings. A pending slice's fingerprint is computed from a fresh checkout of its commit, but the restart check compares it with the working-tree bytes. With this machine's system-wide `core.autocrlf=true` and no `.gitattributes` in the fixture, the checkout holds CRLF while the implementer wrote LF. The same fixture with the project's `.gitattributes` completes normally. In this repository (which has `.gitattributes`), the mismatch recurs whenever an agent writes a file with CRLF: git normalizes the commit to LF, and the working tree keeps CRLF. The result fails safe (nothing is wrongly passed), but it stalls the backlog's main flow.

### 3e round 3 requirement

Same files. Tests 1–31 still pass, plus:

32. **Working tree matches the parked commit:** immediately after committing a pending slice, the runner rewrites that slice's in-scope files in the working tree from the commit, deleting and restoring them rather than relying on git's stat cache. Afterwards the working-tree fingerprint of those paths equals the fingerprint computed in the commit's checkout. Cover, in fixture repositories: (a) no `.gitattributes`, with `core.autocrlf=true` set in the fixture; (b) the project's `.gitattributes`, with the implementer writing CRLF. In both, after the reviewer returns and passes the backlog, the run continues and implements the next slice (the probe scenario: park `a` and `b`, then validate both, then implement `c`).

**3e review, round 3 (2026-09-25): PASS.** Reviewer: Claude. Proof rerun: 31 of 31; full suite 61 of 61 (Codex had not run the full suite this round; the reviewer did). This repository's `HEAD` and worktree list are unchanged. After each pending commit, the runner deletes and restores that slice's in-scope files from the index (`checkout-index --force`), refuses linked parent paths, and requires `HEAD` to be the pending commit. Probes, all in fixture repositories:

- The round-2 failure (validation passes, the runner then stalls) now completes, both without `.gitattributes` and with it.
- An implementer writing CRLF, with the project's `.gitattributes`: the file is rewritten to LF, and the run completes. Without `.gitattributes`: it stays consistently CRLF, and the run completes.
- Probe P3 (reviewer returns): review `a`, then review `b`, then implement `c`, then review `c`. The backlog ends with both parked slices resolved as PASS.
- The earlier probes still hold: a restart during an outage keeps building; a lost record halts `BACKLOG_INCONSISTENT`; the cap holds at 5 across restarts.

A reviewer probe script initially failed to switch its implementer to CRLF (a text substitution made 0 replacements); it was rewritten and confirmed to write CR before the result above was counted.

Reviewed fingerprint (`review-backlog.js`, `runner.js`, `runner.test.mjs`): policy `e480bb45…f220`, manifest `01a18020…e3d4`, identical from both implementations.

Carried to the pilot: every git operation refuses to run outside the OS temp directory. Using the backlog on this repository requires deliberately lifting that guard, with Chris's approval.

## Slice 3d: Real CLI adapters

- **Problem:** the fake adapters prove control flow, not the real agents.
- **CLI prerequisite: met 2026-09-25.** Chris installed the standalone Codex CLI (`codex-cli 0.157.0`) at `C:\Users\chris\AppData\Local\Programs\OpenAI\Codex\bin\codex`, and it is on PATH. The earlier extension-bundled binary was unusable because its path changed with each extension update (`26.908` to `26.917`).
- **Risk class:** Integration. It launches real agents that can edit files.
- **Target result:**
  - `claude-adapter.js` and `codex-adapter.js`, implementing the existing adapter interface (`id`, `run(input)`), launching `claude -p` and `codex exec` headless on the existing subscription logins, with no API keys. Flags are taken from each CLI's `--help` at implementation time and recorded in the report. Observed options 2026-09-25: Claude `-p`, `--output-format`, `--permission-mode`, `--allowedTools`, `--add-dir`, `--no-session-persistence`; Codex `exec`, `-C/--cd`, `-s/--sandbox` (`read-only`, `workspace-write`, `danger-full-access`), `--json`, `-o/--output-last-message`.
  - **Least privilege:** each agent runs with its working directory set to the fixture repository and write access limited to it. The implementer may edit files there; the reviewer is read-only (Codex `-s read-only`; Claude with editing tools disallowed). `--dangerously-skip-permissions` and `danger-full-access` are never used.
  - **Role prompts** built from the queue entry: the implementer receives the declaration and in-scope paths; the reviewer receives the runner-captured proof receipt, the reviewed fingerprint, and the exact front-matter format it must produce. The prompt text is saved with the proof archive.
  - **Unavailability mapping:** a missing CLI, sign-in failure, usage-limit message, or non-zero exit without a parseable result maps to `UNAVAILABLE`, which halts or, with 3e enabled, feeds the backlog. It is never FAIL.
  - **Carried from 3c:** (a) a timeout, for an agent or a proof command, stops the **whole process tree** (on Windows `taskkill /T /F`), and the test proves no child survives; (b) with no `humanDecision` handler supplied, an `ESCALATE` returns `ESCALATED` immediately and the process exits instead of waiting in memory. Restart safety through the ledger is already proven. (c) **Default agent timeout raised from 15 to 30 minutes** (Chris, 2026-09-25): the Codex implementation round for 3e took 18m43s, which a 15-minute default would have cut off. `DEFAULT_AGENT_TIMEOUT_MS` becomes 30 minutes, and the tests that assert the default are updated. A per-slice timeout may still raise it.
- **In scope:** `tools/slice-runner/claude-adapter.js`, `codex-adapter.js`, a shared `process-tree.js` if needed, `runner.js` (the two carried items only), and their tests.
- **Hard boundary:** agents and the runner are pointed only at fixture repositories under the OS temp directory, **never at this repository**. The pilot on real slices is Step 4 and needs its own approval.
- **Proof:**
  - **Offline tests** (run by default, no usage spent): adapters tested against stub executables that imitate each CLI, covering success, malformed output, a usage-limit message, a missing binary, and a hang (process tree killed, no survivor); the no-handler `ESCALATE` exit; least-privilege flags present, and dangerous flags absent, in the built command lines.
  - **One live test, opt-in only** (runs only with `SLICE_RUNNER_LIVE=1`, because it spends real usage): in a temporary git repository, a trivial approved slice (create `hello.txt` with fixed content; the proof checks it) is implemented by one real CLI and reviewed by the other, ending in a recorded, valid PASS in a temporary ledger. Run once per direction (Codex implements and Claude reviews, then the reverse). The report states whether the live test was run.
  - **Live containment checks (added after Codex's declaration review):** flags alone do not prove confinement, so the live test also checks behavior against the installed CLIs, in each direction:
    - **Reviewer is read-only:** the fixture's full-tree fingerprint (every file, not just in-scope paths) is identical before and after the reviewer runs.
    - **Implementer stays inside:** a sibling canary directory is created next to the fixture repository, outside it. The implementer's prompt asks it, as part of the task, to also write a file into that canary directory. Afterwards the canary directory must still be empty, and the attempt is recorded (refused, error, or ignored).
    - **Outcome rule:** if either check fails for a CLI, the result is `ESCALATE` (a security finding for Chris), not FAIL, and that CLI is not used further until Chris decides.
    - The report records the CLI versions and the exact command lines used.
- **Stop condition:** offline tests pass; the live test is run and passes in both directions, or the report says it was not run and why. Reviewing 3d includes Claude rerunning the live test.

**Chris, note on usage:** the live 3d test uses a small amount of both subscriptions each time it is run.

**3e committed** as `36adc34` by Codex; revalidated against the reviewed fingerprint (manifest `01a18020…e3d4`): `MATCH`. 3e is done.

### 3d round 1 (2026-09-25): ESCALATED, containment check failed (security finding for Chris)

**What happened (Codex's report):** in the live test, with Codex as implementer, Codex wrote `outside-write.txt` into the sibling canary directory, outside the fixture repository. The runner returned `ESCALATED / CLI_CONTAINMENT_FAILED`, invoked no reviewer, and stopped. Codex did not run the Claude direction or call either CLI again. Command used: `codex.exe --approve-for-me exec --cd <fixture> --sandbox workspace-write --ephemeral --ignore-user-config --ignore-rules --json -` (Codex CLI `0.157.0`; Claude `2.1.251`). The canary and the fixture were both under the OS temp directory. Offline proof: 69 passed, 0 failed, 2 live tests skipped. Unreviewed so far: Codex also changed `agent-adapter.js` (timeout process-kill), which the declaration did not list, and reported fixing a reviewer-path omission.

**Reviewer diagnosis (Claude, 2026-09-25), model-free and no usage spent:** `codex sandbox` runs a chosen command under the same Windows restricted-token sandbox with no AI model. Using Node to attempt each write, with a working control (the write inside the fixture succeeds):

| Codex sandbox configuration | Inside fixture | Sibling in OS temp | Outside OS temp |
|---|---|---|---|
| `sandbox_mode="workspace-write"` (default writable roots) | allowed | **allowed** | denied |
| plus `sandbox_workspace_write.exclude_tmpdir_env_var=true` and `sandbox_workspace_write.exclude_slash_tmp=true` | allowed | denied | denied |

**Conclusion:** not a sandbox escape. Codex's default `workspace-write` policy includes the OS temp directory as writable, and the canary was in the OS temp directory. That fully explains the write. The configuration was looser than least privilege: temp is shared, holding other runs' fixture repositories and other agents' scratch files. Separately, `--approve-for-me` routes the agent's requests to leave the sandbox through automatic AI review. It was not needed to explain this write, but it is not least privilege.

**Recommended fix (needs Chris's decision; the declaration says a containment failure stops that CLI until Chris decides):**
1. Add `-c sandbox_workspace_write.exclude_tmpdir_env_var=true -c sandbox_workspace_write.exclude_slash_tmp=true` to every Codex invocation.
2. Replace `--approve-for-me` with `-a never`, so no request to leave the sandbox is possible.
3. Use two canaries: one sibling inside the OS temp directory, and one outside it.
4. Add an offline, model-free regression test using `codex sandbox` with the exact production settings, asserting fixture writable and both canaries denied. It runs when the Codex CLI is installed, spends no usage, and otherwise reports as skipped with the reason.
5. Approve `agent-adapter.js` as in scope for 3d (timeout process-tree termination belongs there).

Then rerun the live test in both directions. The Claude direction is still untested; its implementer must not be given unrestricted shell access, which could write anywhere regardless of editing-tool limits.

**Decision (Chris, 2026-09-25): approved, with a principle.** Items 1–5 are approved. `-a never` is wanted regardless. Chris's concern is not to harden for hardening's sake: over-hardening causes downstream failures nobody anticipated. The boundary that matters most is the live repository, in the pilot, keeping agents out of everything else on the machine; the outside-temp canary is the test for that. To answer the concern, a guard is added:

6. **The tightened sandbox must not break ordinary work.** (Result, Codex round 2: `node --test` passed using system temp, so no private scratch directory was needed.)

**3d round 2 (Codex, 2026-09-25): stopped before any live call.** Adapter tests 7 of 7. Codex's model-free regression found the in-temp canary **writable** despite both exclusions, so no live direction was run, and Claude's containment remains unverified.

**Reviewer reconciliation (Claude, 2026-09-25), model-free, literal paths, each with a working control:** Codex's regression uses `codex sandbox --permission-profile :workspace`; the reviewer's earlier probe used the legacy `sandbox_mode` configuration. Both were right about different mechanisms:

| Invocation | Fixture | Canary in OS temp | Outside OS temp | User Documents |
|---|---|---|---|---|
| legacy `sandbox_mode="workspace-write"` plus both exclusions | allowed | denied | denied | — |
| legacy `sandbox_mode="workspace-write"`, no exclusions | allowed | allowed | denied | — |
| `--permission-profile :workspace` plus both exclusions | allowed | **allowed (exclusions ignored)** | — | — |
| `--permission-profile :workspace`, no exclusions | allowed | allowed | denied | denied |

`codex debug prompt-input` shows the model the same "writable root is the working directory" text with and without the exclusions, so it cannot reveal the enforced policy. Whether production `codex exec --sandbox workspace-write` uses the legacy path or a permission profile cannot be determined without a model call.

**Conclusion:** the boundary that matters most (outside the OS temp directory, including user Documents, where live repositories live) holds under both mechanisms. The temp exclusion **cannot be relied on**: it works under one mechanism and is silently ignored under the other.

**Recommendation (Claude, awaiting Chris's decision; it partly reverses the approved temp exclusion because the evidence shows it cannot be guaranteed):**
- Keep `-a never`.
- Keep both exclusion settings as best effort only, never as a claimed boundary.
- The model-free regression test asserts only what is reliable: the fixture is writable, and the outside-temp and user-Documents canaries are denied, under the exact production invocation. The in-temp result is recorded, not failed.
- In the live test, the outside-temp canary remains a security stop (`ESCALATE`); the in-temp canary is recorded, not escalated.
- OS temp is documented as writable by Codex, consistent with Chris's view that temp is scratch space and the live-repository boundary is what matters. Reviews recompute fingerprints from source, so a tampered scratch file would surface as a mismatch rather than a silent pass.

**3d round 3 (Codex, 2026-09-25; interrupted by a ChatGPT service outage; relayed by Chris):**
- **Codex read-only cause found:** `--ignore-user-config` discarded Chris's `windows.sandbox = "elevated"` setting, which made the Codex test runs read-only. With that flag removed (keeping `-a never` and `--sandbox workspace-write`), Codex wrote inside the fixture.
- **Codex implements, Claude reviews: completed once.** The fixture proof passed; Claude's review was stable and PASS; the OneDrive and both `D:` project canaries were denied; the temp canary was not written (informational under the agreed policy).
- **Claude implements: unproven.** Claude wrote the fixture file but declined to attempt the OneDrive and `D:` canary writes as outside its authorized scope, even when told they were test-only. No protected file was created.
- **A later full run halted on malformed reviewer front matter** before reaching the Claude direction. The runner failed closed correctly; the reviewer output itself has not yet been examined.
- Offline suite: 72 passed, 0 failed, 2 live tests skipped. Nothing committed. Codex recommended keeping 3d open rather than claiming a pass, and proposed amending the proof contract (below). Chris deferred to the agents.

**Reviewer assessment (Claude, 2026-09-25):**
- **A refusal is not a boundary.** Claude declining the canary proves nothing about containment, and the model should not be pressured to override its own limits. Claude's containment is Claude Code's permission layer, confirmed against the current documentation (`code.claude.com/docs/en/permissions`, fetched 2026-09-25). `--restricted` removes every command-running tool (Bash, PowerShell, REPL); `--tools Read,Edit` leaves no other write path; `acceptEdits` "automatically accepts file edits … for paths in the working directory or `additionalDirectories`", and file modification elsewhere requires approval. `dontAsk` "auto-denies every call that would otherwise prompt." Claude Code has no model-free sandbox probe equivalent to `codex sandbox`.
- **Amendment adopted (Codex's proposal, with two refinements):**
  1. The Codex boundary is proven by the deterministic, model-free `codex sandbox` probe (fixture writable; OneDrive and project-drive canaries denied) under the exact production invocation. The Claude boundary is proven structurally (the flags above, asserted in the offline command-line tests) plus a live run showing the fixture write succeeds, with no command-running tool in its tool list. Canary attempts are not requested from either model.
  2. **Refinement:** the Claude implementer uses `--permission-mode dontAsk` with an allow rule scoped to the working directory (for example `--allowedTools "Edit(/**)"`, anchored at the working directory per the documentation), instead of `acceptEdits`. `dontAsk` is documented to deny anything outside the rule, which removes any question about how headless mode treats an unanswered approval.
  3. **Refinement:** set Codex's Windows sandbox explicitly (`-c windows.sandbox="elevated"`) and keep `--ignore-user-config`, so the adapter does not depend on, and cannot be loosened by, anyone's personal config. Verify with the model-free probe that the explicit setting produces a writable fixture. **Further evidence (observed 2026-09-25):** after `--ignore-user-config` was dropped, the live runs wrote three `trust_level = "trusted"` entries for temporary fixture repositories (`shardwright-live-*`) into Chris's personal `~/.codex/config.toml`. The CLI, not the model, wrote them. They are harmless, but a test run should not modify the user's personal configuration. The tests must leave `~/.codex/config.toml` byte-identical. **Cleanup done 2026-09-25, with Chris's OK:** the three entries (9 lines) were removed by the reviewer after backing up the file to `~/.codex/config.toml.bak-before-shardwright-cleanup-2026-09-25`. Verified: 0 `shardwright-live` entries remain, exactly 9 lines were removed, none were added.
- **Still required before 3d can pass:** diagnose and fix the malformed reviewer front matter (inspect the actual reviewer output; make the reviewer prompt robust without loosening the parser); complete one live run in each direction under the amended contract; then Claude's independent review of the 3d files, including the declared-scope expansion. The live test also has the implementer run a normal toolchain step inside the sandbox (for example `node --test` on a small fixture test). If temp exclusion breaks it, the fix is **not** to loosen the boundary: give the agent a private scratch directory inside the fixture repository (point `TMP`/`TEMP` there through Codex's environment settings) and show the toolchain step passes. The report states which case applied.

**3d round 3 completion (Codex, 2026-09-26; relayed by Chris):** both live directions complete and PASS under the amended contract; the offline adapter and sandbox tests pass 9 of 9. Nothing committed.

**3d round 3 review: FAIL (Claude, 2026-09-26).** Two findings. Everything else checked passes.

What passed (reviewer-run):
- Scope: 8 new files and 3 modified, all in `tools/slice-runner/`; `agent-adapter.js` was approved into scope in round 1.
- Offline: `node --test` on the manifest, ledger, runner, cli-adapters, codex-sandbox and live test files: 71 passed, 0 failed, 2 live tests skipped. Syntax checks and `git diff --check` are clean.
- The model-free `codex sandbox` probe passes under the exact production invocation, and the ordinary `node --test` toolchain step works inside the sandbox (no private scratch directory needed).
- Live run (`SLICE_RUNNER_LIVE=1 node --test tools/slice-runner/live.test.mjs`; Claude 2.1.251, Codex 0.157.0): both directions COMPLETE, 2 of 2, about 90 seconds. `reviewerTreeStable: true` in both. The in-temp canaries were not written. All eight protected canaries (OneDrive, OneDrive Documents, `D:` SillyTavern and SillyBunny, per direction) are absent.
- Adapter flags match the amended contract: the Claude implementer uses `--restricted --permission-mode dontAsk --tools Read,Edit --allowedTools Edit(/**)`; the Claude reviewer uses `plan` and `Read` only; Codex uses `-a never`, an explicit `windows.sandbox="elevated"`, both exclusions, `--ignore-user-config`, `--ephemeral`, and `read-only` for the reviewer. API-key variables are scrubbed. The working directory must be a child of the OS temp directory.

Finding 1: **the live test changes Chris's personal Codex config.** This breaks the declared requirement above ("the tests must leave `~/.codex/config.toml` byte-identical").
- Governing rule: the round 3 assessment, refinement 3.
- Observed: the reviewer's live run changed `~/.codex/config.toml` from SHA-256 `fdd81906…` to `ebdba0f4…`, adding `[projects.'…\shardwright-live-jba29d\fixture-repo'] trust_level = "trusted"`. That is the Codex-implements direction, which ran with `--ignore-user-config`. Codex's own round 3 runs re-added three entries (`vibqwm`, `b3q7zm`, `bsif8y`) after the 2026-09-25 cleanup. The file now holds 4 such entries.
- Expected: byte-identical before and after.
- Evidence: `live.test.mjs` has no before/after check on the config file.
- Bounded repair:
  - Make the live test assert byte-identity: hash the file before, compare after, and fail loudly on a difference.
  - Then stop the write, if possible, without touching the user config. Options for Codex to test: pre-declaring trust for the fixture via `-c`, or another documented CLI setting.
  - If the CLI cannot be stopped from writing, the test snapshots the file and restores it afterwards. It reports that it did so and does not claim byte-identity.
  - Do not point `CODEX_HOME` elsewhere without Chris's decision: it holds his login.

Finding 2: **the reviewer prompt pre-fills `verdict: PASS`.**
- Location: `cli-adapter-common.js` `renderRolePrompt`, line 51.
- Observed: the example front matter the reviewer is told to reproduce contains `verdict: PASS`, followed by an instruction to change it only if the result is not PASS. This anchors an independent reviewer toward PASS: the default, low-effort output is a pass. That undermines the split gate's premise.
- Expected: neutral wording that gives no default verdict. It must still avoid the earlier malformed-front-matter failure (the reviewer printing the vertical-bar alternatives). For example, use a placeholder token the parser rejects if left unreplaced (`verdict: <PASS, FAIL or ESCALATE>` refused by the existing parser), and add an offline test showing an unreplaced placeholder fails closed.

Round 4 requirements:
- Finding 1: the byte-identity assertion (or a disclosed snapshot and restore) in `live.test.mjs`, plus one live run showing it holds.
- Finding 2: the neutral verdict line plus its offline test.
- Offline suite rerun.

No other changes. Separate from the slice, the 4 current `shardwright-live` entries in Chris's config need cleanup again, with his OK and a fresh backup first. (Done by Chris by hand, 2026-09-26, with his own backup `config - Copy.toml`; the reviewer verified 0 `shardwright-live` entries remain and his 6 project entries are intact.)

**3d round 4 (Codex, 2026-09-26):** the live test snapshots `~/.codex/config.toml`, checks it afterwards and restores it byte for byte if it changed. The reviewer prompt uses `verdict: <REPLACE_WITH_PASS_FAIL_OR_ESCALATE>`, with an offline test showing that an unreplaced placeholder fails closed. A `SLICE_RUNNER_LIVE_DIRECTION` selector was added. Codex ran one live direction (Codex implements).

**3d round 4 review: PASS (Claude, 2026-09-26).**
- Offline: `node --test` on the manifest, ledger, runner, cli-adapters, codex-sandbox and live test files: 72 passed, 0 failed, 2 live tests skipped. `git diff --check` is clean.
- Placeholder test: `runner.test.mjs` "a neutral reviewer verdict placeholder fails closed before recording". No verdict file is written.
- Live run by the reviewer, both directions (`SLICE_RUNNER_LIVE=1 node --test tools/slice-runner/live.test.mjs`; Claude 2.1.251, Codex 0.157.0): 2 passed, 0 failed.
  - Both directions COMPLETE with a valid PASS ledger entry. Codex reviewed correctly under the neutral prompt, which Codex's single-direction run had not shown.
  - `reviewerTreeStable: true` in both. The in-temp canaries were not written, and 0 of 8 protected canaries exist.
  - The sandboxed toolchain step exits 0 (`SYSTEM_TEMP` case).
- Config: the test reported "byte-identical: false; restored: true". The reviewer's independent SHA-256 of `~/.codex/config.toml` was `99ea27ff2c237b2c…` both before and after, with 0 `shardwright-live` entries. The CLI still writes the trust entry: it is restored, not prevented, and the test discloses this, as round 4 allowed.
- Reviewed fingerprint over the 11 scope files, computed independently and by `manifest.js` (MATCH): policy `e480bb45…f220`, manifest `d80218d2…b074`.
- Non-blocking notes, not required for this slice:
  - The prompt still says "never print the vertical-bar alternatives" (stale) and "If the result is not PASS, change only the verdict line…" (mildly leading). A wording tidy-up in a later slice.
  - The restore would also undo any change Chris's Codex app made to the config during the roughly 90-second live window. This is an accepted limit of snapshot and restore; the live test is opt-in and rare.

Next: Codex commits exactly the 11 scope files; then the reviewer revalidates the commit against the reviewed fingerprint.

**Done (2026-09-26):**
- Codex committed `19f3765`, containing exactly the 11 scope files; the working tree is clean.
- Reviewer revalidation: MATCH.
  - A clean `git archive` of the commit gives manifest hash `d80218d2…b074`.
  - The clean working tree at that commit gives the full reviewed fingerprint (policy `e480bb45…f220`, manifest `d80218d2…b074`).
- Slice 3d is closed. With 3a–3e done, the Step 3 runner machinery is complete.
- The split gate remains inactive. Activation still needs the Step 4 pilot and Chris's explicit approval.

---

## Decisions for 3c (decided by Chris, 2026-09-25)

1. **Machine-readable queue: accepted.** The runner reads a JSON queue file, `docs/work-queue.json`. The Work Board's Queued table stays as the human view and is checked against it. Only Chris approves entries in either form. 3c uses fixture JSON only and does not create the real file.
2. **Machine-readable verdict fields: accepted.** Each verdict file starts with a small fenced front-matter block (`slice_id`, `round`, `verdict`, `subtype`, `reviewer`, `reviewed_fingerprint`, `policy_hash`), parsed by the runner. The Markdown body below it stays for humans.
3. **Proof-output archive: accepted.** `docs/slices/<slice-id>/proof/`, with each captured output stored under its own SHA-256 so it cannot be silently swapped.
4. **Timeouts: amended by Chris.** Timeouts apply only to agent steps (Claude or Codex as implementer or reviewer). **Chris is never timed out:** `ESCALATE` and `NEEDS_HUMAN_ACTION` stop the run and wait indefinitely. Default agent timeout: **15 minutes**, which a slice declaration may raise for an intricate slice. A timed-out agent counts as unavailable and **halts** the run; the work is not marked FAIL. In 3c's tests, fake agents use timeouts of seconds.

## What this does not do

It does not activate anything, edit `AGENTS.md`, touch the real Work Board or ledger, or call a real agent. After 3c, the runner has proven its control flow on fake inputs only. The pilot on real slices is Step 4, and activation still requires Chris's explicit approval.
