# Shardwright Character Identity Marker and Duplicate Contract

**Version:** 0.3.0
**Status:** ENTERED — bounded marker policy and explicit host persistence adapter proven; operator UI and server audit route remain separate.

## Purpose and authority

Shardwright needs a roundtrip tether that survives host filename and display-name
changes without allowing duplicated card metadata to merge character continuity.
The server character-binding ledger remains authoritative for
`bindingToken -> characterInstanceId`. A card marker is custody evidence and a
portable lookup aid, never authority by itself.

## Marker

The Shardwright namespace stores a versioned marker containing:

- `characterInstanceId`: the active opaque continuity identity;
- `copyUuid`: the physical-card copy identifier; and
- optional `copiedFromCharacterInstanceId`: explicit duplication lineage.

`characterInstanceId` is the logical continuity identity. A duplicate receives a
new `characterInstanceId`; it MUST NOT inherit the source's active identity unless
an operator later records an explicit same-identity decision. `copyUuid` identifies
one card incarnation and may legitimately differ across servers or card versions.

## Collision and refusal rules

- Missing or malformed markers remain `UNRESOLVED`.
- Two cards sharing the same `(characterInstanceId, copyUuid)` pair refuse as
  `DUPLICATE_MARKER_COLLISION`.
- A known `characterInstanceId` with missing `copyUuid` enters review rather than
  becoming a new identity automatically.
- Two cards sharing `characterInstanceId` with different `copyUuid` values enter
  operator review; they may be legitimate card incarnations or an accidental copy.
- A failed duplicate write leaves the copied marker detectable and unresolved;
  no filename, title, avatar, or similarity fallback is permitted.
- An operator may later record an explicit same-identity rebind or new-identity
  decision through the server ledger. The decision must include an operator action,
  basis, timestamp, and selected target; this contract does not authorize that UI or
  ledger route.

## Proof boundary

The marker decision layer is `PROVEN` by
`node --test core/transcript/character-identity-marker.test.mjs` on 2026-09-11
(5/5): fresh duplicate identity plus lineage, malformed-marker refusal,
duplicate/shared-identity review, stripped-marker review, and auditable operator
decision creation. The SillyTavern write hook, card/chat roundtrip, and operator
decision UI remain separate slices.

The host persistence adapter is separately proven by
`node --test core/transcript/character-identity-association.test.mjs`
(2/2, 2026-09-12): explicit existing-identity association and new-marker
creation call the injected host extension writer and audit callback; unresolved
and reset decisions remain explicit, and missing association targets refuse.
The adapter does not infer identity, provide UI, or claim durable audit storage
without a supplied audit owner.

The SillyTavern host capability wiring is proven by
`node --test core/transcript/host-character-identity-association.test.mjs`
(2/2, 2026-09-12): the active host character index is bound to the supported
extension-field writer, while missing host primitives fail closed. The current
runtime audit callback is intentionally diagnostic-only pending a durable audit
owner.
