# Shardwright Host Pre-Dispatch Context Planning Contract

**Version:** 0.4.1
**Status:** ENTERED — governs a bounded runtime fallback; no retrieval, selection, injection, or memory authority is authorized by it.
**Classification:** Parallel operational-continuity track; not Phase X memory-governance authority.

## 1. Purpose And Causal Bridge

Transcript Recall must preserve complete, source-tethered material without silently truncating it to fit a guessed prompt budget. The host alone owns the final prompt, active tokenizer, and hard context ceiling. Shardwright owns the proposed retrieval bundle and the operator's capacity preference.

```text
need: retain complete recall without context overflow
→ distinction: proposal is not final-prompt measurement
→ boundary: host measures one exact contribution in one generation
→ consequence: accountable approval or refusal
→ failure prevented: stale budgets, guessed costs, silent truncation
```

## 2. Authority And Ownership

| Concern | Owner | Non-owner limitation |
| --- | --- | --- |
| Candidate selection, source custody, complete proposed bundle | Shardwright retrieval surfaces | Host MUST NOT select, rank, merge, or rewrite records. |
| Operator capacity profile | `extension_settings.shardwright.transcriptRecall.capacityProfile` | Host MUST NOT invent, persist, or repair values. |
| Active-tokenizer measurement, prompt slot, final assembly, hard ceiling | SillyTavern host | Shardwright MUST NOT estimate or reuse a prior measurement. |
| Provider dispatch, context-limit override, and retry | SillyTavern host | Planner output MUST NOT bypass host dispatch safeguards or mutate host capacity. |

The existing post-assembly `GENERATE_AFTER_DATA` receipt is observational telemetry. It MUST NOT authorize a later request because it measures a different assembled prompt.

## 3. Same-Request Planning Transaction

For one generation, the host creates an unguessable `requestId` and offers planning only after exact baseline assembly with the declared Transcript Recall target empty, but before provider dispatch.

```text
host baseline assembly (slot empty)
→ frozen planning request
→ Shardwright returns one complete proposal or declines
→ host inserts that exact proposal at the declared slot
→ host measures the contribution and final assembled prompt
→ immutable approval/refusal receipt
→ ordinary provider dispatch only when approved
```

`requestId` is single-use and runtime-only. It MUST NOT be persisted, reused across generations, or accepted after dispatch, cancellation, a changed placement slot, or a changed bundle hash.

### 3.1 Initial Target Boundary

The initial planning target is the dedicated extension-prompt tag
`5_shardwright_transcript_recall`. It is distinct from the existing RAG extension-prompt
tag `5_shardwright_rag` and from the variable-mode name `shardwright_rag_memory`.
Neither existing RAG target participates in this transaction.

Variable-mode Transcript Recall is not authorized by this version. It remains
unavailable until a separate contract proves its exact placement can be measured with
the same certainty as the dedicated extension-prompt target.

For the initial extension-prompt target, the host-owned placement is system
extension-prompt position `0`, depth `0`, with World Info scanning disabled and
the system role. The tag and these placement values together define the slot for
this version. A host implementation MUST stage a candidate contribution only for
the measurement rebuild, then restore the exact prior target state before ordinary
dispatch or any refusal is returned.

## 4. Planning Request

The host-owned planning request MUST be frozen and contain at least:

```json
{
  "schemaVersion": 1,
  "requestId": "opaque one-generation nonce",
  "api": "active host API identifier",
  "tokenizerModel": "active tokenizer identifier",
  "contextWindowTokens": 0,
  "characterInstanceId": "bound opaque Shardwright character instance",
  "queryText": "current user message text",
  "injectionTarget": {
    "kind": "extension_prompt",
    "tag": "5_shardwright_transcript_recall"
  },
  "measurementStage": "PRE_DISPATCH_PLAN"
}
```

It MUST NOT expose a mutable final prompt object for Shardwright to alter directly. The host may include only bounded request context needed for normal retrieval proposal.

