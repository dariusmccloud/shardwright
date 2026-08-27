# Phase X: Shardwright Identity And Legacy Migration Contract

**Version:** 0.1.0

**Status:** ENTERED — product identity and migration boundaries are normative;
runtime renaming, persistence migration, repository renaming, and release packaging
remain unauthorized.

**Semantic parent:** `PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md`

**Architectural parent:** `PHASE_X_MEMORY_DISCOVERY_AND_GOVERNANCE_REBASE_CONTRACT.md`

## 1. Decision

The independently developed product is named **Shardwright**.

```text
Product: Shardwright
Repository slug: shardwright
Display name: Shardwright
Primary namespace: shardwright
Server plugin: shardwright-memory
Tagline: Structured continuity for long-form roleplay.
Artifact name: Memory Shard
```

Shardwright names the product and its governed continuity system. **Memory Shard**
continues to name an output artifact. The product and artifact are related but are
not interchangeable identities.

## 2. Problem

The current fork remains indistinguishable from `Promansis/summary-sharder` at
multiple installation, runtime, presentation, and persistence boundaries. The local
and upstream manifests currently carry the same display name, version, interceptor,
author, and homepage. Both codebases also claim legacy identifiers such as:

- the `summary-sharder` repository and installation-folder slug;
- `summary_sharder_rearrangeChat` as the prompt interceptor global;
- `extension_settings.summary_sharder` as settings authority;
- `chat_metadata.summary_sharder` and `extra.summary_sharder` as persisted chat and
  message namespaces;
- `summary-sharder-settings` and the broad `ss-` DOM/CSS family;
- `ss_debug`, `summarySharder*`, and `summary_sharder:*` browser state;
- `ss_shards_*`, `ss_standard_*`, and `ss_rag_memory` retrieval identities;
- `summary-sharder-memory` as the server-plugin, route, package, and storage identity;
- `https://summary-sharder/...` as schema identifiers.

If both extensions are installed, these shared identifiers can cause overwrite,
double invocation, selector bleed, settings mutation, ambiguous record ownership,
or retrieval from the wrong collection. A blind rename would instead risk making
valid historical settings, chat evidence, vector data, and governance records appear
lost.

## 3. Target Result

Shardwright is independently installable beside the upstream extension while:

1. owning one unmistakable runtime identity;
2. writing only to Shardwright-owned namespaces;
3. preserving historical legacy records without rewriting their origin;
4. migrating eligible data once, atomically, and with provenance;
5. refusing ambiguous, partial, or unverifiable migration;
6. keeping rollback possible until migration closure is proven;
7. preventing either product from executing, styling, configuring, or retrieving
   through the other's identities.

## 4. Authority Gate

### Governing contract

This contract governs product identity, identifier ownership, legacy compatibility,
and migration lifecycle. Existing Phase X contracts continue to govern the semantic
meaning, authority, evidence, publication, and lifecycle of memory artifacts.

### Authoritative sources

- This contract is authoritative for Shardwright's canonical identifiers.
- Existing settings stores, chat/message metadata, vector collections, databases,
  ledgers, and schema-bound records remain authoritative for their own historical
  contents until lawfully migrated.
- Migration reports record derivation; they do not replace source authority.
- Display labels, DOM elements, compatibility aliases, and rebuilt projections are
  not authority.

### Projection boundary

RAG collections, UI state, cached settings views, derived indexes, and schema catalogs
are projections. They may be rebuilt only from recognized authoritative inputs.
Renaming a projection cannot rename, supersede, or adopt its source evidence.

### Lifecycle owner

A future Shardwright identity-migration service owns discovery, eligibility,
preflight, copy or rebuild, verification, activation, rollback, and closure. Feature
modules MUST NOT independently migrate their own keys during ordinary reads or writes.

### Mechanism reused

Migration MUST reuse existing source hashes, message identities, storage transaction
boundaries, replay/rebuild mechanisms, validation gates, and audit/report patterns.
It MUST NOT invent replacement authority from filenames, display labels, or proximity.

### Jurisdiction fit

The legacy identifiers are used by the extension surfaces that Shardwright must own
independently. Separating them is therefore installation and lifecycle correctness,
not product-semantic redesign.

### Failure behavior

Ambiguous ownership, unknown versions, conflicting destination data, incomplete
inventory, failed verification, interrupted migration, or unsafe rollback MUST refuse
activation and preserve the legacy source unchanged. Rebuildable projections MAY be
quarantined and rebuilt. Authoritative records MUST NOT be silently repaired.

## 5. Canonical Shardwright Identity Map

