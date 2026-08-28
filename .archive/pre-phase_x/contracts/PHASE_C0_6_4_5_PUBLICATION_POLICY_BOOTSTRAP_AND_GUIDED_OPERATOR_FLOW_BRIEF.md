# Phase C0.6.4-5: Publication Policy Bootstrap And Guided Operator Flow Brief

## Status

STATUS: PROPOSED C0.6.4-5 IMPLEMENTATION CONTRACT

`C0.6.4-0` defined publication authority.

`C0.6.4-1` established publication policy storage and qualification structure.

`C0.6.4-2` established one-time publication authorization and atomic DNM publication.

`C0.6.4-3` established DNM lifecycle governance and replay.

The current host proof has now exposed the next real boundary:

```text
publication engine exists
!=
publication workflow is usable
```

The backend can:

```text
qualify
-> authorize
-> publish
-> replay lifecycle state
```

But the operator currently cannot complete standard publication without:

- pre-existing publication policy records
- API/script knowledge
- internal contract knowledge
- machine-shaped refusal interpretation

`C0.6.4-5` exists to close that gap without weakening canonical governance.

## Governing Finding

The host UI is now accurate enough to expose the actual product failure:

```text
strict policy machinery is present
but the normal operator path is not productized
```

The missing layer is:

```text
canonical policy machinery
-> opinionated default
-> human policy projection
-> guided lawful action
```

This phase must not loosen the backend contract to hide the usability problem.

It must instead:

1. bootstrap a sane standard policy,
2. project eligibility and blocking states in human terms,
3. expose only the next lawful operator action,
4. keep exact policy, qualification, authorization, and ledger semantics intact underneath.

## Governing Problem

The current publication path is blocked by three operator-hostile assumptions:

### 1. Policy setup is externalized

The host review modal can qualify, authorize, and publish.

It cannot create a publication policy.

That makes standard publication impossible on a fresh host without out-of-band setup.

### 2. The standard rule is not actually standard

The seeded policy currently used in proof and smoke work allows:

```text
immutableChildRequiredForTypes = ['ROLE_EVOLUTION']
```

That rule is too broad for normal operation.

A clean root proposal that was reviewed and granted should not require a synthetic child revision merely because its interpretation type is `ROLE_EVOLUTION`.

### 3. Eligibility results are technically correct but operationally opaque

The current system exposes refusal codes such as:

```text
IMMUTABLE_CHILD_REVISION_REQUIRED
```

That is audit-worthy backend truth.

It is not an operator-facing workflow explanation.

## Jurisdiction Boundary

`C0.75` remains structural authority only.

`C0.6.4-5` remains interpretive continuity publication only.

This boundary remains absolute:

```text
structural authority
!=
interpretive publication governance
```

This phase must not:

- mutate structural authority tables
- merge interpretive publication into structural promotion
- bypass review or subject disposition
- hide exact refusal codes from Technical Details

## Locked Decision 1: Bootstrap Must Be Explicit And Idempotent

When no active matching publication policy exists, the operator surface must show:

```text
Publication setup required

[Set Up Standard Publication Policy]
```

The system must not silently create a policy.

Publication governance is consequential enough that the operator must deliberately initialize it, even if initialization is one click.

The bootstrap action must:

- create exactly one standard active policy
- be safe to retry
- reuse or confirm an equivalent active policy instead of duplicating it
- persist through restart and ledger replay
- require no raw JSON or script use

The standard bootstrap action is the new required entry point for fresh hosts.

## Locked Decision 2: Child Revision Requirement Must Derive From Real Correction Lineage

Default rule:

```text
proposal approved without correction
-> root revision may publish

proposal approved with changes
-> original revision may not publish
-> corrected immutable child revision must complete review
-> corrected child may publish
```

This rule must derive from revision lineage and review outcome, not broad interpretation type.

The deciding evidence must come from:

