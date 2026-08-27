# Phase X: Memory Discovery And Governance Rebase Contract

**Status:** ENTERED — Option B approved; Phase X contract work is authorized, production discovery is not.
**Release effect:** the intended `v1.0` release is rebased around Memory Discovery and Governance.
**Parent authority:** the approved Memory Discovery and Governance Architecture and its reviewed Capture Observation contract.

## Decision

The project adopts:

```text
OPTION B

Rebase v1.0 around the Memory Discovery and Governance Architecture.
Treat the existing implementation as a governance-capable prototype
and migration base rather than the final memory architecture.
```

Existing behavior is retained only when it satisfies the new contracts and acceptance tests.
Implementation proximity is not preservation authority.

## Supersession

Within release planning, this contract supersedes these earlier positions:

1. `PHASE_C0_8_0_RELEASE_CLOSURE_OPERATIONAL_PROOF_AND_CAPABILITY_FREEZE_BRIEF.md`
   says C0.8.0 does not add a new memory architecture.
2. `C0_8_0_CURRENT_CAPABILITY_MATRIX.md` classifies model-selected memory nomination
   as a deferred side objective.

Those statements remain historical evidence of the former release posture. They no
longer govern the intended `v1.0` architecture.

This contract does not invalidate completed C0/C0.5/C0.6/C0.75 proof. Those components
become `KEEP`, `ADAPT`, `REPLACE`, or `DEFER` inputs during Phase X reconciliation.

## Parent Architecture

The frozen human semantic spine is:

`PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md`

Every Phase X child RFC, implementation slice, proof plan, and ordinary UI contract
must trace its material requirements to the practical distinctions and finish lines
defined there. The operational model governs human purpose and derivation; normative
child contracts govern exact machine behavior.

The parent architecture for governed-event accumulation, context sheets, versioned
dossiers, and current continuity is:

`PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`

It preserves the distinction between immutable governed event history and the
human-readable, evolving projections derived from that history.

The governing causal chain is:

```text
eligible canonical source revision
-> durable capture obligation
-> source-bound nominations
-> code-accepted observation records
-> discovery retrieval and clustering
-> provenance resolution
-> source-verified evidence set
-> code-owned readiness
-> bounded synthesis
-> idempotent governance custody transfer
-> governed review and disposition
```

The hierarchy is:

```text
model nomination
!= accepted observation
!= candidate cluster
!= source-verified evidence set
!= synthesized proposal
!= governed or published memory
```

## Authority Gate

### Governing contract

Phase X and its child RFCs govern discovery. Existing Interpretive and Structural
contracts continue to govern proposal custody, review, publication, promotion,
supersession, withdrawal, replay, and recovery until explicitly reconciled.

### Authoritative sources

1. Canonical host source revisions and their stable metadata govern source truth.
2. The server-plugin capture registry owns durable obligations, leases, attempts,
   accepted-result idempotency, validation, and operational history.
3. Accepted observation records own the auditable discovery extraction record.
4. Discovery correction events own human changes to derived clusters.
5. Source-verified evidence sets own bounded synthesis inputs.
6. Existing governance ledgers own admitted proposals and their later lifecycle.

### Subject disposition authority amendment

Phase X recognizes subject disposition as a lawful source of activation authority. It
does not treat subject attestation, an active character card, or ordinary model output
as disposition.

The amendment requires three explicit distinctions:

1. **Self-subject versus shared-subject jurisdiction**
   - A subject has independent disposition authority over a verified proposal limited
     to that subject's identity, self-interpretation, preferences, boundaries, internal
     state, experienced history, or personal commitments.
   - A proposal whose meaning depends on multiple subjects requires mutual disposition.
     No single party may activate the shared meaning alone.
2. **Attestation versus disposition**
   - Attestation creates direct subject evidence and a consideration obligation.
   - Disposition is an explicit approval of an exact proposal revision through an
     authenticated subject-review action. Only disposition can supply subject activation
     authority.
3. **Host-attested context versus independently deliberate subject action**
   - Loading a character card proves which character context the host selected. It does
     not prove that the subject reviewed or approved a proposal.
   - Subject disposition must bind the subject principal, proposal identifier, exact
     revision hash, authenticated session, timestamp, single-use nonce, and authority
     scope.

The activation rule is:

```text
verified self-subject evidence
+ authenticated subject disposition over the exact revision
+ passed code-owned evidence, safety, contradiction, and lifecycle gates
-> active governed self-memory
```

Within legitimate self-subject jurisdiction, an operator may inspect the active memory
and flag a concern but may not make routine operator approval or attention a condition
of activation. Shared-subject meaning requires disposition from every materially
affected subject; when the operator is one of those subjects, both operator and subject
disposition are required.

