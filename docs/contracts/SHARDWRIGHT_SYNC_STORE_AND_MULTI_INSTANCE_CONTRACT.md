# Shardwright Sync Store and Multi-Instance Contract

**Version:** 0.1.0
**Status:** PROPOSED — architecture boundary; implementation not authorized by this document alone.
**Classification:** Cross-instance transport, recovery, and operator-management design.

## 1. Purpose

Define how multiple Shardwright installations preserve, exchange, inspect, and
rebuild the same corpus without treating a shared SQLite file as authority.

This contract covers local installations, SillyTavern/SillyBunny peers, optional
folder or API transports, recovery, synchronization cadence, and the human-facing
Sync Store browser. It does not authorize cross-character memory sharing or
automatic identity merging.

## 2. Authority Model

The authority chain is:

```text
source files and authoritative Shardwright ledgers
    → validated event import
    → local SQLite projection
    → search, planning, retrieval, and UI views
```

- Authoritative ledgers record identity, provenance, source revisions, message
  events, visibility, tombstones, lineage, and accepted synchronization events.
- SQLite is a rebuildable operational projection. Losing it is recoverable by
  replaying a verified ledger snapshot and later event deltas.
- A Sync Store is a transport and coordination boundary, not a replacement for
  ledger authority.
- UI labels, paths, filenames, and aliases are display data, not identity authority.

## 3. Sync Store Identity

Every store has:

- an immutable `storeId`;
- a mutable human-readable display name;
- an auditable store-manifest revision;
- optional description and operator notes.

The display name MAY be changed through an explicit operator action. The `storeId`
MUST NOT be silently changed, reused, or inferred from a folder name.

A folder without a valid store manifest is **UNRECOGNIZED** and MUST NOT be joined
automatically.

The companion draft shape is recorded in
`docs/schemas/sync-store/sync-store-manifest-v1.schema.json`; it remains non-authoritative
until this contract and its schema proof are entered.

## 4. Installation Identity

Every installation has its own immutable `instanceId` within the store. Each
installation writes to its own event namespace:

```text
<storeId>/instances/<instanceId>/events/
```

Two installations MUST NOT append concurrently to one shared live JSONL file.
Events MUST have stable event identities and MUST be safe to import repeatedly.

A fresh installation MUST receive a new `instanceId`. An explicit, operator-approved
restore MAY retain the prior instance identity when the restore package proves that
identity. A copied or ambiguous installation MUST receive a new identity rather than
claiming the prior instance.

## 5. Event Transport

The local mutation path is:

```text
host operation succeeds
    → append local authoritative event
    → update or queue local SQLite projection work
    → create immutable outbound event or delta bundle
```

Local authority MUST NOT wait for OneDrive, a network share, or a remote API.

Inbound events MUST be validated for schema, event identity, hashes, ancestry,
revision compatibility, and duplicate status before entering local authority or
projection state.

Invalid, contradictory, or unverifiable events MUST be quarantined without
overwriting accepted history.

The companion draft envelope shape is recorded in
`docs/schemas/sync-store/sync-store-event-envelope-v1.schema.json`; its event-chain
fields do not by themselves establish global lineage.

## 6. Transport Options

The UI MAY expose these transport modes:

| Mode | Meaning |
| --- | --- |
| `DISABLED` | Local-only operation. |
| `SHARED_FOLDER` | A selected folder is used for immutable event exchange. OneDrive, Synology Drive, or another file synchronizer may carry it. |
| `API` | A configured synchronization service accepts and validates event bundles. |

OneDrive and Synology are transport providers, not authority stores. A SQLite file
MUST NOT be opened directly from a shared cloud or network folder as a live
multi-writer database.

Shared-folder publication MUST use immutable per-instance event files or bundles,
atomic temporary-file publication, and no shared live append target. A transport
MUST NOT rely on OneDrive or a network synchronizer to provide transactional file
locking. Manifest revisions that collide MUST be retained for explicit review.

## 7. Bootstrap and Recovery

An existing installation MUST be exportable as:

1. a verified ledger snapshot;
2. subsequent immutable event or delta bundles;
3. optional SQLite snapshots for acceleration only;
4. manifest and hash metadata.

A new installation MAY be created empty or restored from an existing store. Restore
MUST validate the store manifest, replay the authoritative snapshot and events, and
then build its local SQLite projection. A SQLite snapshot MUST NOT override newer
verified ledger state.