| Surface | Canonical identity | Rule |
|---|---|---|
| Product | `Shardwright` | Human-facing proper name |
| Repository/install slug | `shardwright` | GitHub repository and extension folder |
| Display name | `Shardwright` | Manifest and ordinary UI |
| Tagline | `Structured continuity for long-form roleplay.` | Product description |
| Primary data namespace | `shardwright` | Settings and persisted metadata root |
| Browser root global | `window.Shardwright` | One owned public object |
| Portable code access | `globalThis.Shardwright` | Resolves to the browser root in-host |
| Required interceptor global | `shardwright_rearrangeChat` | Sole loose global required by SillyTavern |
| DOM/CSS prefix | `shardwright-` | IDs, classes, events, data attributes, CSS variables |
| Internal local abbreviation | `sw` | Non-exported local symbols only |
| Server plugin | `shardwright-memory` | Plugin ID, package, install folder, API route root |
| API route root | `/api/plugins/shardwright-memory` | Client/server boundary |
| Browser storage prefix | `shardwright:` | Local and session storage |
| RAG shard collection prefix | `shardwright_shards_` | Shard projection ownership |
| RAG standard collection prefix | `shardwright_standard_` | Standard-summary projection ownership |
| Default RAG variable | `shardwright_rag_memory` | Prompt-variable injection |
| Schema namespace | `urn:shardwright:schema:v1:` | Stable non-retrieval schema identity root |
| Output artifact | `Memory Shard` | Artifact name, not product identity |

The browser global MUST be one object. Public APIs, diagnostics, and capability
handles belong beneath `globalThis.Shardwright`. No new family of loose
`shardwright*`, `Shardwright*`, or abbreviated `sw*` globals is permitted. The
interceptor is the only exception because SillyTavern resolves it by global name.

## 6. Legacy Identity Disposition

### 6.1 Manifest, repository, and installation

The release manifest MUST use the canonical display name, interceptor, author,
version, and Shardwright repository homepage. Installation documentation MUST point
to the Shardwright repository and `third-party/shardwright` folder.

The repository and installed extension folder MUST use `shardwright`. Git redirects
or legacy folders are compatibility locators only and MUST NOT be treated as current
product identity.

### 6.2 Runtime globals and interceptor

Shardwright MUST register `shardwright_rearrangeChat` and MUST NOT register or mutate
`summary_sharder_rearrangeChat`. All other public runtime state MUST live beneath
`globalThis.Shardwright`.

No compatibility bridge may publish the old interceptor or old globals while the
upstream extension could be present. Compatibility MUST occur through data migration,
not shared runtime ownership.

### 6.3 Settings

`extension_settings.shardwright` becomes settings authority. Legacy
`extension_settings.summary_sharder` may be inspected only by the migration service.

A settings migration MUST:

1. identify the source version and recognized fields;
2. compute a source snapshot hash;
3. refuse when destination settings already conflict;
4. copy recognized values into a complete Shardwright settings object;
5. validate the destination before activation;
6. record a migration marker containing source hash, destination hash, policy
   version, time, and result;
7. leave the legacy settings unchanged;
8. make all subsequent writes Shardwright-only.

Ordinary feature reads MUST NOT lazily copy individual settings. Dual-write is
prohibited.

### 6.4 Chat and message metadata

New writes belong under `chat_metadata.shardwright` and `extra.shardwright`.
Historical `summary_sharder` metadata remains evidence of its original namespace.

Migration eligibility MUST be field- and version-aware:

- Shardwright-specific fields with verifiable source bindings may be copied with
  provenance.
- Fields shared with upstream are not automatically attributable to Shardwright.
- Ambiguous fields remain legacy-visible or require an explicit operator import
  decision; they MUST NOT be silently adopted.
- Every migrated record retains its legacy path, source revision or content hash,
  migration policy, and destination reference.
- Migration MUST NOT delete, rewrite, or relabel the legacy record.

After activation, Shardwright MUST read its own namespace for current authority.
Legacy reads are permitted only through a declared compatibility/import path.

### 6.5 DOM, CSS, and browser events

All exported DOM IDs, classes, custom events, data attributes, and CSS variables MUST
use the full `shardwright-` prefix. Existing `ss-` names MUST NOT remain as active
selectors or event channels in an independently installable release.

Internal JavaScript variable names may use `sw` where they do not escape module
scope. The abbreviation grants no DOM, storage, event, or global ownership.

### 6.6 Browser storage and diagnostics

All `localStorage` and `sessionStorage` keys MUST begin with `shardwright:`. Debug and
diagnostic capabilities MUST live beneath `globalThis.Shardwright`.

Legacy browser keys may be imported once when their value and version are recognized.
They MUST remain untouched and MUST NOT be used as the current write target.

### 6.7 Retrieval identities

Shardwright MUST use its canonical collection and injection-variable prefixes. Legacy
collections are projections and MUST NOT be renamed in place.

A migration may either:

