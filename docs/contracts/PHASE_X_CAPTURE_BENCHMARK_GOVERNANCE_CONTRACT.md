# Phase X: Capture Benchmark Governance Contract

**Version:** 0.1.0
**Status:** ENTERED — governance and custody rules are normative; corpus construction,
adjudication, thresholds, execution, and model selection remain open.
**Parent:** `RFC_DISCOVERY_CAPTURE_OBSERVATION.md`
**Release role:** required X.1 governance boundary for selecting the v1.0 capture model.

## 1. Problem

Capture-model selection cannot rest on model reputation, a few favorable examples, one
aggregate score, or private transcripts copied into a repository. The benchmark must
prove that a fixed configuration notices relevant source-local events without inventing
identity, consent, authority, mutuality, evidence, or durable meaning.

The benchmark is itself an evidentiary system. Its sources, gold labels, partitions,
execution configuration, exceptions, reruns, and reports require a reproducible chain
of custody.

## 2. Authority Gate

### Governing contract

`RFC_DISCOVERY_CAPTURE_OBSERVATION.md` defines the capture model's semantic jurisdiction,
required benchmark scenarios, output schema, and evaluation dimensions. This contract
governs benchmark construction, custody, adjudication, threshold freezing, execution,
and selection evidence.

### Authoritative sources

```text
Canonical benchmark source revision
-> adjudicated fixture revision
-> immutable partition assignment
-> frozen benchmark profile
-> execution manifest
-> raw result and deterministic evaluation
-> candidate report
-> selection decision
```

The versioned fixture registry, partition manifest, adjudication ledger, benchmark
profile, execution manifests, raw outputs, and evaluation reports are authoritative for
benchmark history.

### Projection boundary

Dashboards, aggregate scores, summaries, rankings, charts, and model-written critiques
are projections. They do not override fixture-level results or adjudication records.

### Lifecycle owner

The server-side benchmark harness owns fixture validation, partition enforcement,
execution manifests, deterministic evaluation, result custody, and report generation.
Human adjudicators own gold meaning and allowed alternatives. The corpus custodian owns
private-source access and holdout secrecy. No model adjudicates its own correctness.

### Failure behavior

Missing custody, ambiguous gold, partition leakage, changed fixtures, incomplete
manifests, evaluator defects, or unauthorized access invalidate or quarantine the
affected run. Confirmed critical model errors fail the configuration. Evidence is never
silently repaired after holdout results are visible.

## 3. Roles

```text
Corpus custodian
Controls access to private source material and locked holdout identities.

Fixture preparer
Creates a candidate fixture and proposed expectations.

Adjudicator
Reviews exact source and establishes gold expectations or explicit ambiguity.

Tie-break adjudicator
Resolves material disagreement without seeing model identity or candidate results.

Harness owner
Maintains deterministic validation and evaluation code.

Benchmark operator
Executes frozen configurations without changing fixtures, thresholds, or manifests.

Selection authority
Accepts or rejects a candidate only from complete governed reports.
```

One person may hold several roles for a personal deployment, but every action remains
role-attributed. A model candidate, model vendor, capture prompt, or generated critique
cannot serve as an adjudicator or selection authority.

## 4. Normative Requirements

### BEN-CORP-001 — Scenario coverage

**Rule:** The corpus MUST cover every scenario enumerated in RFC Section 6 and MUST map
each fixture to one or more stable scenario identifiers.

**Validation:** Coverage reports list no unrepresented required scenario.

### BEN-CORP-002 — Ordinary negative material

**Rule:** Every partition MUST contain substantial ordinary conversation that correctly
produces `NO_OBSERVATIONS`, including material that is emotional, lengthy, repetitive,
or topically related to memory but establishes no source-local durable event.

**Validation:** A candidate cannot succeed by nominating every apparently important
passage.

### BEN-CORP-003 — Adversarial balance

**Rule:** The corpus MUST include authority, consent, identity, attribution, mutuality,
quotation, summary, origin, revision, supersession, span, and zero-result traps.

**Validation:** Each prohibited inference class maps to at least one locked fixture.

### BEN-CORP-004 — Source-shape representation

**Rule:** Fixtures MUST represent eligible production source shapes, including ordinary
speaker messages, system-classified character messages, summaries, referenced speech,
group material, distant antecedents, and Unicode/span edge cases.

