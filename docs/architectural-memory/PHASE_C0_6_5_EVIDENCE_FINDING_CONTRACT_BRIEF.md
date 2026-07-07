# Phase C0.6.5: Evidence Finding Contract Brief

Last updated: 2026-07-06

Status: proposed implementation plan

## Purpose

Close the largest remaining product gap in interpretive review:

```text
bound evidence exists
but the review surface still cannot explain its meaning in human terms
```

`C0.6.5` defines the contract for persisted, human-readable evidence findings.

This phase does not exist to improve visual polish.
It exists to stop the UI from choosing between two bad outcomes:

1. inventing prose from weak machine labels, or
2. hiding meaningful evidence behind technical records forever.

## Problem Statement

The current review surface can honestly say:

```text
2 bound sources are attached. Human-readable findings are not available yet.
```

That is acceptable as a temporary truth.
It is not acceptable as the long-term interpretive evidence model.

The current runtime already has:

1. bound source records,
2. source roles,
3. grounding references,
4. interpretation candidates,
5. review and publication workflows.

What it does not yet have is a durable contract for:

1. what was actually found,
2. how to say it in human language,
3. which exact sources support that finding,
4. how that finding survives replay and restart without browser invention.

## Phase Goal

Implement evidence findings as persisted, replay-safe records that can be rendered directly in the review surface.

The review UI should be able to show:

```text
Finding
Jeep established primary architectural authority over the extension design.

Basis
- decision:...
- msg_alpha...

Source
Jeep, architectural memory record, June 2026
```

without:

1. deriving prose from raw domains like `AUTHORITY` or `ROLE`,
2. summarizing client-side from arbitrary source text,
3. requiring the operator to read `Technical Details` to understand the evidence.

## Non-Goals

`C0.6.5` does not:

1. redesign the publication lifecycle again,
2. redefine publication policy semantics,
3. replace exact technical bindings and hashes,
4. create natural-language summaries from unstructured source text in the browser,
5. solve generalized semantic reasoning outside interpretive evidence,
6. backfill perfect findings for every historical artifact unless an explicit migration is approved.

## Required Product Decisions

Before implementation closes, the phase must lock these decisions.

### 1. Findings are first-class persisted records

The system must persist a human-readable finding payload.

Minimum contract:

```json
{
  "findingId": "evfind_...",
  "role": "PRIMARY",
  "summary": "Jeep established primary architectural authority over the extension design.",
  "basisRefs": ["decision:...", "msg_alpha..."],
  "sourceLabel": "Jeep, architectural memory record, June 2026",
  "domains": ["AUTHORITY", "ROLE"],
  "supportLevel": "SUPPORTED"
}
```

The exact field names may differ, but the semantic contract must not.

### 2. Source bindings and findings remain distinct

A finding is not a replacement for bound source records.

The system must preserve both:

1. **technical bindings** for exact source identity and replay integrity,
2. **finding records** for human-readable review meaning.

### 3. Browser must not invent evidence prose

The browser may project persisted findings.
It must not synthesize them from:

1. claim domains,
2. source roles,
3. participant IDs,
4. arbitrary source snippets.

If no finding exists, the UI must continue to say so plainly.

### 4. Missing findings fail gracefully

When a candidate lacks persisted findings, the UI must show a truthful fallback such as:

```text
Bound evidence is attached, but no readable findings are available for this candidate.
```

This fallback remains acceptable.
Silent invention does not.

### 5. Findings require exact basis references

Every rendered finding must carry exact basis refs that remain:

1. replay-safe,
2. inspectable,
3. hash-compatible with the existing evidence model.

## Scope

`C0.6.5` covers four layers.

### A. Data Contract

Define:

1. canonical evidence finding schema,
2. role vocabulary,
3. support/status vocabulary,
4. required basis reference fields,
5. source label contract,
6. replay behavior.

### B. Persistence And Replay

Implement:

1. durable storage for findings,
2. replay-safe loading,
3. restart-safe reconstruction,
4. parity across Node and Bun host paths.

