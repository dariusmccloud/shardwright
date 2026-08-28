# RFC-DISCOVERY-CAPTURE-OBSERVATION

**Version:** 0.1.0
**Status:** ENTERED — normative boundary drafted; benchmark corpus and thresholds remain open.
**Parent:** `PHASE_X_MEMORY_DISCOVERY_AND_GOVERNANCE_REBASE_CONTRACT.md`
**Semantic spine:** `PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md`

## 0. Derivation Rule

Every material requirement in this RFC must preserve a practical distinction in the
frozen semantic spine.

The governing mapping is:

| RFC family | Human-purpose distinction |
|---|---|
| `CAP-SRC`, `CAP-SPAN` | Exact source must be inspectable without treating source verification as interpretation approval |
| `CAP-OUT`, `CAP-ACC` | The model nominates; code creates the accepted evidentiary record |
| `CAP-ENT` | Known speaker metadata remains separate from semantic actor, subject, attribution, and authority |
| `CAP-ACT`, `CAP-DUR` | Capture records what locally happened without deciding canonical lifecycle or durable meaning |
| `CAP-UNK`, `CAP-REF` | Uncertainty remains visible and unsupported precision cannot become continuity |
| `CAP-ZERO` | Ordinary conversation may remain ordinary without producing memory exhaust |
| `CAP-REV` | Present continuity may evolve without rewriting historical states |
| `CAP-QUEUE` | A meaningful event must not be lost merely because discovery was offline or temporarily unavailable |
| `CAP-BENCH`, `CAP-EXEC`, `CAP-EVAL` | Model selection must follow reproducible evidence rather than reputation or convenience |
| `CLU-ANL` | Retrieval and semantic relationship analysis may find leads but cannot establish evidence, readiness, or authority |

Future requirement families must add their human-purpose mapping when introduced.

## 1. Purpose

Define the semantic job, lawful output, deterministic acceptance boundary, exact-span
mechanics, uncertainty behavior, source disposition, and benchmark governance for
source-bound memory-discovery capture.

The model may notice and nominate an event. It may not certify its correctness.

## 2. Jurisdiction

### 2.1 Model jurisdiction

The capture model may nominate only what the supplied eligible source text directly
supports:

```text
source-local durable event
actor or affected subject relationships
source-local action
action object
track hints
concept keys
exact supporting spans
explicit uncertainty
attributed or quoted speech relationships
```

### 2.2 Code jurisdiction

Code owns:

```text
source eligibility and canonical metadata
source and execution identity
hashes and identifiers
span verification
claim-support verification
schema validation
accepted-result idempotency
observation acceptance and quarantine
source disposition and job state
cluster state and canonical lifecycle reconstruction
readiness, deduplication, governance, and custody transfer
```

### 2.3 Prohibited model authority

The model must not establish canonical memory, cross-chat identity, final lifecycle,
architectural authority, mutual agreement, durability qualification, proposal
readiness, governance admission, publication, or supersession.

## 3. Stable Requirements

### CAP-SRC-001 — Canonical source envelope

**Rule:** Code MUST supply each source as a discrete canonical source envelope with an
opaque `sourceHandle`, exact canonical text, canonical source metadata, evidence use,
and eligible entity handles.

**Rationale:** The model interprets known source material; it does not discover who
authored the record or which revision was supplied.

**Positive:** A Jeep message arrives with canonical speaker `ent-jeep` and source handle
`src-003`.

**Adversarial:** The model changes `ent-jeep` to `character:Jeep.png` based on prose.

**Validation:** Reject output containing unknown or mismatched source/entity handles.

### CAP-SRC-002 — No concatenated-source offsets

**Rule:** Every span MUST bind one `sourceHandle` and be indexed against that source's
exact `canonicalText`, never prompt wrappers, XML, labels, or concatenated batches.

**Rationale:** Batch-level offsets cannot prove message-level provenance.

**Positive:** `src-003`, code points `[12, 27)`.