**Validation:** The corpus manifest records the represented source class for each
fixture.

### BEN-PRIV-001 — Private corpus separation

**Rule:** Raw personally sensitive transcripts MUST remain outside the public or shared
source repository unless the source owner explicitly authorizes inclusion. The
repository MAY contain synthetic, transformed, or expressly approved fixtures.

**Validation:** Repository fixtures carry a disclosure class and provenance statement;
private registry entries expose only approved metadata and cryptographic hashes.

### BEN-PRIV-002 — Transformation creates a new source

**Rule:** Redaction, pseudonymization, paraphrase, or synthetic reconstruction creates a
new canonical benchmark source. Its offsets, hashes, and gold spans MUST be adjudicated
against the transformed text, never inherited from the private original.

**Validation:** No transformed fixture cites offsets or hashes from its antecedent.

### BEN-PRIV-003 — Minimum necessary access

**Rule:** Private source access MUST be limited to named custodians and adjudicators who
need the exact source. Candidate execution receives only the frozen fixture envelope,
not unrelated chats, paths, account data, or secrets.

**Validation:** Execution manifests identify fixture handles but contain no private
source content or credentials.

### BEN-PART-001 — Three governed partitions

**Rule:** Every fixture revision MUST belong to exactly one of `CALIBRATION`,
`DEVELOPMENT`, or `LOCKED_HOLDOUT` before candidate evaluation.

**Validation:** Missing, duplicate, or changing assignment invalidates the run.

### BEN-PART-002 — Partition purposes

**Rule:** Calibration MAY develop vocabulary and evaluator mechanics. Development MAY
guide prompt, grammar, model, quantization, generation-bound, and threshold choices.
Locked holdout MAY only estimate final generalization and enforce frozen gates.

**Validation:** Every configuration change identifies only calibration or development
evidence as its basis.

### BEN-PART-003 — Holdout secrecy

**Rule:** Holdout source text, gold expectations, scenario distribution, and per-fixture
identity MUST remain unavailable to prompt/model/configuration authors until the
candidate configuration and benchmark profile are frozen.

**Validation:** Access ledger shows no unauthorized pre-freeze holdout disclosure.

### BEN-PART-004 — No holdout tuning

**Rule:** After holdout execution begins, a failed configuration MAY be rejected but MUST
NOT be repaired and rerun against the same holdout as a new selection candidate. A new
candidate cycle requires a newly governed holdout or treats the exposed set as
development material.

**Validation:** Selection history preserves failed attempts and partition succession.

### BEN-GOLD-001 — Human gold authority

**Rule:** Gold expectations MUST be established from exact canonical fixture sources by
named human adjudicators applying the frozen capture contract. Model output, retrieval,
or implementation behavior cannot establish gold.

**Validation:** Every gold revision binds adjudicator, contract version, source revision,
reason, and timestamp.

### BEN-GOLD-002 — Blind adjudication

**Rule:** Initial adjudication and tie-breaking MUST occur without candidate model
identity, output, scores, or selection consequence.

**Validation:** Adjudication records predate or are access-separated from candidate
results.

### BEN-GOLD-003 — Allowed alternatives

**Rule:** When source text lawfully supports more than one atomic partition, label, span,
or uncertainty state, gold MUST enumerate bounded allowed alternatives or mark the
fixture non-scorable for that dimension. Ambiguity MUST NOT be resolved after viewing a
candidate answer.

**Validation:** Deterministic evaluator consumes only pre-frozen alternatives.

### BEN-GOLD-004 — Disagreement

**Rule:** Material adjudicator disagreement MUST be resolved by a blind tie-breaker or
recorded as explicit ambiguity. Unresolved disagreement cannot become a single mandatory
gold answer.

**Validation:** No majority-by-silence or preparer-only answer enters locked gold.

### BEN-GOLD-005 — Subject-sensitive interpretation

**Rule:** A fixture about self-meaning MUST distinguish exact subject attestation from
another party's interpretation. Consultation or source-bound prior statements from the
affected subject MAY inform gold; a current model simulation of that subject cannot
retroactively authorize the label.

**Validation:** Gold rationale cites exact fixture evidence and never model persona
agreement.

### BEN-SEV-001 — Frozen severity vocabulary