### C. Proposal / Candidate Integration

Define how findings enter the system:

1. deterministic synthesis output,
2. bounded grounding output,
3. review candidate assembly,
4. any required validation gate for missing or malformed findings.

### D. Review Surface Projection

Render:

1. findings in the `Review` tab,
2. exact basis references adjacent to each finding or through a clear disclosure,
3. truthful missing-finding fallback,
4. technical bindings in `Technical Details`.

## Suggested Implementation Slices

### C0.6.5A: Canonical Finding Schema

Implement:

1. finding payload shape,
2. validation rules,
3. replay contract,
4. tests for valid/invalid persisted findings.

Proof:

1. valid finding persists and replays identically,
2. malformed finding is rejected or quarantined deterministically,
3. Node and Bun preserve the same shape.

### C0.6.5B: Candidate Assembly And Storage

Implement:

1. candidate payload acceptance or generation path for findings,
2. exact basis-ref validation,
3. source-label persistence,
4. missing-finding behavior contract.

Proof:

1. candidate with findings survives review admission,
2. candidate without findings triggers the intended fallback path,
3. no browser-only synthesis is required.

### C0.6.5C: Review Surface Rendering

Implement:

1. readable findings in `Review`,
2. basis-ref display or disclosure,
3. stable fallback message,
4. no duplication of technical bindings in the main reading path.

Proof:

1. operator can understand why the memory is supported without opening `Technical Details`,
2. exact source bindings remain available,
3. no prose is generated from raw domains alone.

### C0.6.5D: Historical / Compatibility Strategy

Implement or explicitly defer:

1. historical records with no findings,
2. migration strategy for older interpretive candidates,
3. compatibility behavior when old artifacts coexist with new ones.

Proof:

1. old records remain readable and stable,
2. new records show findings,
3. the fallback path is truthful and non-destructive.

## Required Proof Matrix

`C0.6.5` does not close without these proofs.

### Fresh candidate with persisted findings

Expected:

1. finding renders in `Review`,
2. basis refs are inspectable,
3. replay preserves the same finding.

### Candidate with multiple finding roles

Expected:

1. primary and supporting findings remain distinct,
2. ordering is stable,
3. source bindings remain exact.

### Candidate with bound evidence but no findings

Expected:

1. truthful fallback is shown,
2. UI does not invent prose,
3. technical bindings remain inspectable.

### Malformed finding payload

Expected:

1. deterministic validation failure or quarantine,
2. exact refusal reason recorded,
3. replay does not silently coerce the payload.

### Restart and replay

Expected:

1. finding content survives restart,
2. rendered findings and bound refs remain aligned,
3. Node and Bun remain semantically identical.

## UX Rules

The review surface should follow these rules.

1. Lead with the finding, not the source record ID.
2. Keep technical IDs in `Technical Details` or concise disclosures.
3. Show exact basis references, not vague “supported by evidence” language.
4. Never derive prose from `AUTHORITY`, `ROLE`, `RELATIONSHIP`, or similar raw domain labels alone.
5. Do not hide the absence of findings behind pretty wording.

## Dependencies

This phase should start only after the publication closeout boundary is stable enough that review and publication semantics are not still moving under it.

It depends on:

1. the current interpretive review flow remaining usable,
2. bound evidence storage remaining exact,
3. replay and publication contracts staying intact.

It does not require:

1. another lifecycle redesign,
2. broader RAG redesign,
3. a new publication policy system.

## Exit Criteria

`C0.6.5` is complete when:

1. evidence findings are persisted as first-class records,
2. replay preserves them exactly,
3. the review UI renders meaningful human evidence without browser invention,
4. missing findings remain explicit and truthful,
5. technical bindings remain available and exact,
6. Node and Bun behave the same.

## Working Rule

During `C0.6.5`:

```text
Do not let the browser write the evidence story.
Persist the meaning or admit that the meaning is unavailable.
```