- rebuild a Shardwright collection from exact governed sources; or
- copy entries only when collection metadata, source bindings, embedding contract,
  and hashes are complete and compatible.

Shardwright retrieval MUST never query both legacy and canonical collections as one
undifferentiated authority set. Unknown or conflicting collection ownership MUST
quarantine that collection from injection.

### 6.8 Server plugin, API, and durable storage

The plugin ID, package name, install directory, API base, operational storage root,
and emitted plugin identity MUST become `shardwright-memory` or a clearly derived
Shardwright-owned value.

Durable migration MUST use copy, verify, then activate:

```text
legacy source frozen for migration
-> destination created separately
-> replay and integrity verification
-> activation marker committed
-> clients switch to canonical API
-> legacy source retained until closure
```

Moving, deleting, or opening the same database through both plugin identities is
prohibited. An interrupted migration MUST restart idempotently or roll back to the
previous active source.

### 6.9 Schema identifiers

New Shardwright v1 schemas use:

```text
urn:shardwright:schema:v1:<artifact-name>
```

An existing `$id` is an identifier, not a mutable display label. A schema ID already
bound into a persisted artifact, manifest, or hash MUST remain resolvable as the exact
historical schema. It may be mapped to a compatibility catalog entry but MUST NOT be
silently redefined with new meaning.

Pre-release schema drafts with no persisted bindings may be reissued under the
Shardwright URN only through an explicit schema migration slice with fixture proof.
Successor schemas MUST declare their compatibility and must not imply that a renamed
schema grants new authority.

### 6.10 Documentation and attribution

Ordinary product documentation MUST identify Shardwright and its installation path.
Historical documents may retain Summary Sharder names when accurately describing the
legacy implementation or migration source. Credits and license history MUST preserve
upstream attribution without representing Promansis as Shardwright's current author.

## 7. Migration State Machine

```text
NOT_ASSESSED
-> ELIGIBLE | AMBIGUOUS | INCOMPATIBLE

ELIGIBLE
-> PREFLIGHT_PASSED
-> COPIED_OR_REBUILT
-> VERIFIED
-> ACTIVATED
-> CLOSED

AMBIGUOUS | INCOMPATIBLE
-> REFUSED_OR_QUARANTINED

PREFLIGHT_PASSED | COPIED_OR_REBUILT | VERIFIED
-> ROLLED_BACK
```

`ACTIVATED` means canonical Shardwright reads and writes are in effect. It does not
authorize deletion of legacy sources. Deletion, if ever permitted, requires a later
retention contract and independent authorization.

## 8. Migration Manifest And Report

Every stateful migration MUST produce an immutable manifest containing at least:

- migration ID and migration-policy version;
- identity family and scope;
- exact legacy locator, version, and snapshot hash;
- proposed canonical locator and expected version;
- eligibility classification and evidence;
- planned copy, rebuild, alias, quarantine, or no-op disposition;
- destination precondition and conflict check;
- start time, actor, host identity, and idempotency key.

Completion MUST produce a report containing at least:

- manifest reference and exact implementation version;
- source and destination hashes or reconstruction proof;
- records discovered, eligible, migrated, unresolved, refused, and quarantined;
- validation and replay results;
- activation marker or rollback result;
- unresolved items and lawful next action.

Reports are audit evidence. They do not erase or supersede their sources.

## 9. Coexistence Boundary

The independent-installation proof MUST run Shardwright and the upstream extension in
the same SillyTavern host and demonstrate:

1. distinct installation folders and extension-manager entries;
2. distinct manifest names, homepages, versions, and authors;
3. distinct interceptor globals, each invoked exactly once in declared order;
4. no shared settings mutation;
5. no duplicate DOM IDs or cross-product selector/event handling;
6. no shared browser-storage or global-object ownership;
7. no cross-product RAG collection or prompt-variable access;
8. distinct server-plugin routes and storage roots;
9. successful Shardwright access to lawfully migrated historical data;
10. upstream operation that neither reads nor mutates Shardwright state.

Disabling one extension is not coexistence proof.

## 10. Rollback And Recovery

Before activation, rollback removes or quarantines only the incomplete canonical
destination and returns to the unchanged legacy source. After activation, rollback
MUST use the migration report and activation marker; it MUST NOT reverse-copy newer
Shardwright writes into the legacy namespace.

If Shardwright has accepted new writes after activation, reverting product identity
requires a governed export or successor migration. It is not a settings toggle.

## 11. Normative Requirements

### SWI-IDN-001 — Canonical identity is closed

All exported product identifiers MUST derive from the map in Section 5. New aliases
require an amendment to this contract.

### SWI-IDN-002 — Product and artifact remain distinct

`Shardwright` names the product. `Memory Shard` names an output artifact.

