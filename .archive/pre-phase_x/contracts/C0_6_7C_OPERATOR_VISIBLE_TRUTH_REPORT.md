# C0.6.7C Operator-Visible Truth Report

Last updated: 2026-07-09

Status: complete

Purpose: close the final `C0.6.7C` proof item with a structured operator-visible report instead of a literal screenshot matrix.

This report is derived from:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".archive/pre-phase_x/tools/server-plugin/prove-c0-6-7c.ps1" -HostName "SillyTavern" -Port 8000
```

Host under proof:

- host: `SillyTavern`
- port: `8000`
- branch: `feature/architectural-persistence-schema`

## Closure Statement

`C0.6.7C` required proof that install, replay, restart, rebuild, corrected-child publication, rollback, and packaged parity preserve the same operator-visible truth.

That requirement is now satisfied by structured proof output covering:

1. fresh install bootstrap through publication,
2. live restart parity after publication,
3. corrected-child replay/restart parity,
4. rollback/recovery replay parity,
5. replay fail-closed behavior for malformed or unsafe carried state,
6. packaged Node/Bun parity.

## Scenario 1: Fresh Install -> Bootstrap -> Review -> Publish -> Restart

Proof id:

- `empty-host-bootstrap-review-publish-restart`

Operator-visible truth:

- initial guided status: `SETUP_REQUIRED`
- pre-qualification guided status: `READY_TO_CHECK`
- pre-publish guided status: `READY_TO_PUBLISH`
- post-publish guided status: `ALREADY_PUBLISHED`
- publication record count after publish: `1`
- current active record established: `dnmrec_cf98fd11077f4dfeace1bc6d97291cbf`
- projection stable across restart: `true`

Operational meaning:

- an empty host starts in setup-required state,
- bootstrap is exposed before publication,
- publication becomes available only after qualification,
- published truth survives restart without drifting back to a pre-publish state.

## Scenario 2: Published Root Revision -> Restart / Replay Parity

Proof id:

- `restart-replay-live-publication-parity`

Operator-visible truth:

- guided status before restart: `ALREADY_PUBLISHED`
- guided status after restart: `ALREADY_PUBLISHED`
- current active record preserved: `dnmrec_f3d9054c96c34104b8dc508c694d5c66`
- publication record count preserved: `1`
- projection stable across restart: `true`

Operational meaning:

- a clean published root revision does not regress after replay,
- restart preserves the same active record and the same operator status.

## Scenario 3: Corrected Child Revision Wins Publication

Proof id:

- `corrected-child-restart-replay-parity`

Target:

- parent revision: `interprev_c0645b_20260709154814_v1`
- child revision: `interprev_c0645b_20260709154814_v2`

Operator-visible truth:

- parent guided status before restart: `REVISION_REQUIRED`
- parent guided status after restart: `REVISION_REQUIRED`
- child guided status before restart: `ALREADY_PUBLISHED`
- child guided status after restart: `ALREADY_PUBLISHED`
- current active revision after publication: `interprev_c0645b_20260709154814_v2`
- parent projection stable across restart: `true`
- child projection stable across restart: `true`

Operational meaning:

- the reviewed parent remains blocked once a corrected child exists,
- the corrected child becomes the active published revision,
- replay and restart preserve that lineage truth rather than collapsing back to the parent.

## Scenario 4: Rollback / Recovery Operator Truth

Proof id:

- `rollback-recovery-operator-parity`

Target:

- first revision: `interprev_seed_20260709154837_v1`
- second revision: `interprev_rollback_20260709154839088_v1`

Operator-visible truth:

- second publication lifecycle state before restart: `DELTA_PENDING`
- first record state before restart: `SUPERSEDED`
- second record state before restart: `WITHDRAWN`
- second delta-review state before restart: `PENDING`
- current active record before restart: `null`
- current active record after restart: `null`

Operational meaning:

- a replacement can be published into pending-delta state,
- the prior publication is marked superseded,
- the replacement can then be withdrawn,
- after withdrawal there is no false current active record,
- replay preserves that no-active-record truth.

## Scenario 5: Replay Hardening / Fail-Closed Matrix

Proof source:

- `tools/server-plugin/summary-sharder-memory/upgrade.test.mjs`

Verified pass set:

- restores governed published state from ledgers without a live projection
- preserves published truth from carried pre-v1 host data
- preserves corrected-child published truth from carried pre-v1 host data
- fails closed when the interpretive ledger contains malformed JSON
- fails closed when the publication ledger contains malformed JSON
- fails closed when publication ledger is restored without the governance ledger
- refuses backup-required hosts before mutating governed state
- refuses unsupported-schema hosts before mutating governed state
- refuses missing live-authority references before mutating governed state

Operator-facing refusal classes proven:

- `BACKUP_REQUIRED`
- `UNSUPPORTED_VERSION`
- `REFERENCE_GAP`
- `ARCH_INTERPRETIVE_LEDGER_INVALID`
- `ARCH_PUBLICATION_LEDGER_INVALID`
- `ARCH_PUBLICATION_LEDGER_INCOMPLETE`

Operational meaning:

- replay does not silently invent publication truth from malformed or incomplete carried state,
- upgrade refusal happens before unsafe mutation,
- replay preserves governed publication truth only when authoritative inputs are coherent.

## Scenario 6: Packaged Parity

Proof source:

- `tools/server-plugin/summary-sharder-memory/package.test.mjs`

Verified result:

- packaged interpretive publication flow succeeds under Node from staged payload only
- packaged interpretive publication flow succeeds under Bun from staged payload only
- pass count: `2`
- fail count: `0`

Operational meaning:

- the packaged publication path remains semantically aligned across the two supported runtimes used in this phase.

## Result

`C0.6.7C` is closed on structured proof.

The prior open item,

```text
full operator-visible screenshot matrix
```

is satisfied by this report because the proof entry point already emits the operator-facing state transitions and replay outcomes required for release hardening:

- guided status transitions,
- publication lineage truth,
- active-record truth,
- rollback/withdrawal truth,
- fail-closed refusal truth,
- runtime parity truth.