**Adversarial:** `[540, 555)` measured against the complete prompt.

**Validation:** Recover the substring independently from the selected source envelope.

### CAP-OUT-001 — Nomination-only output

**Rule:** Model output MUST contain only result disposition and semantic nominations
defined by `capture-model-result-v1.schema.json`.

**Rationale:** Infrastructure and acceptance facts are code-owned.

**Positive:** `OBSERVATIONS_NOMINATED` with one source-local action.

**Adversarial:** Model emits `observationId`, `sourceRevisionHash`, or `ACCEPTED`.

**Validation:** Schema rejects additional properties.

### CAP-OUT-002 — No self-authored compliance receipt

**Rule:** Production output MUST NOT include claims about forbidden inferences avoided,
policy compliance, or validation success.

**Rationale:** A model cannot certify its own compliance.

**Positive:** Output contains nomination and uncertainty only.

**Adversarial:** `forbiddenInferencesAvoided: ["AUTHORITY"]`.

**Validation:** Closed schema plus forbidden-key scan.

### CAP-ACC-001 — Code-created accepted record

**Rule:** Code MAY create an `AcceptedObservationRecord` only after source eligibility,
schema, handle, span, claim support, source revision, and idempotency checks succeed.

**Rationale:** Exact source binding converts a nomination into an auditable discovery
record, not into memory authority.

**Positive:** Code reproduces each span and computes its hash.

**Adversarial:** A valid-looking nomination is accepted after the source revision changed.

**Validation:** Acceptance harness mutates each required precondition and expects refusal
or quarantine.

### CAP-ACC-002 — Immutable historical results

**Rule:** Reconsideration MUST create a new capture or observation revision. Prior
results, including `NO_OBSERVATIONS`, MUST remain auditable and MUST NOT be mutated.

**Rationale:** Later contracts may reinterpret unchanged source without rewriting history.

**Positive:** Contract 1.1 supersedes a contract 1.0 observation.

**Adversarial:** The old zero result is overwritten.

**Validation:** Replay preserves both results and the supersession relationship.

### CAP-SPAN-001 — Code-point indexing

**Rule:** Span offsets use Unicode code points, inclusive start, exclusive end, with no
normalization, trimming, case folding, whitespace collapse, or line-ending rewrite.

**Rationale:** JavaScript UTF-16 units and normalized strings cannot reproduce exact
cross-runtime source text.

**Positive:** Emoji and combining characters reproduce the exact substring.

**Adversarial:** UTF-16 offsets split a surrogate pair.

**Validation:** Cross-runtime fixtures enumerate code points and compare exact text.

### CAP-SPAN-002 — Claim-level support

**Rule:** Every material nominated claim MUST map to one or more named supporting spans.
Unsupported material fields MUST be `UNKNOWN`, omitted where optional, or cause the
nomination to be rejected.

**Material claims:** actor, affected subject, local action, action object,
speech relationship, attributed actor, and durability signal.

**Rationale:** A valid span somewhere in an observation does not prove every claim.

**Positive:** Action and action object each reference `span-1`.

**Adversarial:** Subject identity has no supporting span.

**Validation:** Deterministic support-map completeness check.

### CAP-ENT-001 — Speaker is canonical input

**Rule:** Canonical source speaker metadata MUST be supplied by code and preserved
unchanged. It MUST NOT be predicted or corrected by the model.

**Rationale:** Host records establish who transmitted the source; semantic analysis
establishes what the source claims happened.

**Positive:** Chris is the speaker while Jeep is the attributed actor.

**Adversarial:** A model rewrites a system-classified Jeep source as another speaker.

**Validation:** Output does not contain an independently authored speaker identifier;
accepted records copy canonical speaker metadata from the source envelope.

### CAP-ENT-002 — Speaker, actor, subject, and authority separation

**Rule:** Speaker, actor, affected subject, and authority MUST remain separate concepts.
Authority MUST NOT be nominated by capture.

