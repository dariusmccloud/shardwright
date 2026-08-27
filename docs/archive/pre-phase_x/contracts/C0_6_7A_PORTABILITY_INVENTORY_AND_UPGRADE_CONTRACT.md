# C0.6.7A Portability Inventory And Upgrade Contract

Last updated: 2026-07-09

Status: active contract

## Purpose

Freeze the persistence and replay contract that `C0.6.7B+` must preserve.

This document answers the narrow question:

```text
What governed-memory artifacts exist today, which ones carry authority, which ones are projections, and what must survive upgrade, replay, restart, rebuild, rollback, and packaged-host movement?
```

The phase brief remains authoritative for the release boundary.
This document is the narrower contract for:

1. artifact classification,
2. replay-domain boundaries,
3. additive migration posture,
4. rollback and downgrade posture,
5. stable-reference expectations,
6. fail-closed rules.

## Observed Persistence Roots

Governed-memory storage currently resolves under:

```text
<userRoot>/summary-sharder/
```

Observed persisted/runtime-adjacent paths:

```text
architectural-memory.db
architectural-memory.snapshot.db
architectural-memory.state.json
interpretive-governance-ledger.jsonl
dnm-publication-ledger.jsonl
generations/
promotions/
promotions/authorizations/
promotions/promotion-journal.jsonl
locks/authority-transition.lock
```

Observed schema/runtime markers:

```text
SERVICE_VERSION = c0
SCHEMA_VERSION = 1
JOURNAL_MODE = WAL
```

## Locked Decisions

### 1. Authority roles must stay distinct

No upgrade or replay path may treat every persisted artifact as equal authority.

Allowed authority roles are:

```text
canonical source
portable ledger
operational projection
derived projection
host metadata
packaged/runtime artifact
proof-only artifact
```

### 2. Portable ledgers are the replay boundary

The replay boundary for governed memory is not the SQLite file alone.

The authoritative replay streams currently observed are:

```text
interpretive-governance-ledger.jsonl
dnm-publication-ledger.jsonl
promotions/promotion-journal.jsonl
```

The SQLite database is an operational projection that must be rebuildable, restorable, or safely refused against those streams and their referenced source inputs.

### 3. Snapshot and state files are not independent authority

`architectural-memory.snapshot.db` and `architectural-memory.state.json` support recovery and host coordination.

They must never outrank:

1. portable ledgers,
2. canonical source references,
3. stable hash-bound publication/review bindings.

### 4. Upgrade is additive-only

`C0.6.7` assumes additive schema evolution only.

Allowed:

1. new tables,
2. new indices,
3. additive columns,
4. rebuild of operational projections,
5. version-gated refusal when the runtime cannot safely interpret stored state.

Disallowed:

1. destructive migrations,
2. silent semantic rewrites,
3. implicit record deletion,
4. fallback that manufactures a false active memory or false lawful action.

### 5. Downgrade is not a supported ordinary flow

The current contract does not support general schema downgrade.

Rollback posture is:

```text
restore compatible pre-upgrade operational snapshot
and
restore matching portable ledgers / source state
and
resume with a code version that explicitly supports that data shape
```

If code and data versions do not match safely, the runtime must refuse before mutation.

## Authority-Role Classification

| Artifact | Role | Why |
| --- | --- | --- |
| Source corpus / chat-message records outside plugin storage root | canonical source | Review evidence, grounding refs, and reconstruction provenance ultimately point back to source records outside the plugin DB. |
| `interpretive-governance-ledger.jsonl` | portable ledger | Carries governed interpretive events such as candidate, review, delegation, synthesis, and related authority-stream changes. |
| `dnm-publication-ledger.jsonl` | portable ledger | Carries publication policy, authorization, publication, supersession, withdrawal, and delta-review lifecycle events. |
| `promotions/promotion-journal.jsonl` | portable ledger | Carries structural promotion / authority-transition replay state for rebuild and promotion domains. |
| `architectural-memory.db` | operational projection | Materialized working store for governed memory, publication, and reconstruction state. |
| `architectural-memory.snapshot.db` | operational projection | Verified recovery copy of the operational projection used for restore after corruption or missing primary DB. |
| `architectural-memory.state.json` | host metadata | Stores runtime-adapter, schema/service version, journal mode, adoption, and optional live-authority/promotion markers. |
| `locks/authority-transition.lock` | host metadata | Prevents overlapping live authority transitions; not part of semantic history. |
| `generations/` and `promotions/authorizations/` contents | proof-only artifact or derived projection, depending on file | Used for rebuild/promotion workflows; must be classified file-by-file when `C0.6.7B/C` closes release proof. |
| Runtime adapters, route modules, bundled schema code | packaged/runtime artifact | Code required to interpret persisted state but not itself replay authority. |

