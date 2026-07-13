# C0.6.9E Finalized Multi-Source Replay Contract Report

Last updated: 2026-07-12

Boundary status: implemented and focused-proof complete

Parent phase status: `C0.6.9E` remains active

## Purpose

Record the completed prerequisite boundary that allows a finalized Architectural shard to preserve consolidated multi-source provenance and replay deterministically without another model call.

This report does not declare `C0.6.9E` complete. Proposal-handoff restart replay and packaged Node/Bun parity remain open.

## Governing Decision

The finalized Architectural shard is a consolidated multi-source continuity artifact, not a current-range delta.

Therefore:

1. inherited qualifying records may remain in the rendered shard,
2. inherited records retain their original provenance,
3. generation context remains separate from record provenance,
4. every source reference resolves through a named immutable manifest descriptor,
5. replay binds the normalized manifest set and its deterministic hash,
6. full historical source content is not duplicated into the replay artifact.

## Authority Classification

```text
immutable replay artifact
+ architectural-shard-replay-ledger.jsonl registration
-> portable replay authority

SQLite
-> operational projection only

chat / lorebook
-> canonical rendered shard only

browser
-> transient transport and review intent only
```

The portable artifact and ledger outrank any future SQLite projection. Missing or conflicting portable authority must refuse rather than regenerate silently.

## Implemented Contract

### 1. Separate schema roles

- `architectural-intermediate/v1` remains the model-generation schema.
- `architectural-finalized/v1` is the consolidated multi-source semantic schema.
- Replay artifact schema version `2` binds the finalized schema and manifest set.

### 2. Generation context

The finalized payload records:

- generation range,
- generated message IDs,
- current manifest identity.

Generation context does not claim ownership of inherited historical references.

### 3. Source-manifest set

Each bound manifest descriptor records:

- `manifestId`,
- `sourceIdentityHash`,
- `sourceRevisionHash`,
- source start and end positions at creation.

Descriptors are normalized by manifest identity before hashing. Input order does not change `sourceManifestSetHash`.

### 4. Record provenance

Each finalized semantic record carries:

- `originManifestId` or governed `authorityRecordId`,
- exact reference-to-manifest bindings.

Every `sourceRef`, thread boundary reference, and source-shaped decision evidence reference must resolve inside its named manifest range.

### 5. Deterministic rendering and replay

Validated finalized records project into the existing deterministic renderer without rendering provenance metadata into the shard text.

Replay verifies:

```text
artifact version
-> normalized manifest set and hash
-> semantic payload hash
-> deterministic finalized rendering
-> exact canonical output
-> canonical output hash
-> content-addressed artifact identity
```

### 6. Portable authority storage

The server-managed authority path provides:

- immutable content-addressed artifact files,
- one idempotent portable registration event,
- authenticated write and read routes,
- exact missing, conflict, version, and tamper refusal.

No replay metadata is written into chat JSONL or lorebook content.

### 7. Post-review finalization and live save integration

The review modal returns operator intent only. Core post-review reconciliation:

1. applies selection intent to generated and inherited records,
2. retains inherited record provenance through historical manifests,
3. refuses raw rendered-text authority edits,
4. produces one finalized semantic payload,
5. renders the exact canonical shard from that payload,
6. constructs the replay artifact from the same payload/output pair.

Before review, the live pipeline allocates and validates the current source-manifest identity. After host save, the same identity is registered against the saved output before the replay artifact is persisted. Replay persistence is independent of proposal eligibility; a valid saved shard that produces no proposal still receives its governed replay artifact.

## Failure Policy

The boundary refuses when:

- a record reference has no manifest binding,
- a reference falls outside its named manifest,
- a required manifest is unavailable,
- manifest identities are duplicated,
- payload, output, manifest-set, or artifact hashes disagree,
- an artifact or renderer contract version is unsupported,
- registered portable authority is missing or unreadable.

Refusal never authorizes regeneration, source rebinding, SQLite-only authority, or proposal creation from unverifiable replay state.

## Focused Proof

Command:

```powershell
node --test core/summarization/architectural-finalized-semantic.test.mjs core/summarization/architectural-semantic-replay-artifact.test.mjs tools/server-plugin/summary-sharder-memory/architectural-replay.test.mjs tools/server-plugin/summary-sharder-memory/architectural-replay-routes.test.mjs
```

Observed result:

```text
tests 16
pass 16
fail 0
exit 0
```

Additional validation:

```powershell
node --check core/summarization/architectural-finalized-semantic.js
node --check core/summarization/architectural-semantic-replay-artifact.js
git diff --check
```

All completed successfully.

Live finalization integration proof (2026-07-12):

```powershell
node --test core/summarization/architectural-live-finalization.test.mjs core/summarization/architectural-post-review-finalization.test.mjs core/summarization/shard-integrity-core.test.mjs core/summarization/architectural-decision-ledger.test.mjs core/summarization/architectural-authority-server-api.test.mjs core/summarization/architectural-finalized-semantic.test.mjs core/summarization/architectural-semantic-replay-artifact.test.mjs
```

Observed result:

```text
tests 50
pass 50
fail 0
exit 0
```

Syntax checks for the modified live-path modules and `git diff --check` also exited `0`.

The focused matrix proved:

1. current-range records resolve against the current manifest,
2. inherited decisions resolve against historical manifests and retain their source references,
3. unbound historical references refuse,
4. references bound to the wrong manifest refuse,
5. manifest order does not affect the normalized manifest-set hash,
6. finalized semantic payload renders byte-identical canonical output,
7. replay restores identical payload, output, versions, and hashes,
8. portable storage survives reopen and duplicate registration remains idempotent,
9. authenticated routes preserve exact success and refusal behavior.

Expected error logs emitted during negative route cases were visible and corresponded to asserted refusal codes; no test failure was masked.

## Remaining C0.6.9E Work

1. Prove proposal-handoff state survives restart and replay.
2. Prove packaged Node/Bun semantic parity.

## Closed Boundary

The completed result is:

```text
multi-source finalized semantic records
-> exact named-manifest provenance validation
-> core reconciliation of operator review intent
-> deterministic canonical renderer
-> versioned replay artifact
-> stable pre-save/post-save manifest identity
-> portable authority storage and authenticated reload
```

The next implementation slice may depend on this contract but may not redefine its authority classification implicitly.
