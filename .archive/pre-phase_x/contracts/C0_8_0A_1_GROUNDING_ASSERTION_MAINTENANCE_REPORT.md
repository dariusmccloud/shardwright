# C0.8.0A.1 Grounding Assertion Maintenance Report

Last updated: 2026-07-13

Final status: `COMPLETE`

## Problem

The deterministic synthesis route test expected:

```text
scopeAssessment = TOO_BROAD
counterevidencePresent = true
```

The current governed stub returned:

```text
scopeAssessment = SUPPORTED
counterevidencePresent = false
```

## Cause

The test expectation predated commit `d2fe53f`.

That commit narrowed the deterministic Jeep statement from the legacy broad claim about authority over the `extension's design` to authority over `continuity and memory requirements within a shared architecture with Chris`.

The deterministic evaluator lawfully distinguishes those statements:

1. the narrowed shared-jurisdiction statement is strongly supported,
2. the extension-wide design claim is too broad and carries counterevidence.

The defect was fixture/test drift, not production grounding-policy drift.

## Changed

1. Renamed the existing route case to identify the narrowed deterministic statement.
2. Updated its expected grounding result to:

```text
aggregateOutcome = STRONGLY_SUPPORTED
scopeAssessment = SUPPORTED
counterevidencePresent = false
```

3. Added an independent route case with the explicit legacy-broad statement.
4. Preserved its required result:

```text
aggregateOutcome = CONTRARY_EVIDENCE_PRESENT
scopeAssessment = TOO_BROAD
counterevidencePresent = true
reasonCodes = [SHARED_JURISDICTION_REQUIRES_QUALIFICATION]
```

5. Made no production evaluator, persistence, replay, or authority change.

## Exact Proof

Targeted grounding routes:

```powershell
node --test --test-name-pattern="interpretive synthesis generate route" tools/server-plugin/summary-sharder-memory/index.test.mjs
```

Observed:

```text
2 passed
0 failed
```

Complete server route regression:

```powershell
node --test tools/server-plugin/summary-sharder-memory/index.test.mjs
```

Observed:

```text
20 passed
0 failed
0 cancelled
0 skipped
```

The visible `ARCH_DECISION_VERSION_CONFLICT` and `ARCH_SHARD_SOURCE_RANGE_STALE` logs are asserted fail-closed cases.

## Tangible Result

The regression suite now proves both sides of the grounding contract:

```text
narrowed shared jurisdiction
-> supported

overbroad extension-wide authority
-> contrary evidence present
-> too broad
```

## Unresolved

Nothing remains inside this maintenance boundary.

The next release gate is `C0.8.0B` transport, JSON, and request-ownership diagnosis.