## Replay Domains

### 1. Interpretive governance domain

Observed persisted operational tables include:

```text
interpretation_revisions
interpretation_grounding_links
interpretation_grounding_aggregates
interpretation_evidence_findings
interpretation_risk_classifications
interpretation_policy_definitions
interpretation_policy_bindings
interpretation_delegation_policies
interpretation_review_obligations
interpretation_review_requests
interpretation_review_dispositions
interpretation_subject_dispositions
interpretation_action_provenance
interpretation_synthesis_policies
interpretation_synthesis_runs
interpretation_synthesis_proposals
interpretation_synthesis_grounding_evaluations
```

Replay source:

```text
interpretive-governance-ledger.jsonl
plus canonical source references
```

### 2. DNM publication lifecycle domain

Observed persisted operational tables include:

```text
interpretation_publication_policies
interpretation_publication_qualifications
interpretation_publication_authorizations
dnm_publication_records
dnm_publication_lifecycle_metadata
dnm_delta_reviews
```

Replay source:

```text
dnm-publication-ledger.jsonl
plus stable references into interpretation revisions, reviews, subject dispositions, and policy bindings
```

### 3. Reconstruction and promotion domain

Observed persisted operational tables include:

```text
reconstruction_runs
reconstruction_manifest_files
reconstruction_manifest_artifacts
reconstruction_candidate_issues
reconstruction_candidate_provenance
reconstruction_candidate_provenance_sources
reconstruction_candidate_claims
reconstruction_candidate_claim_links
reconstruction_candidate_conflicts
reconstruction_candidate_review_items
reconstruction_occurrence_groups
reconstruction_occurrence_group_members
reconstruction_version_lifecycle_groups
reconstruction_supersession_components
```

Replay source:

```text
promotion-journal.jsonl
plus canonical source corpus and pinned/reconstruction artifacts as applicable
```

### 4. Operational state domain

Observed persisted operational tables include:

```text
manifest
memory_scopes
chat_bindings
decision_records
current_decisions
decision_stubs
movement_records
reference_index_snapshots
migration_audit
```

Replay source:

```text
rebuild from portable ledgers, canonical source inputs, and approved operational bootstrap rules
```

### 5. Host metadata domain

Replay source:

```text
none as authority
```

`architectural-memory.state.json` and lock files coordinate runtime posture and recovery, but they must be disposable and reconstructible from authoritative state plus host startup.

## Artifact Inventory

| Artifact | Owner component | Authority role | Replay domain | Upgrade / restore contract | Unsafe partial-restore consequence |
| --- | --- | --- | --- | --- | --- |
| Source corpus / message records | host chat storage, review/reconstruction readers | canonical source | interpretive governance, reconstruction | Must remain addressable by stored refs; not migrated by governed-memory code | Grounding/evidence bindings become unverifiable |
| `interpretive-governance-ledger.jsonl` | `interpretive.js` | portable ledger | interpretive governance | Must remain append-only and replayable across hosts | Review, subject, delegation, or synthesis truth can drift |
| `dnm-publication-ledger.jsonl` | `interpretive.js` | portable ledger | DNM publication lifecycle | Must remain append-only and replayable across hosts | Publication, supersession, withdrawal, or delta-review truth can drift |
| `promotions/promotion-journal.jsonl` | promotion / rebuild layer | portable ledger | reconstruction and promotion | Must replay structural promotion state or refuse clearly | Rebuild/promotion state can split from structural authority |
| `architectural-memory.db` | `core.js`, `schema.js`, route handlers | operational projection | all operational domains | May be restored from verified snapshot or rebuilt from authority streams; additive schema only | False active memory, false lawful action, stale projections |
| `architectural-memory.snapshot.db` | `core.js` | operational projection | operational recovery | Must verify before restore; invalid snapshot must quarantine and refuse | Corrupt restore can overwrite valid projection |
| `architectural-memory.state.json` | `core.js` | host metadata | host metadata | May redirect to live-authority DB path; must fail if inconsistent or outside storage root | Wrong DB pointer, stale authority adoption, host drift |
| `locks/authority-transition.lock` | `core.js` | host metadata | host metadata | Disposable; never treated as semantic truth | Deadlock or overlapping mutation if broken live |
| `generations/*` | rebuild/promotion tooling | proof-only or derived projection | reconstruction | Classification must be tightened per file before release closeout | Replay ambiguity if assumed authoritative by accident |
| `promotions/authorizations/*` | rebuild/promotion tooling | proof-only or derived projection | reconstruction and promotion | Classification must be tightened per file before release closeout | Promotion state may appear portable when it is not |

## Stable Cross-Stream References

The following references are contract-level stable unless the system explicitly refuses the replay:

1. `interpretation_id`
2. `interpretation_revision_id`
3. `parent_revision_id`
4. `created_from_disposition_id`
5. `memory_scope_id`
6. `memory_subject_id`
7. `publication_policy_id`
8. `qualification_id`
9. `publication_authorization_id`
10. `dnm_record_id`
11. `continuity_target_id`
12. `proposal_content_hash`
13. `review_envelope_hash`
14. `grounding_envelope_hash`
15. `grounding_source_set_hash`
16. `subject_disposition_record_id`

Replay, rebuild, restart, and packaged-host movement must preserve enough information that these bindings continue to resolve to the same operator-visible truth.

## Acceptable Identifier Churn

Allowed churn:

1. quarantine filenames,
2. temp-file names,
3. lockfile timestamps,
4. rebuilt ephemeral ordering where row order is not part of the contract,
5. regenerated operational snapshot files after verified snapshot creation.

Disallowed churn:

1. changing a persisted interpretation revision identity,
2. changing publication record identity,
3. changing qualification or authorization identity while claiming semantic continuity,
4. changing policy hash or binding hash without a corresponding authoritative event,
5. changing the current active memory as a side effect of replay or rebuild,
6. changing lawful next action while authoritative inputs remain the same.

## Version Compatibility Posture

### Supported upgrade shape

Supported:

```text
older compatible data
-> newer runtime
-> additive schema/install step
-> replay / restore / rebuild
-> equivalent operator truth
```

### Unsupported downgrade shape

Unsupported as an ordinary product flow:

```text
newer data
-> older runtime
-> best-effort partial operation
```

Expected behavior:

```text
refuse safely
```

### Code/data mismatch contract

If the runtime cannot safely interpret the stored schema or authority state, it must refuse before mutating operational state.

Current observed refusal behavior already includes:

1. unsupported schema version refusal,
2. rebuild-required refusal when no verified operational copy is available,
3. snapshot-verification refusal,
4. path-safety refusal when live-authority pointers escape the storage root.

## Rollback Posture

Rollback is a coordinated recovery act, not a buttonless ordinary path.

Rollback contract:

1. restore a compatible operational DB or verified snapshot,
2. restore the matching portable ledgers,
3. restore or preserve the canonical source records referenced by those ledgers,
4. reopen with a code version that explicitly supports that data version,
5. refuse if the runtime cannot prove the restored artifacts belong to the same semantic authority set.

Unsafe rollback patterns:

1. restoring only the SQLite DB without its matching ledgers,
2. restoring only a snapshot after newer ledgers were appended,
3. reopening newer data with older code and continuing on apparent success,
4. ignoring missing source records referenced by grounding or publication bindings.

## Corruption And Refusal Contract

The system must fail closed for:

1. missing verified operational DB and missing verified snapshot,
2. snapshot verification failure,
3. unsupported schema version,
4. invalid live-authority DB pointer,
5. malformed or missing replay ledger required for a supported domain,
6. orphaned publication or review references that break semantic continuity,
7. hash-binding mismatch that would create false continuity,
8. replay result that would fabricate a false active memory or false lawful action.

Disallowed fallback behavior:

```text
silent repair
silent deletion
invented eligibility
invented publication state
invented active-memory resolution
invented lawful next action
```

## Release-Proof Obligations Inherited By C0.6.7B+

`C0.6.7B+` must prove all of the following against this contract:

1. additive migration preserves semantic bindings,
2. replay consumes every required portable ledger in deterministic order,
3. operational projections rebuild or refuse safely,
4. restart preserves current active memory, publication history, and next lawful action,
5. packaged hosts preserve the same operator-visible truth,
6. corrected-child lineage preserves publish blocking and successor eligibility truth,
7. rollback posture is explicit and non-ambiguous,
8. unsupported downgrade fails closed,
9. no ordinary flow requires raw DB or ledger edits.

## Immediate Implementation Consequences

This contract sets the order for the next slices:

1. `C0.6.7B` must treat SQLite as rebuildable operational projection, not lone authority.
2. Replay tests must cover both `interpretive-governance-ledger.jsonl` and `dnm-publication-ledger.jsonl`.
3. Promotion/reconstruction artifacts must be classified more tightly before release closeout.
4. Version-mismatch handling must be proven, not merely described.
5. Recovery logic must preserve cross-stream bindings, not just row presence.

## Open Tightening Required Later

These are known contract follow-ups, not blockers to accepting this inventory:

1. classify `generations/*` file-by-file before release closeout,
2. classify `promotions/authorizations/*` file-by-file before release closeout,
3. state whether any reconstruction artifacts can be regenerated losslessly from the portable ledgers plus canonical source,
4. prove whether `promotion-journal.jsonl` alone is sufficient for promotion replay or whether additional promotion artifacts are required,
5. document the exact replay ordering once `C0.6.7B` hardens the implementation.
