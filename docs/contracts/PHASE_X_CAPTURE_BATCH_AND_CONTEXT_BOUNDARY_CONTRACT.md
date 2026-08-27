# Phase X: Capture Batch And Context Boundary Contract

**Version:** 0.1.0
**Status:** ENTERED — deterministic batch construction and context-use boundaries are
normative; numeric model-profile values and production implementation remain open.
**Parent:** `RFC_DISCOVERY_CAPTURE_OBSERVATION.md`

## 1. Problem

Capture runs over bounded model input, but batching must not become an undocumented
interpretive or evidentiary layer. A large window can hide missed sources, let summaries
stand in for antecedents, permit context to become proof, or make results depend on
accidental message grouping. A small window can sever a proposal from its adoption,
separate a quotation from its attribution, or repeatedly miss events at boundaries.

The system therefore needs deterministic batching that preserves source identity,
provides bounded local context, makes every eligible evidence source primary exactly
once, and treats overlap and context as explicit execution aids rather than authority.

## 2. Authority Gate

### Governing contracts

- `RFC_DISCOVERY_CAPTURE_OBSERVATION.md` governs source-local nomination and exact spans.
- `PHASE_X_CAPTURE_VOCABULARY_AND_SOURCE_POLICY_CONTRACT.md` governs source classes and
  the evidence/context/exclusion distinction.
- `PHASE_X_CAPTURE_BENCHMARK_GOVERNANCE_CONTRACT.md` governs how numeric batch and
  resource values become release evidence.

### Authoritative sources

Canonical source revisions and source-policy results remain authoritative. A batch
manifest records which exact revisions were presented together. It does not create a new
source, evidence set, conversation, relationship, or memory scope.

### Projection boundary

Token counts, batch membership, overlap, neighboring context, prompt order, model
attention, and batch summaries are execution projections. Co-occurrence inside a batch
does not establish semantic relationship, agreement, continuity, or authority.

### Lifecycle owner

The server-side capture scheduler owns the deterministic construction profile, source
ordering, primary coverage, overlap, context selection, batch hashes, and reconciliation.
The connected worker executes the supplied manifest and may not rebuild or expand it.

### Failure behavior

Missing source-policy results, stale revisions, tokenizer mismatch, budget overflow,
cross-scope mixing, unauthorized context, incomplete primary coverage, or manifest
mutation refuse or quarantine the batch. No source is silently truncated or marked
evaluated because it did not fit.

## 3. Batch Unit

A capture batch is:

```text
one memory scope
+ zero or one canonical chat instance
+ one or more ordered eligible-evidence source revisions
+ optional bounded context-only source revisions
+ one frozen construction profile
```

Canonical chat messages from different chats must not share a v1 capture batch. A
cross-chat reference remains an unresolved antecedent lead for later provenance
resolution. Authorized project, governance, imported, or external records run under
their own source-policy scope and deterministic ordering; they are not inserted into a
chat batch merely because retrieval found them similar.

## 4. Source Roles Inside A Batch

```text
PRIMARY_EVIDENCE
The source revision whose durable capture obligation is being satisfied in this batch.

EVIDENCE_OVERLAP
An eligible-evidence revision repeated from an adjacent batch to preserve boundary
meaning. It may support nominations and may produce idempotently deduplicated results.

CONTEXT_ONLY
A source-policy-approved context revision that may aid interpretation but cannot supply
claim-support spans or satisfy an observation.
```

Every `ELIGIBLE_EVIDENCE` revision must appear as `PRIMARY_EVIDENCE` in exactly one
successfully reconciled batch for its capture contract version. Appearance only as
overlap does not satisfy its durable capture obligation.

## 5. Deterministic Ordering And Construction

For canonical chat messages, source order is the host's immutable canonical message
order, with stable source record handle as the deterministic tie-breaker. For non-chat
records, the source-policy contract must supply a stable order key and tie-breaker.

The construction algorithm is:

```text
1. Resolve one immutable source-policy snapshot.
2. Select pending eligible-evidence revisions in canonical order.
3. Add primary evidence until the next atomic source would exceed a frozen limit.
4. Add only profile-permitted evidence overlap.
5. Add only policy-permitted local context under the context limits.
6. Recalculate exact tokenizer counts over the final rendered input.
7. Refuse if any limit or invariant fails.
8. Compute and persist the immutable batch manifest and hash.
9. Issue the exact manifest to the worker.
```

The worker cannot reorder, omit, truncate, merge, summarize, or append sources. Prompt
wrappers and labels remain outside source text and cannot affect source span offsets.

## 6. Atomic Sources And Oversize Behavior

One source envelope represents one complete canonical source revision. V1 batching must
not truncate or segment its canonical text.

If one required evidence source cannot fit by itself after fixed prompt, schema, output,
and safety reserves:

```text
Source state: SOURCE_PROFILE_INCOMPATIBLE
Reason: SOURCE_EXCEEDS_FROZEN_INPUT_BUDGET
Result: obligation remains unsatisfied
```

The lawful next action is to use a separately benchmarked larger construction/execution
profile or introduce a later governed source-segmentation contract. The system must not
silently omit the source, crop it, summarize it, or treat worker failure as
`NO_OBSERVATIONS`.

## 7. Frozen Construction Profile

Every batch binds a versioned profile containing:

```text
profileId, version, and hash
tokenizer identity, file hash, and version
model context capacity
fixed prompt token count
schema or grammar token count
reserved output tokens
safety-margin tokens
maximum source-input tokens
maximum source count
maximum primary-evidence source count
maximum evidence-overlap source count
maximum context-only source count
maximum context-only tokens
maximum context-to-evidence token ratio
evidence overlap count
context look-behind and look-ahead counts
```

Numeric values are model/configuration-dependent. They become normative only through a
benchmark profile frozen before holdout execution. A production model configuration
cannot claim benchmark proof under different values.

Universal v1 limits apply regardless of profile:

1. at least one primary-evidence source;
2. context-only source count may be zero;
3. context-only tokens must not exceed evidence tokens;
4. the profile's maximum context-to-evidence ratio must be between `0` and `1`;
5. fixed prompt, schema, output, and safety reserves cannot be borrowed by source input;
6. actual rendered input must fit the exact configured model context;
7. no source may be split, truncated, or normalized to fit.

## 8. Context-Only Selection

Context-only material is admitted only when:

- its source-policy result is `ELIGIBLE_CONTEXT_ONLY`;
- it belongs to the same memory scope and, for chat messages, the same chat instance;
- a frozen selection rule names why it is present;
- it fits both the absolute context-token cap and context-to-evidence ratio;
- its canonical revision and policy result are bound in the batch manifest.

Closed v1 context selection reasons are:

```text
PRECEDING_LOCAL_CONTEXT
FOLLOWING_LOCAL_CONTEXT
EXPLICITLY_RESOLVED_LOCAL_REFERENCE
DERIVED_RECORD_ORIENTATION
```

`DERIVED_RECORD_ORIENTATION` may identify where to look or explain local terminology. It
cannot establish that the summarized antecedent event happened.

Context-only material:

- cannot be a primary source handle;
- cannot appear in supporting spans or claim support;
- cannot supply an actor, affected subject, action, durability signal, consent,
  authority, mutuality, or track;
- cannot turn an otherwise unsupported observation into an accepted record;
- cannot satisfy its own durable capture obligation.

If context appears material enough to prove a claim, it must independently qualify as
eligible evidence and receive its own capture obligation rather than being promoted
inside the batch.

## 9. Overlap And Duplicate Control

Evidence overlap exists only to prevent source-local events from being severed at batch
boundaries. It is not retrieval expansion.

- Overlap follows canonical order and the exact frozen count.
- An overlap source retains `ELIGIBLE_EVIDENCE`.
- The same source revision and contract version keep one durable obligation.
- Duplicate nominations are reconciled through accepted-result idempotency and
  observation deduplication, never by discarding raw attempts.
- A source appearing as overlap in several batches becomes `EVALUATED` only after its
  own primary batch succeeds or an exact accepted result already satisfies that
  obligation.
- Overlap cannot cross memory scope or chat instance.

## 10. Normative Requirements

### BAT-SCOPE-001 — One memory scope

Every batch MUST bind exactly one memory scope. Sources from different scopes refuse.

### BAT-SCOPE-002 — One chat instance

A v1 batch containing canonical chat messages MUST bind exactly one chat instance.
Cross-chat antecedents remain provenance leads and MUST NOT be inserted by similarity.

### BAT-SCOPE-003 — Batch is not evidence

Batch co-occurrence, order, overlap, or context MUST NOT establish a relationship,
agreement, lifecycle, canonical track, or authority consequence.

### BAT-ORD-001 — Canonical deterministic order

The server MUST construct batches from immutable canonical order and stable tie-breakers.
The worker MUST execute the supplied order unchanged.

### BAT-ORD-002 — Atomic source revision

V1 MUST present each included source revision in full without truncation, segmentation,
normalization, or summary substitution.

### BAT-ORD-003 — Immutable manifest

Every issued batch MUST bind one immutable manifest and hash. Any source, order, role,
policy, profile, token count, or hash mutation creates a different batch and attempt.

### BAT-COV-001 — Exactly-once primary coverage

Every eligible source revision and capture contract version MUST be primary in exactly
one successfully reconciled batch. Overlap or context appearance does not satisfy it.

### BAT-COV-002 — No false completion

