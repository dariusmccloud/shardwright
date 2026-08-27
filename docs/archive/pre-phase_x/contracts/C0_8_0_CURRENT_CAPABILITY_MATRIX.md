# C0.8.0 Current Capability Matrix

Last updated: 2026-07-13

Status: authoritative release-planning baseline

## Purpose

This matrix is the current source for shipped capability posture and remaining `v1.0` gates.

Earlier briefs and closeout reports remain authoritative for their historical proof and jurisdiction. Where an older capability classification conflicts with this matrix, this matrix governs current release planning.

## Status Vocabulary

```text
COMPLETE
= implementation and the declared phase proof are recorded

SUPPORTED ORDINARY
= host operator path is supported without scripts or raw API knowledge

SUPPORTED ADMIN
= governed host-admin path is supported but is not an ordinary daily action

DEVELOPER/PROOF ONLY
= mechanism exists but requires scripts, raw routes, fixtures, or source-level tooling

PARTIAL
= a bounded portion is proven and the remaining portion is named

RELEASE GATE
= must close or receive an explicit documented-limitation decision before v1.0

DEFERRED
= intentionally outside v1.0 scope

UNSUPPORTED
= not authorized and must fail closed or remain unavailable
```

## Completed Governing Phases

| Phase | Current status | Proven boundary |
|---|---|---|
| C0.5A–C0.5C | COMPLETE | isolated deterministic reconstruction and candidate validation |
| C0.6.1–C0.6.4-5 | COMPLETE | governed interpretive candidate, review, subject disposition, publication, and standard policy bootstrap |
| C0.6.5 | COMPLETE | persisted readable evidence findings, exact bindings, replay, truthful legacy fallback |
| C0.6.6 | COMPLETE | operator flow and revision ergonomics at its declared boundary |
| C0.6.7 | COMPLETE | upgrade, replay, restart, recovery substrate, and packaged parity at its recorded boundary |
| C0.6.8 | PARTIAL | proposal-generation portion superseded and proven by C0.6.9; direct source navigation remains open |
| C0.6.9 | COMPLETE | semantic generation, deterministic rendering, saved-shard handoff, exact Review opening or truthful refusal, portable replay |
| C0.75 | COMPLETE | manual structural promotion, atomic transition, recovery, and rollback |

## Supported Ordinary Operator Flows

| Capability | Status | Governing evidence | Current limitation |
|---|---|---|---|
| Basic Summary and Narrative Sharder operation | SUPPORTED ORDINARY | existing production paths and host smoke posture | upstream provider transport resets may require the bounded identical retry |
| Architectural semantic generation and canonical save | SUPPORTED ORDINARY | C0.6.9 completion matrix | malformed or unlawful responses refuse; bounded retry does not guarantee provider success |
| Saved Architectural shard to governed proposal | PARTIAL / EXPLICITLY LIMITED | C0.6.9 save-to-proposal success/refusal proof | current role/relationship-oriented admission does not implement the approved subject-scoped proposal tracks, acknowledgment/stability rules, provisional handling, or governance-conflict validation in C0.8.0D.1B |
| Exact admitted proposal opens in Review | SUPPORTED ORDINARY | C0.6.9 orchestration proof | refusal correctly leaves Review closed |
| Interpretive review queue and participant dispositions | SUPPORTED ORDINARY | C0.6.3 and later publication closeout proofs | governed identity/delegation rules still apply |
| Subject decision and approve-with-edit child revision | SUPPORTED ORDINARY | C0.6.2/C0.6.3 proof | no authority is published merely by review completion |
| Persisted readable evidence findings | SUPPORTED ORDINARY | C0.6.5 completion report | legacy candidates may truthfully report findings unavailable |
| Standard policy bootstrap and publication | SUPPORTED ORDINARY | C0.6.4-5/C0.6.7 proof | full custom publication-policy administration is deferred |
| Successor revision, replacement, withdrawal, history | SUPPORTED ORDINARY | C0.6.7 closeout and host smoke | current lifecycle law remains controlling |

## Supported Admin And Developer/Proof Flows

| Capability | Current class | Evidence | Release disposition |
|---|---|---|---|
| Ledger replay and projection rebuild | DEVELOPER/PROOF ONLY | C0.5/C0.6.7 replay routes, scripts, and tests | RELEASE GATE for no-script operations selected as supported admin flows |
| Integrity and recovery reports | DEVELOPER/PROOF ONLY | existing server-plugin services and proof harnesses | RELEASE GATE for productized supported admin access |
| Structural qualification, manual promotion, recovery, rollback | DEVELOPER/PROOF ONLY | C0.75 completion and host proof | authority is complete; supported no-script admin surface remains a C0.8.0E decision/gate |
| Packaged Node/Bun semantic checks | DEVELOPER/PROOF ONLY | package tests | existing narrow proofs stand; comprehensive duplicate ST/SB scenarios are pre-final test planning, not implied complete |
| Seed/reset smoke workflows | DEVELOPER/PROOF ONLY | seed and reset scripts | may not be represented as ordinary product setup |
| Raw API payload construction and fixture injection | DEVELOPER/PROOF ONLY | test/proof routes | not a supported operator workflow |

