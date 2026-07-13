# Phase C0.6.9: Architectural Sharder Contract Boundary Brief

Last updated: 2026-07-10

Status: active contract brief

## Purpose

Replace the current prompt-heavy architectural sharder contract with the correct boundary:

```text
source content
-> schema-constrained semantic extraction
-> code-owned legality and normalization
-> deterministic consolidation and cap enforcement
-> targeted semantic repair only when needed
-> canonical shard renderer
-> save
-> governed proposal candidate
-> review
```

`C0.6.9` does not exist to make the prompt shorter.
It exists to remove the wrong work from the prompt and move mechanically enforceable work back into code.

## Governing Rule

```text
The LLM produces meaning-bearing records.
Code owns canonical legality, rendering, source normalization, deterministic pruning, and every transformation that does not require semantic judgment.
```

The model must no longer be responsible for:

1. final shard grammar,
2. parser-specific pipe formatting,
3. exact dialogue renderer syntax,
4. mechanically valid section text,
5. inferred provenance repair,
6. deterministic cap enforcement.

The model should instead produce structured semantic records matching a supplied schema.

## Relationship To Earlier Phases

`C0.6.8` defined the host proposal doorway:

```text
Select evidence.
Create proposal.
Review opens.
```

`C0.6.9` defines how architectural sharder output becomes lawful, reviewable evidence for that doorway without pushing parser and renderer work onto the model.

This phase also locks the primary architectural-mode happy path:

```text
architectural sharder review
-> save output
-> proposal creation from the saved source manifest
-> admitted governed candidate
-> review opens
```

That path stays operator-controlled.
It does not silently publish, silently approve, or silently admit unsupported claims.

## Problem Statement

The current architectural sharder still asks the model to satisfy too many code-owned constraints at once:

1. semantic extraction,
2. routing,
3. compression,
4. final section grammar,
5. parser-sensitive field syntax,
6. canonical record legality,
7. provenance formatting,
8. overflow tradeoffs.

That is why failures surface as parser-shaped defects instead of truthful operator guidance.

Examples already observed in the current branch include:

1. invalid decision types such as `ARCHITECTURE`,
2. event-field leakage from prose into unsupported pipe fields,
3. dialogue rows failing because the final renderer syntax was not emitted exactly,
4. thread references failing because incomplete refs were emitted as if they were canonical,
5. save blocking with raw schema or parser error language that the operator cannot act on directly.

The current prompt already tries to encode many of these rules.
That is necessary but insufficient.
If code can decide legality without semantic judgment, code should decide it.

## Phase Goal

Make the architectural sharder produce schema-constrained semantic records and move all mechanically provable legality into code before canonical shard text is rendered or admitted for proposal creation.

The operator-facing result should be:

```text
I ran architectural sharder.
The system either:
1. saved a lawful shard and opened the governed proposal review, or
2. blocked with a human-readable reason and the next lawful step.
```

## Non-Goals

`C0.6.9` does not:

1. redesign governed review or publication lifecycle again,
2. replace exact bound source records with browser inference,
3. permit provenance manufacture from incomplete references,
4. silently convert unsupported meaning into accepted decisions,
5. widen architectural sharder into autonomous review or publication,
6. reopen evidence-finding semantics already defined under `C0.6.5`,
7. require exact wording replay from any LLM synthesis step.

## Locked Product Decisions

### 1. The proposal is a governed candidate, not canonical memory

Better language:

```text
one governed proposal object
```

or:

```text
one admitted candidate
```

Not:

```text
one canonical proposal object
```

The candidate shape may be canonical.
Its memory meaning is not canonical until review, subject decision, and publication complete.

### 2. Architectural-mode proposal creation is save-driven

The primary ordinary path for architectural mode is:

```text
review architectural shard
-> save
-> create governed proposal candidate from the saved manifest
-> review opens immediately
```

The operator should not have to:

1. find a CLI seed script,
2. choose a synthesis route,
3. choose a policy on the happy path,
4. hunt the queue after save.

### 3. Evidence sources are inputs; the proposal is the review object

The system must synthesize one governed candidate from a validated selected evidence set.

It must not treat each shard as its own review object.

Bad architecture:

```text
each shard becomes a proposal
```

Correct architecture:

```text
selected evidence set
-> source manifest
-> synthesis run
-> grounded proposal candidate
-> admission / dedupe
-> review routing
-> Review opens
```

