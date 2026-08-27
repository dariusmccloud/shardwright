# C0.8.0B Transport, JSON, And Request-Ownership Diagnostic Report

Last updated: 2026-07-13

Final status: `C0.8.0B COMPLETE`

Release disposition: `ACCEPTED UPSTREAM LIMITATION WITH BOUNDED RETRY`

## Problem

Architectural Sharder runs were observed to:

```text
send generation request
-> receive HTTP 502
-> retry automatically
-> eventually succeed or reach semantic validation
```

The unresolved question was whether this represented transport reset, timeout, cancellation, response truncation, malformed JSON, request collision, shared-state corruption, or a combination.

## Evidence Sources

1. `C:\Users\chris\Downloads\127.0.0.1.har`
2. `C:\Users\chris\Downloads\127.0.0.1-2.har`
3. `core/api/api-client.js`
4. `core/api/transient-retry.js`
5. `core/api/compatibility-fallback.js`
6. `core/api/abort-controller.js`
7. `core/sharder/single-pass-pipeline.js`
8. `core/api/single-pass-api.js`
9. exact API compatibility, retry, and structured-output tests

The HAR inspection recorded request metadata, hashes, timing, status, schema posture, and response structure without reproducing source-message or prompt content in this report.

## Observed Transport Classification

Every captured failure had:

```text
HTTP status:       502
upstream target:   https://nano-gpt.com/api/v1/chat/completions
error code:        ECONNRESET
error syscall:     read
response type:     system
```

The observed class is therefore:

```text
UPSTREAM_502
caused by nested TRANSPORT_RESET / ECONNRESET
```

It is not classified as a client timeout. No captured response reports timeout, deadline, abort, or cancellation.

## Trace Chain

### GLM 5 Thinking, range 300–330

```text
attempt 1
request hash: c52cd820eb44988eedd52ebaf15ef16d1cd3ebca640075c4cc10ec01ec3454af
wait:         37,775 ms
result:       502 ECONNRESET

attempt 2
request hash: c52cd820eb44988eedd52ebaf15ef16d1cd3ebca640075c4cc10ec01ec3454af
start gap:    approximately 259 ms after attempt 1 completed
wait:         106,097 ms
result:       200
assistant:    complete JSON, governed root shape
```

### GLM 5 Thinking, range 100–150

```text
attempt 1
request hash: 21d2b2489a1888b5f8450a03b039afc39b5072228c03af5a74255557f3f06341
wait:         37,708 ms
result:       502 ECONNRESET

attempt 2
request hash: 21d2b2489a1888b5f8450a03b039afc39b5072228c03af5a74255557f3f06341
start gap:    approximately 260 ms after attempt 1 completed
wait:         50,008 ms
result:       200
assistant:    complete JSON, governed root shape
```

### GLM 4.7, range 320–347

```text
attempt 1
request hash: 0cd81916c6ccd5efbf3d0ff87c5e36d3114571ccc162abacae2b4178039ec908
wait:         37,698 ms
result:       502 ECONNRESET

attempt 2
request hash: 0cd81916c6ccd5efbf3d0ff87c5e36d3114571ccc162abacae2b4178039ec908
wait:         186,122 ms
result:       200
assistant:    complete JSON, governed root shape
```

The equal hashes prove the retry resent the same serialized body for each failed/successful pair.

## JSON And Structured-Output Classification

The requests carry SillyTavern's internal structured-output descriptor:

```text
json_schema.name   = architectural_intermediate_v1
json_schema.strict = true
schema size        = 5,967 compact JSON characters
```

They intentionally do not carry provider-facing `response_format` at the browser-to-SillyTavern boundary. `applySillyTavernStructuredOutputFormat()` uses the host's internal `json_schema` field, and the exact structured-output tests prove that shape.

All seven captured HTTP `200` assistant bodies parse as whole JSON with:

```text
schemaVersion
profile
source
sections
```

Therefore the supplied HAR evidence does not demonstrate:

1. `RESPONSE_TRUNCATED`,
2. `MALFORMED_JSON`,
3. missing structured-output schema,
4. legacy flattened-root output.

Provider-specific semantic-schema violations observed in other runs remain distinct from transport failure. Strict request schema does not guarantee every provider/model will comply.

## Request Ownership

### Operation owner

The active Sharder run owns generation through `runSharder()` and `runSharderPipeline()`.

`isSharderRunning` prevents a second ordinary Sharder run from starting concurrently in the same extension instance.

### Cancellation owner

The extension-wide abort controller owns cancellation. Its signal is passed through:

```text
runSharder
-> callSharderApi
-> callSillyTavernAPI
-> runCompatibilityAttempt
-> fetch
```

An `AbortError` is not eligible for transient retry and stops compatibility fallback immediately.

The controller is global across summarization features. A different feature creating a new controller aborts the prior controller. That is a real cross-feature ownership characteristic, but no supplied trace shows it caused these incidents.

### Retry owner

`runWithOneTransientRetry()` owns one retry for HTTP `502`, `503`, or `504` within each compatibility attempt.

Observed behavior matches its default:

```text
one transient failure
-> wait 250 ms
-> repeat identical operation once
-> return recovered result or throw terminal retry error
```

### Compatibility owner

`runCompatibilityFallback()` may try a no-stop request and then a default-stop request when stop-string compatibility requires it. The supplied recovered pairs do not demonstrate fallback variation; each pair is byte-identical.

### Upstream owner

SillyTavern's `/api/backends/chat-completions/generate` route owns the server-side request to NanoGPT. The HAR proves that layer returned the nested upstream `ECONNRESET` as HTTP `502`.

## Mutation And Duplication Boundary

The retried request is model generation only.

The governed sequence is:

```text
generation request and bounded retry
-> response parsing and semantic validation
-> operator review
-> save
-> optional governed proposal admission
```

No saved shard, replay artifact, proposal, review revision, publication record, or structural authority mutation occurs inside the retried fetch operation.

If an upstream provider completed work but its response connection reset, the retry may duplicate provider compute or billing. Only the returned attempt can cross into local parsing and later governed mutation. The evidence therefore supports:

```text
possible duplicate upstream compute
not duplicate governed product state
```

## Diagnostic Class Results

| Class | Result | Evidence |
|---|---|---|
| `UPSTREAM_502` | CONFIRMED | three captured HTTP 502 responses |
| `TRANSPORT_RESET` | CONFIRMED | nested `ECONNRESET`, syscall `read` |
| `REQUEST_TIMEOUT` | NOT OBSERVED | no timeout/deadline code; failures are explicit resets |
| `REQUEST_CANCELLED` | NOT OBSERVED | no AbortError or cancellation trace |
| `RESPONSE_TRUNCATED` | NOT OBSERVED | every captured 200 assistant body parses completely |
| `MALFORMED_JSON` | NOT OBSERVED | every captured 200 body has the governed JSON root |
| `REQUEST_COLLISION` | NOT ESTABLISHED | no overlapping/colliding request evidence in supplied traces |
| `SHARED_STATE_CONFLICT` | NOT ESTABLISHED | global abort ownership exists, but no trace connects it to the failures |
| `SEMANTIC_SCHEMA_INVALID` | DISTINCT CLASS | observed in prior model-specific runs, not the cause of these 502 responses |

## Exact Automated Proof

```powershell
node --test core/api/transient-retry.test.mjs core/api/compatibility-fallback.test.mjs core/api/structured-output.test.mjs
```

Observed:

```text
13 passed
0 failed
0 cancelled
0 skipped
```

The matrix proves:

1. exactly one retry for a transient failure,
2. identical operation reuse,
3. no retry for non-transient failure,
4. terminal failure after the single retry,
5. abort stops fallback and preserves the abort,
6. strict OpenAI schema shape,
7. SillyTavern internal `json_schema` shape,
8. no request-body mutation by structured-output application.

## Release Disposition

The supplied incident is accepted for `v1.0` as an upstream provider/proxy limitation with bounded recovery.

No extension runtime repair is authorized because:

1. the failure source is observed upstream,
2. the bounded identical retry behaves as designed,
3. recovered responses are complete JSON,
4. governed state cannot be duplicated by the generation retry,
5. no trace supports collision, shared-state corruption, or cancellation as the cause,
6. expanding retries or adding arbitrary delay could increase cost and latency without addressing the observed upstream reset.

Terminal failure remains truthful through the HTTP status, provider code, source/model context, and technical error chain.

## Deferred Follow-Up Boundary

Generation request coordination remains a side objective, not a release repair.

It may be promoted only if future evidence records overlapping requests, unintended cancellation, shared-state mutation, or provider concurrency failure attributable to extension ownership.

## Tangible Result

```text
captured 502
-> upstream ECONNRESET identified
-> identical one-time retry proven
-> complete JSON recovery proven
-> no governed mutation duplication
-> accepted provider limitation
```

Nothing remains within `C0.8.0B`.

The next release gate is `C0.8.0C` Architectural retrieval isolation and fail-closed host proof.
