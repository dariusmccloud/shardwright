# C0.6.9 Architectural Sharder Contract Boundary Completion Report

Last updated: 2026-07-13

Final status: `C0.6.9 COMPLETE`

## Completed Boundary

C0.6.9 moved mechanically enforceable work out of model-authored shard grammar and into governed code:

```text
persisted source envelope
-> schema-constrained semantic records
-> deterministic exact-duplicate normalization
-> strict intermediate validation
-> section-bounded semantic repair only when still required
-> deterministic canonical rendering
-> pre-save validator bridge
-> saved Architectural shard
-> governed proposal handoff
-> exact review revision open
-> portable restart-safe replay
```

The model produces meaning-bearing records. Code owns legality, exact normalization, rendering, provenance refusal, cap enforcement, and replay verification.

## Authority And Projection Boundary

- The versioned intermediate schema governs model-generation records.
- The finalized semantic schema and deterministic renderer govern the saved canonical shard.
- Immutable replay artifacts plus `architectural-shard-replay-ledger.jsonl` are portable shard replay authority.
- The interpretive governance ledger owns synthesis runs, proposals, admission, and review revisions.
- SQLite remains a rebuildable operational projection.
- Browser state remains transient review and transport state.

Proposal lifecycle state is not copied into the shard replay artifact. Restart restores each authority through its own governing ledger.

## Required Proof Matrix

### Invalid decision type

- Intermediate validation rejects unsupported types such as `ARCHITECTURE`.
- The canonical renderer refuses schema-invalid semantic payloads before rendering.
- Operator projection preserves the technical reason and supplies plain-language next action.

### Unsupported event field leakage

- Additional properties are rejected at the intermediate boundary.
- Invalid semantic records cannot cross into canonical rendering or save.
- Structured diagnostics preserve the section, field, and exact validator reason.

### Dialogue rendering

- Semantic dialogue requires speaker identity but not model-authored renderer syntax.
- The deterministic renderer produces canonical `--speaker` output.
- Rendered dialogue passes the existing parser and structured validator.

### Incomplete or ambiguous source reference

- Pre-save validation rejects every out-of-range reference.
- No source reference or provenance binding is manufactured.
- Operator projection directs the user to review source content or adjust extraction scope.

### Deterministic overflow resolution

- Exact duplicate semantic records are removed before cap validation.
- First occurrence and section order remain stable.
- A duplicate-only overflow retains protected records, uses one API call, performs no semantic repair, and renders identically across reruns.
- Normalization emits an explicit `EXACT_DUPLICATE_SECTION_RECORDS_V1` record.

### Targeted semantic overflow repair

- Only one exclusively overflowing section is eligible.
- The repair request contains only that section and its cap.
- Unaffected sections remain byte-stable.
- Multiple overflowing sections or mixed semantic violations refuse rather than triggering whole-shard regeneration.

### Save-to-proposal success

- A persisted Architectural shard creates and admits a governed proposal.
- Post-save orchestration opens Review on the exact returned interpretation revision.
- Proposal generation does not publish continuity.

### Save-to-proposal refusal

- Proposal blocker projection retains exact technical refusal codes behind plain-language guidance.
- The already-saved shard remains intact.
- Refusal warns the operator and does not open Review.

### Restart, replay, and runtime parity

- Replay restores the same normalized semantic payload, canonical shard, versions, and hashes.
- Proposal handoff state survives operational projection deletion and restart.
- Packaged Node and Bun produce identical finalized semantic artifacts and replay projections.

## Exact Closeout Proof

Semantic extraction, validation, normalization, rendering, repair, and blocker matrix:

```powershell
node --test core/summarization/architectural-intermediate-validator.test.mjs core/summarization/architectural-semantic-prompt.test.mjs core/summarization/architectural-semantic-request.test.mjs core/summarization/architectural-semantic-response.test.mjs core/summarization/architectural-semantic-generation.test.mjs core/summarization/architectural-semantic-renderer.test.mjs core/summarization/architectural-semantic-pre-save.test.mjs core/summarization/architectural-overflow-repair.test.mjs core/summarization/architectural-structured-validator.test.mjs ui/modals/summarization/review-blocker-projection.test.mjs
```

Observed: `80` passed, `0` failed.

Save, proposal handoff, refusal, and restart matrix:

```powershell
node --test --test-name-pattern="interpretive synthesis route creates proposal directly|interpretive synthesis route rejects persisted architectural shards|architectural replay artifact and proposal handoff survive" tools/server-plugin/summary-sharder-memory/index.test.mjs core/summarization/architectural-proposal-handoff-orchestration.test.mjs core/summarization/architectural-proposal-launch-blocker.test.mjs core/summarization/architectural-authority-server-api.test.mjs core/summarization/architectural-live-finalization.test.mjs
```

Observed: `7` passed, `0` failed. The visible stale-source error log is the asserted `ARCH_SHARD_SOURCE_RANGE_STALE` refusal case.

Replay authority and packaged runtime matrix:

```powershell
node --test core/summarization/architectural-finalized-semantic.test.mjs core/summarization/architectural-semantic-replay-artifact.test.mjs tools/server-plugin/summary-sharder-memory/architectural-replay.test.mjs tools/server-plugin/summary-sharder-memory/architectural-replay-routes.test.mjs tools/server-plugin/summary-sharder-memory/package.test.mjs
```

Observed: `24` passed, `0` failed. Visible invalid-artifact and missing-registration logs are asserted refusal cases.

Closeout total: `111` passed, `0` failed across the exact C0.6.9 proof matrix.

## Adjacent Unresolved Evidence

A broad run of `tools/server-plugin/summary-sharder-memory/index.test.mjs` produced `42` passes and one unrelated failure: `interpretive synthesis generate route admits deterministic stub output into governed review without publication` expected grounding scope assessment `TOO_BROAD` but observed `SUPPORTED`.

That C0.6.3 grounding-policy assertion does not exercise C0.6.9 semantic generation, save, handoff, refusal, or replay. It is not repaired or reclassified by this closeout and remains a separate diagnostic item.

Current classification and resolution (2026-07-13): `C0.8.0A` reproduced the failure and traced it to a stale test expectation. Commit `d2fe53f` narrowed the deterministic Jeep stub from the legacy phrase `extension's design` to `continuity and memory requirements within a shared architecture with Chris`. The assertion was realigned with that governed narrowed fixture, and a separate explicit broad countercase now preserves the `TOO_BROAD` / counterevidence contract. No production evaluator change was required. See `C0_8_0A_1_GROUNDING_ASSERTION_MAINTENANCE_REPORT.md`.

## Explicitly Out Of Scope And Next Target

C0.6.9 does not claim that the reported API timeout / transport JSON-format incident is resolved. The next diagnostic boundary should establish:

1. the exact failing request and provider path,
2. whether the observed failure is transport timeout, connection collision, response truncation, or invalid whole-response JSON,
3. request ownership and cancellation behavior,
4. retry timing and whether shared state is released while work remains active,
5. one trace-backed repair target and one exact proof.

No implementation authority follows from this completion report. Generation request coordination remains a contract-required side objective until that diagnostic establishes jurisdiction.

## Phase Verdict

C0.6.9 is complete at its declared boundary:

```text
semantic records
-> code-owned lawful canonical shard
-> durable governed proposal handoff
-> exact review opening or truthful refusal
-> deterministic portable replay
```

Further work requires a new bounded contract and may not implicitly redefine the authority boundaries closed here.
