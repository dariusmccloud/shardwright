# Shardwright Work Board

**Status:** Tracking board, not yet load-bearing. Populated by hand today; nothing here is enforced by a runner, because the runner does not exist yet (activation prerequisite, [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) Section 12).
**Authority:** [PHASE_X_DELIVERY_REGISTER.md](PHASE_X_DELIVERY_REGISTER.md) remains the authority for workstream status. This board is the operational queue and "what's pending" view; it does not override the Register or any contract.
**Rule (per the amendment draft, Section 6):** only Chris adds, approves, reorders, or removes entries in **Queued**. Agents may propose into **On the table but not yet scoped**.
**Reverse link:** the Register should link back here, but the Register has an in-progress edit (uncommitted) as of 2026-09-25; adding the link is deferred to avoid committing someone else's in-progress work under this change.

---

## 🔴 Needs you

| Item | What's needed | Source |
|---|---|---|
| D-1 recall-quality baseline | Real queries + which messages should surface, so a harness can be built and scored | [Mission map](MISSION_AND_CAPABILITY_MAP.md) §6 |
| D-J shard-labeling contract | Confirm intended future-state for structural shard labeling (current-state is documented) before drafting the contract | [Mission map](MISSION_AND_CAPABILITY_MAP.md) §6, [shard observation](reviews/OBSERVATION_SHARD_ROWS_2026-09-21.md) |
| Similharity dependency audit + behavioral test | Decide priority relative to other work | [Similharity provenance](../vendor/similharity/PROVENANCE.md) |
| README server-plugin install steps | Verify actual copy-in steps against a real install before documenting them | [README.md](../README.md) |
| Activation of the split-gate amendment | Final decision, only after Steps 1–4 below are built and piloted | [AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md](proposals/AGENTS_AMENDMENT_SPLIT_GATE_DRAFT.md) §12 |

## 🟡 Running or in review

| Item | Status |
|---|---|
| Activation-prerequisites workstream (Steps 1–4, per Codex's ordering) | Step 1 (this board) done; Step 2 (templates, manifest format, verdict ledger) done and revised once per Codex's review; line-ending policy adopted and working tree normalized (863/863 files byte-identical); Codex CLI installed (`0.157.0`); Step 3 drafted in `docs/proposals/STEP3_RUNNER_SLICE_DECLARATIONS_DRAFT.md`, not started |

## 🟢 Queued (approved, in order)

*(Populated by Chris only. Agents record an entry here only after Chris's explicit approval, citing where that approval is recorded.)*

Each entry must carry these fields so a runner can determine what "approved, in order" actually means (Codex's correction 7):

| Position | Slice ID | Risk class | Owner/implementer | Dependencies | Governing contract version/hash | Approval record | Status |
|---|---|---|---|---|---|---|---|
| 1 | 3a (worktree manifest module) | Ordinary | Codex (implements); Claude (reviews) | Line-ending normalization (`6f90622`) | Spec at `630948d`; declaration at `3aba6a7` | Chris, 2026-09-25, in session; recorded in `docs/proposals/STEP3_RUNNER_SLICE_DECLARATIONS_DRAFT.md` | Authorized, not started |

- **Approval record** means: who approved it, when, and a pointer to where that approval is recorded — not just "it appears in this column."
- **Before activation (Codex's correction 8):** the runner must verify each entry's approval record independently before dispatching it. An entry merely appearing under Queued is not sufficient evidence of approval, since this file is hand-edited and nothing currently stops an agent from adding a row. Until that verification exists, this column is convention only.

## ⚪ On the table, not yet scoped

- Register restructure: shrink long accumulated-proof rows into linked slice records (raised in the transcript-recall design review; not started)
- D-A: whether/when BananaBread + Similharity join transcript recall as a reranker (waiting on the D-1 baseline)
- Recall-quality baseline harness itself (depends on D-1 answers above)

## ✅ Recently done

- `7416fbc` Record two-agent sign-off on the split-gate amendment draft
- `ef32100` Fold Codex's ten corrections into the split-gate amendment draft
- `4eea4fa` License file
- `74803d7` Draft inactive AGENTS.md amendment: split terminal gate
- `c3cc777` Preserve Similharity plugin at original-source commit d695fbb
- `b93c908` Record shard-row observation and size decision D-J

Codex has separate in-progress work in the same tree (Sync Store and Multi-Instance contract, compiled-context document pilot, transcript maintenance run ledger, group participant resolution) — uncommitted as of 2026-09-25, not listed here as "done" because it isn't committed yet.
