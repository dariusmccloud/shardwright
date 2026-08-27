# C0.8.0D.1A: Inspectable Evidence Envelope And Admission Contract

**Status:** ENTERED — contract approved for the first bounded implementation slice; implementation remains open.
**Parent:** `C0_8_0D_1_OPERATOR_PROPOSAL_INTAKE_EVIDENCE_AND_CLARITY_CONTRACT.md`
**Release effect:** blocks ordinary review and publication of newly admitted candidates whose evidence cannot be inspected.

## Problem

The existing evidence model persists two necessary but incomplete products:

1. grounding links preserve frozen technical identity,
2. findings preserve human-readable evidentiary meaning.

Neither product necessarily preserves or resolves the human-readable source content that lets an operator verify the finding. A valid ID, version, or hash proves identity and integrity; it does not show what the evidence says.

Technical bindings are therefore necessary for authority and replay but insufficient for ordinary review.

## Governing Authority

- `C0.6.1` owns frozen structural-record and source-occurrence grounding identity.
- `C0.6.5` owns persisted evidence-finding meaning and forbids browser-authored evidence prose.
- `C0.6.8` owns the ordinary host proposal doorway and exact source inspection.
- `C0.6.9` owns the save-driven Architectural Sharder proposal handoff.
- `C0.8.0D.1` requires tangible evidence, plain-language lifecycle projection, and the Clarity Principle.

This contract extends the evidence envelope without redefining finding meaning, grounding authority, review authority, or publication authority.

## Authority And Lifecycle Ownership

```text
authoritative source artifact
-> server resolves exact frozen source revision
-> server creates deterministic evidence preview
-> admission binds preview to grounding link and finding
-> immutable candidate revision persists the envelope
-> Review projects the persisted envelope
```

- The original message, shard, or structural record remains source authority.
- The evidence preview is an immutable candidate-bound projection of that exact source revision.
- The interpretive admission service owns preview creation, validation, persistence, hashing, replay, and refusal.
- Review may render or reveal previews. It may not create, rewrite, summarize, repair, or rebind them.
- A child candidate revision receives its own frozen evidence envelope. It must not silently inherit mutable preview state.
- Publication consumes the already-admitted envelope and cannot repair missing evidence.

## Canonical Evidence Preview Record

Each grounding link used by a finding must map to one persisted preview record.

Minimum semantic contract:

```json
{
  "evidencePreviewId": "evprev_...",
  "interpretationRevisionId": "interprev_...",
  "groundingLinkId": "groundlink_...",
  "basisType": "SOURCE_OCCURRENCE | STRUCTURAL_RECORD",
  "sourceArtifactClass": "MESSAGE | STRUCTURAL_RECORD | SAVED_SHARD",
  "basisRef": "msg_... | decision:... | shard:...",
  "sourceRevisionIdentity": {
    "recordVersion": 3,
    "recordHash": "sha256:...",
    "chatInstanceId": "chat_...",
    "messageId": "msg_...",
    "messageRevisionHash": "sha256:...",
    "shardArtifactId": "shard_...",
    "shardRevisionHash": "sha256:..."
  },
  "sourceLabel": "Jeep - Checkpoint 1, message 270",
  "speakerLabel": "Jeep",
  "contextLabel": "Architectural memory discussion",
  "previewKind": "MESSAGE_EXCERPT | STRUCTURAL_FIELDS | SHARD_EXCERPT",
  "previewContent": {
    "text": "Exact bounded source excerpt.",
    "fields": []
  },
  "previewContentHash": "sha256:...",
  "verificationState": "VERIFIED",
  "createdAt": 0
}
```

Fields inapplicable to a source class must be absent rather than populated with placeholders. `sourceArtifactClass` describes the persisted artifact used for preview; it does not add a third grounding basis type or reopen the `C0.6.1` grounding vocabulary.

## Preview Content Rules

### Source occurrence

Persist a bounded exact excerpt from the frozen message revision, plus human speaker and chat context. The excerpt must be copied from source content, not summarized.

If the complete message is small enough for the governed bound, the preview may contain the complete message. Otherwise it must contain the exact cited region plus sufficient adjacent context to evaluate the claim.

### Structural record

Persist a deterministic projection of the frozen record fields relevant to human inspection, such as:

- decision or development statement,
- why or rationale,
- scope,
- status,
- human source/provenance label.

The projection must preserve labeled source fields. It must not synthesize a new narrative paragraph.

### Saved shard

Persist the exact bounded shard excerpt that produced the finding, including its human section label and source range. A whole saved shard may be retained as the source artifact while the preview remains bounded to the cited evidence.

### General constraints

1. Preview content is deterministic from the frozen source revision.
2. The browser never generates preview content.
3. Preview text must not be produced from assertion domains, roles, IDs, hashes, or other labels alone.
4. Preview content must be sufficient to assess the associated finding without opening diagnostics.
5. Hover may supplement evidence inspection but cannot be the only accessible inspection path.
6. Exact source opening is additive. It does not replace an inline or in-modal preview.

## Finding Binding

The existing finding record remains the persisted human-readable claim:

```text
findingId
role
summary
basisRefs
sourceLabel
domains
supportLevel
```

The envelope adds a deterministic binding from each `basisRef` to exactly one `evidencePreviewId` and grounding link.

