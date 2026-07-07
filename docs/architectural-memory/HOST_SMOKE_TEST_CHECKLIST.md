# Host Smoke Test Checklist

Last updated: 2026-07-06

Purpose: track live host verification across the restored Summary Sharder build so browser proof, persistence proof, and remaining gaps stay explicit.

## Current target

- Host: local SillyTavern test instance
- Extension copy: served build with guided publication flow, lifecycle UI overhaul, and FAB launcher fix
- Active branch: `feature/architectural-persistence-schema`
- Current profile under live test: `Architectural Memory`

## Prerequisites

- [ ] Similharity plugin is installed and running before any RAG, vectorization, retrieval, or reranker test is treated as valid

Notes:

- Summary Sharder RAG depends on Similharity as a prerequisite plugin.
- Without Similharity, the RAG settings surface, health checks, embedding tests, reranker tests, and related retrieval flows may appear broken even when the Summary Sharder build itself is functioning correctly.
- Do not classify a failed RAG smoke test as a sharder regression until Similharity availability is confirmed first.
- `C0.6.4-5` changes the standard operator flow to:
  - `Publication setup required`
  - `Set Up Standard Publication Policy`
  - `Check Eligibility`
  - `Publish Memory`
- Standard publication no longer requires script or raw-API bootstrap in the intended host path.
- Legacy helper scripts remain available only for fixture seeding and lower-level proof work:
  - policy route: `POST /interpretive/publication/policies`
  - proof/reference script: `tools/server-plugin/prove-c0-6-4-2.ps1`
  - candidate helper: `tools/server-plugin/seed-interpretive-candidate.ps1`
  - smoke reset helper: `tools/server-plugin/reset-interpretive-smoke-storage.ps1`