Code-owned safety gates remain absolute regardless of who supplies disposition.

Here, `independently deliberate subject action` means disposition without routine
operator participation. It does not claim cryptographic independence from the
administrator of the host infrastructure. Any stronger guarantee requires a separate
identity and trust-boundary contract.

#### V1.0 release posture

Independent subject disposition is a post-v1 capability, not a v1.0 release gate.
Phase X preserves its authority boundary now so the v1.0 architecture does not make the
operator permanently exclusive or require destructive migration later.

For v1.0, direct subject attestation remains exact subject evidence with mandatory
consideration and ordinary governed review. V1.0 must preserve distinct actor, subject,
reviewer, and disposition-authority concepts and must remain extensible to additional
subject principals and authority types. It does not need to implement subject
credentials, authenticated subject-review sessions, cryptographic disposition receipts,
independent activation, mutual-disposition orchestration, or their compromise-recovery
paths.

### Projection boundary

Embeddings, similarity scores, reranker results, model confidence, clusters, inbox
views, and generated prose are projections or nominations. They are never evidence
or authority merely because they exist.

### Lifecycle owners

```text
Server plugin
  capture obligations, leases, validation, accepted effects, reconciliation

Connected extension worker
  browser-configured model execution under a lease

Discovery services
  observations, matching, provenance leads, clusters, evidence-set preparation

Code-owned readiness
  final readiness result from declared rules and recorded assessments

Governance
  proposal custody, jurisdiction-scoped disposition, approval, rejection, publication,
  withdrawal,
  supersession, and authority consequences
```

### Failure behavior

Missing sources, invalid spans, stale revisions, unsupported claims, ambiguous
identity, validator disagreement, unavailable model execution, and custody-transfer
uncertainty must retry, remain pending, quarantine, or fail explicitly according to
their owning contract. They must never fabricate lineage or silently weaken evidence.

## Model Boundary

```text
KEEP / ADAPT
BananaBread + Similharty
Embeddings, retrieval, candidate matching, and reranking.

ADD
One local instruction model
Source-bound capture nominations.

CONDITIONALLY REUSE
Configured strong API model
Independent validation of qualifying critical nominations or suspected critical
capture errors, after a separate validator contract and benchmark pass.

REUSE
Configured strong API model
Synthesis only after a source-verified evidence set reaches READY.
```

No model establishes source identity, evidence admission, readiness, lifecycle
authority, governance state, or memory authority.

## Phase X Sequence

```text
X.0  Parent contract reconciliation and supersession
X.1  Capture Observation RFC and benchmark governance
X.2  Durable capture registry, leasing, and reconciliation
X.3  Source-bound observation extraction
X.4  Discovery retrieval, clustering, and provenance
X.5  Discovery Inbox and human correction events
X.6  Deduplication, partitioning, and track-specific readiness
X.7  Bounded synthesis and idempotent custody transfer
X.8  Successor detection, release proof, and capability freeze
```

Every child phase requires its own bounded authorization and exact proof.

## Current Authorization

Only `X.1` capture-contract formalization and the separately approved Subject Identity
and Disposition authority RFC are authorized:

1. normative capture RFC,
2. model-output and accepted-record schemas,
3. source/result/job disposition schemas,
4. exact span contract,
5. benchmark fixture and execution-manifest schemas,
6. benchmark governance and unresolved decisions, governed by
   `PHASE_X_CAPTURE_BENCHMARK_GOVERNANCE_CONTRACT.md`,
7. capture vocabularies and source-policy boundary, governed by
   `PHASE_X_CAPTURE_VOCABULARY_AND_SOURCE_POLICY_CONTRACT.md`,
8. capture batch and context boundary, governed by
   `PHASE_X_CAPTURE_BATCH_AND_CONTEXT_BOUNDARY_CONTRACT.md`,
9. capture reconsideration and immutable successor boundary, governed by
   `PHASE_X_CAPTURE_RECONSIDERATION_AND_SUCCESSOR_CONTRACT.md`.
10. Memory Catalog and Context Sheet parent architecture, governed by
    `PHASE_X_MEMORY_CATALOG_AND_CONTEXT_SHEET_PARENT_ARCHITECTURE_CONTRACT.md`.

The subject-authority contract artifact is:

7. `RFC_SUBJECT_IDENTITY_AND_DISPOSITION.md`.

Production implementation, fixture adjudication, benchmark execution, model selection,
prompt tuning, cluster analysis, credential issuance, subject-review wiring,
disposition persistence, activation changes, and automatic proposal creation remain
unauthorized.

## Governing Law

> Capture is broad and reversible.
> Accepted observations are exact and source-bound.
> Retrieval produces leads, not evidence.
> Uncertainty remains visible.
> Authority remains elsewhere.