- `parentRevisionId`
- child-lineage presence
- the disposition path that created the child revision

It must not be implemented as:

```text
ROLE_EVOLUTION
-> always require immutable child
```

That broad type-level rule may remain available only as an explicit strict policy option.

It must not be the default.

## Locked Decision 3: Authorization Is An Internal One-Time Safeguard Behind Publish Memory

`C0.6.4-5` chooses:

```text
one human action
-> one internal authorization record
-> one publication record
```

The standard operator path must expose:

```text
Publish Memory
```

It must not expose a separate ordinary-user button for:

```text
Authorize Publication
```

The backend may and should still issue a one-time authorization record.

That record remains part of the forensic and replay contract.

But it exists as an internal safeguard behind publication, not as a separate human governance action in the default flow.

The publication operation therefore becomes:

```text
revalidate eligibility
-> issue one-time authorization
-> consume authorization
-> publish atomically
```

This model is chosen because:

1. the review and subject-disposition steps already establish the real human governance boundary;
2. the authorization record is a backend safety and replay mechanism, not a distinct operator judgment;
3. forcing the operator to manually operate internal safeguards adds complexity without adding meaningful authority separation.

Advanced or strict-policy flows may still preserve an explicit two-step authorization model later if a genuinely separate human authority boundary is introduced.

That is not the standard governed publication path.

## Locked Decision 4: Eligibility Results Must Be An Operator Contract

Every eligibility result must return two parallel layers:

### Human layer

- status
- human reason
- next lawful action

### Technical layer

- exact refusal codes
- exact policy binding
- exact hash/provenance fields

Example:

```text
Revision required
This memory was approved with changes. Complete review of Revision 2 before publishing.

Next action
Open Revision 2
```

Example:

```text
Decision pending
Jeep's decision has not been recorded.

Next action
Record Jeep's Decision
```

Raw refusal codes remain in Technical Details.

The operator must never need to reverse-engineer codes like:

```text
SUBJECT_DISPOSITION_STATE_MISMATCH
REVIEW_STATE_NOT_COMPLETE
IMMUTABLE_CHILD_REVISION_REQUIRED
```

## Locked Decision 5: The Standard Policy Must Be Defined In Human And Canonical Terms

### Human projection

`Standard Governed Publication`

A memory may be published when:

- all required reviews are complete;
- the context owner has granted the final subject decision;
- evidence requirements are satisfied;
- no unresolved review or lifecycle blocker remains;
- if the proposal was corrected through review, publication uses the corrected child revision.

### Canonical mapping

The standard policy projection must map to exact persisted predicates.

| Human rule | Canonical predicate |
| --- | --- |
| all required reviews are complete | `interpretation.reviewState === 'COMPLETE'` |
| context owner granted final decision | `interpretation.subjectDispositionState === policy.requiredFinalSubjectState` and standard policy sets `requiredFinalSubjectState = 'GRANTED'` |
| memory is not already published | `interpretation.publicationState === 'NOT_PUBLISHED'` |
| interpretation type is allowed | `policy.permittedInterpretationTypes.includes(interpretation.type)` |
| policy is active | `policy.policyState === 'ACTIVE'` |
| subject / target match is valid | `continuityTargetId === interpretation.memorySubjectId` when `continuityTargetType = 'MEMORY_SUBJECT'` and `subjectIdentityMode = 'EXACT_SUBJECT'` |
| evidence requirements satisfied | `compareGroundingOutcomeLevel(groundingEnvelope.aggregateOutcome, policy.requiredGroundingOutcome) >= 0` |
| no contest/defer blocker remains | if `policy.contestOrDeferBlocksPublication`, then no qualifying `CONTEST` / `DEFER` in review or subject-disposition state |
| no participant disagreement blocker remains | if `policy.participantDisagreementBlocksPublication`, then no `REJECT` / `CONTEST` / `DEFER` participant disposition |
| root revision may publish unless correction lineage requires child | default standard policy must not gate by broad `immutableChildRequiredForTypes`; child-only requirement must derive from actual corrected-revision lineage |
| stale binding inputs are refused | proposal / grounding / review / subject-disposition binding hashes and ids must still match |

