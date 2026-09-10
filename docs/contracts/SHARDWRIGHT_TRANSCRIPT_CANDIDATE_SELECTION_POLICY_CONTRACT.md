# Shardwright Transcript Candidate Selection Policy Contract

**Version:** 0.1.0  
**Status:** ENTERED — governing policy boundary; implementation requires a separately declared slice.

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

## 6. Operator Preferences

An operator may choose a retrieval preference for Continuity when multiple equivalent
occurrences are eligible. That preference is session/operator scoped, revisable, and
never a truth claim. It MUST NOT suppress occurrences from Archaeology view or become a
global custody merge.

## 7. Required Refusals

The selector MUST refuse on missing character identity, missing query, unknown custody,
ambiguous anchor set, stale source revision, or budget unavailability. Refusal states
must remain distinguishable from no-match and deliberately excluded evidence.

## 8. Out of Scope

No semantic interpretation, memory promotion, dossier editing, identity merge/split,
automatic operator preference persistence, transcript mutation, or prompt injection is
authorized by this contract.

## 9. Required Proof Before Runtime Closure

1. Continuity excludes ineligible visibility states.
2. Archaeology preserves all eligible duplicate occurrences.
3. FTS ordering is deterministic and custody-preserving.
4. Ambiguous anchor sets refuse without truncation.
5. Adequacy and sufficiency remain distinct in the result.
6. Operator preference does not alter Archaeology or custody.
7. Capacity refusal preserves the complete candidate/bundle boundary.

## 10. Stop Boundary

This contract authorizes no implementation by itself. Candidate selection, reranking,
anchor choice, and orchestration each require their own bounded implementation slice
and focused proof against these rules.
