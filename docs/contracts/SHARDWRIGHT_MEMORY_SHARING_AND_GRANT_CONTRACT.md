# Shardwright Memory Sharing and Grant Contract

**Version:** 0.1.2
**Status:** ENTERED — governing sharing-policy boundary; implementation requires
separately declared slices.

## 1. Purpose

This contract defines custody scope, consent, grants, revocation, group sharing,
foundation propagation, and the boundary between a recipient's own derived work
and another character's private vault. It governs access policy; it does not itself
create memory authority, alter canonical transcript ledgers, or authorize retrieval
or UI implementation.

## 2. Authority and projection boundary

- Append-only Shardwright ledgers remain canonical authority for source identity,
  message custody, grants, revocations, proxy decisions, and sealed outcomes.
- SQLite and retrieval indexes remain rebuildable operational projections.
- An authored character request is an attestation input, not a durable permission.
- A durable grant exists only after an operator-recorded authority action.
- Model output MUST NOT grant itself access or create a durable grant.

## 3. Custody scopes

| Scope | Contents | Default visibility |
|---|---|---|
| `FOUNDATION` | Identity infrastructure, relationship state, governing architecture, and sealed outcomes | Every authorized instance at initialization |
| `CHARACTER_PRIVATE` | Personal conversations and private work product | Owning character only |
| `GROUP_SHARED` | Material created within, or explicitly admitted to, a group chat | Authorized group participants |
| `SHAREABLE_WORK_PRODUCT` | Private work exposed through an explicit grant | Named grant recipient only, for grant duration |

Retrieval scope MUST come from governed source metadata and explicit decisions. It
MUST NOT be inferred from active speaker, display name, similarity, filename, chat
title, or group membership alone.

## 4. Consent layers

1. **Attestation:** a character-authored request to share its material. This is
   recorded as input and does not constitute authority.
2. **Authority:** an operator-recorded grant action. This is required for every
   durable grant and records the operator, basis, target, material, and duration.

The operator's own writing is implicitly authorized by the operator's act; the
system need not prompt for permission for that act. It MUST still record relevant
custody and grant events.

Group sharing to an absent participant may use an operator proxy decision. The
proxy record MUST identify the absent participants, basis, material, and duration.

## 5. Grant anchors and types

Grant selectors MAY be human-readable, but the durable grant MUST resolve to
immutable anchors such as character instance IDs, source logical IDs, source
revision hashes, message/content hashes, or versioned finding IDs. A topic label,
display name, mutable chat ID, or path MUST NOT be the sole grant anchor.

Supported grant types are ordered from finest to broadest: one-time retrieval,
finding-level, topic-level, time-range, message-level, and full-chat. `None` is
the default; no grant type is preselected. Every timed grant has an explicit
duration and MUST NOT exceed the applicable maximum below. The governing
duration and notification details are further specified in the [Grant Duration
and Notification UX Contract](SHARDWRIGHT_GRANT_DURATION_AND_NOTIFICATION_UX_CONTRACT.md).
Full-chat grants require an additional confirmation step.

| Grant type | Default duration | Maximum duration |
| --- | --- | --- |
| One-time retrieval | Single access | Single access |
| Finding-level | 8 hours | 7 days |
| Topic-level | 8 hours | 7 days |
| Time-range | 8 hours | 7 days |
| Message-level | 8 hours | 3 days |
| Full-chat | 1 hour | 24 hours |

One-time retrieval consumption MUST be atomic and durable. A retry MUST NOT reopen
or consume the same grant twice.

## 6. Revocation and exclusion

Revocation terminates future retrieval access. It does not erase material already
placed in an active working context and does not claim to erase knowledge already
formed from it.

The retrieval projection MUST exclude revoked material for the recipient. The
ordinary human-facing result MAY be silent, but audit and diagnostics MUST preserve
the distinction between no match, unavailable source, deliberate exclusion, and
unresolved authority. Silent means non-output, never non-audit.

Either the granter or operator may revoke a timed grant before expiration. Permanent
foundation propagation is not revoked through an ordinary timed grant; correction
requires a separately governed sealed revision or supersession event.

## 7. Group source ownership

A group source has its own immutable group/source identity, participant-identity
snapshot, and per-generation active speaker. The active speaker is the generation
actor; it does not own the entire group transcript.

Group material is `GROUP_SHARED` only when admitted by the group policy or an
explicit grant. Participation alone does not grant access to a character's private
vault.

## 8. Collaboration non-transitivity

Collaboration on granted material creates new content in the recipient's own chat
history. That content is retrievable to the recipient through ordinary indexing.
It does not grant access to the originating character's private vault, and access
does not transit from A to B to C merely because B worked with A's material.

This is the least-privilege, need-to-know, agency, and sovereignty boundary.

## 9. Foundation propagation

When a ruling, amendment, or architectural decision is sealed:

1. the exact sealed record is appended to the Foundation Ledger;
2. its revision/hash and custody are preserved;
3. authorized instances receive that exact record at initialization or governed
   replay; and
4. no model-generated summary or inference substitutes for the sealed record.

The conversation that produced the sealed outcome remains in its original custody
scope. Only the admitted sealed outcome propagates as foundation material.

## 10. Human-facing and diagnostic surfaces

Normal UI surfaces MUST use clean, casual, actionable language. Technical details
such as hashes, revisions, grant IDs, exclusion reasons, and audit entries remain
behind an explicit diagnostics/audit surface that is accessible without direct
database, log, CLI, or API access. The audit surface is hidden by default; a
visible “cellar door” provides access when troubleshooting or archaeology requires
it.

Expiration notices are decision-based, not informational: they MUST present the
operator with the relevant action and permit inaction. The system MUST issue at
most one pre-expiration reminder, at T-1 hour. It MUST NOT nag, escalate, or
repeat reminders. After expiration, the grant is silently disregarded unless a
new deliberate decision is made. Any extension MUST be deliberate, begin at the
current expiration time, and remain within the grant type's maximum duration.

## 11. Required future implementation slices

This contract does not claim implementation. Separate slices are required for:

- source-scope and group registration;
- grant creation, immutable anchor resolution, and atomic one-time consumption;
- append-only grant/proxy/revocation ledgers and rebuildable projections;
- recipient-scoped exclusion checks and audit diagnostics;
- foundation-ledger initialization and deterministic replay;
- human-facing grant and diagnostics UI.

Each slice MUST preserve the authority and non-transitivity rules above and MUST
refuse or remain unresolved when required identity, scope, or grant custody is
ambiguous.