## Standard Presets

`C0.6.4-5` should define preset bootstrap policies before full custom administration.

### 1. Standard Governed Publication

Normal operator path.

Meaning:

- reviewed and granted root revisions may publish
- corrected proposals publish from their reviewed child revision

### 2. Strict Revision Publication

Explicitly stricter governance.

Meaning:

- every publication requires immutable child revision flow

### 3. Testing

Local smoke preset only.

Meaning:

- minimal governance necessary to prove the route
- still logged canonically

The ordinary host must default to `Standard Governed Publication`.

## Guided Operator Flow

The publication surface must show only the next lawful step.

Target operator flow:

```text
no active policy
-> Set Up Standard Publication Policy

eligible path not yet evaluated
-> Check Eligibility

eligible and publication-ready
-> Publish Memory
```

or, if authorization remains human-visible by contract:

```text
Check Eligibility
-> Authorize Publication
-> Publish
```

Blocked actions may remain available inside a compact disclosure, but the main path must present only the next lawful operator action.

## Minimal First UI

The first human policy surface must answer:

```text
Which memories may be published?
Whose approval is required?
When is a corrected revision required?
Which memory scope does this govern?
Is the policy active?
```

It must not require ordinary operators to parse:

- `immutableChildRequiredForTypes`
- `permittedInterpretationTypes`
- `requiredGroundingOutcome`
- `publicationPolicyHash`

Those remain in Technical Details or Advanced Policy Configuration.

## Required Proof Matrix

`C0.6.4-5` does not close without proving all of the following:

### Bootstrap

- fresh host, no active policy
  - setup prompt appears
- operator selects setup
  - exactly one standard active policy is created
- operator repeats setup
  - no duplicate equivalent policy is created

### Standard publication path

- clean root revision reviewed and granted
  - eligible for publication under standard policy

### Corrected-child publication path

- proposal approved with changes
  - parent revision is refused for publication
  - corrected child becomes eligible after review completion and grant

### Human blocker projection

- missing review
  - plain-language blocker shown
  - exact next action shown
- missing subject decision
  - plain-language blocker shown
  - exact next action shown
- corrected-child requirement
  - plain-language reason shown
  - route to the required child revision shown

### Guided publication completion

- eligible revision
  - publication can be completed through the UI

### Persistence and replay

- restart and ledger replay
  - identical policy, qualification, authorization, publication, and active-state result

### Runtime parity

- Node host
  - semantic behavior matches contract
- Bun host
  - semantic behavior matches contract

### Operator usability

- no script, PowerShell, JSON body, raw policy field, or refusal code is required for ordinary publication

## Non-Goals

`C0.6.4-5` must not yet require:

- full custom policy administration
- arbitrary policy authoring UI
- policy diff/comparison UI
- generalized lifecycle bulk operations
- structural-authority mutation

Those belong after the standard operator path is complete.

## Exit Criteria

This phase closes only when all are true:

- a fresh host can obtain a valid standard publication policy through the application;
- a reviewed-and-granted root revision can publish under the default policy;
- a corrected proposal publishes from its reviewed immutable child;
- strict child-only publication remains available only as an explicit option;
- every refusal explains the human reason and next lawful step;
- raw policy fields are not required for ordinary operation;
- publication can be completed through the host UI;
- canonical policy, qualification, authorization, DNM publication, and ledger replay behavior remain unchanged underneath.

## Product Conclusion

The current workflow is accurately governed but unusable.

That is not a smoke-test defect and not a small copy problem.

The standard publication path must become:

```text
bootstrapped
-> human-projected
-> guided
-> exact underneath
```

The publication engine should remain strict.

The operator should not need to become its mechanic.
