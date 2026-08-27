# Phase X: Capture Vocabulary And Source Policy Contract

**Version:** 0.1.0
**Status:** ENTERED — v1 vocabularies and source-policy boundary are normative;
production implementation remains unauthorized.
**Parent:** `RFC_DISCOVERY_CAPTURE_OBSERVATION.md`

## 1. Problem

Capture cannot be benchmarked or implemented while four meanings remain unstable:

1. which source-local actions the model may nominate;
2. which canonical memory tracks code may later resolve;
3. how known entities differ from unresolved names or external participants;
4. which source classes may supply evidence, context, or no capture input.

Tentative enums are not authority merely because they already exist in a schema. This
contract freezes their v1 meaning, mapping, ownership, and unknown behavior.

## 2. Governing Separation

```text
Source class
What kind of canonical record is this?

Source-policy result
May this exact revision be used as evidence, context only, or not at all?

Signal type
What broad kind of source-local event may have occurred?

Local evidenced action
What did the source show an actor doing here?

Track hint
Which governed memory policy may eventually apply?

Canonical track
Which policy track code resolved after evidence accumulation?
```

The capture model may nominate signal type, local action, unresolved entity leads, and
track hints. Code owns canonical speaker metadata, entity handles, source classification,
source policy, accepted observations, canonical track, jurisdiction, and lifecycle.

## 3. Local Evidenced Action Vocabulary

The closed v1 vocabulary is:

| Action | Source-local meaning |
|---|---|
| `STATED` | Expressed a proposition without a narrower supported action |
| `DISCOVERED` | Articulated a newly recognized fact or self-understanding |
| `INTRODUCED` | Put forward a new concept, structure, requirement, or possibility |
| `PROPOSED` | Offered a specific candidate decision or change |
| `ADOPTED` | Explicitly selected or put a proposal into effect |
| `ACKNOWLEDGED` | Explicitly recognized a statement, event, condition, or action |
| `REJECTED` | Explicitly declined a proposal, claim, state, or option |
| `CHALLENGED` | Explicitly contested a claim, meaning, decision, or authority |
| `REVISED` | Changed previously expressed wording, meaning, plan, or state |
| `CORRECTED` | Declared a prior statement or representation inaccurate and supplied a correction |
| `FORMALIZED` | Converted an existing understanding into an explicit rule or record |
| `COMMITTED` | Undertook a durable course of action or obligation |
| `PROMISED` | Made an explicit promise to another subject or audience |
| `ESTABLISHED_BOUNDARY` | Declared a durable personal, relational, or governance limit |
| `REQUESTED_MEMORY_CONSIDERATION` | Explicitly requested that material be considered for memory |
| `REQUESTED_PRESERVATION` | Explicitly requested that exact material or a prior state be retained |
| `PRESERVED_AS_HISTORICAL` | Explicitly retained a prior state as historical rather than current |
| `WITHDREW` | Explicitly withdrew a prior statement, request, proposal, or position |
| `SUPERSEDED` | Explicitly identified a successor to a prior state, rule, or record |
| `EXPRESSED_DURABLE_PREFERENCE` | Expressed a preference as continuing rather than momentary |
| `EXPRESSED_DURABLE_NEED` | Expressed a need as continuing rather than momentary |
| `REFERENCED_PRIOR_STATEMENT` | Referred to earlier or external speech without locally re-establishing its truth |
| `UNKNOWN_ACTION` | Evidence supports an event but not one enumerated action |

### Action rules

- The label describes only what the supplied source shows locally.
- `ADOPTED`, `WITHDREW`, and `SUPERSEDED` do not mutate canonical lifecycle state.
- `ACKNOWLEDGED` does not establish consent unless a later policy recognizes an exact
  attributable acknowledgment record.
- `PRESERVED_AS_HISTORICAL` means the source distinguishes retention from currentness;
  it does not itself perform storage or supersession.
- `REQUESTED_MEMORY_CONSIDERATION` deterministically routes an explicit subject request
  around capture-confidence thresholds under the semantic spine; the model does not
  decide whether the request was allowed.
- `UNKNOWN_ACTION` preserves uncertainty and cannot be silently mapped to a stronger
  action.
- New labels require a versioned vocabulary successor, benchmark fixtures, and explicit
  mapping. Free-form or nearest-label invention is prohibited.

## 4. Memory Track Vocabulary

Canonical v1 policy tracks are:

```text
PERSONAL_IDENTITY
RELATIONAL
ARCHITECTURAL_DECISION
PROJECT_EVOLUTION_GOVERNANCE
UNKNOWN
```

### Track meanings

| Track | Governed subject matter |
|---|---|
| `PERSONAL_IDENTITY` | A subject's identity, self-interpretation, preference, boundary, internal state, experienced history, personal commitment, or discrete personal precedent |
| `RELATIONAL` | Shared relationship meaning, structure, obligation, agreement, or change involving materially affected subjects |
| `ARCHITECTURAL_DECISION` | An explicit design commitment, correction, method, authority allocation, or architectural successor |
| `PROJECT_EVOLUTION_GOVERNANCE` | A project-state transition, governing rule, phase decision, delegation condition, or amendment to project law |
| `UNKNOWN` | Evidence does not yet support one canonical track |