Construction failure, oversize refusal, timeout, invalid output, or context-only
appearance MUST NOT mark the source evaluated or produce `NO_OBSERVATIONS`.

### BAT-BUD-001 — Exact tokenizer

Budgeting MUST use the exact tokenizer identity and version bound to the execution
profile. Character counts or a different model's tokenizer cannot prove fit.

### BAT-BUD-002 — Reserved capacity

Source input MUST fit after fixed prompt, schema/grammar, output, and safety reserves.
No reserve may be borrowed after the profile is frozen.

### BAT-BUD-003 — Profile-bound limits

All numeric batch limits MUST come from the versioned benchmarked construction profile.
Changed limits create a new candidate configuration requiring applicable benchmark
proof.

### BAT-CTX-001 — Policy-approved context only

Every context-only source MUST bind an `ELIGIBLE_CONTEXT_ONLY` result from the same
source-policy snapshot and an enumerated selection reason.

### BAT-CTX-002 — Evidence remains dominant

Context-only tokens MUST NOT exceed evidence tokens, the profile ratio, or the absolute
context-token cap. The most restrictive bound governs.

### BAT-CTX-003 — Context cannot support claims

Any observation whose supporting span or claim-support binding references a context-only
source MUST be rejected or quarantined.

### BAT-CTX-004 — No implicit promotion

The model, worker, browser, or retrieval layer MUST NOT promote context-only material to
evidence. Promotion requires a new code-owned source-policy result and capture
obligation.

### BAT-OVR-001 — Bounded adjacent overlap

Evidence overlap MUST be canonical, adjacent, profile-bounded, and recorded. Semantic
similarity cannot add overlap.

### BAT-OVR-002 — Idempotent duplicate handling

Overlapping attempts and nominations MUST remain auditable while accepted effects are
idempotently reconciled.

### BAT-FAIL-001 — Oversize remains pending

An atomic source that exceeds the frozen profile MUST receive
`SOURCE_PROFILE_INCOMPATIBLE`, retain its unsatisfied obligation, and expose one lawful
next action.

### BAT-FAIL-002 — Fail closed on manifest mismatch

Stale revisions, policy mismatch, tokenizer mismatch, cross-scope membership, invalid
roles, count overflow, token overflow, or worker-manifest mismatch MUST refuse or
quarantine execution without losing source obligations.

### BAT-AUD-001 — Reconstructible batch

The persisted manifest, construction profile, source-policy snapshot, and source
revisions MUST reproduce exact membership, order, roles, counts, and batch hash after
restart.

## 11. Schema Consequences

`capture-batch-manifest-v1.schema.json` records:

- scope and optional chat identity;
- construction-profile and source-policy snapshot identity;
- ordered source revision and role bindings;
- exact tokenizer and capacity accounting;
- overlap and context selection reasons;
- immutable batch hash and creation time.

`capture-source-disposition-v1.schema.json` adds
`SOURCE_PROFILE_INCOMPATIBLE`. These are contract artifacts and authorize no runtime
producer or consumer.

## 12. Required Proof Before Implementation Closure

1. Every eligible evidence source is primary exactly once across a reconstructed batch
   plan.
2. Adjacent overlap preserves a boundary event without creating a second accepted
   effect.
3. A source appearing only as overlap remains pending for its own obligation.
4. Cross-chat and cross-scope sources refuse batch membership.
5. A context-only span in claim support refuses acceptance.
6. A derived summary may orient capture but cannot prove its antecedent claim.
7. Context counts and tokens obey the absolute cap, evidence ratio, and profile ratio.
8. Prompt, schema, output, and safety reserves remain unavailable to source input.
9. A single oversize source remains pending and is never truncated or converted to a
   zero result.
10. Worker reordering or omission causes manifest mismatch and no accepted effect.
11. Restart reconstructs identical batches and does not duplicate completed primary
    obligations.
12. Changing any numeric construction value changes the profile and batch hashes and
    invalidates inherited benchmark proof.

## 13. Open Values

The benchmark profile must still establish:

- exact tokenizer;
- context capacity and reserved-output size;
- fixed prompt/schema/grammar/safety reserves;
- source, primary, overlap, and context counts;
- absolute context token cap and context-to-evidence ratio;
- look-behind/look-ahead and evidence-overlap counts;
- timeout and retry behavior for the resulting batch sizes.

Until frozen benchmark evidence exists, no numeric value is a production default.

## 14. Stop Boundary

This contract does not authorize tokenizer installation, prompt construction, worker
wiring, source scanning, batching implementation, segmentation, model execution,
numeric threshold selection, or production capture.

## 15. Status

The semantic batch, atomic-source, coverage, budget, overlap, context-only, and failure
boundaries are **ENTERED**. Numeric profile values and implementation proof remain open.
