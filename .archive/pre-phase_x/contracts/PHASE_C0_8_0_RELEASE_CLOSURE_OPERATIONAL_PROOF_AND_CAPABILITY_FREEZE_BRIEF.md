# Phase C0.8.0: Release Closure, Operational Proof, And Capability Freeze Brief

Last updated: 2026-07-13

Status: active governing brief

## Purpose

Close the remaining production, operator, recovery, and release-governance gaps required for a defensible `v1.0` decision.

`C0.8.0` does not add a new memory architecture.

It answers:

```text
Can the governed Architectural and Interpretive Memory system be installed,
operated, reviewed, replayed, recovered, and released without hidden authority
changes or required developer-only intervention?
```

## Numbering Decision

The repository already contains completed `C0.75` structural-promotion work.

This phase is therefore `C0.8.0`, not `C0.7.0` and not `C0.6.10`.

```text
C0.6.x
-> governed interpretation, publication, semantic generation, and replay

C0.75
-> governed structural-authority promotion and recovery

C0.8.0
-> production closure and v1.0 release authority
```

## Entry State

The following boundaries are already complete and must not be reopened without contradictory evidence:

1. `C0.6.5` defines and implements persisted evidence findings for the governed candidate path, including automated compatibility proof.
2. `C0.6.7` proves upgrade, replay, restart, packaged runtime parity, and the existing capability-freeze posture.
3. `C0.6.9` proves semantic generation, canonical rendering, saved-shard persistence, proposal admission or truthful refusal, exact Review opening, and portable replay.
4. `C0.75` proves manual structural promotion, atomic authority transition, restart recovery, rollback, and Node/Bun parity.

The host proposal-generation portion originally assigned to `C0.6.8` is superseded by the exact `C0.6.9` closeout proof. Direct source navigation remains open under the `C0.6.8` jurisdiction.

## Current Position At Adoption

As of 2026-07-13:

```text
C0.6.5   persisted evidence-finding contract                COMPLETE
C0.6.7   upgrade/replay/restart and packaged parity         COMPLETE
C0.6.8   host proposal creation and source navigation       PARTIAL
C0.6.9   semantic generation, save handoff, and replay      COMPLETE
C0.75    structural promotion and recovery                  COMPLETE
C0.8.0   release closure                                    ENTERED
v1.0     release artifact                                   NOT CUT
```

### Proven today

1. `C0.6.5` is complete: new governed candidates persist human-readable evidence findings, exact bindings survive replay, missing findings remain truthful, and automated compatibility coverage passes.
2. Upgrade, replay, restart, recovery substrate, and packaged Node/Bun parity have existing proof under `C0.6.7` and `C0.75`.
3. Saved Architectural shards use schema-constrained semantic generation, deterministic canonical rendering, portable replay authority, and governed save-to-proposal handoff.
4. An admitted proposal opens the exact Review revision; a refused proposal leaves the saved shard intact and does not open Review.
5. Manual structural promotion, committed-state verification, restart recovery, and rollback are complete at the `C0.75` boundary.

### Partially complete today

1. `C0.6.8` proposal creation is proven through the later `C0.6.9` path, but direct source navigation remains unimplemented or unproven at the required host boundary.
2. Historical candidates without findings retain the completed `C0.6.5` truthful fallback; direct source navigation remains unresolved under `C0.6.8` / `C0.8.0D`.
3. Replay, rebuild, integrity, and recovery mechanisms exist and are proven through routes, scripts, or harnesses, but required supported admin operations are not yet exposed as a no-script host-admin flow.
4. The older capability freeze authorizes `v1.0` with documented limitations, but it predates the final `C0.6.9` and `C0.75` completion posture and is not the final release-candidate freeze.

### Unproven or unresolved today

1. Architectural RAG persisted-source admission, profile-isolated indexing, discovery-only retrieval, labelled prompt evidence, truthful UI posture, and equivalent SillyTavern/SillyBunny production behavior are complete through C0.8.0C.4.
2. Direct source navigation from findings and supported technical references is not closed.
3. No-script supported admin replay, rebuild, and recovery controls are not closed.
4. The current extension manifest remains at `0.9`; no verified `v1.0` tag or GitHub release artifact exists.

Completed dispositions formerly listed here:

- C0.8.0B classified the supplied transport incidents and recorded the release disposition.
- The stale C0.6.3 grounding assertion was repaired with narrowed-support and explicit broad-countercase proof.
- C0.8.0C proved fail-closed isolation on both supported hosts; C0.8.0C.1 superseded only its blanket-unavailability product posture.

### Current gate

```text
NOW
-> C0.8.0A Contract Reconciliation And Release Baseline complete
-> stale C0.6.3 grounding assertion maintenance complete
-> C0.8.0B Transport, JSON, And Request-Ownership Diagnostic complete
-> C0.8.0C Architectural Retrieval Isolation And Fail-Closed Host Proof complete as a safety baseline
-> C0.8.0C.1 Architectural RAG Discovery-Projection Contract Reconciliation complete
-> C0.8.0C.2 Architectural RAG Admission And Index Schema complete
-> C0.8.0C.3 Architectural RAG Retrieval Semantics And Prompt Boundary complete
-> C0.8.0C.4 Architectural RAG Packaged Host Proof And UI Posture complete
-> next bounded gate: C0.8.0D Evidence Usability And Exact Source Navigation
-> stop for authorization before C0.8.0D work
```

No later `C0.8.0` slice is authorized merely by adopting this brief.

## Governing Rule

```text
No capability is supported merely because a route, script, test fixture, or
projection exists. Its authorized operator or admin path, canonical persistence,
replay behavior, and failure policy must match the governing contract and pass
the named proof.
```

## Authority Gate

### Governing contracts

The phase must preserve the contracts established by:

1. `PHASE_C0_5_OPERATIONAL_DB_AND_REBUILD_BRIEF.md`
2. `PHASE_C0_6_5_EVIDENCE_FINDING_CONTRACT_BRIEF.md`
3. `PHASE_C0_6_7_UPGRADE_REPLAY_AND_RELEASE_HARDENING_BRIEF.md`
4. `PHASE_C0_6_8_HOST_PROPOSAL_CREATION_AND_SOURCE_NAVIGATION_BRIEF.md`
5. `PHASE_C0_6_9_ARCHITECTURAL_SHARDER_CONTRACT_BOUNDARY_BRIEF.md`
6. `PHASE_C0_75_PROMOTION_AUTHORITY_AND_TRANSACTION_CONTRACT_BRIEF.md`

### Authoritative sources

Authority remains divided by jurisdiction:

1. canonical source messages and their stable identities govern source truth,
2. versioned schemas, immutable semantic replay artifacts, and the Architectural replay ledger govern saved Architectural shard replay,
3. the Interpretive governance ledger owns synthesis runs, proposals, admission, review, publication, supersession, and withdrawal,
4. structural authority generations, promotion evidence, the promotion journal, and the authoritative generation pointer govern structural promotion and recovery,
5. versioned release artifacts and their recorded proof govern the shipped product claim.

### Projection boundary

SQLite databases, browser state, queues, rendered review surfaces, and integrity reports are operational projections or views. They do not become durable semantic, interpretive, structural, or release authority merely because they are convenient to query.

### Lifecycle owners

1. Architectural generation code owns schema validation, normalization, canonical rendering, save refusal, and replay verification.
2. Interpretive governance services own proposal, review, publication, successor, replacement, and withdrawal lifecycles.
3. Structural promotion services own qualification, authorization, transition, committed-state verification, restart recovery, and rollback.
4. Host-admin recovery controls may invoke existing replay, rebuild, integrity, and recovery services; they may not duplicate or redefine them.
5. Release governance owns capability classification and the final authorization decision.

### Mechanisms reused

This phase must reuse existing:

1. canonical ledgers and replay artifacts,
2. replay, rebuild, integrity, and recovery services,
3. evidence-finding records and exact source bindings,
4. source resolvers where exact navigation is possible,
5. structured diagnostics and governed blocker projection,
6. packaged Node/Bun proof harnesses.

### Failure policy

Ambiguous authority, stale bindings, malformed model output, unrecoverable versions, unresolved source targets, transport uncertainty, and recovery divergence must refuse or report explicitly. No slice may silently fall back to a weaker authority path.

## Release Classification

### Release-gating

The following must close before `v1.0`:

