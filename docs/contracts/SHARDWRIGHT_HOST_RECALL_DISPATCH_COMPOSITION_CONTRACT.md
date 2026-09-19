# Shardwright Host Recall Dispatch Composition Contract

**Version:** 0.6.1
**Status:** ENTERED — live host composition wires retrieval-to-proposal planning through cloned exact-capacity measurement and sentinel replacement, and publishes each refusal/proposal/approval to the existing planning diagnostic receipt; browser proof of a real injected bundle remains outstanding.
**Classification:** Parallel operational-continuity track; not Phase X memory-governance authority.

## 1. Purpose and causal bridge

The planner and approved-bundle materializer are individually proven, but no
contract yet governs their composition into one SillyTavern generation. This
contract defines that seam without granting the host authority over recall
content or granting Shardwright authority over provider dispatch.

The frontend adapter now listens on the additive `GENERATE_BEFORE_DISPATCH`
event, binds work to the latest eligible non-dry-run invocation, attempts the
existing planner, and only replaces the live sentinel after an approved bundle
and post-condition verification. A planner refusal is observable and leaves
the host payload untouched.

The read-only planner provider composes the existing projection, candidate,
anchor, window, policy, and bundle transports into a request-bound proposal;
it does not approve capacity or mutate a host payload.

```text
need: approved recall must reach the same provider dispatch it was measured for
→ distinction: observation, proposal, approval, and materialization are separate states
→ boundary: one generation-owned composition transaction
→ consequence: exact approved content is staged, measured, restored, and dispatched once
→ failure prevented: stale approval reuse, cross-generation injection, silent truncation,
  or prompt-slot leakage
```

## 2. Authority and ownership

| Concern | Owner | Boundary |
| --- | --- | --- |
| Invocation identity and eligibility | SillyTavern host | Captured synchronously at `GENERATION_AFTER_COMMANDS`; ambient state after an `await` is not authoritative. |
| Projection freshness, retrieval, candidate selection, and complete bundle | Shardwright | Host MUST NOT select, rerank, shorten, merge, or rewrite recall material. |
| Approval binding and capacity accounting | Host planning contract | Approval is single-use and bound to request ID, bundle hash, target, and measured prompt. |
| Prompt-slot staging, final assembly, provider dispatch, and restoration | SillyTavern host | Shardwright MUST NOT mutate provider payloads or bypass host safeguards. |
| Dispatch diagnostics | Host transient diagnostics surface | Snapshot is replaceable in-memory telemetry, never authority or persistence. |

Existing character, transcript, association, and authority ledgers remain
unchanged. This contract does not make a proposal, receipt, or diagnostic
snapshot authoritative for identity, memory, or governance.

## 3. Same-generation composition transaction

For one eligible generation, the host MUST execute the following ordered
transaction using one immutable invocation context:

```text
GENERATION_AFTER_COMMANDS
→ capture invocation context and generation identity
→ ensure the service-owned projection is current
→ request exactly one Shardwright proposal for the captured request
→ measure and finalize against the host's exact baseline
→ if approved, materialize the matching bundle for this dispatch
→ rebuild the provider payload
→ record the transient dispatch snapshot
→ restore the prior Shardwright slot state before provider dispatch
→ dispatch through the ordinary host provider path
```

The request, proposal, approval, materialization, and dispatch snapshot MUST
all refer to the same generation identity. A later generation, retry,
cancellation, changed target, changed bundle hash, or changed invocation
context invalidates the prior transaction.

The host MUST NOT call retrieval or materialization from a post-assembly
observational hook. `GENERATE_AFTER_DATA` remains telemetry only.

For the compatibility path that uses the current host surface, Shardwright MUST
register its `GENERATE_AFTER_DATA` listener with
`eventSource.makeLast(event_types.GENERATE_AFTER_DATA, handler)` when available,
not plain `.on()`. Ordering is advisory: listeners registered later may still
run afterward. The handler MUST skip dry runs and MUST verify, in the live
`generate_data` object before returning, that the sentinel is gone and the
approved bundle is present. A failed postcondition is an explicit refusal.

The host now exposes the additive `GENERATE_BEFORE_DISPATCH` event after
`generate_data` assembly and before `GENERATE_AFTER_DATA`/provider dispatch.
The event payload is `{ generateData, promptCounts, countPrompt, type, dryRun }`;
`promptCounts` is the host's already-computed per-generation accounting record
when available, otherwise `null`. `countPrompt` is a host-owned tokenizer
callback for the live payload shape (string or structured message array).
Listeners remain generation-scoped and the host retains ordinary dispatch
ownership.

## 4. Eligibility and non-applicable generations

The host declares eligible generation types before composition. Intentionally
excluded, quiet, dry-run, or unsupported invocations return `NOT_APPLICABLE`
and leave ordinary host generation unchanged. An eligible invocation whose
identity, projection, proposal, measurement, approval, or materialization is
unavailable records an explicit refusal and continues or aborts ordinary
provider dispatch only according to the host failure policy; it MUST NOT be
silently relabeled `NOT_APPLICABLE`.

No approved bundle may be reused for a second generation or silently carried
across a failed, cancelled, or retried transaction.

## 5. State restoration and failure behavior

The dedicated Transcript Recall extension-prompt target MUST be restored on
every exit path, including refusal, capacity failure, provider error,
cancellation, and exception. Restoration MUST preserve the exact pre-existing
target value and ownership of unrelated extension prompts.

If restoration cannot be verified, the composition MUST refuse further recall
materialization for that attempt and expose an explicit diagnostic; it MUST NOT
leave staged recall content in the host prompt or attempt a best-effort merge.

Capacity refusal, unavailable projection, unresolved identity, stale approval,
and provider failure remain distinct diagnostic outcomes. None authorizes
truncation or automatic retry with altered recall content.

## 6. Required proof

Runtime implementation may close only after proving, with a focused host test
and one live diagnostic observation:

1. an eligible generation captures one immutable invocation and creates one
   matching planning request;
2. an approved proposal is materialized exactly once for that request and the
   provider receives the rebuilt payload through the ordinary host path;
3. the exact prior extension-prompt state is restored before provider dispatch,
   including refusal, cancellation, and provider-error paths;
4. a stale, changed, duplicated, or cross-generation receipt refuses without
   injecting recall content;
5. ineligible/dry-run generations return `NOT_APPLICABLE` without changing
   ordinary host generation;
6. the transient dispatch snapshot records the matching request ID, bundle hash,
   target, prompt-token count when available, and bundle-presence flag; and
7. neighboring RAG/extension prompt state and authority ledgers remain
   unchanged.

## 7. Explicit non-scope

This contract does not authorize new retrieval, reranking, sufficiency policy,
identity association, transcript mutation, provider selection, host-wide API
changes, native Vector Storage changes, or persistent prompt/diagnostic storage.
It does not authorize variable-mode injection or any target other than the
dedicated `5_shardwright_transcript_recall` extension-prompt slot.
The read-only planner provider composes the existing projection, candidate,
anchor, window, policy, and bundle transports into a request-bound proposal;
it does not approve capacity or mutate a host payload.