### 4. The model boundary stops at semantic records

The model may perform:

1. extraction,
2. routing judgment,
3. compression,
4. merge judgment,
5. evidence selection,
6. decision identification.

The model may not be the final authority for:

1. legal enums,
2. final renderer syntax,
3. pipe-segment legality,
4. proof-free reference normalization,
5. deterministic cap math,
6. canonical text layout.

### 5. Replay restores persisted results; it does not re-invent them

If proposal creation or architectural synthesis uses an LLM or other nontrivial generator, replay must restore:

1. synthesis input envelope,
2. source manifest,
3. synthesis output,
4. content hash,
5. model/tool/version if applicable,
6. grounding/admission result,
7. persisted schema version,
8. normalization version,
9. renderer version,
10. canonical rendered output hash.

Replay requires either: (a) the persisted canonical rendered output and its hash, or (b) every versioned transformation needed to reproduce and verify that output. Replay must not ask the model to regenerate the same wording and hope it lands identically.

## Required Contract Decisions

Before `C0.6.9` closes, implementation must lock the following exact contracts.

### A. Intermediate semantic schema

The intermediate semantic schema MUST be defined as a versioned normative JSON Schema document (`architectural-intermediate-schema-v1.json`). The schema version is embedded in the `$id` field (e.g., `"https://summary-sharder/architectural-intermediate/v1"`) and recorded alongside every persisted shard for replay fidelity.

The schema must define:

1. closed enums,
2. required properties,
3. `additionalProperties: false`,
4. array limits (minItems/maxItems),
5. section-specific record shapes,
6. source-reference patterns (S-ordinal format),
7. ID patterns (DEC:, EVT:, DIA:, THR: prefixes),
8. explicit omission rules for non-applicable optional fields (use `"omitWhen"` annotations or equivalent normative commentary).

Schema version is part of the replay contract: when the schema version changes, the old version must remain referenceable so persisted shards can be re-validated against their original schema.

Where the inference stack supports constrained generation, use it.
Do not treat this as merely “please output JSON.”

### B. Provenance normalization boundary

Code may normalize incomplete references only when proof exists.

Example:

```text
S288
-> S288:1
```

is allowed only when code can prove that:

1. there is exactly one valid subordinate reference, or
2. bound evidence resolves the intended reference exactly.

Otherwise:

1. reject the record,
2. request repair, or
3. surface a human-readable blocker.

Normalization must never manufacture provenance.

### C. Cap-handling split

Code may safely:

1. count records,
2. enforce section caps,
3. remove exact duplicates,
4. rank by explicit weight or status,
5. protect sealed decisions,
6. protect correction chains,
7. drop low-priority resolved items by deterministic rule.

When records tie on weight and status, canonical deterministic tie-breakers order them using immutable identity/provenance fields (e.g., decision ID, source reference), independent of arrival order or runtime. All cap enforcement, ranking, and dropping must follow this stable ordering. The determinism proof must require this stable ordering.

The model is needed only when distinct records must be semantically consolidated without losing governing meaning.

That consolidation must be a targeted repair pass over the overflowing section, not a full regeneration of the whole shard.

### D. Save-to-proposal orchestration contract

On successful save of an architectural shard that is eligible for proposal creation:

```text
saved shard manifest
-> handoff key = hash(manifestId + canonicalOutputHash)
-> durable state transition (SAVED -> PROPOSING -> REVIEWING | BLOCKED | FAILED)
-> proposal synthesis / admission
-> governed review candidate
-> review opens
```

When a proposal candidate is admitted but the review launch is blocked (e.g., referential drift, integrity failure, authority conflict), the state transition encodes the blocked outcome:

```text
SAVED -> PROPOSING -> BLOCKED (candidate-admitted, review-blocked)
```

The blocked state must durably record:
- the handoff key,
- the blocker projection (code, reason, nextStep),
- the admitted candidate (if one was produced),

so the operator sees a truthful blocker and the system can distinguish "never attempted" from "attempted and blocked" on restart/replay.

Idempotent outcomes:
- **Created**: new candidate created and review opens.
- **Reused**: existing candidate reused (same handoff key), no duplicate, review reused.
- **Blocked**: handoff blocked by integrity or authority, saved shard remains valid source artifact, operator sees truthful blocker.
- **Failed**: handoff failed after transient error, state preserved for restart-safe retry with same handoff key.

