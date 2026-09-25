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

## Slice 3e: Review backlog

- **Problem:** if the independent reviewer is out of usage, the runner halts, and all work waits, even though the other agent may have usage left (Chris's requirement; amendment §8).
- **Design (amendment §8), with the cap confirmed at 3 by Chris's approval:**
  - The backlog is **off unless the approved queue enables it**: a top-level `reviewBacklog: { maxPending: 3 }` in the queue file. Without it, an unavailable reviewer halts exactly as today.
  - **Entry to the backlog:** after implementation, when the proof ran and **exited 0**, the reviewer is unavailable (error, timeout, or `UNAVAILABLE`), and the entry is ordinary-risk and touches none of amendment §8's excluded categories. A failed proof, or an ineligible entry, halts as today.
  - **What the runner records:** it commits only the entry's in-scope paths in the (fixture) git repository, with a message beginning `REVIEW_PENDING <sliceId>`. It appends a line to a runner-owned, append-only `docs/review-pending.jsonl`: `sliceId`, `commit`, `manifestHash`, `policyHash`, `proofOutputHash`, `recordedAt`, and `dependsOn` (the slice IDs already pending before it). It then continues to the next approved entry. A pending slice has no verdict and never counts as PASS.
  - **Cap:** when the pending count reaches `maxPending`, the run halts with `BACKLOG_FULL`.
  - **Validation pass first:** when the reviewer is available and the backlog is not empty, no new slice is implemented. Pending slices are reviewed oldest first, each **at its own commit**: the runner checks it out in a temporary git worktree, recomputes the fingerprint there (it must equal the pending record, otherwise `HALTED` with `PENDING_RECORD_MISMATCH`), and gives the reviewer that commit and fingerprint. The verdict is recorded in the ledger as usual.
  - **Cascade:** if a pending slice gets `FAIL`, every later pending slice whose `dependsOn` includes it becomes `REVIEW_REQUIRED` (reason `ANCESTOR_FAILED`), and the run stops with `FAIL`. `ESCALATE` during validation stops with `AWAITING_DECISION`, as today.
  - **Restart:** a slice with a pending record is not re-implemented; it waits for validation.
- **In scope:** `tools/slice-runner/runner.js`, `runner.test.mjs`, and a new `tools/slice-runner/review-backlog.js` if Codex prefers to separate it. Fake agents only; fixture repositories under the OS temp directory, each initialized with `git init`.
- **Proof** (runner tests 1–16 still pass, plus):
  18. Backlog disabled: an unavailable reviewer halts, with no commit and no pending record.
  19. Enabled: an unavailable reviewer on an eligible slice with a passing proof creates one commit containing only in-scope paths and one pending record, and the run continues to the next entry.
  20. Not eligible (keystone, an excluded category, or a failed proof): halts, no pending record.
  21. Cap: the fourth eligible slice with `maxPending: 3` halts `BACKLOG_FULL`.
  22. Validation first: with a pending backlog and the reviewer back, the implementer is not called until every pending slice is reviewed, oldest first, each at its own commit (asserted by the commit the reviewer receives).
  23. Pending record mismatch: a pending record whose fingerprint does not match its commit halts `PENDING_RECORD_MISMATCH`.
  24. Cascade: pending A then B (B depends on A); A fails validation, so B becomes `REVIEW_REQUIRED` with `ANCESTOR_FAILED`, and nothing new is implemented.
  25. Restart: a pending slice is not re-implemented on restart.
  26. A pending slice never appears as PASS in the ledger or the run result.
- **Risk class:** Ordinary. It runs git in fixture repositories only, and never in this repository.

## Slice 3d: Real CLI adapters

- **Problem:** the fake adapters prove control flow, not the real agents.
- **CLI prerequisite: met 2026-09-25.** Chris installed the standalone Codex CLI (`codex-cli 0.157.0`) at `C:\Users\chris\AppData\Local\Programs\OpenAI\Codex\bin\codex`, and it is on PATH. The earlier extension-bundled binary was unusable because its path changed with each extension update (`26.908` to `26.917`).
- **Risk class:** Integration. It launches real agents that can edit files.
- **Target result:**
  - `claude-adapter.js` and `codex-adapter.js`, implementing the existing adapter interface (`id`, `run(input)`), launching `claude -p` and `codex exec` headless on the existing subscription logins, with no API keys. Flags are taken from each CLI's `--help` at implementation time and recorded in the report. Observed options 2026-09-25: Claude `-p`, `--output-format`, `--permission-mode`, `--allowedTools`, `--add-dir`, `--no-session-persistence`; Codex `exec`, `-C/--cd`, `-s/--sandbox` (`read-only`, `workspace-write`, `danger-full-access`), `--json`, `-o/--output-last-message`.
  - **Least privilege:** each agent runs with its working directory set to the fixture repository and write access limited to it. The implementer may edit files there; the reviewer is read-only (Codex `-s read-only`; Claude with editing tools disallowed). `--dangerously-skip-permissions` and `danger-full-access` are never used.
  - **Role prompts** built from the queue entry: the implementer receives the declaration and in-scope paths; the reviewer receives the runner-captured proof receipt, the reviewed fingerprint, and the exact front-matter format it must produce. The prompt text is saved with the proof archive.
  - **Unavailability mapping:** a missing CLI, sign-in failure, usage-limit message, or non-zero exit without a parseable result maps to `UNAVAILABLE`, which halts or, with 3e enabled, feeds the backlog. It is never FAIL.
  - **Carried from 3c:** (a) a timeout, for an agent or a proof command, stops the **whole process tree** (on Windows `taskkill /T /F`), and the test proves no child survives; (b) with no `humanDecision` handler supplied, an `ESCALATE` returns `ESCALATED` immediately and the process exits instead of waiting in memory. Restart safety through the ledger is already proven.
- **In scope:** `tools/slice-runner/claude-adapter.js`, `codex-adapter.js`, a shared `process-tree.js` if needed, `runner.js` (the two carried items only), and their tests.
- **Hard boundary:** agents and the runner are pointed only at fixture repositories under the OS temp directory, **never at this repository**. The pilot on real slices is Step 4 and needs its own approval.
- **Proof:**
  - **Offline tests** (run by default, no usage spent): adapters tested against stub executables that imitate each CLI, covering success, malformed output, a usage-limit message, a missing binary, and a hang (process tree killed, no survivor); the no-handler `ESCALATE` exit; least-privilege flags present, and dangerous flags absent, in the built command lines.
  - **One live test, opt-in only** (runs only with `SLICE_RUNNER_LIVE=1`, because it spends real usage): in a temporary git repository, a trivial approved slice (create `hello.txt` with fixed content; the proof checks it) is implemented by one real CLI and reviewed by the other, ending in a recorded, valid PASS in a temporary ledger. Run once per direction (Codex implements and Claude reviews, then the reverse). The report states whether the live test was run.
- **Stop condition:** offline tests pass; the live test is run and passes in both directions, or the report says it was not run and why. Reviewing 3d includes Claude rerunning the live test.

**Chris, note on usage:** the live 3d test uses a small amount of both subscriptions each time it is run.

---

## Decisions for 3c (decided by Chris, 2026-09-25)

1. **Machine-readable queue: accepted.** The runner reads a JSON queue file, `docs/work-queue.json`. The Work Board's Queued table stays as the human view and is checked against it. Only Chris approves entries in either form. 3c uses fixture JSON only and does not create the real file.
2. **Machine-readable verdict fields: accepted.** Each verdict file starts with a small fenced front-matter block (`slice_id`, `round`, `verdict`, `subtype`, `reviewer`, `reviewed_fingerprint`, `policy_hash`), parsed by the runner. The Markdown body below it stays for humans.
3. **Proof-output archive: accepted.** `docs/slices/<slice-id>/proof/`, with each captured output stored under its own SHA-256 so it cannot be silently swapped.
4. **Timeouts: amended by Chris.** Timeouts apply only to agent steps (Claude or Codex as implementer or reviewer). **Chris is never timed out:** `ESCALATE` and `NEEDS_HUMAN_ACTION` stop the run and wait indefinitely. Default agent timeout: **15 minutes**, which a slice declaration may raise for an intricate slice. A timed-out agent counts as unavailable and **halts** the run; the work is not marked FAIL. In 3c's tests, fake agents use timeouts of seconds.

## What this does not do

It does not activate anything, edit `AGENTS.md`, touch the real Work Board or ledger, or call a real agent. After 3c, the runner has proven its control flow on fake inputs only. The pilot on real slices is Step 4, and activation still requires Chris's explicit approval.
