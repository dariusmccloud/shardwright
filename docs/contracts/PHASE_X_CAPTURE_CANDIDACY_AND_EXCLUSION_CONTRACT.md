# Phase X: Capture Candidacy And Exclusion Contract

**Version:** 0.1.0
**Status:** ENTERED — the candidacy test and exclusion boundary are normative;
benchmark corpus, fixtures, and thresholds remain open.
**Parent:** `RFC_DISCOVERY_CAPTURE_OBSERVATION.md`
**Semantic spine:** `PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md`

## 0. Provenance

This contract formalizes the capture-worthiness reasoning from the original Phase X
design dialogue (`docs/Phase_X-Origin.md`), which was reconstructed and reviewed
2026-08-28 after discovering it had never been carried into a governing contract. The
positive criteria, the short-form test, and the exclusion list below are drawn directly
from that source, not newly invented.

## 1. Problem

`RFC_DISCOVERY_CAPTURE_OBSERVATION.md` defines how a nomination becomes an exact,
auditable accepted observation once the model decides to nominate something. It does not
define *whether a given piece of source material is worth nominating at all* beyond the
general instruction that ordinary conversation should lawfully produce `NO_OBSERVATIONS`
(`CAP-ZERO-001`).

Without an explicit, closed candidacy test:

- different capture runs, models, or benchmark passes could apply inconsistent,
  undocumented judgment about what counts as "durable enough";
- capture could drift toward nominating conversation volume (memory exhaust), the
  exact failure `CAP-ZERO-001` already names as adversarial;
- capture could just as easily under-nominate, silently missing durable material because
  no positive test told it what to look for;
- the "what should this system even remember" reasoning that motivated Phase X in the
  first place would exist only in an unversioned origin document, not in anything an
  implementation or benchmark can be held to.

## 2. Authority Gate

### Governing contracts

- `RFC_DISCOVERY_CAPTURE_OBSERVATION.md` governs source-local nomination, exact spans,
  and the existing `CAP-ZERO-001` zero-result boundary that this contract refines.
- `PHASE_X_CAPTURE_VOCABULARY_AND_SOURCE_POLICY_CONTRACT.md` governs the closed action
  vocabulary a nomination uses once it exists. This contract governs whether a nomination
  exists in the first place; it does not add, remove, or reinterpret any action label.
- `PHASE_X_MEMORY_FORMATION_OPERATIONAL_MODEL.md` governs that capture must remain
  broad and reversible while authority remains narrow and governed. This contract
  operates entirely on the broad, reversible side of that boundary.

### Authoritative sources

A candidacy match makes source material *eligible to be nominated*. It is not evidence,
not an accepted observation, not a proposal, and not memory authority. A nomination that
matches a candidacy criterion still must pass every existing exact-span, claim-support,
schema, and idempotency gate in `RFC_DISCOVERY_CAPTURE_OBSERVATION.md` before it becomes
an accepted observation, and still must pass the full existing evidence and governance
pipeline before it can become governed memory.

### Projection boundary

Criterion match count, model confidence, and any salience-sounding label produced during
candidacy evaluation are projections. They do not establish durability, authority,
governance outcome, or retrieval salience (`LOW`/`STANDARD`/`HIGH`, governed elsewhere
by the Active Continuity Assembly and Precedence Contract — a different, later-stage
concept that this contract does not define or touch).

### Lifecycle owner

This contract does not create new lifecycle. It narrows and gives positive shape to the
existing `CAP-ZERO-001` boundary the capture model already operates under. Code
ownership, model jurisdiction, and observation acceptance remain exactly as defined in
`RFC_DISCOVERY_CAPTURE_OBSERVATION.md` Section 2.

### Failure behavior

- Source material matching no candidacy criterion and no exclusion carve-out produces a
  lawful `NO_OBSERVATIONS` result, exactly as already permitted by `CAP-ZERO-001`.
- Source material matching a candidacy criterion still proceeds through the unmodified
  existing acceptance pipeline; a criterion match never itself accepts, admits, or
  activates anything.
- Explicit subject-raised requests and operator continuity holds are not gated by this
  contract at all — see Section 6.

## 3. The Candidacy Test

The governing question capture must ask about a piece of source material is not:

> Was this conversation important?

It is:

> Did this establish, change, reinforce, contradict, contextualize, or conclude
> something that future continuity would become meaningfully worse without?

Short form:

```text
Capture change-bearing events and meaning-bearing recurrence.
Do not capture conversation volume.
```

A candidacy match exists when the source material satisfies at least one criterion in
Section 4 and is not fully covered by Section 5's exclusion list. Sections 4 and 5 are
not mutually exclusive by content alone — material may contain incidental detail (Section
5) alongside a genuinely qualifying development (Section 4). The test applies to the
qualifying material, not to the surrounding prose that carried it.

## 4. Positive Candidacy Criteria

The closed v1 candidacy criterion vocabulary is:

| Criterion | Source-local meaning |
| --- | --- |
| `STATE_CHANGE` | Someone changed their identity, position, preference, boundary, capability, relationship, goal, or understanding |
| `DURABLE_COMMITMENT` | A promise, decision, agreement, architectural choice, rule, or intended future direction was established |
| `PIVOTAL_EVENT` | Something happened that materially affected later behavior, meaning, or relationship structure |
| `ORIGIN_EVENT` | A later-important concept, motif, relationship, goal, or practice began here |
| `MEANING_CHANGE` | An existing subject acquired a new meaning, lost an old meaning, or came to mean different things to different people |
| `CORRECTION_OR_CONTRADICTION` | Prior understanding was rejected, narrowed, corrected, or superseded |
| `RECURRING_PATTERN` | Multiple events establish a pattern that no individual event proves by itself |
| `SYMBOLIC_CONTINUITY` | An image, place, object, phrase, ritual, or metaphor recurs and becomes meaning-bearing |
| `OUTCOME` | An experiment, effort, conflict, plan, or trial succeeded, failed, or produced an unexpected lesson |
| `EXPLICIT_IMPORTANCE` | A participant directly states that something should be remembered, preserved, or understood as part of their history |

### Criterion rules

- A capture nomination MAY cite one or more matched criteria as its rationale for
  existing, using this closed vocabulary only.
- Matching a criterion makes source material a lawful nomination candidate. It does not
  by itself supply exact spans, claim support, actor/subject resolution, action
  labeling, or durability signal — those remain governed entirely by
  `RFC_DISCOVERY_CAPTURE_OBSERVATION.md` and the Capture Vocabulary contract.
- `SYMBOLIC_CONTINUITY` and `RECURRING_PATTERN` require the recurrence itself to be
  source-supported; a single occurrence cannot satisfy them (this is the same
  requirement the Parent Architecture Contract's `SHE-MOT-001` already imposes on motif
  sheets downstream — this contract's job is only to keep a single occurrence from
  triggering a nomination in the first place under these two criteria specifically).
- `EXPLICIT_IMPORTANCE` describes ordinary conversational emphasis (someone saying
  something like "I want that noted" in passing). It is distinct from, and weaker than,
  the Operational Model's `REQUESTED_MEMORY_CONSIDERATION` self-raising route, which
  deterministically bypasses this entire contract — see Section 6.
- New criteria require a versioned successor to this contract with explicit mapping.
  Free-form or nearest-criterion invention is prohibited, matching the discipline
  `VOC-ACT-001` already applies to the action vocabulary.

## 5. Exclusion List

The following ordinarily should not, by themselves, drive a capture nomination:

- scene decoration that never becomes consequential;
- transient emotion without later effect;
- repeated statements that add no stability or change;
- every physical action;
- generic affection or conflict;
- model-generated poetic language treated as fact;
- interpretations no participant affirmed and no recurring pattern supports;
- a summary's claims without antecedent evidence;
- every conversational topic;
- every retrieved similarity;
- speculative symbolism from one occurrence.

This list narrows candidacy; it does not delete anything. Excluded material remains
ordinary searchable source material. It may still become eligible evidence later — for
example if a participant explicitly raises it (Section 6), if it recurs enough to satisfy
`RECURRING_PATTERN` or `SYMBOLIC_CONTINUITY` on its own terms, or if a later exchange
gives it retroactive weight under `MEANING_CHANGE` or `ORIGIN_EVENT`. This contract only
governs the *default* nomination behavior for material that, on its own, is exclusion-list
material and nothing more.