If proposal creation fails, the saved shard remains a valid persisted source artifact and the operator sees a truthful blocker. Repeated saves with the same handoff key must not duplicate candidates or reopen an incorrect review while preserving the saved shard as the source artifact.

### E. Operator-facing validation error contract

When semantic validation fails, the operator must see:

```text
Blocked: [section] failed validation
Reason: [specific field or constraint]
Next step: Review source content or adjust extraction scope
```

No stack trace.
No raw schema dump.
No parser-internal field list as the only explanation.

Technical refusal codes may still exist in diagnostics and proof logs.
They are not the primary operator message.

## Intended Pipeline

```text
source content
-> LLM semantic extraction
-> schema-constrained intermediate records
-> code validation + resolvable normalization
-> deterministic consolidation / cap enforcement
-> targeted semantic repair only when needed
-> canonical text renderer
-> final shard
-> save
-> governed proposal candidate
-> review
```

## Prompt Contract

The architectural sharder prompt should become a compact operational prompt that explicitly says:

1. you produce structured semantic records matching the supplied schema,
2. you do not emit renderer syntax,
3. you do not emit parser-specific formatting,
4. you do not invent references,
5. you do not invent rationale,
6. you preserve governing meaning,
7. you route by function, not by topic,
8. you return only the semantic record set.

The current prompt already carries valuable routing and extraction rules.
Those rules should survive.
What should disappear from the model burden is final grammar enforcement.

## Scope

`C0.6.9` covers five layers.

### A. Intermediate Record Schema

Define:

1. record families by section,
2. closed enums for decisions, threads, and other bounded fields,
3. ref and ID patterns,
4. optional vs required field rules,
5. max cardinality rules where generation can honor them directly.

### B. Semantic Generation Boundary

Implement:

1. schema-constrained generation path where supported,
2. fallback strict JSON generation contract where not supported — must run the same intermediate-schema validator used by constrained generation before rendering; validate enums, additional-properties restrictions, cardinality limits, and omission rules; reject invalid fallback records so illegal output cannot cross the model boundary,
3. prompt simplification around semantic-only output,
4. proof that invalid final-grammar defects no longer originate in the model boundary.

### C. Validation, Normalization, And Rendering

Implement:

1. validation over intermediate records,
2. proof-based reference normalization only,
3. deterministic canonical renderer,
4. final validator bridge before save and proposal creation.

### D. Targeted Repair

Implement:

1. overflow repair by section,
2. targeted semantic consolidation when deterministic pruning is insufficient,
3. bounded retry rules,
4. truthful failure projection when repair cannot safely resolve the issue.

### E. Operator Surface And Proposal Handoff

Implement:

1. human-readable blocker projection,
2. saved-shard to proposal handoff,
3. review launch on success,
4. stable saved artifact retention on proposal-creation failure.

## Suggested Implementation Slices

### C0.6.9A: Intermediate Schema And Semantic-Only Prompt

Implement:

1. canonical intermediate schema,
2. semantic-only prompt rewrite,
3. constrained-generation integration where supported,
4. tests for valid and invalid semantic payloads.

Proof:

1. invalid decision types such as `ARCHITECTURE` cannot be emitted in constrained mode,
2. unknown freeform thread statuses are rejected before rendering,
3. parser-specific syntax is absent from semantic output.

### C0.6.9B: Deterministic Renderer And Validator Bridge

Implement:

1. intermediate-to-canonical renderer,
2. proof-based normalization rules,
3. pre-save validation bridge,
4. stable final shard generation.

Proof:

1. dialogue records render into canonical speaker syntax without the model hand-authoring it,
2. unsupported event fields do not leak through as final saved records,
3. incomplete refs are either proven, repaired, or blocked truthfully.

### C0.6.9C: Targeted Overflow Repair

Implement:

1. deterministic cap enforcement,
2. targeted semantic repair for unresolved overflow only,
3. stable retry limits,
4. overflow diagnostics that explain what was protected and why.

Proof:

1. exact duplicates are removed mechanically,
2. sealed or governing records remain protected,
3. unresolved overflow does not trigger whole-shard regeneration.

### C0.6.9D: Save-To-Proposal Handoff

Implement:

1. architectural shard save producing a validated source manifest,
2. governed candidate creation from that manifest,
3. admission / dedupe / routing,
4. immediate review open on success.

Proof:

