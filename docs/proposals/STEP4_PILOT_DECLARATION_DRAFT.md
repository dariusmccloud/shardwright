# Step 4 Pilot: Draft Declaration

**Status:** Draft. Not authorized. Written 2026-09-25 by Claude while Codex was unavailable (OpenAI Codex incident). Codex reviews this declaration before anything is implemented; Chris approves it.
**Parent:** [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §12, activation prerequisite 5: "A pilot over a few real slices, reviewed by Chris, before the rule becomes permanent."
**Boundary:** the pilot tests the machinery on real work. It does **not** activate the split gate or edit `AGENTS.md`. The current Terminal Gate governs throughout. Activation remains a separate decision by Chris after the pilot report.

## Preconditions

1. Slice 3d has passed review and its commit is revalidated, so both real adapters are proven under the amended containment contract.
2. The worktree is clean when each pilot run starts: no uncommitted work by any agent.
3. Chris has approved the pilot, the slices in it, and the repository exception below.

## Plain-language summary for Chris

The runner has only ever worked on throwaway test folders. The pilot lets it work on this repository for a few small, low-risk tasks that you choose. One agent builds each task, the other reviews it, and the runner records everything. Afterwards you read a short report and decide whether to switch the new gate on. Nothing is switched on by the pilot itself.

## What changes to allow the pilot

- **One bound exception to the working-directory guard.** Today the adapters refuse any working directory outside the OS temp directory (`AGENT_CWD_OUTSIDE_TEMP`). The pilot adds an explicit, opt-in runner setting naming exactly one allowed repository path (this repository's absolute path). Any other path is still refused. The setting is off by default and never inferred.
- **The review backlog stays off.** The runner uses git only to park backlog slices, so with the backlog off the "git only in temp" guard stays in place unchanged. Piloting the backlog on this repository is a later, separate decision.
- **The real queue and ledger files are created:** `docs/work-queue.json` (entries approved by Chris) and `docs/verdicts/ledger.jsonl`, plus verdict files and proof archives, all committed as ordinary project files.

## Pilot slices

Proposed: **3 slices**, each ordinary risk, reversible, touching no authority, persistence, lifecycle, replay, schema, migration, security, sync, identity, UI state, or user data. Chris picks them. Candidates from existing open items:

| Candidate | Why it fits | In-scope paths (approximate) |
|---|---|---|
| Record the minimum supported Node version (open decision D-H) | Documentation only; closes a known open item | the governing doc that records it, plus the Work Board |
| README server-plugin install steps | Documentation only; a gap noted in the README rewrite | `README.md` |
| A small, test-only addition to an existing proven module | Exercises real code review without touching behavior | one `*.test.mjs` file |

At least one slice should run in each direction (Codex implements and Claude reviews, and the reverse).

## Proof required

For each pilot slice:

1. The runner dispatches it from the approved queue, runs the implementer, captures the proof itself, runs the independent reviewer, and records a hash-bound verdict in the real ledger.
2. The diff stays inside the declared in-scope paths (checked by the reviewer against the worktree manifest).
3. No containment finding: the model-free Codex sandbox probe passes under the production invocation, the Claude invocation keeps its structural restrictions, and nothing outside this repository changes. Before and after each run, the reviewer fingerprints `~/.codex/config.toml` and a sample of sibling project folders; they must be unchanged.
4. A plain-language brief per slice for Chris: what was done, what it supports, the expected outcome, and anything needed from him.

## Pilot report (the deliverable)

One document for Chris covering:

- each slice: verdict, rounds needed, what review caught, time taken, usage-limit events;
- any escalations and how they were resolved;
- anything that needed manual intervention the design did not anticipate;
- a recommendation on activation, with the remaining known limits restated: approval authorship cannot be verified (anyone able to edit the queue can add an approval), the sampling audit rate is still open, and the review backlog is not yet piloted.

## Stop conditions

- **Normal:** all pilot slices reach a recorded verdict, and the report is delivered. The pilot then stops; activation waits for Chris.
- **Early stop:** any containment finding, any change outside this repository, a ledger or backlog integrity error, or Chris's instruction. The pilot halts and the finding goes to Chris.

## Review and Chris's answers (2026-09-26)

**Codex review:** PASS at the declaration level (2026-09-26). Codex noted that before authorization Chris must choose the three slices, approve the single repository-path exception, and specify the protected paths and canaries and the exact test-only slice.

**Chris's answers:**
1. **Slices** (replacing the two table candidates since done as ordinary slices, entries 10 and 11):
   - Codex implements, Claude reviews: declare the plugin's minimum Node version (`engines.node` `>=24.21.0`) in `tools/server-plugin/shardwright-memory/package.json`, the follow-up the D-H row leaves open.
   - Claude implements, Codex reviews: a README Troubleshooting row for the plugin failing to load with a missing-`ajv` error.
   - Test-only: a test that the installed payload carries `package.json` and `package-lock.json`, so the dependency install can run. The exact test file is named in the queue entry.
2. **Review backlog:** off.
3. **Off-limits beyond declared scopes:**
   - In the repository: `AGENTS.md`, `docs/contracts/`, the split-gate amendment draft, `tools/slice-runner/`, and `vendor/`.
   - Outside it:
     - `C:\Users\chris\OneDrive\Documents\Personal\Projects` and every subfolder other than this repository. Chris's standing rule: not touched unless a project is expressly the work.
     - `~/.codex/config.toml`, `D:\SillyTavern`, `D:\SillyBunny`, and `D:\AI\Projects`.
   - Protected canaries and before/after fingerprints cover these.

**Still needed:** Chris's explicit approval of the pilot as a whole, including the one repository-path exception.

## Questions for Chris before approval

1. Which three slices? (The table above is a starting point.)
2. Keep the review backlog off for this pilot, as proposed?
3. Any area of the repository you want explicitly off-limits during the pilot, beyond the declared scopes?