Version 0.3.0 makes the two retrieval inputs explicit. `characterInstanceId` MUST
come from an installed Shardwright character-binding capability; the host MUST NOT
derive it from a display name, avatar filename, chat title, path, or similarity.
`queryText` MUST be the current user message text supplied by the host, not an
arbitrary assembled prompt or prior assistant output. Missing or blank values
refuse request creation with `CHARACTER_INSTANCE_UNAVAILABLE` or `QUERY_UNAVAILABLE`.
These fields authorize handoff only; they do not authorize retrieval, selection,
reranking, window assembly, bundle construction, or injection.

## 5. Shardwright Proposal

Shardwright may return exactly one immutable proposal for the matching request:

```json
{
  "schemaVersion": 1,
  "state": "PROPOSAL",
  "requestId": "matching opaque nonce",
  "injectionTarget": {
    "kind": "extension_prompt",
    "tag": "5_shardwright_transcript_recall"
  },
  "bundleText": "complete proposed contribution",
  "bundleHash": "sha256:...",
  "capacityProfile": {
    "retrievalCeilingTokens": 24576,
    "safetyHeadroomTokens": 0
  }
}
```

The proposal requests host measurement; it is not injection authority. It MUST represent the whole selected bundle. Shardwright MUST NOT omit, silently shorten, or replace records merely to fit. A declined proposal is valid and does not imply retrieval failure.

### 5.1 Proposal Admission And Canonical Bundle Hash

Before a host may measure a proposal, it MUST validate all of the following. A
failure is `PROPOSAL_INVALID`; it MUST NOT be repaired, normalized, partly
accepted, or substituted with a prior proposal.

- The outer proposal, `injectionTarget`, and `capacityProfile` are frozen plain
  objects with no fields other than those shown in Section 5.
- `schemaVersion` is the integer `1`; `state` is exactly `PROPOSAL`; and
  `requestId` exactly equals the still-live host request's `requestId`.
- `injectionTarget` exactly equals that request's typed dedicated target.
- `bundleText` is a non-empty string and is retained byte-for-byte. The host
  MUST NOT trim, reformat, concatenate, or otherwise rewrite it before hashing
  or measurement.
- Every capacity-profile field is a safe non-negative integer, and
  `retrievalCeilingTokens` is greater than zero. The host validates this shape
  only; it MUST NOT invent, persist, or silently repair operator preferences.
- `bundleHash` is exactly the lowercase `sha256:` prefix followed by the SHA-256
  digest of the UTF-8 bytes of the canonical proposal payload below.

The canonical proposal payload is the compact JavaScript `JSON.stringify`
serialization, with no whitespace and no Unicode normalization, of this exact
member order:

```json
{
  "schemaVersion": 1,
  "requestId": "matching opaque nonce",
  "injectionTarget": {
    "kind": "extension_prompt",
    "tag": "5_shardwright_transcript_recall"
  },
  "bundleText": "complete proposed contribution",
  "capacityProfile": {
    "retrievalCeilingTokens": 24576,
    "safetyHeadroomTokens": 0
  }
}
```

`state` and `bundleHash` are deliberately outside the hashed payload: the first
selects the response variant; the second is the digest being checked. Every
authority-bearing value that can affect placement, text, capacity, or
request-liveness is inside it. The host MUST recompute this digest from the
received fields and compare it exactly before it constructs any measured prompt
state.

If the host's cryptographic digest service is unavailable, it returns
`BUDGET_UNAVAILABLE` with `HASH_UNAVAILABLE`. It MUST NOT approximate the
digest, accept an unverified proposal, or substitute a prior hash.

## 6. Host Measurement And Receipt

The host MUST use its active tokenizer to measure both the exact contribution and the exact final prompt with that contribution in its declared target. It returns a frozen receipt bound to the same `requestId`, `injectionTarget`, and `bundleHash`.

Before final-prompt approval exists, a host may return a transient
`PROPOSAL_MEASURED` planning result with the exact contribution-token delta,
final-prompt tokens, and prompt ceiling. That result records measurement only:
it MUST restore the target and MUST NOT alter the baseline prompt selected for
ordinary provider dispatch. It is not an `APPROVED` receipt and grants no
injection authority.