If a source file is unavailable during rebuild, the affected source remains
unresolved; the system MUST NOT synthesize content from a stale SQLite cache.

## 8. Synchronization Cadence

Cadence controls transport and change detection, not implicit full-corpus
re-ingestion. Supported triggers MAY include:

- startup;
- explicit **Sync now**;
- after a local mutation;
- after a configurable idle interval;
- every configurable interval;
- before shutdown.

Safe behavior SHOULD be immediate local append followed by debounced outbound export,
idle synchronization, and periodic reconciliation. Any initial cadence values are
provisional examples only, MUST be configurable, and require benchmark or operator
evidence before becoming normative defaults.

When transport is unavailable, outbound events remain queued locally and MUST retry
without mutating or discarding the authoritative event.

## 9. Operator Management Surface

The Sync Store browser MUST be a human-facing projection over authoritative records
and verified SQLite state. It SHOULD expose:

- store name, immutable store ID, health, last activity, and last verified snapshot;
- registered instances, instance IDs, host type/version, last seen, pending events,
  imported events, projection generation, and health;
- character identities, aliases, associated cards/sources, collision warnings, and
  identity decisions;
- transcript sources, source class, structured locator status, revision hash,
  coverage, message counts, visibility/tombstone counts, and custody receipts;
- document sources, revision hashes, relationship resolution, and projection state;
- event history, backups, snapshots, and quarantined artifacts.

The browser is read-only by default. Reassociation, reset, quarantine release,
store rename, and other mutations MUST be explicit, auditable operator actions.

## 10. Store Rename and Merge

Renaming a store changes only its display metadata and appends an auditable metadata
event. It does not alter `storeId`, instance IDs, character identities, or source IDs.

There is no silent Store ID merge. Combining two stores MUST create a new store
identity through an explicit review:

```text
Store A + Store B
    → merge review and conflict report
    → new Store C
```

Store C MUST preserve both source store IDs, ancestry, accepted events, unresolved
conflicts, and the operator decision. No source event may be deleted or rewritten as
part of the merge.

## 11. Failure and Conflict Policy

The system MUST:

- preserve local authority when transport is unavailable;
- deduplicate by stable event identity and content/hash custody;
- refuse or quarantine malformed, conflicting, stale, or unverifiable imports;
- distinguish pending transport from rejected or quarantined data;
- keep SQLite projection state visibly stale until verified catch-up completes;
- expose progress and terminal state for long-running import, replay, or rebuild work.

Arrival order alone MUST NOT establish global canonical lineage when independent
instances have diverged. Until a separate reconciliation contract defines ancestry,
vector-clock or equivalent conflict rules, and operator resolution, divergent
descendants remain locally authoritative but globally **UNRESOLVED** and MUST NOT be
promoted to one accepted canonical lineage.

## 12. Explicitly Out of Scope

This contract does not authorize:

- direct shared-file SQLite writes;
- automatic character or chat identity merging;
- semantic relationship admission;
- cross-character memory grants or group sharing;
- automatic source discovery from arbitrary directories;
- encryption, account federation, or external identity provider policy;
- runtime prompt injection;
- replacement of the existing ledger/projector architecture with CouchDB, Realm,
  LiteFS, or another database model.

## 13. Open Decisions

The following require separate decisions before implementation:

- authentication and authorization for an API transport;
- encryption at rest and in transit;
- whether folder transport uses per-event files, signed bundles, or both;
- store enrollment and removal workflow;
- manifest revision conflict and write-arbitration rules;
- backup retention and snapshot rotation;
- multi-user access policy;
- UI layout and terminology for the management browser;
- whether the server service runs on Synology, another host, or remains optional;
- the initial cadence values and evidence required to adopt them;
- the separate divergence-reconciliation mechanism and operator decision flow.

Lifecycle ownership is provisionally divided as follows: the Shardwright runtime
owns each local outbox and importer; a deployed API coordinator owns accepted
remote transport processing; and a folder synchronizer is transport infrastructure,
not a Shardwright authority owner.

If two stores are explicitly merged, historical installations retain their original
identity as the composite `sourceStoreId + instanceId`. A newly created installation
in the merged store receives a new local `instanceId`; neither source identity is
silently renamed or reused.

## 14. Exit Condition

This contract remains **PROPOSED** until its open decisions are narrowed, a store
manifest and event-envelope schema are authorized, and a focused bootstrap/import/
quarantine proof succeeds. Implementation slices MUST remain separate for ledger
transport, projection replay, cadence, and management UI.
