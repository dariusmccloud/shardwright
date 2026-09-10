# Shardwright Host Approved-Bundle Materialization Contract

**Version:** 0.2.0
**Status:** PROVEN — bounded same-dispatch materialization only.
**Classification:** Parallel operational-continuity track; not Phase X memory-governance authority.

## 1. Problem And Evidence

The proven host planning path stages a proposal only to measure it, then restores
the dedicated target. An `APPROVED` receipt therefore currently leaves the baseline
prompt as the provider payload. The receipt proves that the bundle *may* be used;
it does not make the bundle reach that same generation.

The governing [Host Pre-Dispatch Context Planning Contract](SHARDWRIGHT_HOST_PRE_DISPATCH_CONTEXT_PLANNING_CONTRACT.md)
Section 6 permits an exact approved bundle to be retained for that dispatch, while
Section 9 requires actual injection to be separately declared and bounded.

## 2. Target Result

For one live host generation only, a matching `APPROVED` receipt materializes the
same admitted bundle in the dedicated `5_shardwright_transcript_recall` prompt
slot, rebuilds the actual provider payload, and restores the prior slot state before
provider dispatch. The provider receives that rebuilt payload, not the earlier
baseline assembly.

## 3. Authority And Boundaries

| Concern | Owner | Boundary |
| --- | --- | --- |
| Proposal text, selection, and capacity profile | Shardwright planner | Host does not select, shorten, rank, or rewrite it. |
| Receipt binding, slot placement, payload assembly, and dispatch | SillyTavern host | Shardwright does not mutate host prompt objects. |
| Prompt slot lifetime | SillyTavern host | It exists only while the host rebuilds the same dispatch payload; it is restored before dispatch. |

The authoritative proposed text is the admitted proposal retained only in the
current `Generate` call. The approval receipt is operational accounting, not a
memory, preference, evidence, or governance record. The extension-prompt map and
provider payload are disposable host projections, not persistence.

## 4. Admission And Failure Policy

Materialization is lawful only when all of these exactly match the still-live
request: request ID, typed target, and bundle hash. The host stages the proposal's
unchanged `bundleText`; it MUST NOT trim, reformat, concatenate, or substitute it.

If binding is invalid, slot staging fails, payload assembly fails, or restoration
fails, the bundle is refused for that generation and the failure is visible as a
host planning refusal. The host MUST restore the prior slot state whenever it was
staged. It MUST NOT retain a stale target, retry with an earlier proposal, partially
inject, infer a replacement, or persist the proposal/receipt. Ordinary baseline
dispatch remains available only without a bundle and must not be represented as
Transcript Recall injection.

## 5. Scope

**In scope:** host planning helper, its focused tests, the OpenAI pre-dispatch
call site, and planning/delivery documentation required to record the proof.

**Out of scope:** candidate selection, retrieval, reranking, sufficiency, source
custody, transcript mutation, Shardwright settings, server storage, UI work,
provider-default mutation, and any persistent injection state.

## 6. Required Proof

1. A frozen, matching approval stages the exact bundle once, rebuilds the provider
   payload once, restores the prior slot once, and supplies the rebuilt payload for
   dispatch.
2. Changed request ID, hash, or typed target refuses before staging or assembly.
3. An assembly failure restores the prior slot and produces a visible refusal; it
   does not retain a bundle or silently claim injection.
4. A generation with no proposal retains ordinary host dispatch behavior.
5. A focused live probe shows the bundle in SillyTavern's injected-context view and
   an `APPROVED` receipt for the same request/target/hash.

## 7. Stop Condition

Stop after the focused deterministic proof and the live probe pass, the governing
planning contract and Delivery Register are reconciled, and no retrieval or
selection work has begun.

## 8. Implementation Evidence

The host helper and OpenAI pre-dispatch call site implement this boundary. Focused
proof is `node --test scripts/shardwright-context-planning.test.mjs
scripts/shardwright-context-override.test.mjs
scripts/shardwright-capacity-resolution.test.mjs` in the SillyTavern public root:
21/21 passed on 2026-09-08. The materialization-specific cases prove exact
stage/rebuild/restore ordering, binding refusal before any target mutation, and
restoration after assembly failure. Syntax validation of
`scripts/shardwright-context-planning.js` and `script.js` also passed.

Live proof completed on 2026-09-08 in a small-chat controlled generation. The host
returned `APPROVED` / `EXACT_CAPACITY_APPROVED` for request
`ab604d57-2704-4905-a80e-e356b775e987` with the dedicated target and a matching
bundle hash. Native Prompt Itemization's raw provider payload contained the exact
text `[Shardwright server-digest controlled probe]` as a system message immediately
after the default system prompt. The native itemization summary did not separately
label the generic extension entry; the raw payload is the controlling observation.

This proves same-dispatch materialization and placement only. Retrieval, candidate
selection, reranking, sufficiency, source custody, durable records, and product UI
remain outside this contract.