For a measured proposal, the host computes:

```text
measuredRemaining = max(0, promptTokenCeiling - baselinePromptTokens - safetyHeadroomTokens)
usableRetrieval = min(retrievalCeilingTokens, measuredRemaining)
```

It returns `APPROVED` only when the exact final prompt is at or below the host
ceiling and the exact contribution is at or below `usableRetrieval`. Otherwise
it returns `BUNDLE_OVER_CAPACITY` with the measured shortfall. Neither outcome
permits partial-bundle fallback. In this contract an `APPROVED` receipt remains
planning accounting only. Same-dispatch materialization is governed separately by
the [Approved-Bundle Materialization Contract](SHARDWRIGHT_HOST_APPROVED_BUNDLE_MATERIALIZATION_CONTRACT.md);
it may use only a matching approval and must restore the staged target before
provider dispatch.

| State | Meaning | Dispatch consequence |
| --- | --- | --- |
| `APPROVED` | Exact proposal and final prompt fit host ceiling and declared profile. | The exact bundle may be retained for this dispatch. |
| `BUNDLE_OVER_CAPACITY` | Exact measurements establish a shortfall. | No bundle injection; no partial fallback. |
| `BUDGET_UNAVAILABLE` | Tokenizer, API, slot, or measurement is unavailable. | No bundle injection; no guessed fallback. |
| `PROPOSAL_INVALID` | Nonce, hash, schema, profile, or slot binding fails. | No bundle injection; host records refusal. |

An `APPROVED` receipt MUST include contribution tokens, final prompt tokens, prompt ceiling, explicit safety headroom, and the profile retrieval ceiling. It must never represent a different proposal as approved.

## 7. Non-Negotiable Failure Policy

- No prior-generation measurement may substitute for the current transaction.
- No character-ratio, word-ratio, DOM counter, or unrelated RAG setting may supply a token-cost fallback.
- A host or profile refusal remains visible as refusal; it does not become `NO_MATCH`.
- An over-capacity proposal MUST NOT be truncated, down-ranked, or partly injected. A new selection policy requires its own contract and proof.
- Ordinary generation remains unchanged when Shardwright supplies no proposal.
- Requests and receipts are operational accounting only; they create no evidence, governance, retrieval-preference, or memory authority.

## 8. Required Implementation Proof

An implementation slice may close only when it proves:

1. an approved proposal dispatches only under its matching nonce, hash, and slot;
2. changed proposal, slot, or nonce refuses with no injection;
3. unavailable host measurement refuses without an estimate;
4. an over-capacity complete proposal refuses without partial injection or selection mutation;
5. a malformed explicit profile refuses without repair;
6. a non-Shardwright generation follows ordinary host dispatch unchanged; and
7. the receipt is visible to Shardwright diagnostics but never persisted as memory, preference, or governance state.

## 9. Explicit Non-Scope

This contract does not authorize candidate selection, reranking, sufficiency decisions, transcript mutation, routes, server storage, settings migration, generic UI work, host-wide extension APIs, host measurement, or actual prompt injection. Each requires a separately declared bounded slice after the required implementation surface exists.

## 9.1 Over-Capacity Resolution And One-Shot Host Retry

An exact `BUNDLE_OVER_CAPACITY` receipt may offer an operator a host-owned capacity
resolution. This is a recovery from an observed host limit, not a selection policy,
authority grant, or permission to alter the proposed bundle.

The host computes an exact minimum prompt ceiling from the measured transaction:

```text
requiredPromptCeiling = baselinePromptTokens
                      + contributionTokens
                      + safetyHeadroomTokens
requiredHostContextLimit = requiredPromptCeiling + active configured output limit
```

The host MUST obtain the active configured output limit and any provider/model maximum
from its own authoritative generation settings. It MUST NOT infer either from a DOM
counter, the previous receipt, an extension preference, or a model-name heuristic. If
the requested context cannot be supported by the active host/provider settings, the
host returns visible `EXPANSION_UNAVAILABLE`; it MUST NOT clamp, silently substitute a
smaller value, or partially inject the bundle.