### Non-track routes

These are evidence or discovery routes, not canonical memory tracks:

```text
THIRD_PARTY_DISCOVERY
OPERATOR_CONTEXT
SUBJECT_REQUESTED
OPERATOR_CONTINUITY_HOLD
```

They describe how material was found or preserved. Code must still resolve the proposal's
actual subject matter before governance.

### Legacy and nomination mapping

| Existing or tentative value | Canonical v1 mapping |
|---|---|
| `SELF` | `PERSONAL_IDENTITY` |
| `RELATIONAL` | `RELATIONAL` |
| `ARCHITECTURAL` | `ARCHITECTURAL_DECISION` |
| `GOVERNANCE` | `PROJECT_EVOLUTION_GOVERNANCE` |
| `PROJECT_CONTINUITY` | `PROJECT_EVOLUTION_GOVERNANCE` when a durable transition or decision is verified; otherwise no canonical track |
| `OPERATOR_CONTEXT` | No canonical track; evidence route only |
| `UNKNOWN` | `UNKNOWN` |

Track hints in model output now use the canonical names. They remain non-authoritative;
code may resolve a different track or keep `UNKNOWN` from the exact evidence and policy.
Historical records retain their original values and versioned mappings.

## 5. Entity Handle And Unresolved Lead Contract

### Known entities

Canonical entity handles are opaque, code-issued identifiers. The source envelope
supplies the only handles a model may nominate for known actors, affected subjects, and
attributed speakers.

```text
canonical speaker metadata
!= claimed actor
!= affected subject
!= attributed actor
```

The model may select an eligible handle; it may not manufacture, rename, merge, split,
or infer a canonical entity.

### Unresolved entities

When source text mentions a person, character, group, or external participant without an
eligible canonical handle, the model emits an `unresolvedEntityLead` containing:

```text
leadHandle
semanticRole
supporting span handles
resolutionHint or UNKNOWN
```

The lead is a retrieval target, not an entity. Code later resolves it to one canonical
entity, preserves it unresolved, marks it external, or rejects it. Multiple unresolved
participants require separate lead handles; a repeated generic `UNKNOWN` must not
collapse them.

### Entity failure behavior

- Unknown handle: reject the nomination.
- Known handle with unsupported role: reject or quarantine the affected observation.
- Unresolved lead with invalid spans: reject the lead and affected claim.
- Ambiguous resolution: preserve alternatives and remain unresolved.
- External participant: create no canonical identity until the entity-governance
  mechanism admits one.
- Display-name similarity, character filename similarity, and retrieval similarity never
  merge entities.

## 6. Source Class Vocabulary

Closed v1 source classes are:

| Source class | Meaning |
|---|---|
| `CANONICAL_CHAT_MESSAGE` | Exact canonical host message with known host classification and source revision |
| `CANONICAL_GOVERNANCE_RECORD` | Exact admitted governance, disposition, policy, or lifecycle authority record |
| `CANONICAL_DERIVED_RECORD` | Exact managed shard, summary, or other derived record whose existence is canonical but whose prose does not replace underlying evidence |
| `AUTHORIZED_PROJECT_RECORD` | Versioned project document or record admitted by the project source policy |
| `AUTHORIZED_IMPORTED_RECORD` | Versioned record imported through an authorized provenance process |
| `ADMITTED_EXTERNAL_EVIDENCE` | External evidence explicitly admitted with provenance, scope, and revision |

Speaker type is not source class. `USER`, `CHARACTER`, `SYSTEM`, and `OTHER` remain
canonical host classifications inside a `CANONICAL_CHAT_MESSAGE`.

### Source-policy dispositions

Every exact source revision receives one code-owned disposition before an envelope may
be sent to capture:

```text
ELIGIBLE_EVIDENCE
May directly support source-local claims within its admitted scope.

ELIGIBLE_CONTEXT_ONLY
May help interpret supplied evidence but cannot provide claim-support spans.

EXCLUDED
Must not be sent to capture for the evaluated policy and scope.
```

### Default v1 policy

| Source class | Default disposition | Boundary |
|---|---|---|
| `CANONICAL_CHAT_MESSAGE` | `ELIGIBLE_EVIDENCE` | Exact message proves only what that message and canonical metadata support |
| `CANONICAL_GOVERNANCE_RECORD` | `ELIGIBLE_EVIDENCE` | Only within the record's governed jurisdiction and current/historical status |
| `CANONICAL_DERIVED_RECORD` | `ELIGIBLE_CONTEXT_ONLY` | May prove the derived record exists; cannot substitute for antecedent evidence of summarized claims |
| `AUTHORIZED_PROJECT_RECORD` | Policy-resolved | Must bind admitted repository/path scope, revision, and authority class |
| `AUTHORIZED_IMPORTED_RECORD` | Policy-resolved | Must bind origin, import authority, revision, and admitted scope |
| `ADMITTED_EXTERNAL_EVIDENCE` | Policy-resolved | Must bind provenance, admitting authority, revision, and claim scope |

