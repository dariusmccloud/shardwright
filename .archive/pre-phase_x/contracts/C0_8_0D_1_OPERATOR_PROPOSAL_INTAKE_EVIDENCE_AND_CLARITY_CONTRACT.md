# C0.8.0D.1: Operator Proposal Intake, Inspectable Evidence, And Clarity Contract

**Status:** ENTERED — contract approved; implementation and proof remain open.
**Release effect:** release-gating for the intended `v1.0` ordinary operator workflow.
**Implementation authority:** none follows from this document until a bounded implementation slice is declared.

## Purpose

Restore the ordinary product doorway promised by `C0.6.8`, narrowed during `C0.6.7D`, and only partially supplied by the `C0.6.9` save-driven handoff.

The system already owns governed synthesis, candidate admission, review, disposition, publication, replay, and recovery. What remains missing is the operator path that makes those capabilities understandable and usable without route knowledge, scripts, internal policy vocabulary, or machine-reference interpretation.

## Governing Authority And Reconciliation

- `PHASE_C0_6_8_HOST_PROPOSAL_CREATION_AND_SOURCE_NAVIGATION_BRIEF.md` governs saved-evidence intake, host orchestration, direct Review landing, and truthful refusal.
- `PHASE_C0_6_9_ARCHITECTURAL_SHARDER_CONTRACT_BOUNDARY_BRIEF.md` governs the save-driven Architectural Sharder handoff and confirms that evidence sources are inputs while one admitted candidate is the review object.
- `PHASE_C0_6_5_EVIDENCE_FINDING_CONTRACT_BRIEF.md` owns persisted human-readable findings. The browser must not synthesize evidence meaning from labels or hashes.
- `PHASE_C0_8_0_RELEASE_CLOSURE_OPERATIONAL_PROOF_AND_CAPABILITY_FREEZE_BRIEF.md` requires ordinary proposal creation, direct Review landing, inspectable findings and exact sources, and an explicit shipped-capability classification.

This contract supersedes the `C0.6.7D` release deferral of host-first saved-evidence proposal creation. The deferral remains historically accurate but is not the intended `v1.0` release posture.

This contract does not reopen the proven `C0.6.9` save-driven path. That path becomes one system-suggested intake path, not a substitute for operator-requested intake or inspectable evidence.

## Product Boundary

The ordinary workflow is:

```text
Create Proposal
-> choose or confirm tangible evidence
-> system synthesizes one proposed memory
-> candidate is validated, deduplicated, and admitted
-> exact admitted revision opens in Review
-> operator inspects the proposal and its evidence
-> operator sees the current lifecycle position and one lawful next action
```

The operator must not choose synthesis mode, validation policy, routing, candidate admission, queue destination, or publication mechanics on the happy path. Those are server-owned orchestration concerns.

## Locked Requirements

### 1. System-suggested proposal entry

The Architectural Sharder may identify saved evidence that supports a proposal. The ordinary path may continue automatically after an operator-approved save or may ask the operator to confirm creation, depending on the declared intake surface.

The system must explain what evidence triggered the suggestion. It must not imply that an admitted proposal is already memory authority.

### 2. Operator-requested proposal entry

An operator or memory subject must be able to deliberately preserve something specific without first making the Sharder guess it.

The supported evidence picker must accept one or more lawful items from explicitly supported classes:

- stable source messages or bounded message ranges,
- persisted Architectural or Narrative shard outputs,
- persisted structural decisions or other governed records whose exact revision can be resolved.

Unsupported evidence classes must not render as selectable.

### 3. One evidence set produces one review object

```text
selected lawful evidence set
-> frozen source manifest
-> synthesis run
-> one governed proposal
-> admission / dedupe
-> one Review revision
```

Evidence items remain inputs. They do not become separate proposals merely because they were stored separately.

### 4. One server-owned orchestration path

System-suggested and operator-requested entry must converge on the same governed server services for:

1. evidence resolution and freezing,
2. synthesis-policy selection,
3. synthesis-run creation,
4. proposal generation,
5. grounding and admission,
6. deduplication,
7. review routing,
8. replay and recovery.

The browser may request and display the workflow. It may not reproduce those authority decisions locally.

### 5. Canonical deduplication

The server must derive a stable dedupe key from at least:

- memory scope and continuity target,
- requested interpretation contract,
- normalized frozen evidence-set identity.

The result must distinguish:

- the same evidence and target already represented by an open proposal,
- the same evidence and target already admitted or published,
- the same evidence supporting a lawful new revision lineage,
- materially different evidence requiring a new candidate.

Duplicate handling must return the existing lawful review target or a plain-language refusal. It must not silently create parallel candidates.

### 6. Direct Review landing

Successful intake returns the exact admitted `interpretationRevisionId` and opens that revision in Review. The operator must not search the queue.

### 7. Inspectable evidence is an admission requirement

A reviewable finding must carry or resolve an operator-inspectable evidence envelope. A raw binding alone is not sufficient for ordinary review.

Minimum inspectable evidence shape:

```text
finding summary
source class
human source label
speaker / record context
frozen source identity and revision identity
operator-readable excerpt or record preview
exact Open Source action when a unique resolver exists
verification or drift state
```

