# Shardwright Transcript Maintenance-Run Ledger Contract

**Version:** 0.1.0
**Status:** ENTERED — governing boundary for event-triggered and scheduled source
maintenance; no runtime implementation is authorized by this document alone.
**Parent contract:** [Transcript Index And Recall Experience Contract](SHARDWRIGHT_TRANSCRIPT_INDEX_AND_RECALL_EXPERIENCE_CONTRACT.md)

## 1. Purpose

This contract defines the durable operational record for Transcript Index
maintenance checks. It makes a maintenance attempt auditable without turning a
freshness check into source authority, source registration, transcript content, or
projection state.

The first implementation target is the cheap metadata check for an active registered
source. The same record shape may later cover bounded scheduled checks. Neither use
authorizes enumeration of unregistered files, full transcript parsing, automatic
registration, automatic intake, lineage inference, or sharing changes.

## 2. Authority and projection boundary

The source registry, source-revision, message, and visibility ledgers remain the
authoritative transcript records. The maintenance-run ledger is authoritative only
for the fact that Shardwright attempted a maintenance operation, the scope it
declared, the metadata it observed, and the outcome it recorded. It MUST NOT assert
that a source revision exists, that content was ingested, or that the SQLite
projection is current.

The maintenance-run ledger is append-only operational evidence. It is not an input
to the incremental transcript projector and MUST NOT be used to repair, advance, or
replace any projection cursor. A rebuild MAY retain or discard its derived view of
maintenance history without changing transcript authority.

## 3. Owner and storage

The server-side Transcript Index maintenance service owns creation, closure, replay,
validation, and recovery of maintenance-run records. Browser code and host chat
files are not ledger owners.

The implementation MUST use one append-only JSONL ledger per authenticated storage
root at `transcript-maintenance-run-ledger.jsonl`, protected by a dedicated lock at
`locks/transcript-maintenance-run-ledger.lock`. The ledger is local to that storage
root; it MUST NOT be silently shared across users or installations.

## 4. Entry shape and lifecycle

Each run has a stable `runId` and produces at least two ledger entries:

1. `OPEN_MAINTENANCE_RUN`, appended before source inspection; and
2. `CLOSE_MAINTENANCE_RUN`, appended after inspection, refusal, failure, or explicit
   suspension.

If the process ends after the open entry, replay MUST expose the run as `OPEN` and
MUST NOT imply success. A later recovery or resume MUST append a new close entry; it
MUST NOT rewrite the open entry.

Every entry MUST contain:

```text
ledgerVersion
sequence
entryId
operation
entryHash / payloadHash
runId
triggerKind
sourceScope
startedAt or recordedAt
```

The open payload MUST include the declared source scope and trigger. The close
payload MUST include the terminal state, completed/expected counts when applicable,
revision-boundary metadata, and an outcome or refusal/failure category.

Allowed trigger kinds are `ACTIVE_CHAT_LOAD`, `ACTIVE_CHAT_CHANGE`,
`BEFORE_ELIGIBLE_RETRIEVAL`, and `SCHEDULED`. A future trigger kind requires a
contract amendment.

Allowed terminal states are `COMPLETED`, `SUSPENDED`, `FAILED`, and `REFUSED`.
`OPEN` is a replayed state for an unclosed run, not a successful terminal outcome.

## 5. Scope and metadata custody

The source scope MUST identify registered `sourceLogicalId` values and their
character or group scope. Active-source checks MUST name at most the active
registered source. A scheduled check MUST declare its bounded registered-source set
before opening the run.

A metadata check MAY record only non-content filesystem evidence such as resolved
locator hash, existence, byte length, modification timestamp, creation timestamp
when available, and a metadata fingerprint. It MUST NOT record transcript bytes or
claim a content hash unless the existing source-observation operation was explicitly
invoked afterward.

The ledger MUST distinguish `NOT_SCANNED`, `METADATA_UNAVAILABLE`, `UNCHANGED`,
`POSSIBLE_REVISION`, `SOURCE_MISSING`, `SOURCE_UNRESOLVED`, and `ERROR` outcomes.
`POSSIBLE_REVISION` is a trigger for the existing explicit observe/intake path, not
an intake decision.

## 6. Concurrency, integrity, and recovery

Only one append may hold the maintenance-run lock for a storage root at a time.
Concurrent or ambiguous source resolution MUST close as `REFUSED` or `FAILED` with
an explicit category; cached locator substitution is forbidden.

Replay MUST refuse a malformed line, sequence gap, duplicate sequence, unsupported
ledger version, invalid operation transition, mismatched payload hash, or close entry
whose `runId` has no open predecessor. The ledger's bytes MUST be preserved for
quarantine and diagnosis. A malformed maintenance ledger MUST NOT invalidate source
registration, source revisions, message rows, visibility, or an otherwise usable
SQLite projection.

## 7. Retention and projection

Maintenance records are retained as operational audit evidence until an explicit
retention policy is added. No implementation may silently truncate or compact this
ledger. Any future compaction or archival rule requires a separate contract.

An optional SQLite maintenance-history view MAY be built later, but it is a
rebuildable projection only. Ordinary retrieval and source freshness decisions MUST
use the current maintenance state derived from ledger replay; they MUST NOT treat a
projection row as proof that source content was observed or ingested.

## 8. Required proof before runtime use

Before an active-source checker consumes this contract, focused proof MUST show:

1. open and close entries append with independent sequence numbers;
2. an unclosed run replays as `OPEN` and does not report success;
3. metadata-only evidence does not read or retain transcript content;
4. malformed, gapped, conflicting, and cross-root records refuse safely; and
5. the existing source registry, source-revision, message, visibility, and
   projection paths remain unaffected by maintenance-ledger failure.

No event-triggered or scheduled maintenance implementation is proven until those
checks pass.
