# Verdict Template

Copy to `docs/verdicts/<slice-id>.md` (folder does not exist yet). Written by the **reviewer**, never the implementer. Defined by [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](../proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §3, §4, §6a. Inactive today — see the same note as the slice-record template.

**Hash-bound / append-only once written** (amendment §3a, §7). A later edit is a different file/hash and is visibly not the reviewed verdict.

```markdown
# Verdict: <slice-id>

**Reviewer:** <agent + model/session, must differ from the implementer>
**Timestamp:**
**Verdict:** PASS | FAIL | ESCALATE | ESCALATE/NEEDS_HUMAN_ACTION | SELF_REVIEW_DEFERRED

## Evidence this verdict is bound to
(Copy exactly from the slice record — this is what makes the verdict invalid if the tree changes before dispatch, amendment §3b.)

- Commit/tree **or** worktree manifest fingerprint: `<...>`

## What was checked
- [ ] Proof output/artifact actually inspected (not just the implementer's summary) — command(s), exit code(s), and results match the slice record
- [ ] Diff/manifest stays within declared in-scope paths; any out-of-scope change is explained
- [ ] Governing documents reconciled as claimed
- [ ] Register row (if any) matches this slice record
- [ ] Report claims no stronger than the recorded proof
- [ ] Any "already authorized by existing contract" claim cites the specific clause

## Findings (if FAIL or ESCALATE)
| Category (see amendment §4 lists) | Description |
|---|---|
| | |

## If ESCALATE
- **Decision needed:**
- **Options:**
- **Evidence:**

### If ESCALATE/NEEDS_HUMAN_ACTION specifically
- **Exact action Chris must take:**
- **Expected observation:**
- **What result permits continuation:**

## If SELF_REVIEW_DEFERRED
Confirm all of amendment §8's conditions before using this — ordinary risk, reversible, existing contract, touches none of: authority, persistence, lifecycle, replay, schemas, migrations, security, sync, external files, identity, UI state, user data. Record the review-debt entry.

- [ ] All conditions above confirmed
- **Review-debt ledger entry:** `<link>`

## Revalidation note
This verdict is valid only while the evidence fingerprint above still matches the tree at dispatch time. The runner re-checks this before starting the next slice (amendment §3b) — do not treat a PASS as permanent.
```