Canonical IDs, versions, and hashes remain preserved for replay and audit. They belong in an explicitly diagnostic surface and must not substitute for the readable preview.

If required evidence cannot be previewed or resolved exactly, the candidate must not be presented as ordinarily reviewable. The server must refuse, quarantine, or mark it blocked according to the owning admission contract.

### 8. Plain-language lifecycle projection

The ordinary surface must answer:

```text
What is being proposed?
Why is it being proposed?
Where exactly did it come from?
What happens next?
```

The lifecycle projection must present a human-readable progression such as:

```text
Proposed
-> Evidence verified
-> Awaiting review
-> Awaiting subject decision
-> Ready to publish
-> Published
```

Only the authoritative current position and immediate lawful next action receive primary emphasis:

```text
Current: Awaiting Jeep's decision
Next: Jeep approves, edits, rejects, or defers this proposal
```

Internal state codes remain available only in diagnostics.

### 9. Truthful refusal and recovery guidance

Every blocked intake or lifecycle transition must display:

```text
Blocked: [plain-language reason]
Next step: [one lawful action]
```

Technical refusal codes and integrity details remain preserved behind diagnostics. A refusal-code-only operator state is invalid.

### 10. The Clarity Principle

> Any element that does not provide insight, direction, feedback, or lawful movement must be removed from the ordinary workflow.

This is a release quality gate, not optional polish.

At scale, every unnecessary element becomes a repeated operator decision. Ordinary UI content must therefore pass this inclusion test:

```text
Does this help the operator understand, decide, recover, or continue?
-> Yes: retain it and express it in human language.
-> No: remove it from the ordinary workflow.
```

Collapsing irrelevant content does not satisfy this rule. Raw IDs, hashes, internal policy vocabulary, duplicated status copy, unexplained inputs, and debug-only projections must be removed from the ordinary workflow or confined to an explicitly diagnostic surface.

## Authority And Projection Boundaries

- Persisted source messages, shards, records, manifests, and their frozen revisions are evidence authority inputs.
- The interpretive synthesis ledger owns synthesis runs, proposals, admission, dedupe, and replay.
- The interpretation candidate and its immutable revision are the review object.
- Review is a human projection over governed candidate state; it is not an authority store.
- Technical Details is a diagnostic/audit projection. It is not the ordinary evidence-inspection experience.
- Publication authority remains unchanged and cannot be granted by intake, evidence selection, or browser presentation.

## Failure Behavior

- Missing, stale, mutated, ambiguous, or non-inspectable evidence: refuse or quarantine before ordinary review.
- Duplicate open proposal: return and open the existing exact revision when lawful.
- Duplicate published meaning without a lawful successor basis: refuse with the existing record and one next action.
- Synthesis or admission failure: preserve the selected evidence set and report a plain-language blocker.
- Review launch failure after admission: preserve the admitted revision and provide a direct retry/open action.
- Resolver ambiguity: never choose a likely source.

## Required Implementation Slices

Implementation must remain separately authorized and proven:

1. **Evidence envelope and admission contract** — freeze operator-inspectable previews alongside exact bindings; refuse non-inspectable evidence.
2. **Unified intake orchestration and dedupe** — converge system-suggested and operator-requested paths on one server-owned workflow.
3. **Evidence picker and direct landing** — select lawful evidence, create one proposal, and open its exact Review revision.
4. **Review clarity projection** — expose the four operator questions, lifecycle position, next action, and only content passing the Clarity Principle.
5. **Restart and host proof** — prove both entry paths, exact evidence inspection, duplicate behavior, refusal behavior, and replay.

The first slice is entered under `C0_8_0D_1A_INSPECTABLE_EVIDENCE_ENVELOPE_AND_ADMISSION_CONTRACT.md`.

Proposal eligibility, consent, and activation are further governed by
`C0_8_0D_1B_SUBJECT_SCOPED_PROPOSAL_GOVERNANCE_CONTRACT.md`. Intake must resolve
the affected subject and the exact subject-scoped policy before synthesis or
admission; it must not apply one subject's policy as a universal default.

## Release Proof Gate

This contract closes only when host proof demonstrates:

1. a system-suggested proposal identifies its tangible evidence and opens the exact admitted revision,
2. an operator can select multiple lawful evidence items and create one proposal without scripts or internal configuration,
3. the same normalized request does not create a duplicate candidate,
4. every displayed finding exposes an inline readable preview or exact in-context source action,
5. missing, stale, ambiguous, or non-inspectable evidence blocks ordinary review with one plain-language next step,
6. Review visibly answers the four operator questions,
7. Review identifies the current lifecycle position and immediate lawful next action,
8. ordinary Review contains no element that fails the Clarity Principle,
9. restart/replay preserves the proposal, evidence envelope, dedupe identity, lifecycle state, and exact Review target unchanged,
10. no ordinary flow requires CLI, raw API payloads, SQL, hashes, policy selection, routing knowledge, or queue hunting.

## Status

`C0.8.0D.1` is **ENTERED**. The contract is reconciled and approved. The ordinary proposal-intake and inspectable-evidence product behavior remains unimplemented and release-open.