An over-capacity resolution surface may offer exactly these choices:

| Choice | Effect |
| --- | --- |
| Continue baseline | Preserve the ordinary baseline dispatch; do not inject Transcript Recall. |
| Expand once and retry | Create one runtime-only host override for the next fresh generation, then clear it on completion, cancellation, refusal, or error. |
| Update host default and retry | After explicit operator confirmation, change the host's persisted context setting through its native validated setting path, then begin one fresh generation. |
| Cancel | Dispatch nothing and leave host settings unchanged. |

Both retry choices MUST abandon the original request, proposal, staged contribution,
measurement, and approval/refusal receipt. The next generation creates a new request
ID, rebuilds ordinary prompt context from the beginning under the chosen host limit,
and runs the complete planning and capacity path again. A prior proposal or approval
MUST NOT be carried into, assumed valid for, or injected during the retried
generation.

The one-shot override is host runtime state only. It is bound to a single retry
transaction and cannot be stored in `extension_settings.shardwright`, chat metadata,
memory, a retrieval preference, or a receipt. It MUST be installed before the host
selects or trims ordinary chat context and MUST be removed through a finally-equivalent
cleanup path. A late mutation after host prompt assembly is prohibited because it
cannot recover context already excluded by the original ceiling.

Shardwright may observe the resulting resolution state for diagnostics, but it MUST
NOT create the prompt, set a host context value, trigger retry, persist the choice, or
interpret an operator's capacity choice as evidence or retrieval authority.

## 10. Initial Decline-Path Proof

The dedicated target's empty-slot planning request and decline path are `PROVEN` on
2026-09-07. Focused Shardwright capability and runtime-identity tests passed 7/7;
the modified local host script passed syntax validation. After a hard refresh, an
ordinary local OpenAI generation completed normally and
`globalThis.Shardwright.contextPlanning.getLastResult()` returned a frozen
`DECLINED` result with `NO_TRANSCRIPT_PROPOSAL`, a host-created request ID, and the
exact dedicated `5_shardwright_transcript_recall` extension-prompt target.

This proves same-request request creation, target isolation, registered capability
handoff, decline visibility, and unchanged ordinary dispatch only. It does not prove
proposal validation, contribution measurement, final-prompt approval, token capacity
enforcement, injection, selection, reranking, or persistence.

## 11. Initial Malformed-Response Proof

The host-side malformed-response boundary is `PROVEN` on 2026-09-07. Focused
Shardwright capability and runtime-identity tests passed 8/8; the host planning
module tests passed 3/3; and both modified host modules passed syntax validation.
A hard-refreshed live probe replaced the decline capability with a frozen response
containing an intentionally wrong request ID. The host returned and surfaced
`PROPOSAL_INVALID` with `REQUEST_BINDING_MISMATCH`, its own real request ID, and the
exact dedicated target. No proposal was accepted and no injection path exists.

This proves response binding refusal only. It does not prove acceptance, exact
contribution measurement, final-prompt approval, capacity enforcement, injection,
selection, reranking, or persistence.

## 12. Proposal-Admission Definition

The proposal shape, canonical-hash rule, and admission refusal policy in Section
5.1 are `ENTERED` on 2026-09-07. They resolve the previously unspecified
meaning of `bundleHash`: it binds the complete text, the matching live request,
the typed target, and the declared capacity profile. This is a documentation-only
definition. It authorizes neither an accepted proposal nor host measurement,
prompt mutation, provider dispatch, persistence, or selection.

## 13. Proposal-Admission Proof

The host-side proposal-admission boundary is `PROVEN` on 2026-09-07. Focused
Shardwright planning and runtime-identity tests passed 9/9; focused host
planning tests passed 5/5; and both modified host modules passed syntax
validation. A frozen canonical proposal with a recomputed SHA-256 digest was
accepted only as `PROPOSAL_ADMITTED` planning state. Mutable payloads, changed
text with an old hash, mismatched nonce, and mismatched target each refused
before any measurement.

This proves canonical hash and request/target admission only. It does not prove
host token measurement, final-prompt approval, injection, provider dispatch,
selection, reranking, or persistence.