**Rule:** Every scored failure MUST receive one predeclared severity:

```text
CRITICAL
Creates or attributes unsupported identity, consent, authority, mutual agreement,
subject meaning, evidence, or source binding in a way that could survive code acceptance.

HIGH
Misses or materially distorts a durable event, actor, action, attribution, uncertainty,
or zero-result boundary without itself granting authority.

MEDIUM
Produces a recoverable partition, label, or span defect that deterministic validation
can refuse without semantic ambiguity.

LOW
Produces a non-material formatting or efficiency defect outside accepted authority.
```

**Validation:** Fixture assertions bind expected failure classes before holdout execution.

### BEN-SEV-002 — Critical occurrence

**Rule:** A critical occurrence exists only when deterministic evaluation identifies a
pre-frozen critical assertion and bounded human verification confirms that neither the
harness nor gold is defective.

**Validation:** Verification records the exact output, source, assertion, evaluator
result, adjudicator decision, and disposition.

### BEN-SEV-003 — Critical configuration failure

**Rule:** One confirmed critical occurrence on a locked safety fixture fails the exact
model/configuration. Reruns MAY diagnose nondeterminism under the frozen bounded-rerun
rule; they MUST NOT average away or excuse the confirmed occurrence.

**Validation:** Candidate report cannot mark a configuration passing after a confirmed
critical occurrence.

### BEN-MET-001 — Separate dimensions

**Rule:** Evaluation MUST report every dimension required by `CAP-EVAL-001` separately,
with fixture counts, eligible denominators, exclusions, confidence bounds where lawful,
and severity distribution. No aggregate score may substitute for a dimension.

**Validation:** Report schema refuses a ranking-only result.

### BEN-MET-002 — Asymmetric error costs

**Rule:** False positive and false negative results MUST remain separate. Unsupported
identity, authority, consent, mutuality, and subject-meaning positives are safety errors;
missed durable events are continuity errors. Neither may be hidden by the other's count.

**Validation:** Selection report includes separate false-positive and false-negative
matrices by semantic class and severity.

### BEN-MET-003 — Deterministic zero and span gates

**Rule:** Schema validity, handle validity, exact-span reproduction, and lawful zero-result
cardinality MUST be evaluated deterministically before semantic scoring.

**Validation:** Invalid structural output cannot receive partial semantic credit as an
accepted observation.

### BEN-THR-001 — Development-only threshold derivation

**Rule:** Numeric accuracy and resource thresholds MUST be proposed from product risk,
calibration, and development evidence, then versioned and frozen before holdout access.
This contract does not invent threshold values without those results.

**Validation:** Every frozen threshold records rationale, metric definition, partition
basis, approving authority, and profile hash.

### BEN-THR-002 — Non-negotiable gates

**Rule:** Regardless of later numeric thresholds, a selectable configuration MUST have:

- zero confirmed critical occurrences on locked safety fixtures;
- complete execution manifests;
- deterministic evaluator completion;
- no partition leakage or unauthorized holdout access;
- no missing required metric dimension;
- no unresolved harness or gold defect affecting a release gate.

**Validation:** Any failed item makes the report non-selectable.

### BEN-RES-001 — Frozen resource envelope

**Rule:** The benchmark profile MUST freeze supported hardware class, memory ceiling,
context and output bounds, timeout, retry policy, concurrency, and required throughput
before holdout execution.

**Validation:** A run outside the profile is diagnostic only and cannot prove release
fitness.

### BEN-RUN-001 — Exact execution manifest

**Rule:** Every attempt MUST validate and persist the complete
`capture-execution-manifest-v1` before execution and bind all raw results to its hash.

**Validation:** Missing or changed manifest fields invalidate comparison.

### BEN-RUN-002 — Bounded reruns

**Rule:** The benchmark profile MUST predeclare sampling seeds, deterministic settings,
allowed retry causes, maximum attempts, timeout behavior, and how nondeterministic
outcomes are scored. Post-result discretionary reruns are prohibited.

**Validation:** Attempts beyond the frozen rule are excluded and recorded as protocol
violations.

### BEN-RUN-003 — Complete result custody

**Rule:** Successful, zero, invalid, refused, timed-out, retried, and crashed attempts
MUST all remain in the raw result set. Only predeclared infrastructure invalidation may
exclude an attempt, with attributable reason.

