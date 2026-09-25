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

## Slice 3c: Runner control loop, with fake agents

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

## Slice 3d: Real CLI adapters (later, separate authorization)

- **Problem:** the fake adapters prove control flow, not the real agents.
- **CLI prerequisite: met 2026-09-25.** Chris installed the standalone Codex CLI (`codex-cli 0.157.0`) at `C:\Users\chris\AppData\Local\Programs\OpenAI\Codex\bin\codex`, and it is on PATH. The earlier extension-bundled binary was unusable because its path changed with each extension update (`26.908` to `26.917`). Headless sign-in with the ChatGPT plan has not been tested yet; 3d must prove it.
- **Risk class:** Integration. It launches external processes with repository access.
- **Not drafted further** until 3a through 3c are proven.

---

## Decisions for 3c (decided by Chris, 2026-09-25)

1. **Machine-readable queue: accepted.** The runner reads a JSON queue file, `docs/work-queue.json`. The Work Board's Queued table stays as the human view and is checked against it. Only Chris approves entries in either form. 3c uses fixture JSON only and does not create the real file.
2. **Machine-readable verdict fields: accepted.** Each verdict file starts with a small fenced front-matter block (`slice_id`, `round`, `verdict`, `subtype`, `reviewer`, `reviewed_fingerprint`, `policy_hash`), parsed by the runner. The Markdown body below it stays for humans.
3. **Proof-output archive: accepted.** `docs/slices/<slice-id>/proof/`, with each captured output stored under its own SHA-256 so it cannot be silently swapped.
4. **Timeouts: amended by Chris.** Timeouts apply only to agent steps (Claude or Codex as implementer or reviewer). **Chris is never timed out:** `ESCALATE` and `NEEDS_HUMAN_ACTION` stop the run and wait indefinitely. Default agent timeout: **15 minutes**, which a slice declaration may raise for an intricate slice. A timed-out agent counts as unavailable and **halts** the run; the work is not marked FAIL. In 3c's tests, fake agents use timeouts of seconds.

## What this does not do

It does not activate anything, edit `AGENTS.md`, touch the real Work Board or ledger, or call a real agent. After 3c, the runner has proven its control flow on fake inputs only. The pilot on real slices is Step 4, and activation still requires Chris's explicit approval.
