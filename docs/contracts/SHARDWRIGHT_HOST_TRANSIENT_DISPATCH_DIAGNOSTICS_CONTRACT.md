# Shardwright Host Transient Dispatch Diagnostics Contract

**Version:** 0.3.0
**Status:** PROVEN — bounded in-memory diagnostic slice.
**Classification:** Parallel operational-continuity track; not memory authority.

## Purpose

Prompt Itemization is useful but not the owned diagnostic surface for Transcript
Recall. The host therefore retains one replaceable, browser-memory-only snapshot at
the final local handoff to its provider dispatcher, so an operator can inspect the
exact payload Shardwright supplied for that generation.

## Boundary

The host owns final dispatch. A snapshot is lawful only for a matching, already
materialized approved bundle. It contains the final prompt, request ID, typed target,
bundle hash, prompt-token count when available, and an exact-bundle-presence flag.
It is replaced by the next generation (or cleared when that generation has no
Transcript Recall materialization), is never persisted, logged, emitted as an event,
sent to the Shardwright server, placed in chat metadata, or treated as evidence.

Refusal turns have a separate browser-memory-only evidence snapshot. It records
the refusal evidence state and verifies that the `no material supplied` envelope
reached the final local prompt, retaining only bounded metadata such as prompt-item
count and token count; it never clones the full prompt. It is not a recall snapshot,
contains no recalled content, and is replaced or cleared on the next planning result.
`CAPACITY_UNAVAILABLE` specifically means evidence was found but the complete
bundle could not fit the host's measured capacity; it must not be reported as
source or index unavailability. When available, the refusal snapshot also retains
bounded capacity facts (host ceiling, baseline, usable retrieval, shortfall, and
retrieval ceiling) without retaining the full prompt.

## Proof

1. A matching materialized dispatch snapshots a cloned final prompt and matching
   request/hash/target metadata with bundle presence true.
2. A malformed or mismatched context refuses without retaining prompt text.
3. A later ordinary generation clears the prior snapshot.
4. The browser exposes the snapshot only beneath the owned
   `globalThis.Shardwright.contextPlanning` namespace.
5. A refusal-envelope snapshot is exposed separately through
   `getLastEvidenceDispatchSnapshot()` and never shares the approved-bundle
   snapshot's authority or schema.

## Stop Condition

Stop after focused proof, host syntax validation, and one live inspection confirm
the snapshot matches the controlled bundle and disappears after an ordinary turn.

## Implementation Evidence

`core/transcript/host-context-planning.js` owns the snapshot beneath
`globalThis.Shardwright.contextPlanning`; the host pre-dispatch adapter records it
after the verified sentinel replacement, and the legacy final OpenAI handoff may
also record it for compatibility. Both paths are best-effort diagnostics and do
not authorize or gate injection; an ordinary generation still clears any earlier
snapshot. Focused Shardwright ownership/snapshot proof is
12/12 and focused host planning/materialization proof is 21/21 on 2026-09-08;
host `script.js` syntax validation passed.

Live proof completed on 2026-09-08. A controlled approved generation returned
`DISPATCH_SNAPSHOT` with request ID `6da043de-c87b-4d82-a103-eef1c6a67702`, a
matching bundle hash, `promptTokens: 5739`, and `bundlePresent: true`. The operator
then installed a one-generation decline planner, sent an ordinary message, and
`getLastDispatchSnapshot()` returned `null`. This proves both final local-handoff
capture and ordinary-generation clearing. It does not prove remote provider
processing or create any durable record.

The pre-dispatch recording seam was live-verified on 2026-09-19 with typed query
`afterlife`: the planner returned `EXACT_CAPACITY_APPROVED`, and the same
request ID (`0db81a66-5fec-4b63-8985-7705fbb0e070`) and bundle hash were present
in `getLastDispatchSnapshot()`, with `bundlePresent: true` and
`promptTokens: 523`. The generated turn completed normally. This proves the
new adapter path records the transient snapshot for the bundle it actually
inserted; it does not prove remote provider processing or make the snapshot
durable.