The pure host proposal constructor is `PROVEN` on 2026-09-08 by
`node --test shardwright-context-planning.test.mjs` in the local SillyTavern public
scripts directory (17/17). Given a frozen live request, complete bundle text, and
valid capacity profile, it emits a frozen Section 5 proposal with the exact
canonical hash; incomplete inputs refuse without hashing. This constructor does
not derive a query, call a retrieval route, choose candidates, assemble windows,
retain a proposal for dispatch, or alter the default decline planner.

The explicit retrieval-input handoff is `PROVEN` on 2026-09-09 by the same focused
host suite (18/18): valid requests carry the opaque character binding and current
user query, while missing binding or blank query refuses before request creation.
The live instance currently has no installed character-binding capability, so its
normal generation remains visibly unavailable for Transcript Recall and continues
the ordinary baseline path.

## 14. Measurement-Only Definition

The placement and measurement-only rules in Sections 3.1 and 6 are `ENTERED`
on 2026-09-07. They authorize a host to stage one admitted contribution in the
dedicated target, rebuild with its existing OpenAI prompt assembler, measure the
baseline and rebuilt prompts with its active tokenizer, and restore the exact
prior target state. They do not authorize approval, injection, or a changed
provider payload.

## 15. Measurement-Only Proof

The measurement-only boundary is `PROVEN` on 2026-09-07. Focused host planning
tests passed 7/7, including exact rebuilt-prompt delta measurement and restoration
after an assembly failure; focused Shardwright planning and runtime-identity tests
remained 9/9; and modified host modules passed syntax validation. In a
hard-refreshed live probe, a frozen, hash-bound controlled proposal returned
`PROPOSAL_MEASURED` with the live request ID, dedicated target, contribution of
268 tokens, and rebuilt prompt of 80,112 tokens against an 80,000-token ceiling.

The result is deliberately not approval: the measured final prompt exceeded the
ceiling. The host restored the dedicated target and ordinary dispatch retained its
baseline prompt. This proves exact measurement and restoration, not capacity
approval, injection, changed provider payload, selection, reranking, or
persistence.

## 16. Capacity-Gate Definition

The exact capacity-gate rule in Section 6 is `ENTERED` on 2026-09-07. It reuses
the existing Transcript Recall preflight posture: measured remaining capacity is
bounded by actual host space after explicit safety headroom and the operator's
retrieval ceiling; over-capacity stays a complete-bundle refusal. This definition
authorizes an immutable accounting receipt only. A separate slice is required
before an `APPROVED` receipt can retain any target contribution for dispatch.

## 17. Capacity-Gate Proof

The exact capacity gate is `PROVEN` on 2026-09-07. Focused host planning tests
passed 10/10, including both an approval-shaped fitting measurement and a
complete-bundle over-capacity refusal; focused Shardwright planning and
runtime-identity tests passed 10/10; and modified host modules passed syntax
validation. In a hard-refreshed live controlled probe, the host returned
`BUNDLE_OVER_CAPACITY` with `EXACT_CAPACITY_EXCEEDED`, the live request ID,
dedicated target, 79,933 baseline tokens, 371 contribution tokens, 80,304 final
tokens against an 80,000-token ceiling, zero usable retrieval tokens, and a
371-token shortfall. The operator then hard-refreshed to remove the probe.

This proves real same-request capacity refusal without partial fallback. It does
not prove that an `APPROVED` receipt retains a contribution for dispatch,
changes a provider payload, selects records, reranks, or persists any result.

## 18. Simplified Capacity-Profile Correction

Version 0.2.0 corrects the profile boundary. SillyTavern's measured prompt ceiling
already excludes its configured reply-token limit, and the fully assembled baseline
already includes system/card and active-chat content. The former three reservation
fields therefore represented extra, ambiguously named cushions rather than uncounted
capacity. The current profile has only `retrievalCeilingTokens` and explicit optional
`safetyHeadroomTokens`; no hidden structural or reply reservation is applied.