- The default seed target `scope_interpretive_smoke / character:jeep.png` is now protected against accidental reuse.
- For a clean smoke run on the default Jeep line, seed with:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File "tools/server-plugin/seed-interpretive-candidate.ps1" -HostName "<HostName>" -Port <Port> -ResetFirst -RestartHostAfterReset`
- Reusing the dirty default Jeep line now requires an explicit override:
  - `-AllowDirtyDefaultLine`
- Scope changes alone do not isolate the Jeep publication line.

### Guided publication contract proof

- [x] Standard policy bootstrap is explicit, idempotent, and replay-safe
- [x] Guided root publication bootstraps, qualifies, authorizes internally, and publishes atomically
- [x] Guided publication replay restores the same published/active state after restart
- [x] Packaged publication path succeeds under Node
- [x] Packaged publication path succeeds under Bun
- [x] Standard publication contract no longer requires script, JSON body, raw policy field, or refusal-code knowledge for ordinary flow

Additional live host proof:

- [x] Guided publication now succeeds end-to-end through the served UI:
  - `Set Up Standard Publication Policy`
  - `Check Eligibility`
  - `Publish Memory`
- [x] Published state renders coherently across:
  - request card status
  - top-right status chip
  - `Review`
  - `Publication Lifecycle`
- [x] `Publication Lifecycle` and `Technical Details` now read as distinct operator and diagnostic surfaces

Evidence:

- automated proof: `tools/server-plugin/summary-sharder-memory/interpretive.test.mjs`
- packaged runtime parity: `tools/server-plugin/summary-sharder-memory/package.test.mjs`

## Verified now

### Review / lifecycle surfaces

- [x] `Publication Lifecycle` label is live in the served build
- [x] `Jeep` and `Chris` request buttons change focus correctly
- [x] `History` tab renders distinct reviewer-specific content
- [x] `Technical Details` and `Publication Lifecycle` are shared record views as expected for the same revision

### FAB / launcher

- [x] Quick action registry contains `Run Sharder`, `Batch Sharder`, and `Interp. Review`
- [x] Sharder launcher wiring works
- [x] Interpretive review launcher wiring works

Notes:

- Standard browser automation click is unreliable on the radial FAB buttons.
- Direct DOM-triggered action invocation proved the launcher path itself is functional.

### Architectural sharder flow

- [x] `Sharder: Select Range` opens
- [x] `Sharder: Optional Existing Shards` opens
- [x] `Sharder Review` opens
- [x] Review modal outer scroll surface works
- [x] Architectural review keeps warm archive disabled
- [x] Decision-capacity override state is implementation-driven, not a dead control

Notes:

- The processing toast remains visible after review opens. This appears to be a toast-lifecycle UX issue, not a stuck-processing condition.
- Architectural review currently reports `Override: Unavailable` unless excess new decision IDs exceed the hard limit and every excess decision is `PROPOSED`.

### Save / cold archive / baseline reuse

- [x] `Save Sharder Output` succeeds
- [x] Success toast appears: `Sharder output saved`
- [x] Cold archive save works
- [x] `chatMetadata.summary_sharder.coldArchive` increments after save
- [x] Saved cold archive entry preserves:
  - `startIndex`
  - `endIndex`
  - `shardProfile`
  - `stableDecisionIds`
- [x] `summary_sharder.shardManifests` appends a new manifest
- [x] `summary_sharder.summarizedRanges` appends the saved range
- [x] Newly saved shard appears in the next-run baseline selector
- [x] Overlapping shards are correctly marked `Reference Only`

## Verified evidence from the current live pass

- Saved architectural shard range: `0-22`
- Follow-up probe range: `23-30`
- New saved shard shown as selectable baseline:
  - `Memory Shard 0-22`
- Correctly blocked overlap baseline:
  - `Memory Shard 0-52`

## Remaining tests

### Architectural profile boundaries

- [ ] Confirm architectural warm archive remains blocked on every relevant surface, not only review
- [ ] Confirm no architectural output enters warm RAG storage through any alternate path
- [ ] Confirm architectural retrieval remains unavailable and fails closed rather than partially degrading

### Narrative / warm archive / RAG

- [x] Run a narrative sharder save with warm archive enabled
- [x] Verify warm archive persistence path succeeds
- [x] Verify saved narrative shard is retrievable through Collection Browser / query test
- [x] Verify live cross-chat RAG injection uses the added shared collection during generation
- [x] Verify reranker participation on retrieved candidates

Current boundary:

- Warm archive save now succeeds after host-side Similharity and BananaBread configuration was corrected.
- Collection Browser query test proves the stored collection is searchable.
- RAG Debug Query now matches the Collection Browser results for the linked shared collection.
- RAG History now proves live injection with non-zero entries against the shared read collection set.
- Live prompt answers now reflect recalled shared-chat specifics such as `CSP` and `PAS`, which confirms context-guided synthesis rather than generic fallback.
- RAG retrieval, live injection, and reranker participation are now all verified in-host.

Verified live evidence:

- Collection Browser query: `provisional` -> returned linked-chat hits
- Debug Query: `provisional` -> returned raw and scored vector hits
- Live query: `Explain provisional snapshot mechanism` -> `Entries: 2` in RAG History
- Follow-up live query: `What does PAS stand for?` -> answered `Provisional Architecture Snapshot`
- Injection trace showed read collections:
  - `ss_standard_jeep_-_2026-05-25_18h35m36s079ms_-_Checkpoint_-_Archivist_Bot_96ef0b06`
  - `ss_standard_jeep_-_2026-07-05_13h04m02s870ms_153208db`
- Injection preview included recalled `**Characters**` and `**Events**` entries from the linked read collection
- Reranker debug proof:
  - provider payload shape: top-level array
  - ranked entry count: `5`
  - scored entry count: `5`
  - reordered results placed `Jeep intervenes only when explicitly requested or when drift is flagged.` first for query `when does Jeep intervene`

### Proposal / interpretive pipeline

- Current boundary:
  - if the queue is empty, seed one governed candidate through the plugin route before continuing UI smoke
  - ordinary publication is now host-usable, but repeated smoke seeding can still leave noisy historical residue if the default line is reused without reset
  - helper script: `tools/server-plugin/seed-interpretive-candidate.ps1`
  - default smoke seeding should use `-ResetFirst -RestartHostAfterReset` unless you intentionally want to inspect dirty-state behavior

- [ ] Verify saved evidence can feed proposal generation
- [ ] Verify proposal record appears in interpretive review surfaces
- [ ] Verify review submission path updates the corresponding runtime state
- [ ] Verify publication lifecycle actions reflect the resulting review state

### Server-plugin / persistence proof

- [ ] Confirm server-plugin DB movement for proposal-side records
- [ ] Confirm no divergence between client metadata state and server-plugin projection state

## Known minor UX issues

- [ ] Processing toast stays centered after the review popup appears; should dismiss or move off the center path

## Publication closeout boundary

The major product gap is no longer bootstrap or ordinary-path usability.

That boundary is now considered proven enough to move from product rescue into closeout proof.

Authority now lives in:

- contract: `docs/architectural-memory/PHASE_C0_6_4_5_PUBLICATION_POLICY_BOOTSTRAP_AND_GUIDED_OPERATOR_FLOW_BRIEF.md`
- execution order: `docs/architectural-memory/C0_6_4_5_CLOSEOUT_AND_NEXT_LIFT_PLAN.md`

Remaining publication work is now:

- publication data hygiene on the default smoke line
- corrected-child publication proof
- restart / replay / cross-host parity proof
- only the UI tightening needed to support those proofs
- evidence-finding compatibility is now covered by automated local proof, not open host semantics

## Suggested execution order

1. Architectural boundary confirmation
2. Narrative warm archive save
3. RAG retrieval and reranker
4. Guided publication clean-root proof
5. Corrected-child publication proof
6. Restart / replay / cross-host parity
7. Server-plugin persistence cross-check
8. Evidence-finding host closeout only after the publication proofs above stay stable

## Operator script: proposal -> review -> lifecycle

Use one known-good saved shard and run this sequence in the host UI.

### A. Preflight

- [ ] Confirm Summary Sharder extension is loaded in the host under test
- [ ] Confirm server plugin is running
- [ ] Confirm the saved shard you want to use already exists in cold archive or warm archive
- [ ] Confirm `Interp. Review` launcher is present in the FAB / quick actions

Evidence to capture:

- shard range used
- profile used (`Narrative Memory` or `Architectural Memory`)
- whether the source shard was cold-only or warm/RAG-backed

### B. Generate proposal

- [ ] Open the Summary Sharder panel
- [ ] If a host UI entry point exists, locate it for the saved shard / current memory candidate
- [ ] If no host UI entry point exists, seed one governed candidate via `tools/server-plugin/seed-interpretive-candidate.ps1`
- [ ] For the default Jeep smoke line, prefer `-ResetFirst -RestartHostAfterReset` to avoid revision/history/publication bleed between runs
- [ ] Trigger proposal generation or seed creation
- [ ] Confirm generation completes without host error

Expected result:

- a new interpretive review candidate/proposal record is created
- no silent failure or stuck processing state remains

Evidence to capture:

- toast text, if any
- visible proposal title / subject
- any generated proposal ID or revision ID shown in UI

### C. Confirm proposal enters review queue

- [ ] Open `Interp. Review`
- [ ] Confirm the new proposal appears in `Requests`
- [ ] Confirm the queue status matches expected initial state
- [ ] Click each participant/request button and verify focus changes to the correct record

Expected initial status:

- review is pending
- at least one reviewer or subject decision is still pending

Evidence to capture:

- queue card title
- revision number / ID shown
- top-right prominent status chip text

### D. Submit reviewer action

Pick one lawful path first, ideally the simplest direct reviewer action.

- [ ] Open the `Review` tab
- [ ] Submit one reviewer action
- [ ] Confirm submission succeeds without modal failure
- [ ] Confirm the queue and detail view refresh correctly

Expected result:

- `History` gains a new review record
- `Technical Details` reflects updated review state
- `Publication Lifecycle` updates lawful next steps

Evidence to capture:

- exact action chosen
- exact visible post-submit status
- whether `History` shows the new item immediately

### E. Submit remaining required action(s)

- [ ] Complete the remaining reviewer/subject action required for the proposal
- [ ] Confirm the prominent status changes from review-pending to the next controlling state

Expected progression:

- `Pending review` -> `Reviews complete` or equivalent intermediate state
- if subject action is still required, prominent state should become `Decision pending`

Evidence to capture:

- final queue card status
- final prominent detail status
- whether `Review`, `History`, `Technical Details`, and `Publication Lifecycle` all agree

### F. Inspect the four surfaces after submission

#### Review

- [ ] Current approved/pending context is correct
- [ ] Evidence block matches expectation
- [ ] No stale action controls remain visible

#### History

- [ ] New review entries appear
- [ ] Ordering is correct
- [ ] No orphan record panels remain

#### Technical Details

- [ ] `Current State` values match the actual workflow state
- [ ] Evidence bindings are present if expected
- [ ] IDs/hashes stay in technical sections only

#### Publication Lifecycle

- [ ] `Current Memory` is truthful
- [ ] `Publication Readiness` shows only lawful actions
- [ ] blocked actions, if shown, have human-readable reasons
- [ ] `Publication History` reflects actual events only

Lifecycle gate note:

- If every revision shows the same blocked state with `Granted = GRANTED` and `No Active Publication Policy`, stop here and seed a publication policy first.
- That state means the review flow is complete enough to enter publication governance, but the required policy record does not yet exist in the host environment.

### G. Persistence cross-check

- [ ] Refresh the host page
- [ ] Reopen the same proposal/review record
- [ ] Confirm the review state persisted
- [ ] If DB/server tooling is available, confirm server/plugin state matches the client view

Expected result:

- no client-only phantom review state
- no divergence between queue card, detail surface, and persisted runtime state

### Pass criteria

This whole pass is considered successful only if:

- proposal generation succeeds
- proposal enters the review queue
- reviewer actions can be submitted
- state changes persist after reload
- `Review`, `History`, `Technical Details`, and `Publication Lifecycle` stay internally consistent