1. save succeeds and opens review without CLI intervention,
2. invalid or stale source manifests block with plain-language operator guidance,
3. the saved shard remains available even if proposal creation is refused.

### C0.6.9E: Operator Error Surface And Replay Safety

Status note (2026-07-12): the finalized multi-source semantic contract, core post-review reconciliation, pre-save manifest identity, deterministic canonical rendering, and post-save governed replay-artifact persistence are implemented and focused-proof complete. Proposal-handoff restart replay and packaged Node/Bun parity remain open. See `C0_6_9E_FINALIZED_MULTI_SOURCE_REPLAY_CONTRACT_REPORT.md`.

Implement:

1. plain-language blocker projection,
2. exact technical refusal code retention in diagnostics only,
3. replay restoration from persisted artifacts,
4. Node and Bun parity proof.

Proof:

1. operator sees section + reason + next step instead of a stack trace,
2. replay restores the same semantic payload, canonical rendered shard, and its hash, or every versioned transformation needed to reproduce and verify that output,
3. proposal handoff state survives restart and replay identically.

## Required Proof Matrix

`C0.6.9` does not close without these proofs.

### Invalid decision type

Expected:

1. semantic generation rejects or prevents the illegal type,
2. the operator does not see raw parser failure,
3. diagnostics preserve the exact technical reason.

### Unsupported event field leakage

Expected:

1. unsupported fields are rejected before canonical save,
2. the operator sees which section failed and why,
3. no final shard is saved with illegal event grammar.

### Dialogue with valid semantic quote but missing rendered speaker syntax

Expected:

1. semantic record remains valid if speaker identity exists in schema form,
2. renderer produces canonical dialogue syntax,
3. the model does not have to hand-format `--speaker`.

### Incomplete or ambiguous source reference

Expected:

1. code proves the normalization or refuses it,
2. provenance is never manufactured,
3. the blocker tells the operator to review source content or adjust scope.

### Section overflow with deterministic resolution

Expected:

1. deterministic pruning resolves the cap without a semantic retry,
2. protected records remain,
3. output is stable across reruns.

### Section overflow requiring semantic consolidation

Expected:

1. only the overflowing section is sent to targeted repair,
2. the rest of the shard remains untouched,
3. failure to resolve yields a truthful blocker rather than a whole-shard rewrite.

### Save-to-proposal success

Expected:

1. architectural shard saves,
2. proposal candidate is synthesized/admitted from the saved manifest,
3. review opens immediately.

### Save-to-proposal blocked

Expected:

1. shard save result remains durable,
2. proposal creation refuses with a plain-language blocker,
3. no CLI or route knowledge is required to understand the failure.

### Restart and replay

Expected:

1. replay restores the same semantic payload and canonical shard,
2. reviewable proposal state remains stable,
3. Node and Bun produce identical semantics,
4. persisted schema, normalization, and renderer versions are recorded,
5. replay requires either the persisted canonical rendered output and its hash, or every versioned transformation needed to reproduce and verify that output.

## UX Rules

### 1. The operator should not debug parser law

The operator’s job is to review meaning, not reverse-engineer grammar.

### 2. Failure messages must always include the next lawful step

Minimum contract:

```text
Blocked: [section] failed validation
Reason: [specific field or constraint]
Next step: Review source content or adjust extraction scope
```

If a sharper next action exists, use it.

Examples:

```text
Blocked: Threads failed validation
Reason: Source reference could not be resolved exactly.
Next step: Review source content or narrow the extraction range.
```

```text
Blocked: Decisions failed validation
Reason: Decision type must be one of the approved architectural decision types.
Next step: Review source content and regenerate with supported decision classes only.
```

### 3. Saved artifacts and review objects stay conceptually separate

The saved shard is evidence.
The admitted candidate is the review object.

### 4. The happy path must remain short

For architectural mode, success should feel like:

```text
Run sharder
-> review output
-> save
-> proposal opens
```

The operator should spend attention on whether the proposal is true, grounded, and acceptable, not on moving it between systems by hand.

## Exit Criteria

`C0.6.9` is complete when:

1. the model emits semantic records instead of final shard grammar,
2. code owns final legality, normalization, rendering, and deterministic pruning,
3. targeted repair is section-bounded,
4. operator-facing errors are human-readable and actionable,
5. architectural shard save can drive governed proposal creation without CLI fallback,
6. replay restores persisted synthesis artifacts without regeneration,
7. Node and Bun remain semantically identical.