Valid v1 profiles migrate to v2 by preserving their retrieval ceiling, setting
headroom to zero, and retaining an unchanged `legacyCapacityProfileV1` snapshot.
Malformed v1 values remain unavailable. This correction changes accounting only;
it does not authorize host-default expansion, prompt retention, injection,
selection, or persistence beyond the existing settings migration.

## 19. Host Retry Transaction Definition

Version 0.2.1 enters the host-owned resolution rule for an exact over-capacity
receipt. Direct host lifecycle inspection established that SillyTavern determines
its prompt ceiling before selecting and trimming chat context, while the current
Transcript Recall measurement occurs only after baseline assembly. A late increase
cannot reconstruct excluded context. Therefore `Expand once and retry` is defined as
a one-shot host override installed before a wholly new generation, not as a mutation
of the already assembled request. `Update host default and retry` remains an explicit
operator action through SillyTavern's native validated setting path.

This is an entered design boundary only. It does not prove a dialog, one-shot
override, native-default mutation, automatic retry, injection, or changed provider
payload. Those require a separately declared host implementation slice with
success, cancel, refusal, error-cleanup, and fresh-request proofs.

## 20. One-Shot Override Primitive Proof

The host-only one-shot override primitive is `PROVEN` on 2026-09-07 by
`node --test scripts/shardwright-context-override.test.mjs scripts/shardwright-context-planning.test.mjs`
in the local SillyTavern public root (13/13), plus syntax validation of the
modified host modules. It accepts only a positive safe-integer prompt ceiling and
non-empty retry ID, refuses concurrent arming, consumes state destructively before
host context selection, supports explicit retry-ID-bound clearing, and leaves no
state for a later unrelated generation.

`script.js` consumes that host-runtime value before deriving `this_max_context`;
the OpenAI planning input receives a matching ephemeral token budget whose full
context is the override prompt ceiling plus the active reply limit. Neither path
mutates `oai_settings` or persists a Shardwright setting. This proves the isolated
primitive and its early host wiring only. No dialog, user-reachable arming path,
automatic retry, native-default update, retained Transcript Recall target, or
provider-payload change is claimed.

## 21. Resolution Dialog And Retry Implementation Status

Version 0.2.3 implements the first operator-facing subset: continue baseline,
cancel generation, or expand once and retry. The host derives the required full
context only from an exact over-capacity receipt, the active reply limit, and the
native host-validated provider maximum. It refuses a missing or insufficient provider
maximum visibly and retains the baseline path; it does not clamp or alter the
persisted setting. Choosing expansion arms a retry-ID-bound one-shot override,
unblocks the original attempt, and begins a new `regenerate` generation. The new
generation consumes the override before any host context selection and therefore
creates a new planning request and measurement.

`Update host default and retry` is deliberately not implemented in this slice. It
would mutate a persisted native host setting and needs its own explicit confirmation
and native-setting-path proof.

Focused deterministic proof is
`node --test scripts/shardwright-context-override.test.mjs scripts/shardwright-capacity-resolution.test.mjs scripts/shardwright-context-planning.test.mjs`
in the local SillyTavern public root (16/16), plus syntax validation of
`shardwright-context-override.js`, `shardwright-capacity-resolution.js`,
`openai.js`, and `script.js`. This proves exact expansion derivation, host-limit
refusal, retry-ID binding, one-shot consumption, and no persistent-setting mutation
in the introduced paths. It does not yet close the required live proof of the
baseline, cancel, expand-once/fresh-request, and post-error cleanup paths.

## 22. Server-Backed Canonical Digest Boundary

When the active browser context cannot expose Web Crypto, the authenticated
Shardwright Memory server may provide the narrowly scoped endpoint
`POST /context-planning/canonical-sha256`. It accepts exactly one non-empty
`canonicalPayload` UTF-8 string of at most 524,288 bytes and returns only:

```json
{
  "ok": true,
  "algorithm": "sha256",
  "digest": "sha256:lowercase-hex"
}
```

The endpoint hashes the received UTF-8 bytes exactly as received. It MUST NOT parse,
normalize, reserialize, truncate, persist, log payload text, create a ledger entry,
or accept a proposal as a result of hashing it. The caller remains responsible for
constructing the Section 5 canonical payload; the host remains responsible for
recomputing the payload from an admitted proposal and comparing the exact digest.