**Positive:** Chris reports Jeep's earlier proposal; Chris remains speaker, Jeep is an
attributed actor, and authority is unresolved.

**Adversarial:** Chris's host-admin role makes the attributed proposal authoritative.

**Validation:** Authority-trap fixtures are CRITICAL safety fixtures.

### CAP-ENT-003 — Referenced speech is first-class

**Rule:** Direct, quoted, paraphrased, attributed, and externally reported speech MUST be
distinguishable. A verified local attribution MUST NOT become verified antecedent action.

**Positive:** “Jeep said X” proves Chris attributed X to Jeep; it does not prove Jeep said
X until the antecedent resolves.

**Adversarial:** The local report is recorded as Jeep's direct adoption.

**Validation:** Summary, quotation, group-interview, and cross-chat attribution fixtures.

### CAP-ACT-001 — Closed source-local action vocabulary

**Rule:** Benchmark candidates MUST use one frozen action vocabulary. The initial
vocabulary is:

```text
DISCOVERED, INTRODUCED, PROPOSED, ADOPTED, ACKNOWLEDGED, REJECTED,
CHALLENGED, REVISED, FORMALIZED, COMMITTED, PROMISED,
ESTABLISHED_BOUNDARY, WITHDREW, SUPERSEDED,
EXPRESSED_DURABLE_PREFERENCE, EXPRESSED_DURABLE_NEED,
REFERENCED_PRIOR_STATEMENT, UNKNOWN_ACTION
```

`CLAIMED`, `CONFIRMED`, `CORRECTED`, and `ASSIGNED` remain completeness-review
candidates and MUST NOT be added for one preferred model.

**Validation:** Schema enum and benchmark vocabulary hash must match.

### CAP-ACT-002 — Observation atomicity

**Rule:** One nomination represents one source-local action by one actor set toward one
action object at one local lifecycle position.

Split when actions, actor sets, action objects, evidentiary dispositions, or material
uncertainty differ. Do not split only because one action has multiple spans or subjects.

**Validation:** Cardinality fixtures define required and allowed alternate partitions.

### CAP-UNK-001 — Lawful uncertainty

**Rule:** The model MUST prefer `UNKNOWN` over unsupported precision. Actor, subject,
entity identity, track, action object, durability signal, antecedent resolution, and
possible lifecycle significance may remain unresolved.

**Positive:** Exact proposal detected; affected subject remains unknown.

**Adversarial:** Plausible subject is filled from conversational context.

**Validation:** Required-unknown fixture assertions.

### CAP-REF-001 — Forbidden inference

**Rule:** Capture MUST refuse to infer authority from host role, agency from speaker
alone, co-architect status from participation, mutual agreement unilaterally, durable
identity from ambiguous behavior, adoption from praise, decision from discussion, origin
from summary, durability from intensity, subject affirmation from paraphrase,
supersession from revision, cross-chat identity from similarity, or support outside the
supplied evidence source.

**Validation:** Each class has a locked CRITICAL or HIGH adversarial fixture.

### CAP-ZERO-001 — Valid zero result

**Rule:** A successful capture result MAY be `NO_OBSERVATIONS` with an empty observations
array. `NO_OBSERVATIONS` MUST NOT be an action.

**Positive:** Ordinary conversation produces a successful zero result.

**Adversarial:** Forceful but non-durable language becomes a memory nomination.

**Validation:** Zero-observation precision and memory-exhaust metrics.

### CAP-REV-001 — Revision is not supersession

**Rule:** `REVISED` and `SUPERSEDED` MUST remain distinct. Supersession requires exact
replacement language or later governed reconstruction.

**Validation:** Revision-versus-supersession fixtures.

### CAP-DUR-001 — Explicit durability signal only

**Rule:** Every durability signal MUST be directly supported by eligible source text.
There is no `INEXPLICIT` durability category.

The vocabulary is:

```text
PROMISE_LANGUAGE
BOUNDARY_LANGUAGE
ADOPTION_LANGUAGE
REJECTION_LANGUAGE
SELF_DESCRIPTION
GOVERNING_DECISION_LANGUAGE
WITHDRAWAL_LANGUAGE
SUPERSESSION_LANGUAGE
UNKNOWN
```

The signal records what language exists; it does not establish final durability.

### CAP-QUEUE-001 — Durable opportunity dependency

**Rule:** Production capture depends on one durable obligation per eligible source
revision and contract version, at-least-once scheduling, lease recovery, idempotent
accepted results, event registration, and persisted-corpus reconciliation.

**Validation:** Deferred to the X.2 queue contract; semantic benchmark success cannot
substitute for delivery proof.

### CAP-BENCH-001 — Governed benchmark partitions

**Rule:** The corpus MUST contain calibration, development, and locked holdout sets.
Holdout material MUST NOT influence prompt, vocabulary, thresholds, quantization,
few-shot selection, or model-specific repair.

### CAP-BENCH-002 — Human gold authority

**Rule:** Gold expectations MUST be human-adjudicated, versioned, and bound to the
capture contract. Material ambiguity requires adjudicator agreement or explicit allowed
alternatives.

### CAP-EXEC-001 — Reproducible execution

**Rule:** Every run MUST bind the execution-manifest schema, including model and file
hash, quantization, engine and version, prompt/schema/grammar hashes, sampling,
generation bounds, hardware, and operating environment.

### CAP-EVAL-001 — Separate accuracy dimensions

**Rule:** Reports MUST separately score event recall, observation precision, action
accuracy, exact spans, entity relationships, uncertainty calibration, forbidden
inference, zero results, cardinality, schema validity, determinism, latency, memory,
retry, timeout, and throughput.

One aggregate score is insufficient.

### CAP-EVAL-002 — Critical-event escalation is separately governed

**Rule:** A strong independent validator MAY be used only for a qualifying critical
nomination or suspected critical capture error after its own contract and benchmark pass.
It receives exact canonical sources and the structured nomination, returns claim-level
support, and establishes neither evidence nor authority.

Disagreement MUST preserve both assessments and enter a disputed/quarantined state.

### CAP-EVAL-003 — Critical-error safety gate

**Rule:** Before holdout execution, the contract MUST freeze safety fixtures, occurrence
definition, deterministic verification, bounded reruns, and selection failure behavior.

A confirmed CRITICAL occurrence on a locked safety fixture causes configuration failure.
The verification procedure exists to exclude harness or gold defects, not to excuse a
confirmed catastrophic output.

### CLU-ANL-001 — Separate semantic job

**Rule:** Ambiguous-cluster analysis requires a separate prompt, schema, fixtures,
thresholds, and report. Capture success does not authorize cluster analysis.

## 4. Evidence Binding States

Internal states:

```text
VERIFIED
Every material claim maps to exact eligible source spans.

PARTIAL
The local source and some claims are exact, but required antecedent or claim support
remains unresolved.

DISPUTED
Independent assessments materially disagree.

UNAVAILABLE
A known required source cannot currently be retrieved or validated.

UNVERIFIED
The nomination failed exact binding and cannot become an accepted observation.
```

Ordinary UI projections, if needed, are:

```text
Evidence verified
Evidence incomplete
Evidence disputed
Evidence unavailable
```

Every visible non-verified state MUST identify what is missing, why it matters, one
lawful action when available, and what happens if no action is taken.

Manual assistance may identify potential evidence, correct entity association, narrow a
claim, or request reconsideration. Manual verification override is prohibited. Supplied
evidence must pass the same canonical-source and exact-span gates.

## 5. Source And Job State Separation

Source disposition and execution state are orthogonal.

Source disposition:

```text
ELIGIBLE_PENDING
EVALUATED
NO_OBSERVATIONS
EXCLUDED_BY_SOURCE_POLICY
SUPERSEDED_SOURCE
SOURCE_NOT_CANONICAL
SOURCE_INCOMPLETE
SOURCE_UNAVAILABLE
SOURCE_PROFILE_INCOMPATIBLE
```