1. reconcile the live documentation and remaining contradictory proof state,
2. establish the exact transport/JSON/request-ownership incident contract and release disposition,
3. implement and prove Architectural RAG as a discovery-only projection over already-persisted Architectural shards, with no authority effect,
4. close the human evidence-inspection path selected for the `v1.0` product promise,
5. provide no-script controls for recovery operations classified as supported admin flows,
6. repeat fresh-install, upgrade, replay, restart, recovery, and packaged-host proof against the release candidate,
7. freeze the supported, admin-only, developer-only, deferred, unsupported, and hidden capability posture,
8. version, package, verify, tag, and publish the exact release artifact.

### Explicitly deferred side objectives

Unless separately promoted by a new governing decision, `C0.8.0` excludes:

1. whole-chat archive,
2. destructive-delete enhancements beyond current guarantees,
3. proposal-retirement UX,
4. help drawer or generalized README UI,
5. actor-aware defaults,
6. chat-hygiene tooling,
7. highlight and toast polish,
8. full custom publication-policy administration,
9. model-selected nomination or model-governed proposal action,
10. generalized source-viewer redesign beyond exact resolvers needed for release evidence navigation.

## Execution Law

Each subphase is a separate bounded slice.

```text
one evidenced problem
-> one declared jurisdiction
-> one bounded change
-> one exact proof
-> stop
```

Completion of this brief does not authorize implementing all subphases in one change.

## C0.8.0A: Contract Reconciliation And Release Baseline

### Goal

Create one authoritative statement of completed boundaries, open release gates, and capability classifications.

### Required work

1. record `C0.6.9` as complete and remove stale claims that host proposal creation remains open,
2. classify `C0.6.8` proposal creation as superseded by `C0.6.9` proof while retaining direct source navigation as open,
3. reconcile the active `C0.6.5` findings contract with older freeze language that says findings are unavailable for every candidate,
4. record `C0.75` as completed structural-promotion jurisdiction,
5. diagnose or explicitly dispose of the unrelated `C0.6.3` grounding-policy test contradiction recorded by the `C0.6.9` completion report,
6. identify every remaining release blocker and its governing owner,
7. publish one current capability matrix and make older documents point to it rather than compete with it.

### Proof gate

1. no active document presents a completed boundary as open,
2. no open boundary is presented as complete,
3. every remaining item is classified as release-gating, supported admin, developer-only, deferred, unsupported, hidden, or side objective,
4. the roadmap has one current authority source.

## C0.8.0B: Transport, JSON, And Request-Ownership Diagnostic

### Goal

Establish the exact cause, owner, and release disposition of observed first-attempt `502` / transport failures without conflating them with semantic-schema failures.

### Required evidence classes

The diagnostic must distinguish, when observed:

```text
TRANSPORT_RESET
UPSTREAM_502
REQUEST_TIMEOUT
REQUEST_CANCELLED
RESPONSE_TRUNCATED
MALFORMED_JSON
REQUEST_COLLISION
SHARED_STATE_CONFLICT
SEMANTIC_SCHEMA_INVALID
```

### Required work

1. capture the exact request, provider path, timing, retry sequence, and terminal response,
2. identify request ownership and cancellation behavior across the extension and host API client,
3. determine whether shared state is released while provider work remains active,
4. prove whether the existing one-transient-retry behavior duplicates any save, proposal, or governance mutation,
5. separate transport diagnostics from structured-response and semantic-validator diagnostics,
6. issue one bounded release disposition:
   - accepted provider limitation with truthful diagnostics,
   - bounded repair required before release,
   - or release blocked pending external resolution.

### Proof gate

1. the observed incident is reproducible or preserved in a complete trace,
2. its classification is based on observed values rather than inference,
3. retry does not duplicate governed state,
4. cancellation or terminal failure leaves no partial governed mutation,
5. malformed, truncated, or schema-invalid responses fail closed under their correct diagnostic class,
6. any implementation repair receives its own newly declared bounded slice.

This diagnostic does not pre-authorize global serialization, provider-specific delay, retry-count expansion, or API-client redesign.

## C0.8.0C: Architectural Retrieval Isolation And Fail-Closed Host Proof

Status: complete as a fail-closed safety baseline. Its blanket-unavailability posture is superseded by the approved C0.8.0C.1 discovery-projection contract. The observed refusal proof remains valid evidence for unsupported, malformed, mixed-profile, and pre-contract routes. Existing absolute guards remain temporary safety controls until a separately authorized implementation slice replaces them with contract-aware admission.

### Goal

