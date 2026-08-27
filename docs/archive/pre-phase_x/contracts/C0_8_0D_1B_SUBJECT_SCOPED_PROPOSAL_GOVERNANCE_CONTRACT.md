# C0.8.0D.1B: Subject-Scoped Proposal Governance Contract

**Status:** ENTERED — governing distinction approved; implementation and host proof remain open.
**Parent:** `C0_8_0D_1_OPERATOR_PROPOSAL_INTAKE_EVIDENCE_AND_CLARITY_CONTRACT.md`
**Release effect:** blocks broadening automatic or operator-requested proposal admission until eligibility, consent, and activation are resolved under the affected subject's policy.

## Problem

The current save-driven admission gate treats an explicit subject-level role or relationship decision as the practical doorway to a governed proposal. That doorway is too narrow for ordinary architectural work and too universal for different memory subjects.

Architectural conversations commonly establish reasoning patterns, design commitments, corrections, project evolution, governance law, identity changes, relationship changes, or precedent-setting meaning. Different subjects may lawfully set different evidentiary and consent thresholds for those categories.

A global classifier therefore creates two invalid outcomes:

1. legitimate decisions are refused because they do not assign a role owner,
2. one subject's preservation policy is silently imposed on another subject.

## Governing Authority And Jurisdiction

The approved authority distinction is:

- each memory subject governs meaning asserted about that subject, including identity, self-understanding, personal history, and nondelegable consent;
- materially affected relational participants govern their own participation in shared relationship meaning;
- named project or architectural authorities govern decisions within their expressly delegated jurisdiction;
- the system contract governs evidence integrity, policy resolution, lifecycle enforcement, replay, and refusal, but does not decide what is meaningful for every subject;
- retrieval, synthesis, UI presentation, and structural records are not sources of interpretive authority by themselves.

No subject declaration silently becomes a universal policy. A policy applies only to the subject, relationship, project, or governance scope to which it is explicitly bound.

## Reconciled Architecture

```text
shared governance infrastructure
-> resolve affected subject and jurisdiction
-> resolve the exact subject-scoped proposal policy
-> apply the policy's eligibility and evidence gates
-> synthesize candidate meaning
-> create policy-specific review obligations
-> preserve candidate status until every required gate passes
-> validate activation against publication and governance law
```

The infrastructure for evidence, immutable candidate revisions, review obligations, dispositions, publication, replay, and audit remains shared.

Personal, relational, architectural, and project/governance proposals are distinct policy tracks over that infrastructure. “Same lifecycle” and “parallel lifecycle” are reconciled as one lifecycle engine with different eligibility, review, consent, and activation rules.

## Shared Invariant Gates

Every proposal policy must require all of the following:

1. **Explicit** — the proposed change or enduring meaning is stated or directly demonstrated in the frozen evidence.
2. **Acknowledged** — every party whose acknowledgment is required by the selected policy has explicitly confirmed, accepted, or acted on the formulation in a policy-recognized way.
3. **Grounded** — the claim is supported by exact, inspectable, frozen source evidence.
4. **Stable** — the evidence establishes a settled conclusion or durable precedent rather than passing commentary, exploration, or an unresolved option.
5. **Enduring** — the proposal identifies why the meaning would remain useful to continuity beyond the immediate conversation.
6. **Policy-resolved** — the affected subject, scope, track, required reviewers, final disposition authority, and activation rules are deterministic before admission.

Failure of any required invariant leaves the material as evidence or candidate meaning. It does not become memory authority.

## Proposal Tracks

### Personal and identity

Examples include a reasoning pattern, operational capability, discrete identity-state change, personal-history meaning, or precedent that changes how the subject understands or operates.

- The person described is the memory subject.
- Direct subject evidence is required; another party's interpretation alone is insufficient.
- The subject's final disposition authority is nondelegable unless that subject has established a narrower explicit delegation that the governing law permits.
- Emotional weight alone does not qualify. The proposal must identify the concrete shift or precedent.

### Relational

Examples include a relationship-structure change, shared delegation agreement, durable relational progress, or a change in mutual obligations.

- Every materially affected person is a relational participant.
- Grounding must include policy-required acknowledgment from each affected side.
- One-sided attribution cannot activate shared relationship memory.
- Disagreement, contest, or missing required participation blocks activation under the owning policy.

### Architectural decision

Examples include a design commitment, correction record, authority allocation, architectural method, or explicit change to governing design.

- The named authority or affected memory subject remains subject of any claim about that person.
- Shared design commitments carry shared project authority and require every policy-named approval.
- Before activation, the proposal must be checked against applicable governing contracts and existing active authority.
- Structural facts may support synthesis but cannot be promoted directly into interpretive meaning.

### Project evolution and governance

