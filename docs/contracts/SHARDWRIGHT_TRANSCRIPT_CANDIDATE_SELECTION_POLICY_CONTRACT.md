# Shardwright Transcript Candidate Selection Policy Contract

**Version:** 1.2.0
**Status:** ENTERED — governing policy boundary; retrieval-side bounded materialization and operator-scoped preference persistence are implemented as separate pre-host boundaries.

## 1. Purpose

Define how Transcript Recall turns an explicit generation query and character-scoped
candidate set into a selection request for anchor resolution. This contract does not
grant memory authority, interpret meaning, or permit silent loss of eligible evidence.

## 2. Governing Boundaries

- Character identity comes only from the recorded opaque `characterInstanceId` binding.
- Candidate custody comes from the authenticated FTS candidate route.
- Visibility filtering is posture-specific: Continuity excludes hidden/deleted or
  otherwise ineligible rows; Archaeology includes every eligible historical occurrence.
- Retrieval preference never merges custody, rewrites source text, or establishes truth.

## 3. Postures

### 3.1 Continuity

Continuity is conversation-facing. It prefers a coherent, bounded set of the strongest
current occurrences and may select one default occurrence only when the eligible set is
unambiguous. It MUST refuse with `AMBIGUOUS_ANCHORS` rather than silently choose among
multiple eligible occurrences that exceed the declared anchor budget.

### 3.2 Archaeology

Archaeology is completeness-facing. It retains all eligible occurrences and preserves
their source/document custody. It MUST NOT collapse duplicates merely because their
content is identical.

## 4. Candidate Ordering

Selection is FTS-first. Lexical candidates are ordered by the proven selector score,
then by explicit recency and source-local order supplied by custody metadata. A future
semantic reranker may refine ordering only as a disposable retrieval preference; it
MUST preserve every candidate identity and MUST NOT become an authority source.

## 5. Sufficiency and Capacity

`Adequacy` means the selected evidence can plausibly address the query. `Sufficiency`
means the selected evidence covers all materially distinct eligible occurrences needed
for the declared posture and question. A numeric top-N ceiling alone never proves
sufficiency. If the candidate set is insufficient, the result MUST say so; it MUST NOT
pretend that a truncated set is complete.

The host token measurement and capacity approval remain the final admission gate. A
bundle that does not fit is refused as a complete bundle; it is never silently reduced
to fit.

### 5.1 Retrieval-Side Materialization Boundary

Corpus exploration, associative expansion, summary-shard discovery, and candidate
comparison MUST remain server-side operations. They MUST NOT be treated as prompt
material merely because they were discovered. Before host measurement, a distinct
materialization boundary MUST produce one bounded, custody-preserving evidence bundle
for the declared posture. The host MUST receive only that materialized bundle, never
the broad intermediate candidate/expansion collection.

Materialization MUST preserve complete retained rows and their custody metadata. It
MUST NOT silently trim, summarize, deduplicate across custody, or discard materially
distinct evidence to satisfy an unmeasured prompt budget. If the available evidence
cannot be reduced to a bounded complete bundle without such loss, materialization
MUST refuse explicitly and leave host capacity measurement untouched. The operator
setting `transcriptRecall.capacityProfile.materializationCeilingCharacters` is a raw
rendered-character safety fuse, defaulting to `1,000,000`; it is configurable through
the settings catalog and is not a token, sufficiency, relevance, or authority claim.
When the complete rendered bundle exceeds that ceiling, the server MUST refuse with
`TIR_MATERIALIZATION_CHARACTER_CEILING_EXCEEDED`. No partial bundle crosses the
boundary. Host exact token measurement remains the final admission gate after this
pre-materialization check.

The operational candidate-count profile defaults to 50 candidate families for ordinary
retrieval and permits an explicit operator limit up to 256. These bounds govern only
candidate selection; they do not represent token capacity, evidence sufficiency, or
authority. A result that remains truncated is still insufficient for planner admission,
regardless of which permitted limit was requested.

## 6. Operator Preferences

An operator may choose a retrieval preference for Continuity when multiple equivalent
occurrences are eligible. That preference is session/operator scoped, revisable, and
never a truth claim. It MUST NOT suppress occurrences from Archaeology view or become a
global custody merge. A persisted preference MUST be keyed by the authoritative
`characterInstanceId` and the exact candidate content family (`contentHash`), and MUST
name one eligible occurrence by its custody-bearing `messageRecordId`. The preference
record MUST include an operator action identifier, recording timestamp, and schema
version. It is stored only in the Shardwright-owned operator-preference mapping under
`extension_settings.shardwright.transcriptRecall.operatorPreferences`; this mapping is
an operator-local retrieval projection, not a ledger, identity source, or custody
authority. It may be replaced or cleared without rewriting source records. A missing,
malformed, stale, or ineligible preference MUST be ignored with an explicit unresolved
state; the selector MUST retain the ordinary policy result rather than guessing or
silently suppressing evidence. Archaeology MUST never read the preference as an
exclusion or merge. At runtime, a preference may be consulted only after
custody-bearing anchor resolution and only for Continuity assembly. The resolver MUST
receive the complete eligible occurrence set for the content family, select the
explicitly preferred `messageRecordId`, and leave the source selection and Archaeology
result unchanged. If no valid preference resolves an equivalent multi-occurrence
family, Continuity MUST refuse as ambiguous rather than choose the first occurrence.