An explicit versioned policy may narrow any default. It may broaden a policy-resolved
class only through its owning authority. Browser settings, model output, retrieval, or
prompt text cannot promote context or excluded material into evidence.

## 7. Normative Requirements

### VOC-ACT-001 — Closed action vocabulary

Model action output MUST use exactly one v1 action label and MUST NOT invent synonyms,
compound labels, or lifecycle consequences.

### VOC-ACT-002 — Expressive completeness

The action vocabulary MUST express every required RFC benchmark scenario, including
independent proposal and later adoption, correction, revision, explicit preservation of
a prior state, memory consideration, withdrawal, supersession, and referenced speech.

### VOC-ACT-003 — Unknown is non-escalating

`UNKNOWN_ACTION` MUST remain unresolved and MUST NOT default to adoption, agreement,
authority, durability, or lifecycle change.

### VOC-TRK-001 — Closed canonical tracks

Only the five v1 track values in Section 4 may be written by new Phase X track
resolution. Historical values remain versioned historical inputs.

### VOC-TRK-002 — Routes are not tracks

Third-party discovery, operator context, subject request, and continuity hold MUST NOT
become canonical tracks merely because they caused preservation or discovery.

### VOC-TRK-003 — Code resolves track

Model track hints MUST NOT establish proposal policy, subject jurisdiction, review
obligations, disposition authority, or activation.

### VOC-ENT-001 — Eligible handle set

Every known entity nomination MUST match an exact code-supplied eligible entity handle.

### VOC-ENT-002 — Unresolved leads remain distinct

Each unresolved participant MUST have a source-bound lead. `UNKNOWN` MUST NOT merge
multiple people or create a canonical entity.

### VOC-ENT-003 — No identity by similarity

Names, filenames, card metadata, prose descriptions, embeddings, and retrieval scores
MUST NOT independently create or merge canonical entities.

### VOC-SRC-001 — Code-owned source classification

Every capture source MUST bind one exact source class, record identity, revision hash,
and source-policy result supplied by code.

### VOC-SRC-002 — Evidence/context separation

Only `ELIGIBLE_EVIDENCE` sources may provide claim-support spans. Context-only sources
MUST NOT satisfy claim support even when they contain matching prose.

### VOC-SRC-003 — Derived records do not replace antecedents

A summary or managed shard MAY support a claim about the derived record itself but MUST
NOT verify the summarized event, speaker, consent, identity, authority, or agreement
without exact eligible antecedent sources.

### VOC-SRC-004 — Unknown or stale policy refuses

Missing class, missing policy, changed revision, unknown policy version, ambiguous
provenance, or mismatched policy hash MUST prevent envelope issuance or quarantine the
result.

## 8. Schema Consequences

This contract succeeds the tentative discovery-schema vocabularies as follows:

- `capture-model-result-v1` receives the frozen action and canonical track-hint enums;
- unresolved names move from repeated `UNKNOWN` entity entries into distinct
  `unresolvedEntityLeads`;
- `capture-source-envelope-v1` binds source record, revision, class, and policy-result
  identity;
- `capture-source-policy-result-v1` records the code-owned evidence/context/exclusion
  decision before capture;
- `accepted-observation-record-v1` preserves generic source-policy binding and distinct
  unresolved leads instead of collapsing acceptance back to chat-only identity.

These are contract artifacts only. No production producer or consumer is authorized by
their existence.

## 9. Required Proof Before Implementation Closure

1. Every required benchmark scenario maps to one or more frozen actions without
   lifecycle inference.
2. The Lyra prior/current-state example can nominate `CORRECTED`, `REVISED`,
   `REQUESTED_PRESERVATION`, and `PRESERVED_AS_HISTORICAL` without activating memory.
3. Every new canonical track maps to one governance policy family.
4. Every legacy hint maps deterministically or remains without a canonical track.
5. Two unresolved referenced people remain two leads rather than one `UNKNOWN` entity.
6. A model-created entity handle refuses.
7. System-classified character speech remains a canonical chat message with canonical
   speaker metadata.
8. A managed summary cannot verify its antecedent claims.
9. A context-only source cannot satisfy a claim span.
10. A missing or stale source-policy result prevents capture acceptance.
11. Restart/replay preserves vocabulary version, source policy, unresolved leads, and
    mappings unchanged.

## 10. Stop Boundary

This contract does not authorize entity creation, entity merging, source scanning,
source-policy administration, prompt changes, model execution, track resolution,
proposal admission, historical migration, or production schema wiring.

## 11. Status

The v1 action, track, entity-lead, source-class, and source-policy vocabularies are
**ENTERED**. Implementation and benchmark proof remain open.
