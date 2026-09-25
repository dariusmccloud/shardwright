# Verdict Ledger

This page explains the ledger. The ledger itself is a separate machine-readable file, `docs/verdicts/ledger.jsonl`, which does not exist yet; slice 3b builds the code that writes and checks it (see [STEP3_RUNNER_SLICE_DECLARATIONS_DRAFT.md](../proposals/STEP3_RUNNER_SLICE_DECLARATIONS_DRAFT.md), slice 3b).

## What it does

It detects tampering with review verdicts. When a reviewer writes a verdict file, the ledger records the SHA-256 hash of that file's exact bytes, computed by the ledger code itself. Later, the file's current hash is compared with the recorded one. A mismatch means the verdict was edited after the fact, and the verdict is void (`TAMPERED`), whatever the file now says.

## Rules

- **Append-only.** A new line is only ever added at the end. Existing lines are never edited, reordered, or deleted.
- **Review rounds.** A slice can be reviewed more than once (for example FAIL, then a fix, then PASS). Each review is a new round with its own verdict file (`docs/verdicts/<slice-id>-r<round>.md`) and its own ledger line. Rounds count up from 1 without gaps. A slice's current verdict is its highest round.
- **Corrections** to a past verdict never edit the verdict file or its ledger line. They go in a dated addendum referenced from the slice record.
- **A damaged ledger fails closed.** If any line is unreadable or incomplete, verification reports `LEDGER_CORRUPT` for the whole ledger rather than guessing.

## Line format (JSON Lines)

One JSON object per line, UTF-8, each line ending in a line feed:

```json
{"sliceId":"3a","round":1,"verdictPath":"docs/verdicts/3a-r1.md","verdictSha256":"<64 hex>","verdict":"PASS","subtype":null,"reviewer":"Claude (Opus 5.5)","recordedAt":"2026-09-25T18:00:00Z"}
```

- `verdict`: `PASS`, `FAIL`, `ESCALATE`, or `SELF_REVIEW_DEFERRED`.
- `subtype`: `NEEDS_HUMAN_ACTION` (only with `ESCALATE`) or `null`.

## Status

Inactive. Nothing writes to or checks a ledger yet. The verdicts for slices 3a and 3a.1 were given in the session and recorded in the Step 3 declarations file, not here, because the ledger code did not exist when they were issued.