## 7. Required Refusals

The selector MUST refuse on missing character identity, missing query, unknown custody,
ambiguous anchor set, stale source revision, or budget unavailability. Refusal states
must remain distinguishable from no-match and deliberately excluded evidence.

## 8. Out of Scope

No semantic interpretation, memory promotion, dossier editing, identity merge/split,
inferred preference selection, transcript mutation, or prompt injection is authorized
by this contract. The bounded operator-preference mapping and explicit Continuity
application described in Section 6 are the only preference behaviors authorized here.

## 9. Required Proof Before Runtime Closure

1. Continuity excludes ineligible visibility states.
2. Archaeology preserves all eligible duplicate occurrences.
3. FTS ordering is deterministic and custody-preserving.
4. Ambiguous anchor sets refuse without truncation.
5. Adequacy and sufficiency remain distinct in the result.
6. Operator preference does not alter Archaeology or custody.
7. Capacity refusal preserves the complete candidate/bundle boundary.
8. A valid persisted preference selects only its Continuity occurrence; absent or stale
   preference refuses equivalent anchors without changing the underlying occurrence set.

## 10. Stop Boundary

This contract authorizes no implementation by itself. Candidate selection, reranking,
anchor choice, and orchestration each require their own bounded implementation slice
and focused proof against these rules.

## 11. Bounded Runtime Policy Evaluation

The read-only policy evaluator over the proven FTS selection and anchor-resolution
surfaces is `PROVEN` for the first implementation slice. It reports `ADEQUATE` versus
`INSUFFICIENT` independently from `SUFFICIENT`, refuses ambiguous Continuity anchors,
marks truncated Archaeology results insufficient, and preserves the complete custody
resolutions. It distinguishes `NO_QUERY` and `NO_MATCH` from policy insufficiency.
It does not rerank, persist preferences, assemble windows, inject, or establish
semantic truth. Focused proof is recorded in
`transcript-candidate-policy.test.mjs` (4/4) alongside the existing FTS and anchor
proofs (11/11 combined on 2026-09-10).

The authenticated read-only transport at `POST /transcript-recall/policy` is also
`PROVEN`. It composes only the supplied selection and anchor-resolution custody and
returns the same policy result without source text or persistence. Focused route proof
passes 2/2 on 2026-09-10.

The read-only reranker-admission helper is `PROVEN` for this slice. It accepts one
finite score for every known candidate, refuses unknown, duplicate, omitted, or
non-finite score entries, and applies deterministic score ordering with selector-order
tie breaks while preserving candidate custody. It does not invoke a model or alter
eligibility. Focused proof is `transcript-reranker-admission.test.mjs` (3/3 on
2026-09-10).

The host-side reranker adapter is `PROVEN` for selected window inputs. It delegates
provider execution to the existing RAG reranker client supplied by the caller, binds
returned scores to the original window identities, and refuses unavailable, lossy, or
duplicate results without partially reordering the set. Focused proof is
`core/transcript/transcript-reranker-adapter.test.mjs` (4/4 on 2026-09-10).

The host planning module now exposes an explicit composition seam for that adapter.
It delegates provider execution to the caller's existing RAG client and accepts only
already-selected windows. The seam proof is
`transcript-reranker-planning-seam.test.mjs` (1/1 on 2026-09-10); it does not authorize
automatic dispatch or provider selection.

The host transport helper for the policy route is `PROVEN`. It sends only frozen
selection and anchor-resolution custody through the existing CSRF-protected route and
preserves explicit refusal states without retry or fallback. Focused proof is
`core/transcript/transcript-policy-transport.test.mjs` (2/2 on 2026-09-10).

The host read-only retrieval orchestrator is `PROVEN`. It sequences the existing
candidate, anchor, window, policy, and bundle transports, stops on the first refusal,
and refuses insufficient or ambiguous policy results before bundle presentation. It
does not invoke reranking, inject, or mutate host state. Focused proof is
`core/transcript/transcript-recall-orchestrator.test.mjs` (3/3 on 2026-09-10).

The deterministic reranker-input projection is `PROVEN`. It exposes only content from
already-selected windows, retains window and anchor identity, and refuses incomplete
custody or windows with no included content. Focused proof is
`core/transcript/transcript-reranker-input.test.mjs` (2/2 on 2026-09-10).

The explicit provider-invocation helper is `PROVEN`. It invokes only the caller-supplied
existing RAG reranker after selected-window projection and applies strict score
admission; it remains opt-in and does not alter dispatch or injection. Focused proof is
the provider-invocation case in `core/transcript/transcript-reranker-adapter.test.mjs`
(4/4 adapter tests on 2026-09-10).