Prove that Architectural output cannot enter warm RAG, retrieval indexing, or prompt retrieval unless a future governing contract explicitly authorizes it.

### Required work

1. prove every relevant host surface blocks Architectural warm-archive admission,
2. prove Architectural shards cannot enter ordinary retrieval indexing through an alternate save path,
3. prove Architectural output cannot appear in prompt retrieval,
4. prove configuration drift or unsupported routes refuse rather than silently admit or degrade,
5. prove equivalent behavior on the supported SillyTavern and SillyBunny packaged hosts,
6. preserve plain-language operator guidance and exact technical refusal evidence.

### Proof gate

```text
Architectural output
-> no warm archive admission
-> no retrieval indexing
-> no prompt retrieval path
```

And:

```text
misconfigured or unsupported path
-> explicit refusal
-> no partial write
-> no silent fallback
```

## C0.8.0C.1: Architectural RAG Discovery-Projection Contract Reconciliation

### Goal

Reconcile the original mode-aware Architectural RAG roadmap with the later blanket deferral and establish the approved authority boundary:

```text
persisted Architectural shards and canonical ledgers
-> establish memory evidence and authority

Architectural RAG vectors and retrieval
-> discover and surface relevant existing evidence
-> carry exact source identity and hashes
-> never create, adopt, supersede, publish, or establish authority
```

### Governing contract

`PHASE_C0_8_0C_1_ARCHITECTURAL_RAG_DISCOVERY_PROJECTION_CONTRACT_BRIEF.md` owns the admission, projection, retrieval, failure, and proof boundaries for all later Architectural RAG work.

### Release effect

Architectural RAG is release-gating for the intended `v1.0` product rather than a deferred side objective. C0.8.0D does not begin until the bounded C0.8.0C.2-C0.8.0C.4 implementation and host-proof sequence closes.

## C0.8.0D: Evidence Usability And Exact Source Navigation

Status reconciliation (2026-07-15): `C0.8.0D.1` is the approved release-gating addendum for operator proposal intake, inspectable evidence, lifecycle clarity, and the Clarity Principle. A technical binding or debug-row link does not by itself satisfy human evidence inspection. See `C0_8_0D_1_OPERATOR_PROPOSAL_INTAKE_EVIDENCE_AND_CLARITY_CONTRACT.md`.

### Goal

Complete human inspection of governed evidence without weakening canonical source bindings or reimplementing the existing evidence-finding contract.

### Existing authority reused

`C0.6.5` owns persisted human-readable findings. `C0.6.8` owns host source-navigation affordances. This slice integrates and proves those contracts; it does not invent browser-authored findings.

### Required work

1. verify newly governed candidates persist and replay human-readable findings with their exact bindings,
2. identify the explicit compatibility posture for historical candidates that lawfully lack findings,
3. render primary, supporting, and limiting evidence only when recorded by the canonical finding contract,
4. provide direct navigation from a finding or technical reference to the exact source message where an existing resolver can establish one unique target,
5. provide a truthful copy-only or unavailable state where no exact resolver exists,
6. refuse ambiguous navigation rather than choosing a likely source,
7. retain raw bindings and hashes in Technical Details.

### Proof gate

1. a new reviewable candidate displays a persisted readable finding,
2. the finding carries exact canonical source bindings,
3. restart/replay preserves the finding and bindings unchanged,
4. at least one message reference opens the exact source occurrence,
5. at least one supported technical reference resolves correctly,
6. missing or ambiguous sources remain non-clickable and explain why,
7. no prose is synthesized in the browser from classification labels alone.

### Product decision

If this slice is not closed, `v1.0` may proceed only through an explicit release decision that narrows the product promise to technical evidence bindings without complete human-readable navigation. Silence is not a valid classification.

## C0.8.0E: Upgrade, Replay, Restart, And No-Script Recovery Controls

### Goal

Expose the already-governed recovery mechanisms required for supported host administration without scripts, raw SQL, manual JSON editing, or source intervention.

### Required work

1. inventory canonical artifacts, ledgers, projections, host metadata, version markers, and current recovery services,
2. classify each operation as ordinary automatic recovery, supported admin action, or developer-only proof/repair,
3. provide no-script host-admin controls only for operations classified as supported admin actions,
4. make replay, rebuild, integrity verification, and governed recovery invoke their existing lifecycle owners,
5. define additive upgrade, version mismatch, unsupported downgrade, rollback, and partial-failure behavior,
6. prove restart after publication, successor revision, replacement, withdrawal, structural promotion, and rollback,
7. prove Node/Bun and packaged-host semantic parity.