## 6. Relationship To Explicit Subject Intent And Operator Holds

This contract governs ordinary automatic capture only. It does not govern, narrow, or
gate:

- a subject's explicit memory-consideration request (`REQUESTED_MEMORY_CONSIDERATION`),
  which the Operational Model already establishes as deterministically bypassing capture
  confidence thresholds entirely — this contract's candidacy test is exactly the kind of
  threshold that request bypasses;
- an operator continuity hold (`Keep for Continuity`), which the Operational Model
  already establishes as requiring no significance test at all.

A candidacy criterion match or non-match is irrelevant to either route. This contract
must not be read, implemented, or benchmarked in a way that makes automatic candidacy
evaluation a precondition for a subject's or operator's explicit action.

## 7. Normative Requirements

### CAND-TEST-001 — Closed positive criteria

A capture nomination's stated candidacy rationale, when supplied, MUST use one or more
criteria from Section 4's closed vocabulary. Free-form rationale text is prohibited.

### CAND-TEST-002 — Criterion match is necessary for ordinary nomination, not sufficient for anything downstream

Source material with no candidacy criterion match and no applicable Section 6 route MUST
NOT produce a capture nomination. A criterion match MUST NOT itself establish evidence,
authority, durability, governance outcome, or activation — those remain governed
entirely by the existing discovery, evidence, and governance contracts.

### CAND-EXC-001 — Exclusion list narrows default nomination only

Section 5 material MUST NOT drive an ordinary automatic nomination by itself. Exclusion
MUST NOT delete, hide, or block later re-evaluation of the same source material under a
matched criterion, an explicit subject request, or an operator continuity hold.

### CAND-EXC-002 — Explicit routes are ungated

Implementation MUST NOT apply this contract's candidacy test to a subject-raised
`REQUESTED_MEMORY_CONSIDERATION` action or an operator continuity hold. Those routes are
governed exclusively by the Operational Model.

### CAND-VOC-001 — Closed criterion vocabulary

New candidacy criteria require a versioned successor to this contract with explicit
mapping and benchmark fixtures. Nearest-criterion invention or silent criterion
redefinition is prohibited.

### CAND-ZERO-001 — Reconciled with the existing zero-result boundary

This contract narrows `CAP-ZERO-001`'s "valid zero result" boundary with positive
criteria; it does not relax, replace, or contradict it. A capture result remains lawfully
`NO_OBSERVATIONS` whenever no criterion is matched and no Section 6 route applies.

## 8. Required Proof Before Implementation Closure

1. Each of the ten Section 4 criteria has at least one benchmark fixture demonstrating a
   correct nomination and at least one adversarial fixture demonstrating correct
   non-nomination for near-miss material.
2. Ordinary conversation matching no criterion and no exclusion carve-out produces
   `NO_OBSERVATIONS`.
3. Section 5 exclusion-list material alone (no criterion match) does not produce a
   nomination.
4. A single occurrence cannot satisfy `RECURRING_PATTERN` or `SYMBOLIC_CONTINUITY`;
   a benchmark fixture demonstrates the second qualifying occurrence is what enables
   nomination, not the first.
5. A subject-raised `REQUESTED_MEMORY_CONSIDERATION` action produces a durable request
   record regardless of candidacy criterion match, per Section 6.
6. An operator continuity hold succeeds regardless of candidacy criterion match, per
   Section 6.
7. A criterion match alone, with no valid exact span or claim support, still fails
   `RFC_DISCOVERY_CAPTURE_OBSERVATION.md`'s existing acceptance gates — candidacy does
   not bypass evidence.
8. Restart/replay preserves candidacy contract version and criterion vocabulary
   unchanged.

## 9. Stop Boundary

This contract does not authorize model prompt changes, a benchmark corpus, fixture
authoring, threshold tuning, production capture implementation, or any change to the
existing action vocabulary, source-policy, batching, or governance contracts.

## 10. Status

The candidacy test, the ten positive criteria, the exclusion list, and their
reconciliation with `CAP-ZERO-001` and the Operational Model's explicit-intent routes are
**ENTERED**. Benchmark corpus, fixtures, and implementation proof remain open.
