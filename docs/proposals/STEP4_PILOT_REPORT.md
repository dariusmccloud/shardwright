# Step 4 Pilot Report

**For:** Chris, to decide whether and how to activate the split Terminal Gate.
**Written by:** Claude, 2026-09-26. Codex reviews this report.
**Declaration:** [STEP4_PILOT_DECLARATION_DRAFT.md](STEP4_PILOT_DECLARATION_DRAFT.md). **Work Board:** entries 16 and 17.

## Bottom line

The pilot worked. The runner handed three real tasks in this repository back and forth between Codex and Claude, ran each proof itself, and recorded hash-bound verdicts. Every safety check held on every launch. Review caught a real non-delivery (a FAIL in round 1) and passed correct work.

It took five launches to get a clean run. Each earlier launch stopped safely on a different, real defect, all now fixed.

**Recommendation:** not yet the standing rule for everything. First, one more runner slice so that a failed review goes back to the builder automatically, carrying the reviewer's findings. Then activate for ordinary-risk work. Details are at the end.

## The three tasks

| Task | Built by | Reviewed by | Rounds | Result | Time in the final run |
|---|---|---|---|---|---|
| 1. Declare the plugin's minimum Node version, and update the D-H row | Codex | Claude | 2 (FAIL, then PASS) | PASS | build 41 s, review 54 s |
| 2. README troubleshooting row: server plugin not loading | Claude | Codex | 1 | PASS | build 9 s, review 47 s |
| 3. Test that the packaged plugin carries its `package.json` | Codex | Claude | 1 | PASS | build 41 s, review 90 s |

The final run took about five minutes end to end.

**Independent check after the run (Claude):**
- All three proofs pass again.
- All three verdicts still match the files exactly (fingerprint MATCH), so nothing changed after review.
- The full plugin suite passes 404 of 404: the previous 403 plus task 3's new test.

**What review caught:** in round 1, task 1's builder changed nothing. The runner's proof failed, and the reviewer independently confirmed each of the three files was untouched: a correct FAIL. That is the gate doing its job.

**Usage-limit events:** none. **Escalations to Chris:** none.

## The five launches

| Launch | What happened | Cause | Fix |
|---|---|---|---|
| 1 | Stopped before any task was sent | The runner's startup history scan went through a git guard that only allowed temp folders | Read-only history access for this one approved repository; all git writes still limited to temp |
| 2 | Task 1: the builder changed nothing; FAIL recorded | Unknown at the time: the runner throws away the builder's reply | The launcher now records every agent's reply |
| 3 | Task 1: the builder stopped and explained; the review was refused | The builder was right: the task wording contradicted itself (only three files, but "run the packager", which rewrites others). The reviewer also wrote a sentence before the verdict. | Wording clarified to mean the net change to files. A stray sentence before a single complete verdict is now set aside and kept. |
| 4 | Task 1 built, proved and reviewed PASS; the verdict was refused | The runner's example verdict was double-spaced, and the reviewer copied it | The example is now one tight block, locked in by a test |
| 5 | **All three tasks PASS; every check held** | | |

A launch between 1 and 2 was also refused at the pre-flight check because group B's fixes were not committed yet. That was the guard working.

**Safety checks, all launches:**
- nothing was written outside this repository;
- the Codex settings file was never changed;
- no change landed outside a task's allowed files;
- the containment probe denied every protected location each time.

## What needed people

- **Chris relaunched five times.** The runner stops after a failed review instead of sending it back, so a person has to start the next round.
- **Four fixes went through agent-to-agent review between launches.** None needed a decision from Chris.
- **Commits are manual.** The runner leaves passed work uncommitted. After the run, each builder commits its own task and the reviewer checks the commit matches what was reviewed.
- **Two batches of CodeRabbit findings** (groups A and B) were triaged and fixed before the final launch. Group C (three plugin document-compiler findings) is deferred as its own slice.

## Open gaps

**Needed before activation:**
1. **A failed review should go back to the builder automatically,** following the progress rule and the 5-round checkpoint pause in the amendment. Today the runner stops and waits for a relaunch.
2. **The builder's next round should see the reviewer's findings.** Today round 2 gets only the original task.
3. **The runner itself should keep the builder's reply.** Today only the pilot launcher does.

**Worth fixing, not blocking:**
- Some runner tests allow only 100 milliseconds for a step, and a busy Windows machine sometimes takes longer. The failures move between tests; it is test-only.
- A Codex usage-limit error now stops the run labelled "exited with an error" rather than "usage problem". Same stop, less specific label.
- The Work Board and the runner's queue file are kept in step by hand.

**Known limits, unchanged:**
- The runner cannot verify who wrote an approval.
- The sampling-audit rate is still open.
- The review backlog has not been piloted.

## Recommendation

1. **Next slice (Codex builds, Claude reviews):** runner gaps 1 to 3 above, plus the 100 ms test timeouts.
2. **Then activate the split gate for ordinary-risk slices,** which is what this pilot exercised: documentation, build configuration, tests.
3. **Keep the current gate for keystone work** (authority, persistence, schemas, identity, migrations) until that kind of slice has been through the runner at least once with you watching the report.
4. **Pilot the review backlog separately** later, as planned.

**The decision is yours:** whether to take this path, or activate now and accept relaunching after each FAIL until the runner slice lands.