### Proof gate

1. fresh install succeeds from the packaged artifact,
2. governed upgrade from the supported pre-v1 state succeeds,
3. replay reconstructs identical operator-visible truth from canonical authority,
4. restart preserves active memory, history, and structural authority,
5. supported admin recovery restores lawful state through the host controls,
6. unsupported version combinations fail safely and explain the repair path,
7. the UI cannot mutate canonical authority directly or treat SQLite as the sole source of truth.

## C0.8.0F: Capability Freeze

### Goal

Freeze the exact `v1.0` product posture and ensure no UI, route, or document implies unsupported authority.

### Required classifications

Every capability must be one of:

```text
supported ordinary operator flow
supported admin flow
developer-only flow
deferred capability
unsupported capability
deprecated or hidden path
```

### Minimum ordinary operator flows

1. create a proposal from lawful saved evidence,
2. open the admitted proposal directly in Review,
3. inspect readable findings and exact sources according to the release decision,
4. record reviewer and subject decisions,
5. approve with changes and review the corrective child revision,
6. publish an eligible memory,
7. create and publish a successor replacement,
8. withdraw according to the governed lifecycle,
9. inspect current and historical truth.

### Minimum supported admin flows

1. inspect plugin and authority health,
2. initialize the standard publication policy through the supported host path,
3. run supported replay and projection rebuild operations,
4. run governed recovery,
5. inspect integrity and failure reports.

### Proof gate

1. one capability matrix records every shipped surface,
2. ordinary flows require no scripts, raw API payloads, SQL, or internal policy vocabulary,
3. admin controls reuse governed services and visibly identify their scope,
4. developer-only routes and proof harnesses cannot be mistaken for product UI,
5. deferred and unsupported capabilities are named,
6. hidden or deprecated paths cannot imply current support,
7. side objectives remain outside release scope unless explicitly promoted.

## C0.8.0G: Final Release Proof And Cut

### Goal

Produce and authorize the exact `v1.0` artifact.

### Required work

1. run the complete release proof matrix against the release candidate,
2. build and test the packaged SillyTavern artifact,
3. build and test the packaged SillyBunny artifact,
4. verify manifest version, package contents, install behavior, upgrade behavior, and reproducibility,
5. bump the extension version from `0.9` to `1.0.0` using the repository’s accepted manifest format,
6. prepare release notes with supported capabilities, admin flows, limitations, and deferred work,
7. create the release commit and tag,
8. publish the GitHub release and exact verified artifacts,
9. record the final release decision and proof chain.

### Final decision

The decision must be exactly one of:

```text
v1.0 authorized
v1.0 authorized with documented limitations
v1.0 blocked
```

### Proof gate

1. every release-gating slice has an exact passing proof or an explicit limitation authorized by the governing product decision,
2. both packaged-host proofs pass against the artifact being released,
3. the capability posture is frozen and matches the UI,
4. documentation matches implementation and current completion state,
5. no known blocker is hidden as a side objective or vague limitation,
6. the tagged artifact is reproducible from the recorded release commit,
7. the published checksums match the verified artifacts.

## Required Phase Artifacts

`C0.8.0` must produce:

1. a reconciled capability matrix,
2. a transport/request-ownership diagnostic report and release disposition,
3. an Architectural retrieval-isolation host-proof record,
4. an evidence-navigation and replay-proof record,
5. an admin recovery and packaged-host proof record,
6. final release notes,
7. a final `C0.8.0` completion and release-decision report,
8. the tagged and published `v1.0` artifacts with checksums.

## Exit Condition

`C0.8.0` closes only when the repository can truthfully state:

```text
The exact v1.0 artifact has one frozen capability posture; preserves the
governing semantic, interpretive, and structural authority boundaries; passes
fresh-install, upgrade, replay, restart, recovery, retrieval-isolation,
evidence-inspection, and packaged-host proof; and has an explicit release
authorization decision supported by reproducible evidence.
```

## Terminal Gate

Each subphase stops when its named proof succeeds. Naming the next subphase does not authorize it.

`C0.8.0G` stops when the release decision and artifact publication proof are recorded. Further work requires a new authorized phase or a separately declared defect slice.