Examples include a phase completion, project-state transition, new governing rule, delegation condition, or amendment to existing law.

- The project is context, not a substitute memory subject.
- Required project authorities and affected subjects are review participants according to the bound policy.
- An explicit decision formulation is required; discussion of an option is insufficient.
- Activation requires both factual grounding and governance-conflict validation.

### Third-party discovery

When participants facilitate another character's or person's self-discovery, the person being described is the subject. Facilitators are evidence participants, not owners of that subject's meaning.

This distinction applies equally to the operator and to every other facilitator.
Opening space for reflection, asking questions, supplying context, witnessing a
change, or helping the subject articulate it may establish attributable evidence
participation. None of those actions makes the facilitator the author, owner, or
final disposition authority for the subject's self-meaning. The subject's direct
evidence and subject-scoped policy remain governing.

## Policy Binding

Every synthesis request and admitted candidate must bind a versioned policy record containing at least:

```text
proposalTrack
policyProfileId and version
jurisdictionScope
memorySubjectIds
materialParticipantEntityIds
requiredEvidenceTests
requiredReviewerRoles and exact reviewer identities
finalDispositionAuthority
acknowledgmentRule
stabilityRule
onDisagreement
onUnavailableReviewer
governanceValidationRule
activationTarget
policyHash
```

The server owns policy resolution. The browser may explain the resolved policy but may not select a more permissive policy to obtain admission.

Unknown, missing, ambiguous, or conflicting policy bindings fail closed.

### Subject-jurisdiction assignment v1

Before request orchestration may bind a policy, the server must resolve one
immutable, versioned active assignment for the exact `subjectEntityId` and
`jurisdictionScopeId`. The assigned registered profile must declare the same
subject and jurisdiction. Missing assignments, profile mismatches, changed
assignment versions, and multiple active assignments refuse. Assignments are
ledger-backed and replayable. Version succession and revocation require a later
explicit lifecycle slice; v1 never silently replaces an active assignment.

For the persisted-shard proposal path, the server now checks this assignment
after freezing the synthesis request. If an assignment exists, the server binds
its exact profile and evidence-set hash to that request without browser input.
The existing eligibility precondition then refuses admission until governed
facts have been attested and evaluated. When no assignment exists, the legacy
unbound path remains unchanged; no profile is guessed or supplied as fallback.

The validated architectural `DECISIONS` record directly attests that a decision
was explicitly recorded. Resolution of every cited basis into the frozen source
manifest directly attests referential grounding. The shard path persists those
two governed records and evaluates the request. It does not infer stability,
enduring continuity value, or acknowledgment from decision status, shard
selection, speaker presence, tone, silence, or model output; absent records for
those facts remain `NOT_ATTESTED` and produce the exact refusal set.

### Deterministic profile input v1

The first executable, unwired profile input is defined by
`subject-scoped-proposal-policy.js` and its v1 fixture. It deliberately accepts
only explicit server-supplied facts:

- exact profile, subject, jurisdiction, proposal-kind, and proposal-track identity,
- verified basis references for explicitness, grounding, stability, and enduring value,
- exact required acknowledger identities and their verified or unavailable states,
- an explicit governance-validation result when the bound rule requires it.

The evaluator does not read prose, retrieve context, infer significance, resolve
subject identity, or choose a fallback profile. It is not wired to production
admission. Its purpose is to freeze and prove the policy-input boundary before
orchestration changes.

### Governed fact records v1

The server-owned fact derivation boundary accepts only immutable records bound
to the same frozen `evidenceSetHash` as the policy binding. Its closed v1
vocabulary is:

- `EXPLICITNESS_VERIFICATION`, `GROUNDING_VERIFICATION`,
  `STABILITY_VERIFICATION`, and `ENDURING_VALUE_VERIFICATION`, each with the
  exact verifying record identity and nonempty basis references;
- `ACKNOWLEDGMENT`, with an exact entity identity and either `VERIFIED` or
  `UNAVAILABLE` state;
- `GOVERNANCE_VALIDATION`, with one enumerated compatibility, amendment,
  successor, duplicate, conflict, prohibition, unavailable, or ambiguous state.

Records from another evidence set, duplicate or ambiguous records, unsupported
states, and records without exact basis references refuse. Missing records
derive `NOT_ATTESTED`; they are never inferred. The resulting fact set and its
source-record set are independently hashed, immutably persisted, and replayed.
This boundary remains unwired from production proposal admission.

### Bound eligibility result v1

A synthesis request may now resolve its exact immutable policy binding and
governed fact attestation into one deterministic eligibility result. The result
binds the policy hash and fact hash, is ledger-backed and replayable, and records
either `ELIGIBLE` or the complete sorted refusal set. Missing or mismatched
bindings, profiles, or attestations refuse evaluation. This result is evidence
for a later admission decision; it does not itself create or admit a candidate,
open Review, publish memory, or change source evidence.