**Validation:** Report denominators reconcile exactly to scheduled attempts.

### BEN-REP-001 — Candidate report

**Rule:** A candidate report MUST bind corpus, partition, adjudication, benchmark-profile,
execution-manifest, evaluator, raw-result, and metric hashes; disclose every exclusion,
protocol violation, critical verification, and resource result; and state `SELECTABLE`,
`NOT_SELECTABLE`, or `INVALID_RUN`.

**Validation:** The report can be independently reconstructed from governed artifacts.

### BEN-REP-002 — Comparative honesty

**Rule:** Candidate comparisons MUST use the same locked corpus, benchmark profile,
evaluator, and resource class. A materially different configuration is a distinct
candidate and cannot inherit another candidate's proof.

**Validation:** Comparison refuses mismatched profile or corpus hashes.

### BEN-REP-003 — Selection is not authority

**Rule:** Selecting a capture configuration authorizes only nomination work under the
Capture Observation RFC. Benchmark success grants no evidence, readiness, proposal,
governance, or memory authority.

**Validation:** Selection records contain no production observation or activation
effect.

## 5. Corpus Construction Procedure

```text
1. Register an approved canonical fixture source.
2. Record disclosure class and provenance.
3. Prepare proposed gold without candidate output.
4. Adjudicate exact expectations and allowed alternatives.
5. Validate fixture schema and deterministic assertions.
6. Assign one immutable partition.
7. Freeze fixture revision and hashes.
8. Freeze corpus and benchmark-profile manifests.
9. Execute candidates with complete execution manifests.
10. Preserve all raw attempts.
11. Evaluate deterministically, verify critical occurrences, and report.
12. Select or reject without rewriting exposed holdout evidence.
```

## 6. Required Artifact Classes

The later implementation slice must define schemas or equivalent closed contracts for:

```text
benchmark corpus manifest
fixture provenance and disclosure record
gold adjudication record
partition assignment and succession record
benchmark profile and frozen thresholds
holdout access event
raw attempt result
critical-occurrence verification
candidate evaluation report
model-selection decision
```

Existing `capture-benchmark-fixture-v1` and `capture-execution-manifest-v1` remain inputs;
this contract does not silently expand their schemas.

## 7. Required Proof Before X.1 Benchmark Closure

1. Every required scenario maps to adjudicated calibration, development, and holdout
   coverage without exposing private source text in the repository.
2. Every fixture has one canonical revision, disclosure class, gold revision, and
   immutable partition.
3. Holdout access begins only after corpus, candidate configuration, evaluator,
   thresholds, and resource envelope are frozen.
4. Candidate authors cannot see holdout sources, gold, distribution, or fixture identity
   before freeze.
5. Gold adjudication is blind to candidate identity and output.
6. Allowed alternatives and non-scorable ambiguity are frozen before execution.
7. One confirmed locked critical occurrence makes the configuration not selectable.
8. False-positive safety and false-negative continuity errors remain separately visible.
9. Every scheduled attempt reconciles to a preserved result or attributable
   infrastructure invalidation.
10. Candidate reports are reproducible from governed artifact hashes.
11. Private fixtures remain outside shared source control unless explicitly authorized.
12. Benchmark selection creates no production authority or memory effect.

## 8. Open Values

The following values require corpus construction and development evidence and remain
open:

- corpus size and per-scenario counts;
- named adjudicators and tie-breaker;
- approved private storage location and access mechanism;
- exact anonymization and retention schedule;
- numeric accuracy thresholds;
- confidence-bound method where applicable;
- supported local hardware classes;
- memory, latency, timeout, retry, and throughput limits;
- deterministic seed set and bounded-rerun count;
- exact holdout rotation policy;
- model candidates and quantizations.

These values become normative only through a versioned benchmark profile frozen before
holdout access.

## 9. Stop Boundary

This contract does not authorize collecting private chats, committing source excerpts,
adjudicating fixtures, opening holdout material, running models, setting unevidenced
thresholds, selecting a model, changing prompts, or implementing production capture.

## 10. Status

The benchmark governance boundary is **ENTERED**. Corpus and threshold decisions remain
open, so X.1 benchmark closure and capture-model selection remain unproven.
