# C0.6.5 Evidence Finding Contract Completion Report

Last updated: 2026-07-13

Final status: `C0.6.5 COMPLETE`

## Completed Boundary

`C0.6.5` closes the persisted human-readable evidence-finding contract:

```text
governed candidate evidence
-> canonical readable findings with exact basis references
-> deterministic validation and persistence
-> truthful Review rendering
-> restart-safe replay
-> explicit compatibility fallback for records without findings
```

The browser does not invent evidence meaning from raw domains or classification labels.

## Authority And Projection Boundary

1. Persisted evidence-finding records and their exact basis references govern readable evidence meaning.
2. Canonical grounding links govern whether a basis reference is admissible.
3. The Interpretive governance ledger owns durable replay.
4. SQLite is a rebuildable operational projection.
5. The Review surface renders canonical findings or an explicit unavailable state; it does not author findings.

## Implemented Contract

### Canonical findings

Finding-bearing candidates preserve:

1. deterministic finding identity,
2. finding role,
3. human-readable summary,
4. exact basis references,
5. source label,
6. domains,
7. support level.

### Grounding enforcement

Finding basis references must exist in the candidate's governed grounding links. An unbound reference is rejected rather than approximated or silently removed.

### Explicit unavailable state

Candidates without persisted findings load with:

```text
evidenceFindingState = UNAVAILABLE
evidenceFindings = []
```

The Review surface reports that human-readable findings are unavailable and retains access to exact technical bindings.

### Historical compatibility

Legacy or non-canonical finding state reopens through the same truthful unavailable path. Mixed legacy and finding-bearing records replay without destructive backfill or browser synthesis.

### Replay and packaged runtime posture

Finding-bearing candidates replay with the same content and exact bindings. The existing packaged proof confirms semantic equality for the evidence-finding payload under Node and Bun.

This is a narrow packaged semantic-parity result. It is not a claim that every SillyTavern host proof has been duplicated independently on SillyBunny.

## Exact Closeout Proof

Interpretive persistence, validation, compatibility, and replay regression:

```powershell
node --test tools/server-plugin/summary-sharder-memory/interpretive.test.mjs
```

Observed on 2026-07-13:

```text
51 passed
0 failed
0 cancelled
0 skipped
```

The exact C0.6.5 cases within that matrix passed for:

1. deterministic evidence-finding normalization,
2. persisted candidate projection and reload,
3. explicit unavailable state,
4. legacy fallback,
5. ungrounded basis-reference refusal,
6. ledger replay preserving findings and hashes,
7. mixed-generation restart/replay semantics.

Packaged semantic-parity proof:

```powershell
node --test --test-name-pattern="packaged interpretive evidence findings remain semantically identical under Node and Bun" tools/server-plugin/summary-sharder-memory/package.test.mjs
```

Observed on 2026-07-13:

```text
1 passed
0 failed
0 cancelled
0 skipped
```

Review-rendering evidence:

- `ui/modals/management/interpretive-review-modal.js` reads `evidenceFindingState` and persisted `evidenceFindings`.
- `AVAILABLE` findings render as readable finding cards.
- Missing findings render the explicit human-readable unavailable message.
- The renderer does not generate evidence prose from raw domain labels.

The host smoke checklist records evidence-finding compatibility as automated local proof rather than an open host semantic.

## Exit-Criteria Result

1. Evidence findings are persisted as first-class records: **passed**.
2. Replay preserves them exactly: **passed**.
3. Review renders persisted human evidence without browser invention: **passed by implementation inspection and existing host posture**.
4. Missing findings remain explicit and truthful: **passed**.
5. Technical bindings remain available and exact: **passed**.
6. Node and Bun preserve the packaged evidence-finding semantics: **passed at the existing narrow packaged boundary**.

## Explicitly Not Claimed

`C0.6.5` does not claim:

1. direct navigation from a finding to its source message,
2. perfect backfill for every historical candidate,
3. a generalized source viewer,
4. comprehensive duplicate execution of every SillyTavern host scenario on SillyBunny,
5. any change to publication, proposal, or structural-promotion authority.

Direct source navigation remains governed by `C0.6.8` and the `C0.8.0D` release slice.

## Phase Verdict

`C0.6.5` is complete at its declared boundary:

```text
persist evidence meaning when present
-> bind it exactly
-> replay it unchanged
-> render it without browser invention
-> admit truthfully when it is unavailable
```

Further evidence-navigation or host-parity work requires its own bounded release slice and does not reopen this contract.