### SWI-GLB-001 — One owned global object

Public runtime capabilities MUST live beneath `globalThis.Shardwright`; only the
required interceptor may exist as an additional loose global.

### SWI-INT-001 — Interceptor ownership is exclusive

Shardwright MUST register only `shardwright_rearrangeChat` and MUST NOT claim the
legacy interceptor.

### SWI-SET-001 — Settings migrate once

Legacy settings MUST migrate atomically through the migration service. Lazy migration
and dual-write are prohibited.

### SWI-MET-001 — Persisted metadata preserves provenance

Migrated chat and message metadata MUST retain exact legacy provenance and MUST NOT
rewrite or delete its source.

### SWI-MET-002 — Ambiguous ownership refuses adoption

Metadata that cannot be attributed to an eligible source MUST remain legacy-visible,
require explicit import disposition, or be quarantined.

### SWI-DOM-001 — Exported UI identifiers are fully prefixed

Exported DOM, CSS, event, and data-attribute identifiers MUST use `shardwright-`.

### SWI-BST-001 — Browser state is isolated

Current browser-storage keys MUST use `shardwright:` and diagnostics MUST belong to
the owned global object.

### SWI-RAG-001 — Retrieval projections are isolated

Shardwright MUST neither write to nor silently query legacy RAG collections as current
Shardwright authority.

### SWI-RAG-002 — Projection migration is verified

RAG data MUST be rebuilt from exact sources or copied only with compatible metadata,
source bindings, and hashes.

### SWI-SRV-001 — Plugin identity owns its full boundary

Plugin ID, API route, package, install folder, storage root, and emitted identity MUST
be Shardwright-owned and mutually consistent.

### SWI-SRV-002 — Durable migration is copy-verify-activate

Durable stores MUST be created separately, replayed or copied, verified, and then
activated. In-place rename and concurrent dual ownership are prohibited.

### SWI-SCH-001 — New schemas use the canonical URN

New Shardwright v1 schema IDs MUST use `urn:shardwright:schema:v1:`.

### SWI-SCH-002 — Historical schema identity is immutable

A schema ID already bound into persisted evidence MUST remain resolvable with its
historical meaning and MUST NOT be silently repointed.

### SWI-MIG-001 — Migration is manifest-driven

Every stateful migration MUST have an immutable preflight manifest and completion or
rollback report.

### SWI-MIG-002 — Migration is idempotent

Repeating the same migration against the same source and destination state MUST not
duplicate, re-author, or mutate records.

### SWI-MIG-003 — Legacy sources survive activation

Migration activation MUST NOT delete legacy settings, metadata, collections,
databases, ledgers, or schema artifacts.

### SWI-COE-001 — Side-by-side operation is release proof

Independent installation is unproven until the coexistence boundary in Section 9
passes with both extensions enabled.

### SWI-ROL-001 — Rollback cannot erase newer authority

Rollback MUST NOT copy newer canonical writes into legacy stores or discard them.

### SWI-DOC-001 — Attribution remains truthful

Shardwright documentation MUST use current Shardwright identity while preserving
accurate upstream credit and historical references.

## 12. Required Implementation Slices

Implementation MUST remain separately authorized and bounded in this order:

1. machine-readable identity registry and collision inventory proof;
2. owned browser global and interceptor separation;
3. DOM/CSS/event isolation;
4. settings and browser-state migration;
5. chat/message metadata migration;
6. server-plugin/API/storage migration;
7. RAG collection and injection identity migration;
8. schema-ID successor and compatibility catalog;
9. manifest, repository, installation, and documentation identity;
10. legacy-data recovery and side-by-side coexistence proof.

Each slice requires its own before/change/after proof and MUST preserve unrelated
uncommitted work.

## 13. Out Of Scope

This contract does not authorize:

- runtime code changes;
- migration execution;
- repository or local-folder renaming;
- deletion of any legacy data;
- changes to memory semantics, governance authority, subject jurisdiction, or
  publication lifecycle;
- treating existing schema drafts as migrated;
- installing both extensions before coexistence safeguards exist.

## 14. Closure Proof Required

This contract may close only when:

- every observed legacy identity family has an explicit disposition;
- the canonical identity registry exists and is consumed by relevant boundaries;
- migration fixtures prove success, ambiguity refusal, conflict refusal,
  interruption recovery, idempotent replay, and rollback;
- historical settings, chat/message metadata, durable records, and schema bindings
  remain accessible after migration;
- all Shardwright tests pass under canonical identity;
- both extensions pass the side-by-side proof in Section 9;
- no active exported legacy identifier remains outside a declared compatibility
  reader or historical record.

## 15. Stop Boundary

Entering this contract freezes the Shardwright identity map and migration law only.
It does not authorize a mechanical rename or any production implementation.
