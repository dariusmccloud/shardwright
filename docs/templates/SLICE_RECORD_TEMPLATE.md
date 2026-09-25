# Slice Record Template

Copy this file to `docs/slices/<slice-id>.md` (folder does not exist yet — create it on first use) and fill it in. Defined by [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](../proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §7. Inactive today: nothing reads or enforces this format until the runner (Step 3) exists.

**Once a verdict is recorded on this file (see VERDICT_TEMPLATE.md), this file becomes append-only.** Do not edit it in place afterward; add a dated addendum instead. This is what makes a recorded proof or a FAIL tamper-evident (amendment §7, §3a).

```markdown
# Slice: <slice-id>

**Risk class:** Ordinary | Integration | Keystone
**Implementer:** <agent + model/session>
**Started / Finished:** <timestamps>

## Declaration
(Same fields the Method Contract already requires — this does not replace them, it records them alongside the evidence.)

- **Problem:**
- **Evidence:**
- **Target result:**
- **In scope:**
- **Out of scope:**
- **Proof required:**
- **Stop condition:**

## Governing contracts depended on
| Contract | Version/hash at approval |
|---|---|
| <name> | <version or content hash> |

(If any of these change before this slice is dispatched or reviewed, the queue entry becomes `STALE_REVIEW` — amendment §6a.)

## Evidence reviewed
Pick one:
- **Commit/tree:** `<commit hash>` / `<tree hash>`
- **Worktree manifest** (used when review happens before a commit):
  - Baseline fingerprint: `<hash or listing>`
  - Post-slice fingerprint: `<hash or listing>`
  - In-scope paths: `<list>`
  - Out-of-scope paths: `<list>`

## Proof
One row per proof command. The runner captures these directly (amendment §3a, §10) — do not hand-type a result summary in place of this.

| Command | Exit code | Output/artifact location | Environment | Input fixture/hash |
|---|---|---|---|---|
| | | | | |

**Runtime/browser proof:** required: yes/no · done: yes/no · location:

## Governing documents reconciled
| Document | Result |
|---|---|
| | Updated / Already current / Intentionally unchanged |

## Plain-language brief for Chris
- **Done:**
- **Supports:**
- **Expected outcome:**
- **Needed from Chris (if anything):**

## Recommended next slice (advisory only — does not authorize anything)
- **Recommend:**
- **Why:**

## Unresolved items / review debt

## Verdict
See `docs/verdicts/<slice-id>.md` once reviewed. Link it here after review: `<link>`
```
