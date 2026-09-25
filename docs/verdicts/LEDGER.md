# Verdict Ledger

This page explains the ledger. The ledger itself is a separate machine-readable file, `docs/verdicts/ledger.jsonl`, which does not exist yet; slice 3b builds the code that writes and checks it (see [STEP3_RUNNER_SLICE_DECLARATIONS_DRAFT.md](../proposals/STEP3_RUNNER_SLICE_DECLARATIONS_DRAFT.md), slice 3b).

## What it does

It detects tampering with review verdicts. When a reviewer writes a verdict file, the ledger records the SHA-256 hash of that file's exact bytes, computed by the ledger code itself. Later, the file's current hash is compared with the recorded one. A mismatch means the verdict was edited after the fact, and the verdict is void (`TAMPERED`), whatever the file now says.

## Rules

- **Append-only.** A new line is only ever added at the end. Existing lines are never edited, reordered, or deleted.
- **Review rounds.** A slice can be reviewed more than once (for example FAIL, then a fix, then PASS). Each review is a new round with its own verdict file (`docs/verdicts/<slice-id>-r<round>.md`) and its own ledger line. Rounds count up from 1 without gaps. A slice's current verdict is its highest round.
- **Corrections** to a past verdict never edit the verdict file or its ledger line. They go in a dated addendum referenced from the slice record.
- **A damaged ledger fails closed.** If any line is unreadable or incomplete, verification reports `LEDGER_CORRUPT` for the whole ledger rather than guessing.

## Known limits (accepted, 3b review 2026-09-25)

- **One writer at a time.** The ledger does not lock. If two processes append at once, a duplicate round can be written. It is never silently accepted: the next read reports `LEDGER_CORRUPT`. The runner is a single process, so this is not expected in normal use.
- **An interrupted write needs manual repair.** If a crash leaves a partial last line, the whole ledger reports `LEDGER_CORRUPT` until someone removes that partial line. This is the chosen fail-closed behavior: the ledger never guesses.
- **Verdict files must use LF line endings** (enforced since slice 3b.1: a verdict file containing any carriage return is refused at append). A file saved with CRLF would be rewritten to LF by git on checkout, which changes its hash and would be misreported as tampering.
- **Each verdict file is recorded once.** A path already in the ledger, for any slice or round, is refused, with letter case ignored (3b.1). This keeps a later round from overwriting an earlier round's evidence.

## Line format (JSON Lines)

One JSON object per line, UTF-8, each line ending in a line feed:

```json
{"sliceId":"3a","round":1,"verdictPath":"docs/verdicts/3a-r1.md","verdictSha256":"<64 hex>","verdict":"PASS","subtype":null,"reviewer":"Claude (Opus 5.5)","recordedAt":"2026-09-25T18:00:00Z"}
```

- `verdict`: `PASS`, `FAIL`, or `ESCALATE`. The ledger code (3b) still accepts a fourth value, `SELF_REVIEW_DEFERRED`, which was withdrawn on 2026-09-25 (amendment §8). The runner refuses it, so nothing should produce it. Removing it from the ledger code is left for a later cleanup.
- `subtype`: `NEEDS_HUMAN_ACTION` (only with `ESCALATE`) or `null`.

## Status

The ledger **code** exists and is tested: `tools/slice-runner/ledger.js` (slices 3b and 3b.1), used by the runner in 3c. The **real ledger file** `docs/verdicts/ledger.jsonl` does not exist yet: the code has only run against temporary test ledgers, and nothing in this repository writes to or checks a real one. Verdicts for the Step 3 slices were given in the session and recorded in the Step 3 declarations file, because the split gate is not active.