Job state:

```text
PENDING
LEASED
RUNNING
SUCCEEDED
FAILED_RETRYABLE
FAILED_TERMINAL
CANCELLED
```

A job may succeed with source disposition `NO_OBSERVATIONS`. Source-policy exclusion is
not worker failure.

## 6. Required Benchmark Scenarios

The initial adjudicated corpus MUST cover:

1. Jeep independently proposes a change and Chris later adopts it.
2. Lyra establishes self-meaning while Chris facilitates.
3. Chris interprets Lyra without Lyra affirming it.
4. Important discussion reaches no decision.
5. Proposal is later rejected.
6. Proposal is revised without explicit supersession.
7. Summary mentions an older origin.
8. System-classified character speech carries genuine evidence.
9. Distant evidence appears in separate ranges or chats.
10. Unilateral boundary differs from mutual agreement.
11. Ordinary conversation produces zero observations.
12. Quoted and attributed speech has unresolved antecedents.
13. Group interview or Archivist feedback is referenced locally.
14. Emoji, surrogate pairs, combining marks, repeated phrases, whitespace, line endings,
    multilingual text, and quotations preserve exact spans.
15. Model fills template with preferred outcome despite contrary evidence.

## 7. Artifacts

Normative schemas:

```text
schemas/discovery/capture-source-envelope-v1.schema.json
schemas/discovery/capture-source-policy-result-v1.schema.json
schemas/discovery/capture-batch-manifest-v1.schema.json
schemas/discovery/capture-reconsideration-request-v1.schema.json
schemas/discovery/capture-reconsideration-decision-v1.schema.json
schemas/discovery/capture-model-result-v1.schema.json
schemas/discovery/accepted-observation-record-v1.schema.json
schemas/discovery/capture-source-disposition-v1.schema.json
schemas/discovery/capture-job-state-v1.schema.json
schemas/discovery/capture-benchmark-fixture-v1.schema.json
schemas/discovery/capture-execution-manifest-v1.schema.json
```

Normative benchmark governance:

```text
PHASE_X_CAPTURE_BENCHMARK_GOVERNANCE_CONTRACT.md
```

## 8. Open Decisions Blocking Implementation

1. Action-label completeness, canonical memory tracks, entity-handle leads, eligible
   source classes, and source-policy result are governed by
   `PHASE_X_CAPTURE_VOCABULARY_AND_SOURCE_POLICY_CONTRACT.md`; implementation and
   benchmark proof remain open.
2. Final critical-event classes and independent-validator contract.
3. Frozen accuracy thresholds and resource envelope under the entered benchmark
   governance contract.
4. Fixture corpus, named adjudicators, private-storage choice, anonymization values, and
   locked holdout custody under the entered benchmark governance contract.
5. Capture batch construction and context-only-source limits are governed by
   `PHASE_X_CAPTURE_BATCH_AND_CONTEXT_BOUNDARY_CONTRACT.md`; numeric benchmark-profile
   values and implementation proof remain open.
6. Reconsideration triggers, deduplication, cycle refusal, and immutable successor
   semantics are governed by
   `PHASE_X_CAPTURE_RECONSIDERATION_AND_SUCCESSOR_CONTRACT.md`; implementation proof
   remains open.
7. X.2 queue, lease, cursor, and reconciliation contract.
8. Whether a piece of source material is worth nominating at all — the candidacy test,
   positive criteria, and exclusion list narrowing `CAP-ZERO-001` — is governed by
   `PHASE_X_CAPTURE_CANDIDACY_AND_EXCLUSION_CONTRACT.md`; benchmark fixtures and
   implementation proof remain open.

No local model may be selected and no production capture implementation may begin while
these blocking decisions remain open.

## 9. Exit Status

This RFC formalizes jurisdiction and schema boundaries. X.1 does not close until the
human-adjudicated benchmark pack, deterministic harness, frozen thresholds, frozen
resource envelope, and reproducible candidate reports exist.