The endpoint is an authenticated host cryptographic service only. It creates no
candidate-selection, injection, retrieval, memory, preference, or governance
authority. A malformed body, oversize payload, malformed response, unavailable
server, or mismatched digest remains `BUDGET_UNAVAILABLE` with `HASH_UNAVAILABLE`;
there is no JavaScript approximation or plaintext fallback.

Version 0.2.4 entered this boundary after a live browser observation on 2026-09-08:
`window.isSecureContext` was `false`, `crypto` existed, and `crypto.subtle` did not.
The controlled planner correctly refused rather than producing an unverifiable hash.

Version 0.2.5 implements the bounded fallback in two places only: the authenticated
server route delegates exact-byte hashing and admission checks to the core helper;
the host planner uses that route only when Web Crypto is unavailable. The route
does not retain the payload and the host accepts only the declared SHA-256 response
shape. Its focused proof is `node --test context-planning-digest-route.test.mjs`
(2/2) in `tools/server-plugin/shardwright-memory/`, covering one known exact digest
and missing/oversize refusal. The host focused proof is
`node --test scripts/shardwright-context-planning.test.mjs
scripts/shardwright-context-override.test.mjs
scripts/shardwright-capacity-resolution.test.mjs` (18/18) in the SillyTavern public
root, including the no-Web-Crypto server-digest path. `node --test index.test.mjs`
cannot currently begin because the local server-plugin installation is missing
`node_modules/ajv/dist/2020.js`; that environment blocker is not repaired or masked
by this slice.

Live proof completed on 2026-09-08 after the server restart and browser hard
refresh. The controlled planner returned `APPROVED` with
`EXACT_CAPACITY_APPROVED`, request ID
`2e391516-93e2-4331-af71-6d092805e4f0`, the dedicated
`5_shardwright_transcript_recall` target, and canonical bundle digest
`sha256:d452f37cf9bdfd2fd0500d3acd7446beee86cb8fe78979b9dab56b520ac89a72`.
This proves the insecure-browser server-digest fallback survives the real host
planning transaction through exact-capacity admission. It does not prove candidate
selection, retrieval, final dispatch retention, or prompt injection.

## 23. One-Shot Retry Exhaustion

The one-shot override is consumed before the fresh retry selects context. A retry
therefore MUST independently measure its newly assembled baseline; it MUST NOT
reuse the former receipt merely because the override was derived from it. If that
fresh retry remains `BUNDLE_OVER_CAPACITY`, the one-shot expansion is exhausted.
The host MUST show that visible result, retain no Transcript Recall contribution,
and continue the ordinary baseline dispatch. It MUST NOT offer another expansion
dialog within the same retry transaction or create another automatic retry.

This boundary was entered after live receipts on 2026-09-08 proved override
consumption: the first receipt required 87,023 prompt tokens (81,725 baseline plus
5,298 contribution); the retry's ceiling was exactly 87,023, but its rebuilt
baseline grew to 82,196 and it remained 448 tokens over. The correction prevents
the repeated dialog, not the legitimate fresh measurement.

Focused proof is `node --test scripts/shardwright-context-planning.test.mjs
scripts/shardwright-context-override.test.mjs
scripts/shardwright-capacity-resolution.test.mjs` (22/22) in the SillyTavern
public root, including the offer-before-consumption and exhaustion-after-consumption
decision. Live proof completed on 2026-09-08: the first capacity dialog armed one
retry, the fresh retry remained over capacity, no second dialog appeared, and the
ordinary baseline generation completed with the visible exhaustion warning.

## 24. Explicit Character-Binding Handoff

The host may resolve its opaque `characterInstanceId` only by sending an explicitly
supplied operator/runtime `bindingToken` to the authenticated
`/api/plugins/shardwright-memory/transcript-recall/character-binding` route. The
resolver returns the recorded opaque identity or refuses; it MUST NOT derive a token
from a display name, avatar, filename, path, or `hostLocator`, and it does not persist
tokens or create bindings. Focused proof is `node --test transcript-character-binding-route.test.mjs transcript-character-binding.test.mjs`
(6/6) plus `node --test shardwright-context-planning.test.mjs` (20/20). No live token
source is installed in the current instance, so planning still refuses when the host
cannot supply the binding capability.