### Admission precondition v1

At the existing synthesis-to-candidate boundary, a synthesis run carrying a
subject-scoped policy binding must resolve an exact persisted `ELIGIBLE` result
before `prepareInterpretiveCandidate()` may run. A missing, stale, mismatched, or
ineligible evaluation refuses admission and creates no proposal or candidate.
Unbound historical synthesis runs retain their existing admission behavior;
this compatibility rule does not invent a fallback policy or reinterpret their
historical records.

## Acknowledgment And Stability

Acknowledgment and stability cannot be inferred from tone, topical similarity, or model confidence.

Only enumerated deterministic evidence shapes may satisfy these facts:

- a model assertion that evidence was acknowledged or stable is advisory only;
- manual acknowledgment must create an attributable governed record, not mutate source history;
- action-based acknowledgment is eligible only when the policy defines the exact attributable action and its binding;
- silence, continued conversation, absence of objection, retrieval similarity, and repeated wording do not prove acknowledgment;
- passage of time alone does not prove stability.

### Stability and enduring-value declarations v1

Each policy rule names the exact identities authorized to declare stability and
enduring continuity value for that proposal kind. A declaration binds the
declaring identity, subject, jurisdiction, proposal kind, evidence-set hash,
exact basis references, assigned profile version, and policy hash. It is
immutable, ledger-backed, and replayable. An unlisted actor, missing assignment,
different evidence set, unsupported fact type, or changed declaration identity
refuses. The synthesis system may preserve and later consume these records but
cannot create them on a subject's or project authority's behalf.

On a later shard attempt over the same frozen evidence set, orchestration may
consume declarations only when subject, jurisdiction, proposal kind,
evidence-set hash, and assigned policy hash all match exactly. The declaration
becomes the attributable basis for the corresponding verified fact. Missing or
nonmatching declarations remain `NOT_ATTESTED`; they are not approximated.

## Unavailable Reviewers And Provisional State

### Attributable acknowledgment records v1

A `VERIFIED` acknowledgment must be recorded by the exact required participant
for that participant; no operator, model, facilitator, or other subject may
impersonate consent. An `UNAVAILABLE` record must be created by an identity named
as an unavailability authority in the assigned policy and must preserve a
concrete reason and exact basis references. Both states bind the subject,
jurisdiction, proposal kind, frozen evidence set, participant identity, assigned
profile version, and policy hash. They are immutable and replayable. Only one
acknowledgment state may exist per participant and evidence set. `UNAVAILABLE`
is a provisional blocker and never satisfies acknowledgment.

Shard orchestration consumes acknowledgment records only when proposal kind,
frozen evidence-set hash, and assigned policy hash match exactly. A matching
`VERIFIED` record satisfies only its named participant. A matching `UNAVAILABLE`
record preserves that participant's unavailable state, produces provisional
ineligibility, and never becomes consent. Once every invariant and required
acknowledgment is verified, the existing admission boundary may create the
governed candidate and no earlier.

### Administrative host actions v1

Authenticated server routes expose profile registration, subject-jurisdiction
assignment, stability or enduring-value declaration, and acknowledgment
recording. Callers provide semantic identities and exact basis references; the
server computes every trusted hash, validates authority, appends ledger events,
and enforces immutability. Caller-supplied policy, assignment, declaration, or
acknowledgment hashes have no authority. These are bounded governance actions,
not ordinary proposal controls or permission for a browser to choose a more
permissive policy during proposal creation.

### Authenticated actor binding v1

An ordinary governance action must never accept its acting semantic identity
from browser input. The server resolves the authenticated host account handle
through one immutable, ledger-backed account-to-semantic-entity binding. Binding
creation is administrative, replayable, and one-to-one: an account cannot be
rebound to another entity, and an entity cannot be claimed by another account.

An unbound account refuses the action. A caller-supplied declaring, recording,
or acknowledging identity that differs from the resolved entity refuses as an
impersonation attempt. A verified acknowledgment resolves both participant and
recorder to the authenticated entity. An unavailable-participant record still
names the unavailable participant explicitly, but its recording authority is
resolved from authentication and validated by the assigned policy.

Administrative identity-bearing routes remain separate from ordinary action
routes. Their existence does not authorize ordinary controls to select an actor.

### Ordinary status projection v1

Read-only status routes explain whether a subject scope is configured and
whether a synthesis request is eligible, blocked, provisional, or still waiting
for evidence checks. They expose human-readable missing requirements, exact
missing participant identities where applicable, and one lawful next action.
Policy hashes, evidence hashes, ledger identities, and refusal codes remain
outside the ordinary projection. These routes do not mutate or reinterpret any
governed record.

