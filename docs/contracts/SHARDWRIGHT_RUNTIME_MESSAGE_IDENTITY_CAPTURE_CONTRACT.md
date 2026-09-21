# Shardwright Runtime Message Identity Capture Contract

**Version:** 0.1.0
**Status:** PROVEN — runtime source capture, persistence rollback, generation ordering, and live refusal-boundary proof are complete; approved prompt injection remains governed separately.

## 1. Purpose and boundary

This contract governs the narrow gap between a host message becoming the source
of a generation and that message having a durable Shardwright message identity.
The identity is required for request-bound transcript recall and for later
source reconciliation. This contract does not authorize retrieval, reranking,
prompt injection, semantic interpretation, or character-identity inference.

## 2. Authority and ownership

The host owns the live chat array and its ordinary save lifecycle. Shardwright
owns only the namespaced `extra.shardwright.messageIdentity` marker it writes
through an authenticated host persistence primitive. The authoritative
transcript ledgers and SQLite projection remain server-owned as specified by the
Transcript Index and Incremental Projection contracts; a runtime marker is
custody evidence, not an authority record by itself.

The host adapter MUST receive the active generation context directly from the
host. It MUST NOT derive identity from a display name, filename, chat title,
array position, timestamp, content similarity, or model output.

## 3. Identity shape

The capture marker uses the existing message-identity schema:

```text
schemaVersion
messageId
initFingerprint
revisionHash
```

`messageId` is an opaque `msg_` identifier minted once when no valid marker is
present. `initFingerprint` and `revisionHash` are computed from the observed
message and its resolved speaker identity by the existing message-identity
core. A capture that cannot establish the complete required marker remains
`UNRESOLVED`; it MUST NOT substitute a weaker identity.

## 4. Capture timing

### 4.1 Source message before generation

For an eligible generation, the host adapter MUST synchronously identify the
host's actual source/query message before Shardwright begins asynchronous
retrieval or planning. If that message lacks a valid `messageId`, Shardwright
MAY mint and attach the opaque ID through the host writer, then MUST complete
the marker computation and persistence step before exposing the invocation as
eligible to the recall planner.

The captured invocation freezes the resulting `messageId`, character binding,
chat identity, generation identity, and query text. Later ambient host changes
MUST NOT alter that invocation.

### 4.2 Generated output after dispatch

The newly generated host message is reconciled through the existing ordinary
message-identity lifecycle after the provider returns. This is a separate
message event and MUST NOT be used to retroactively change the source identity
of the generation that produced it.

## 5. Persistence and transaction behavior

Capture MUST use the host's supported extension-field/chat save primitive and
MUST preserve unrelated `extra` fields. A successful source capture is not
eligible for recall until the host write reports success or the host provides an
equivalent verified in-memory persistence receipt.

If the host write fails, is unavailable, or cannot be verified, the invocation
returns an explicit refusal such as `MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE`.
Ordinary generation may continue only according to the host failure policy; no
recall planning or injection may proceed from an unpersisted identity.

Repeated capture of the same valid marker is idempotent. Existing valid
`messageId` values MUST NOT be replaced merely because the message text,
selected swipe, or display fields changed; those changes produce a new
`revisionHash` under the existing reconciliation rules.

## 6. Reconciliation, deletion, and branches

Capture MUST reuse the existing `reconcileMessageIdentityState` and deletion
tombstone lifecycle for fingerprints, revision hashes, duplicate detection,
visibility, and source-local gaps. It MUST NOT repair a conflicting or duplicate
marker by selecting a winner. Such conflicts remain `AMBIGUOUS` or
`UNRESOLVED` for operator review.

Branch and checkpoint records retain independent occurrence identity. A newly
captured marker does not establish parentage, deduplication, or shared access;
those decisions remain governed by the Branch Lineage and Deduplication
contract.

## 7. Failure states

The adapter exposes at least these distinguishable outcomes:

```text
CAPTURED                  complete marker persisted and invocation eligible
ALREADY_IDENTIFIED        existing valid marker reused idempotently
NOT_APPLICABLE             excluded or dry-run generation
MESSAGE_UNAVAILABLE       no lawful source message is exposed by the host
MESSAGE_IDENTITY_AMBIGUOUS conflicting marker or duplicate identity
MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE host write/verification failed
MESSAGE_IDENTITY_RECONCILIATION_FAILED fingerprint or revision computation failed
```

`MESSAGE_UNAVAILABLE`, `MESSAGE_IDENTITY_AMBIGUOUS`, and persistence or
reconciliation failures MUST remain visible diagnostics. They MUST NOT be
collapsed into `NOT_APPLICABLE`, and MUST NOT trigger inference or automatic
retry with a different identity.

## 8. Required proof

The implementation slice MUST prove:

1. a new eligible source message receives one opaque marker through the host
   writer before recall planning;
2. a repeated eligible generation reuses that marker without replacement;
3. the persisted marker contains valid fingerprint and revision custody;
4. host-write failure, missing source message, and conflicting markers refuse
   without planning or prompt mutation;
5. the generated assistant message is reconciled separately after dispatch;
6. existing deletion, visibility, and branch ledgers remain unchanged; and
7. a live browser generation reaches planning with a nonempty frozen
   `sourceMessageId` and records either an explicit refusal or an approved
   dispatch snapshot.

## 9. Explicit non-scope

This contract does not authorize automatic character association, source
registration, transcript intake, cross-instance reconciliation, candidate
selection, reranking, sufficiency decisions, prompt injection, or changes to
SillyTavern's canonical message schema. Host integration changes remain limited
to the existing extension-field/chat persistence seam and the generation
invocation boundary.

## 10. Status

The runtime identity-capture boundary is **PROVEN** by
`node --test core/transcript/runtime-message-identity-capture.test.mjs`
(5/5), the adjacent generation-boundary and host-resolver proof (6/6), the
host syntax check, and the 2026-09-19 browser observation in which
the source marker `msg_b40a59af35c14ca9b48aa03c7ec15cbc` was persisted, reused
by the frozen generation invocation, and carried into an explicit
`INSUFFICIENT_EVIDENCE` planning refusal. The live provider path remained
unchanged; approved bundle injection remains governed by the Host Recall
Dispatch Composition contract.