## Open Release Gates

| Gate | Observed current state | Required closeout |
|---|---|---|
| Architectural RAG discovery projection | supported: persisted-source admission, profile-isolated rebuild/index, discovery-only retrieval, stale/mixed-source exclusion, labelled prompt evidence, explicit degradation diagnostics, truthful UI posture, and equivalent SillyTavern/SillyBunny production proof; warm archive remains unavailable | preserve the C0.8.0C.1 no-authority-effect boundary through release-candidate regression proof |
| Operator proposal intake and inspectable evidence | save-driven single-shard handoff exists; operator-requested multi-source intake and subject-scoped eligibility/consent are not implemented; inspectable-evidence implementation is pending full host proof | C0.8.0D.1 unified intake and clarity, C0.8.0D.1A evidence envelope, and C0.8.0D.1B subject-scoped governance proof |
| Exact source navigation | canonical bindings exist; direct resolvers are not closed | C0.8.0D exact navigation or explicit documented limitation |
| No-script supported admin recovery | mechanisms exist behind routes/scripts/harnesses | C0.8.0E classification and controls for required supported admin operations |
| Final capability freeze | C0.6.7D is historical and predates C0.6.9/C0.75 closeout | C0.8.0F final UI-to-capability reconciliation |
| Release artifact | manifest is `0.9`; no verified v1.0 tag/release exists | C0.8.0G version, package, install/upgrade proof, tag, artifacts, checksums, release decision |

## Partial Or Explicitly Limited Capabilities

| Capability | Lawful current posture |
|---|---|
| Historical evidence findings | old candidates remain readable and non-destructive with explicit `UNAVAILABLE`; perfect backfill is not claimed |
| Source references | exact bindings and current-chat message navigation exist at proven boundaries; a binding or debug-row link is not a substitute for operator-inspectable evidence |
| Recovery tooling | recovery authority and mechanisms are proven; ordinary no-script admin access is not yet supported |
| Bun/SillyBunny parity | recorded package and host proofs remain valid only at their named boundaries; comprehensive duplicate host coverage is not claimed |
| Provider compatibility | C0.8.0B classifies the captured failures as upstream `502` / `ECONNRESET`, recovered by one byte-identical retry; every provider/model dialect and transport behavior is not guaranteed |

## Deferred Side Objectives

The following remain outside the release phase unless explicitly promoted:

1. whole-chat archive,
2. destructive-delete enhancements beyond current guarantees,
3. proposal-retirement UX,
4. help drawer or generalized README UI,
5. actor-aware defaults,
6. chat-hygiene tooling,
7. highlight and toast polish,
8. full custom publication-policy administration,
9. model-selected memory nomination,
10. model-governed proposal action,
11. generalized source-viewer redesign beyond exact release navigation resolvers.

## Unsupported Or Fail-Closed Capabilities

1. automatic structural promotion,
2. startup candidate auto-adoption,
3. candidate-to-live fallback reads,
4. model-authorized structural promotion,
5. interpretive publication through structural-promotion routes,
6. browser-authored evidence meaning,
7. publication during proposal generation,
8. silent recovery from ambiguous authority,
9. Architectural RAG admission that lacks the C0.8.0C.1 identity, provenance, isolation, and no-authority-effect contract.

## Current Release Position

```text
C0.8.0A reconciliation baseline                    COMPLETE
stale grounding assertion maintenance              COMPLETE
C0.8.0B transport diagnostic                       COMPLETE
C0.8.0C retrieval isolation safety baseline        COMPLETE
C0.8.0C.1 RAG contract reconciliation              COMPLETE
C0.8.0C.2 admission and index schema               COMPLETE
C0.8.0C.3 retrieval semantics                      COMPLETE
C0.8.0C.4 packaged-host proof and UI posture       COMPLETE
C0.8.0D evidence navigation                        NEXT BOUNDED GATE
C0.8.0E admin recovery controls                     NOT STARTED
C0.8.0F final capability freeze                    NOT STARTED
C0.8.0G release cut                                NOT STARTED
v1.0 artifact                                      NOT CUT
```

## Governing Rule

No row becomes supported because implementation exists nearby. A status changes only through its named proof and an updated authoritative matrix.