The persisted-shard client preserves the blocked synthesis-request identity,
loads this read-only projection, and renders its status, missing requirements,
and next action. Subject-policy refusal codes remain diagnostic only. If the
status lookup itself is unavailable, the existing generic failure projection
remains the truthful degraded fallback.

When a required reviewer cannot participate:

- the obligation and reason for unavailability must be recorded;
- the candidate remains provisional, blocked, or deferred according to the bound policy;
- the system must not reinterpret impossibility as consent;
- no provisional candidate may publish or activate unless an existing governing policy explicitly authorizes that exact exception;
- the ordinary UI must state whose review is missing, why activation is blocked, and one lawful next action.

## Governance-Conflict Validation

Architectural and project/governance proposals must validate against the exact active governing records in their jurisdiction before activation.

The validation result must distinguish:

- compatible addition,
- lawful amendment or successor,
- duplicate existing authority,
- unresolved conflict,
- prohibited contradiction,
- governing record unavailable or ambiguous.

The proposal must remain inactive when the governing record cannot be resolved exactly or when a conflict lacks a lawful amendment/supersession path.

## Prohibited Behavior

The following remain prohibited across every policy track:

- vibe-based significance,
- model-inferred authority or consent,
- retrieval used as proof,
- pattern extension that adds no new grounded fact, decision, shift, or precedent,
- one-sided attribution about another subject,
- passing commentary treated as settled meaning,
- structural records treated as interpretive meaning without governed synthesis,
- browser-authored policy, evidence meaning, subject identity, or approval,
- admission under a generic fallback policy when the applicable subject policy is missing,
- activation before all policy-required evidence, review, consent, publication, and governance gates pass.

## Existing Capability Reconciliation

The current lifecycle has reusable foundations:

- `subject-meaning-memory-v1` requires direct memory-subject review;
- `shared-role-memory-v1` requires memory-subject and relational-participant review, preserves both perspectives on disagreement, and assigns final disposition to the memory subject;
- candidate risk, required review obligations, participant disagreement, immutable revisions, publication qualification, and continuity-target binding already exist.

Those mechanisms do **not** yet prove this contract. Current gaps include:

- no versioned subject-scoped eligibility profile,
- no general proposal-track vocabulary covering the tracks above,
- no deterministic acknowledgment or stability evidence contract,
- no general shared-project approval rule,
- no governed unavailable-reviewer/provisional activation policy,
- no architectural governance-conflict validation gate,
- save-driven admission remains narrowed to role/relationship-oriented wording,
- ordinary refusal text exposes internal role-owner terminology.

Existing policies and records remain authoritative historical state. They must be extended or succeeded through versioned policy changes, not silently reinterpreted.

## Failure Projection

Ordinary refusal must identify the failed human requirement and the policy scope. Examples:

```text
Blocked: This source does not show a settled decision or change.
Next step: Keep it as evidence, or select sources that state and acknowledge the decision.
```

```text
Blocked: This relationship proposal has not been acknowledged by both people.
Next step: Request the missing participant review.
```

```text
Blocked: This architectural proposal conflicts with active governing law.
Next step: Review the conflict and create a lawful amendment or successor.
```

“Distinct role owner,” policy IDs, assertion domains, hashes, and refusal codes remain diagnostic information and must not be required operator vocabulary.

## Required Proof Before Implementation Closure

1. Two different subjects may bind different policy profiles without either profile affecting the other.
2. The same evidence set may be eligible under one subject's declared policy and ineligible under another's, with truthful explanations.
3. Each proposal track resolves deterministic subject, participant, review, disposition, and activation obligations.
4. Missing acknowledgment, stability, reviewer identity, or policy binding refuses admission.
5. A required unavailable reviewer produces a recorded provisional/blocking state and never implicit consent.
6. Architectural and governance proposals cannot activate while conflicting governing authority is unresolved.
7. Retrieval may discover sources but cannot satisfy any evidence or consent gate.
8. Restart/replay preserves policy identity, review obligations, provisional state, conflict results, and refusal reasons unchanged.
9. Ordinary UI explains eligibility and lifecycle requirements without internal policy vocabulary.
10. Existing valid subject and shared-role candidates retain their historical policy bindings unchanged.

## Stop Boundary

This contract does not authorize:

- broadening the save-driven admission classifier,
- adding subject-policy editing UI,
- implementing acknowledgment inference,
- changing existing publication or disposition records,
- migrating historical candidates,
- inventing a fallback policy for subjects who have not declared one.

Those require separately declared implementation slices after deterministic policy input and proof fixtures are approved.

## Status

`C0.8.0D.1B` is **ENTERED**. The shared-infrastructure and subject-scoped-policy distinction is governing. Production behavior remains unchanged and release-open.
