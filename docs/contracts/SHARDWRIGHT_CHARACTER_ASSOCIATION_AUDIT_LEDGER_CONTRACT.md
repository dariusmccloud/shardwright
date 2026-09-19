# Shardwright Character Association Audit Ledger Contract

**Version:** 0.3.0
**Status:** ENTERED — ledger, authenticated route, client transport, and review UI are governed; two-phase marker/audit outcomes are specified.
**Classification:** Host roundtrip identity and operator-audit track; not character or memory authority.

## 1. Purpose

Character-card markers provide portable custody evidence, but an operator
association decision must survive restart and remain inspectable. This contract
defines the durable audit record without making the audit ledger authoritative
for character identity or memory content.

## 2. Authority and ownership

- The server-owned append-only association-audit ledger is authoritative for
  **what decision the operator recorded**, not for whether the decision is true.
- The character-binding ledger remains authoritative for
  `bindingToken -> characterInstanceId`.
- Card markers remain custody evidence and a portable lookup aid.
- SQLite and UI views are rebuildable projections only.
- The server plugin owns append, validation, idempotency, replay, and read-back.
- The Shardwright review UI owns only explicit operator input and presentation;
  it may not infer identity or bypass the server transport.

## 3. Event shape

Each JSONL event MUST contain exactly:

```json
{
  "schemaVersion": 1,
  "eventType": "CHARACTER_ASSOCIATION_DECISION",
  "eventId": "opaque unique event id",
  "idempotencyKey": "operator action id",
  "characterSelector": { "hostCharacterId": "opaque structured host id" },
  "decision": "ADOPT_EXISTING | CREATE_NEW | LEAVE_UNRESOLVED | RESET_MARKER",
  "cardMarkerBefore": null,
  "targetCharacterInstanceId": null,
  "basis": "operator-supplied explanation",
  "recordedAt": "RFC3339 timestamp",
  "eventHash": "sha256:..."
}
```

`hostCharacterId` MUST be a structured, trustworthy host identifier. The host
adapter uses the persisted card `copyUuid` (`shardwright-card:<copyUuid>`), not
the volatile character-list index. Display
names, avatar filenames, chat titles, and filesystem paths are not valid
selectors. The ledger records the operator's declared basis; it does not treat
that basis as independent evidence.

## 4. Append and idempotency

- Writes require authenticated local-plugin transport and a valid event shape.
- The server MUST acquire the ledger's exclusive append guard and durably flush
  the complete line before acknowledging success.
- Repeating an `idempotencyKey` with the same canonical event payload returns the
  original event without a second append.
- Repeating it with different immutable content refuses with
  `ASSOCIATION_AUDIT_IDEMPOTENCY_COLLISION`.
- Invalid, unauthenticated, or ambiguous events refuse without creating a file
  or mutating neighboring ledgers.

## 5. Custody and interpretation

The audit event records an operator action, not a semantic truth claim. It MUST
not silently merge character identities, rewrite historical messages, or alter
memory authority. `LEAVE_UNRESOLVED` records deliberate non-resolution;
`RESET_MARKER` records marker removal when the host supports an explicit clear
primitive. A missing or unavailable host clear primitive remains refused.

## 5.1 Marker/audit transaction outcome

Card-marker and server-audit writes are separate systems. The host MUST expose
`APPLIED_AND_AUDITED`, `MARKER_APPLIED_AUDIT_PENDING`, or
`REFUSED_NOT_APPLIED`; an audit refusal after a successful marker write MUST
never be reported as completed success.

## 6. Read-back and failure behavior

The server MUST expose a read-back surface that validates hashes and monotonic
event order. Malformed or hash-mismatched entries refuse replay and quarantine
the audit ledger; the last verified prefix remains available for diagnostics.
Partial writes MUST NOT be silently repaired or interpreted as decisions.

## 7. Required proof

Implementation may close only after proving:

1. one valid decision appends and survives a fresh-process read-back;
2. the same idempotency key and same canonical event returns the original with
   no second append;
3. the same key with changed immutable content refuses without append;
4. invalid/ambiguous selectors refuse without ledger creation or mutation; and
5. neighboring authority ledgers remain byte-identical throughout the proof.
6. the review UI presents explicit candidate choices, records the selected
   operator action through the authenticated transport, and preserves the
   ledger's refusal/outcome distinction without mutating identity authority.

The ledger module proof is currently `4/4` via
`node --test tools/server-plugin/shardwright-memory/character-association-audit.test.mjs`
(2026-09-12): append/read-back, idempotent replay, collision refusal, and
invalid-selector isolation. Authenticated route transport proof is separately
`2/2` via `node --test tools/server-plugin/shardwright-memory/character-association-audit-route.test.mjs`
(2026-09-12): append/read-back and collision propagation through the existing
authenticated user-root route boundary.

Client transport proof is separately `2/2` via
`node --test core/transcript/character-association-audit-transport.test.mjs`
(2026-09-12): CSRF-aware append acknowledgement and explicit transport refusal.

Review-UI roundtrip proof (2026-09-14) also passed: the modal presented the
explicit candidate identities, accepted an operator-supplied basis, and the
`Leave unresolved` action returned `UNRESOLVED: OPERATOR_LEFT_UNRESOLVED`.
The action recorded an outcome without changing identity authority.

## 8. Explicit non-scope

This contract does not authorize automatic similarity matching, duplicate hooks,
identity merge authority, memory mutation, or retrieval. The review UI is
authorized only as the explicit, fail-closed operator surface described above;
it remains a projection and cannot establish truth or silently merge identities.