Required invariants:

1. every finding basis ref matches one grounding link,
2. every finding basis ref matches one verified preview,
3. preview source identity equals the grounding link identity,
4. preview content hash is included in the candidate review-envelope hash,
5. no preview may be shared across candidate revisions by mutable reference,
6. duplicate basis refs may reuse one immutable preview within the same revision,
7. ambiguous matches refuse admission.

## Inspectability State

Each candidate revision receives one server-derived evidence-inspectability state:

```text
VERIFIED
MISSING
UNRESOLVABLE
AMBIGUOUS
STALE
DRIFTED
LEGACY_UNAVAILABLE
```

`VERIFIED` requires every basis ref used by every displayed finding to resolve to a persisted preview whose frozen identity and content hash validate.

No client may promote another state to `VERIFIED`.

## Admission Rules

### Newly created candidates

A new candidate may enter ordinary Review only when:

1. it has at least one persisted readable finding,
2. every finding has at least one exact basis ref,
3. every finding basis ref resolves to exactly one grounding link,
4. every referenced grounding link resolves to exactly one deterministic preview,
5. every preview validates against the frozen source revision,
6. the complete envelope is included in the immutable review hash.

Failure of any condition refuses or quarantines admission before ordinary Review.

### Counterevidence and limiting evidence

Counterevidence, contradiction, limitation, and partial-support sources are subject to the same inspectability requirement as supporting evidence. The operator must not be shown only the favorable evidence.

### Historical candidates

- Existing published records remain historical truth and are not erased or rewritten.
- Historical candidates without previews remain loadable in a clearly identified read-only compatibility posture.
- A historical pending candidate with `LEGACY_UNAVAILABLE` evidence may not newly advance to approval or publication through the ordinary workflow.
- Continuing that memory requires a governed rebind/rebuild operation that produces a new candidate revision with verified previews.
- No migration may invent source content or silently mark legacy bindings as inspectable.

## Failure Projection

Ordinary refusal must use:

```text
Blocked: The proposal's supporting evidence cannot be inspected.
Next step: Review the selected sources and create the proposal again.
```

More specific lawful projections may include:

```text
Blocked: A selected message changed after it was chosen.
Next step: Reopen the source and confirm the current message.
```

```text
Blocked: Two saved records match this evidence reference.
Next step: Select the exact record revision.
```

```text
Blocked: This older proposal has no inspectable evidence preview.
Next step: Rebuild it from its available sources as a new revision.
```

Technical codes, hashes, and mismatched values remain preserved in diagnostics.

## Review Projection Requirements

For every finding, ordinary Review must expose:

1. readable finding summary,
2. support or limitation role in human language,
3. human source and speaker context,
4. inline or in-modal readable preview,
5. exact Open Source action when uniquely resolvable,
6. visible verification or drift warning when relevant.

Ordinary Review must not expose raw basis IDs merely because they exist. Copying an identifier is not evidence inspection and is not a lawful substitute for preview or navigation.

Technical Details remains available for audit but cannot satisfy the ordinary Review proof gate.

## Persistence And Replay

The persisted candidate/replay artifact must include:

- evidence preview records,
- preview-to-grounding and preview-to-finding bindings,
- preview content hashes,
- inspectability state,
- source revision identities,
- refusal or quarantine state when preview creation failed.

Restart, ledger replay, operational rebuild, Node packaging, and Bun packaging must reproduce byte-equivalent semantic preview records and identical inspectability decisions without reading mutable live source content again.

## Compatibility And Versioning

This is an additive versioned envelope change. Existing `evidenceFindings` and `groundingLinks` retain their meanings.

The implementation must declare:

- evidence envelope schema version,
- review-envelope hash version,
- replay artifact version,
- migration/compatibility handling for pre-preview candidates,
- minimum packaged-plugin version able to read the new envelope.

Unknown future envelope versions must fail closed rather than degrade to binding-only ordinary review.

## Exact Proof Matrix

Implementation does not close without proving:

1. a message-backed finding persists an exact readable excerpt and opens its exact source occurrence,
2. a structural-record finding persists deterministic human fields without synthesized prose,
3. a shard-backed finding persists the exact cited shard excerpt and source range,
4. multiple findings may share one immutable preview within one revision without duplication,
5. every counterevidence and limiting basis is equally inspectable,
6. missing preview creation refuses admission with one plain-language next action,
7. stale, mutated, ambiguous, and unresolvable sources fail with distinct governed states,
8. a pending historical candidate without previews is read-only and cannot publish,
9. restart/replay preserves preview content, bindings, hashes, and inspectability state unchanged,
10. Review displays the evidence without Technical Details, copied IDs, browser synthesis, or live-source reconstruction,
11. Node and Bun produce identical semantic envelopes and admission decisions,
12. no contradictory ordinary path can admit a new binding-only candidate.

## Stop Boundary

This contract does not authorize:

- evidence picker UI,
- unified proposal orchestration,
- Review layout changes,
- historical rebuild controls,
- publication-flow redesign.

Those remain separate bounded slices after the envelope and admission mechanism is implemented and proven.

## Status

`C0.8.0D.1A` is **ENTERED**. The evidence-preview schema, ownership, admission rules, compatibility posture, failure behavior, and proof matrix are defined. Production implementation remains open.
