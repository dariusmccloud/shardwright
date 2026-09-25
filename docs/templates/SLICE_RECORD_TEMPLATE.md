# Slice Record Template

Copy this file to `docs/slices/<slice-id>.md` (folder does not exist yet — create it on first use) and fill it in. Defined by [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](../proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §7, tightened per Codex's second review (2026-09-25). Inactive today: nothing reads or enforces this format until the runner (Step 3) exists.

**Once a verdict is recorded (see VERDICT_TEMPLATE.md and `docs/verdicts/LEDGER.md`), this file becomes append-only.** Do not edit it in place; add a dated addendum section at the bottom instead. The ledger's hash check is what makes an undisclosed edit detectable.

**Each field below is labeled with who authors it** (Codex's correction 9), so the implementer cannot fill in a field only the reviewer or runner is supposed to prove.

```markdown
# Slice: <slice-id>

**Status:** ACTIVE | PROVEN | STALE_REVIEW | REVIEW_DEBT | BLOCKED   *(runner-authored once it exists; implementer sets ACTIVE at creation)*
**Risk class:** Ordinary | Integration | Keystone   *(implementer proposes; reviewer may raise, never lower)*
**Implementer:** <agent + model/session>   *(implementer-authored)*
**Started / Finished:** <timestamps>   *(implementer-authored)*

## Declaration   *(implementer-authored)*
(Same fields the Method Contract already requires — this does not replace them, it records them alongside the evidence.)

- **Problem:**
- **Evidence:**
- **Target result:**
- **In scope:**
- **Out of scope:**
- **Proof required:**
- **Stop condition:**

## Governing contracts depended on   *(implementer-authored; reviewer verifies)*
| Contract | Version/hash at approval |
|---|---|
| `AGENTS.md` / Method Contract | <version or content hash — always listed> |
| `AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md` (if this slice is activation-workstream related) | <version/hash> |
| <project contract(s) this slice implements> | <version or content hash> |

(Codex's correction 4: the governing contract stack itself is dependency evidence — if any row changes before dispatch or review, the entry becomes `STALE_REVIEW`, amendment §6a.)

## Evidence: worktree manifest   *(fingerprints computed per WORKTREE_MANIFEST_FORMAT.md)*
- **Declared baseline fingerprint:** <manifest hash>   *(implementer-authored, before starting)*
- **Post-slice fingerprint:** <manifest hash>   *(implementer-authored, after finishing)*
- In-scope paths: `<list>`
- Out-of-scope paths: `<list>`
- **Reviewed fingerprint:** <manifest hash>   *(reviewer-authored — independently recomputed from the live tree, never copied from above)*

(Once work is committed, a commit hash / tree hash may be recorded instead of the manifest — same independent-recomputation rule applies.)

## Proof   *(runner-authored — runner executes the command directly and captures this; the implementer does not hand-type these rows)*
One row per proof command.

| Command | Exit code | Output hash (SHA-256) | Artifact path | Environment/runtime version | Input fixture/hash | Capture timestamp |
|---|---|---|---|---|---|---|
| | | | | | | |

**Runtime/browser proof:** required: yes/no · done: yes/no · location:

## Governing documents reconciled   *(implementer-authored; reviewer verifies)*
| Document | Result |
|---|---|
| | Updated / Already current / Intentionally unchanged |

## Plain-language brief for Chris   *(implementer-authored)*
- **Done:**
- **Supports:**
- **Expected outcome:**
- **Needed from Chris (if anything):**

## Recommended next slice (advisory only — does not authorize anything)   *(implementer-authored)*
- **Recommend:**
- **Why:**

## Unresolved items / review debt

## Verdict
Link to each round's `docs/verdicts/<slice-id>-r<round>.md` after review: `<link>`. Confirm each has a line in `docs/verdicts/ledger.jsonl` before treating this slice as reviewed.

## Addenda
(Dated entries only. Never edit the sections above after a verdict is recorded.)
```
