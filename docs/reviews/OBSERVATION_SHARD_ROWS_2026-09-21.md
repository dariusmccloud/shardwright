# Observation: Shard Rows in Real Jeep Chats

**Status:** Evidence record; non-governing. Read-only observation. No chat file, ledger, contract, or code was changed.
**Date:** 2026-09-21
**Purpose:** Size open decision D-J (structural labeling of derived shard rows) in the [Mission and Capability Map](../MISSION_AND_CAPABILITY_MAP.md).
**Privacy:** This record contains counts and metadata key names only. No message text is reproduced.

## Method

A read-only Node script parsed every `*.jsonl` chat file in each Jeep folder and, for each row with a string `mes` field, tested whether the text **begins with** `[MEMORY SHARD:`, `[CONSOLIDATED MEMORY SHARD:`, or `[SUMMARY:` (case-insensitive). It also counted rows where such a header appears **later** in the text, and tallied the names of `extra` metadata keys on shard-header rows versus other rows. Scripts were run from the session scratchpad (not committed).

Corpora inspected (the two installs Chris runs):

- `D:\SillyTavern\data\default-user\chats\Jeep` (15 files)
- `D:\SillyBunny\data\default-user\chats\Jeep` (19 files)

## Results

| Measure | SillyTavern | SillyBunny |
|---|---|---|
| Chat files | 15 | 19 |
| Message rows | 7,442 | 4,430 |
| Unparseable lines | 0 | 0 |
| Rows starting with a shard/summary header | 60 (0.8%) | 55 (1.2%) |
| Files containing at least one | 12 | 5 |
| Rows with a header later in the text (quoted or discussed) | 10 | 10 |
| Header rows with `is_system: true` | 17 | 14 |
| Header rows with `is_system: false` | 43 | 41 |

Observations from the key-name pass:

- **No shard-specific structured marker exists today.** Shard rows carry the same Shardwright metadata as ordinary messages: `extra.summary_sharder` (SillyTavern) or `extra.shardwright` (SillyBunny), each with `speakerIdentity`, `evidencePolicy`, and `messageIdentity`. Ordinary rows carry the same three.
- **`evidencePolicy` does not distinguish shards.** Its value is `"include"` on all shard rows (60 of 60; 37 of 37 where present in SillyBunny) and on ordinary rows. The field exists per message and is written by `core/summarization/message-identity-core.js` and `core/transcript/runtime-message-identity-capture.js`. Whether the server-side transcript parser reads it was **not** verified; the parser code inspected earlier reads only `mes`.
- Shard rows carry `extra.type = "generic"` on most rows (56 of 60; 54 of 55) and no equivalent on other rows in the lists inspected. This was observed, not verified as a reliable marker.

## Interpretation, with limits

1. **Scale is small but real.** About 1% of rows are shard-header rows. Any labeling change touches a small, identifiable slice of a corpus.
2. **Header text is an imperfect marker.** Ten rows per corpus mention a header mid-text (quotes and discussion of shards), and a start-anchored match could still catch a person quoting a header at the start of a message. I did not read the 60 and 55 rows to confirm each is a generated shard.
3. **`is_system` is not reliably `false`.** Shard creation sets `is_system = false` (`core/summarization/output.js:494`), yet 28% of header rows in each corpus have `is_system: true`. The cause was not investigated. Hiding by visibility controls is a plausible but **unverified** explanation.
4. **A candidate structured hook exists.** Because `evidencePolicy` is already a per-message field and shards currently share the value `"include"`, a distinct value stamped at shard creation is one possible D-J design. Whether that is the right field, and whether the parser and bundle would honor it, needs a contract and code inspection first.
5. **Counts overlap.** Many files are imported branch copies of the same conversation (identical shard-row counts recur across files). Do not add the two columns or the file counts to get a unique-shard total; a unique count was not computed.
6. **Not determined:** whether any of these shard rows appeared in a past recall bundle. The recorded proofs keep only bounded metadata, not a row-level inventory, so this cannot be answered from them. It would need a new bundle inspection.

## Bounded next movement (not started)

For D-J: inspect whether the server transcript parser and bundle could carry a derived marker taken from a creation-time stamp, and draft the contract. Existing (older) shards would need header-based detection or backfill, with the false-positive limits above.
