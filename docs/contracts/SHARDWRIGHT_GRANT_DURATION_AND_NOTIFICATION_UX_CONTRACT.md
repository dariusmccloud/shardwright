# Shardwright Grant Duration and Notification UX Contract

**Version:** 0.1.0
**Status:** ENTERED — governing duration and notification-policy boundary; implementation requires separately declared slices.

## 1. Purpose and relationship

This contract governs the time semantics and human-facing notifications of
grants defined by the [Memory Sharing and Grant Contract](SHARDWRIGHT_MEMORY_SHARING_AND_GRANT_CONTRACT.md).
It does not create grant authority, select recipients, resolve identity, or
implement a grant ledger or user interface.

The sharing contract remains authoritative for custody scope, consent, immutable
anchors, revocation, and non-transitive access. This contract supplies the
duration and notification rules that those grants must obey.

## 2. Duration vocabulary

- **Default duration** is the duration proposed when an operator chooses a
  timed grant and has not entered a different permitted duration.
- **Maximum duration** is the hard upper bound for the grant's effective life.
- **Current expiration** is the already-recorded expiration instant of an active
  grant. It is the starting point for a deliberate extension.
- **Single access** means one atomic retrieval opportunity, not a time window.

The default is a safe starting value, not authority to issue a grant. Every
grant still requires the authority action specified by the sharing contract.

## 3. Grant duration table

| Grant type | Default duration | Maximum duration |
| --- | --- | --- |
| One-time retrieval | Single access | Single access |
| Finding-level | 8 hours | 7 days |
| Topic-level | 8 hours | 7 days |
| Time-range | 8 hours | 7 days |
| Message-level | 8 hours | 3 days |
| Full-chat | 1 hour | 24 hours |

An implementation MUST reject a duration outside the selected type's permitted
range. A one-time retrieval has no clock-based extension: once consumed, it is
closed; if it is revoked or otherwise refused before consumption, it remains
closed rather than becoming a new opportunity.

## 4. Expiration behavior

Expiration is a custody transition, not merely a display event. At expiration,
future retrieval MUST be refused or omitted according to the sharing contract's
exclusion rules. Expiration MUST NOT erase material already placed in an active
working context, and MUST NOT claim to erase knowledge already formed from it.

An expired grant is silently disregarded in ordinary human-facing operation.
Silence means no output or prompt; it does not suppress the durable audit record
of issuance, expiration, refusal, or later operator action.

## 5. Notification policy

Expiration notices are decision-based, not informational. A notice MUST present
the relevant action available to the operator and make clear that inaction is a
valid choice.

For a timed grant, the system MAY issue one pre-expiration reminder at T-1 hour.
It MUST NOT issue multiple reminders, nag the operator, escalate, or repeat the
notice after inaction. A grant with less than one hour remaining MAY omit the
reminder rather than issuing it late.

After expiration, the system MUST silently disregard the grant unless the
operator deliberately creates or authorizes a new permitted action. No automatic
renewal, escalation, or inferred consent is allowed.

Normal UI text MUST remain casual, concise, and actionable. Technical custody
details belong behind the explicit diagnostics/audit surface required by the
sharing contract.

## 6. Deliberate extension

An extension requires an explicit operator action and a durable audit record. It
begins at the grant's current expiration time, not at the time the operator
clicks the extension control. The resulting effective expiration MUST remain
within the selected grant type's maximum measured from the original grant
issuance; repeated extensions MUST NOT create a path around that maximum.

An extension MUST preserve the original immutable anchor, recipient, scope, and
grant type unless a separately governed action changes them. Changing those
fields is a new grant decision, not an extension.

## 7. Audit and failure behavior

The system MUST distinguish at least: active, expired, revoked, deliberately
excluded, refused, and unresolved authority. A notification omission or silent
expiry MUST NOT be interpreted as absence of an audit event.

Malformed duration, missing expiration, ambiguous grant type, or an extension
that would exceed the maximum MUST fail closed without changing the active grant.
The operator may then review the diagnostic record and make a new explicit
decision.

## 8. Required proof for future implementation

Any implementation slice against this contract MUST prove, at minimum:

1. each table default and maximum is accepted or refused at the boundary;
2. one-time retrieval cannot be reopened or consumed twice;
3. exactly one T-1-hour reminder is possible and inaction produces no repeat;
4. expiration silently removes ordinary access while preserving audit custody;
5. deliberate extensions begin at current expiration and cannot exceed the
   type maximum; and
6. malformed or ambiguous duration state fails closed without mutation.

Until those proofs are recorded, this contract claims policy only, not runtime
behavior.
