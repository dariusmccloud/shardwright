# Verdict Template

Copy to `docs/verdicts/<slice-id>.md` (folder exists; see `docs/verdicts/LEDGER.md`). Written by the **reviewer**, never the implementer. Defined by [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](../proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §3, §4, §6a, tightened per Codex's second review (2026-09-25). Inactive today — see the same note as the slice-record template.

**Immutability mechanism (Codex's correction 1):** editing this file's text does not create a new file — the actual protection is that (a) the file is never edited in place after being written, corrections go in a dated addendum instead, and (b) at write time its SHA-256 hash is appended to `docs/verdicts/LEDGER.md`. The runner rejects any verdict whose current file hash no longer matches its ledger row — that mismatch is treated as tampering, not as a new valid verdict.

```markdown
# Verdict: <slice-id>

**Reviewer:** <agent + model/session, must differ from the implementer>
**Timestamp:**
**Verdict:** PASS | FAIL | ESCALATE | SELF_REVIEW_DEFERRED
**Subtype:** (only when Verdict is ESCALATE) NEEDS_HUMAN_ACTION | <none>

(Machine-readable form per Codex's correction 5 — `verdict` and `subtype` are separate fields, not a combined string. `NEEDS_HUMAN_ACTION` is still a kind of `ESCALATE`, never a fifth top-level verdict.)

## Evidence this verdict is bound to
- **Reviewed fingerprint:** <manifest hash — reviewer's own independent computation per WORKTREE_MANIFEST_FORMAT.md, or commit/tree hash>

Do **not** copy the implementer's declared baseline or post-slice fingerprint here. Compute this value directly from the live tree, then compare it to what the slice record declares:

| | Slice record says | Reviewer independently computed | Match? |
|---|---|---|---|
| Fingerprint | `<...>` | `<...>` | yes/no |

A mismatch is itself a finding (FAIL at minimum; ESCALATE if the cause is unclear).

## What was checked
- [ ] Proof output/artifact actually inspected — for each row, the recorded output hash was verified against the archived artifact, not just read as a claim
- [ ] Diff/manifest stays within declared in-scope paths; any out-of-scope change is explained
- [ ] Every governing-contract row in the slice record, including `AGENTS.md` itself, matches its current version/hash
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

### If Subtype: NEEDS_HUMAN_ACTION specifically
- **Exact action Chris must take:**
- **Expected observation:**
- **What result permits continuation:**

## If SELF_REVIEW_DEFERRED
Confirm all of amendment §8's conditions before using this — ordinary risk, reversible, existing contract, touches none of: authority, persistence, lifecycle, replay, schemas, migrations, security, sync, external files, identity, UI state, user data. Record the review-debt entry.

- [ ] All conditions above confirmed
- **Review-debt ledger entry:** `<link>`

## What would invalidate this verdict (Codex's correction 10)
Any of the following, checked at dispatch time or later, voids this verdict and routes the slice back to review (`STALE_REVIEW`):

- [ ] Tree/manifest fingerprint no longer matches "Reviewed fingerprint" above
- [ ] A governing contract listed in the slice record changed version/hash
- [ ] A declared external dependency changed
- [ ] A captured proof artifact's hash no longer matches what was recorded
- [ ] The Work Board queue approval for this slice was revoked or changed

## Ledger entry
Confirm this file's SHA-256 hash is recorded in `docs/verdicts/LEDGER.md` before this verdict is treated as final.
```