An authenticated registration route now records one explicit operator binding at
`POST /transcript-recall/character-binding/register`. It requires `bindingToken` and
`operatorActionId`, generates the opaque instance identity server-side, and appends
durable custody through the existing binding registry. It performs no display-locator
inference, automatic discovery, rebind, or retrieval. Focused registration proof is
`node --test transcript-character-binding-registration-route.test.mjs` (2/2).

The host now has a read-only candidate transport helper that sends only the frozen
request's opaque character identity and current query to the existing authenticated
candidate route. It returns bounded candidate metadata or a visible refusal; it does
not rank, assemble, retrieve transcript text, or inject. Focused host proof covers
successful route handoff and invalid/refused inputs (2 tests).

Live proof completed on 2026-09-09: the operator registered `operator:jeep`, seeded
the session capability, and `await Shardwright.transcript.getCurrentCharacterInstanceId()`
returned the opaque identity `transcript_character_f5fc9977660744ad9e347a18e709bc8d`.

The host now exposes an explicit runtime-owned capability beneath
`Shardwright.transcript`: `setBindingToken(token)`, `clearBindingToken()`, and
`getCurrentCharacterInstanceId()`. The token is session-only, never inferred or
persisted by this capability, and the resolved opaque identity is cached only for the
current runtime. Invalid or cleared tokens leave identity unavailable. Focused proof
is the capability test (2/2); it proves explicit-token requirement, resolver use,
cache behavior, and clear/refusal behavior. This does not authorize automatic token
discovery or retrieval orchestration.
The host also transports an explicitly frozen candidate-selection result to the
authenticated anchor-resolution route with a positive explicit occurrence limit.
The helper returns the route's custody outcome or a visible refusal and performs no
automatic occurrence choice. Focused external host proof is `node --test
scripts/shardwright-context-planning.test.mjs` (24/24).

The host now transports one explicit resolved anchor to the authenticated context-window
route with declared posture and non-negative before/after bounds. It returns the
posture-filtered window or a visible refusal and performs no source selection, joining,
ranking, or injection. Focused external host proof is `node --test
scripts/shardwright-context-planning.test.mjs` (26/26).

The host now transports a complete explicit selection, per-document anchor list, and
shared before/after bounds to the authenticated window-assembly route. It preserves
the route's separately returned windows and refuses incomplete input. Focused external
host proof is `node --test scripts/shardwright-context-planning.test.mjs` (28/28).
The host now transports one frozen assembled-window result to the authenticated bundle
presentation route. The helper preserves the returned custody payload and refuses
mutable or unavailable input; it does not measure, approve, or inject the bundle.
Focused external host proof is `node --test scripts/shardwright-context-planning.test.mjs`
(30/30).

The host now composes the bound bundle proposal directly into the existing measurement
and exact-capacity finalization transaction. Staging is restored on every path; fitting
bundles approve and over-capacity bundles refuse without partial fallback. Focused
external host proof is `node --test scripts/shardwright-context-planning.test.mjs`
(34/34).

An approved proposal can now be passed through the existing dispatch-materialization
transaction via a named host helper. It preserves request/hash binding and restores
the dedicated slot before returning the rebuilt provider payload. Focused external
host proof is `node --test scripts/shardwright-context-planning.test.mjs` (35/35).

The host can now bind only a frozen `BUNDLE` presentation into the existing
request-bound proposal constructor. The bundle text is hashed under the same request
and profile boundary; mutable, empty, or non-bundle input refuses before measurement.
Focused external host proof is `node --test scripts/shardwright-context-planning.test.mjs`
(32/32).
The host planning module and binding capability are packaged under the tracked
Shardwright extension tree. Baseline host imports resolve that packaged module; no
untracked root-level companion file is required for a clean deployment.
