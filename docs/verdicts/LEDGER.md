# Verdict Ledger

Append-only. One row per verdict, written once, at the same time the verdict file is written. This is the tamper-detection mechanism Codex's correction 1 asked for: a verdict file's *current* hash is checked against its ledger entry here. A mismatch means the file was edited after the fact and the verdict is void, regardless of what the file currently says.

**Rule:** rows are only ever appended. A correction to a past verdict is a new addendum file referenced from the original slice record (never an edit to the original verdict file or a rewrite of its ledger row).

Inactive today — nothing writes to or checks this file yet; it exists so the format is real before the runner is built.

| Slice ID | Verdict file | Verdict file hash (SHA-256) | Verdict | Subtype | Reviewer | Timestamp |
|---|---|---|---|---|---|---|
| *(no entries yet)* | | | | | | |
