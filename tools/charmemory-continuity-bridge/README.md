# CharMemory Continuity Bridge

An independent, interim retrieval bridge for CharMemory Markdown files.

It does one job: keep the character's current editable continuity available without
asking SillyTavern Vector Storage to re-embed the entire file after every edit.

## Boundary

- CharMemory Markdown remains the editable source of record for this bridge.
- SQLite stores a local search projection and immutable prior block revisions.
- FTS5 searches **current** revisions only.
- Each current search result carries CharMemory's exact `chat` and `date` source
  attributes when recorded. They render as provenance labels, never inferred event dates.
  Pre-provenance legacy rows are explicitly labeled `source details unavailable` until
  a source-derived backfill can record them.
- Retrieval uses a 24-record candidate window and injects whole, current records only
  until a 48,000-character evidence budget is reached. This replaces the prototype's
  fixed three-record ceiling; it is not semantic reranking or a claim of completeness.
- When an enabled Similharity reranker reference is already configured in Shardwright,
  the bridge adopts its endpoint/model/secret reference once into bridge settings. The
  protected secret value is neither copied nor displayed. A reranker failure preserves
  FTS order and is reported as such; ranking never blocks continuity retrieval.
- A source is identified by its character-card avatar and logical memory filename,
  never by its replace-on-save attachment URL. A uniquely evidenced legacy URL source
  is migrated once; ambiguous candidates refuse.
- Before every synchronization, the bridge reads the active Data Bank attachment with
  cache bypass. A deleted or empty attachment refuses rather than allowing a browser
  cache entry to supply an unaccountable older snapshot.
- The bridge never edits CharMemory Markdown, consolidates memories, assigns meaning,
  or establishes Shardwright authority.
- If a changed block cannot be matched safely, synchronization refuses without changing
  its index.

## Observability

The owned `globalThis.CharMemoryContinuityBridge.getStatus()` diagnostic surface is
read-only. A single status line appears beneath CharMemory's existing statistics after
each bridge attempt, for example: `Injected 3 memories · sync 34 ms · retrieval 25 ms`.
The same state reports source identity/hash and revision count, query presence,
match/injection counts, timings, and either a runtime error or guarded refusal reason.
`REFUSED` means the bridge deliberately declined an unsafe operation; `ERROR` means it
could not complete an operation. `NO_MATCHES` is retained so a successful search that
found nothing is never misreported as an injection.

`Retrieving continuity` confirms that the shared pre-prompt generation hook ran. This
hook is used for both SillyTavern text-completion and chat-completion APIs; a
text-completion-only hook would leave chat-completion sessions silently idle.

The current identity tether is the character-card avatar filename plus logical memory
filename. A future portability slice may introduce a generated persistent source ID for
legitimate avatar or filename renames; that is deliberately deferred.

## First milestone proof

```powershell
node --test tools/charmemory-continuity-bridge/server/continuity-store.test.mjs
```

The proof establishes that unchanged sources do no indexing work, one changed block
creates one new immutable revision, current retrieval excludes the old revision,
attachment replacement preserves source identity, and ambiguous changes fail closed.

## Installation requirement

The bridge claims each selected logical CharMemory source and records the claim separately
from its current attachment URL. It then adds only that current URL to SillyTavern's existing
`disabled_attachments` list. CharMemory can still read and edit the file, while native Vector
Storage excludes it and cannot duplicate injection. No global Vector Storage setting changes.

Because CharMemory replaces the attachment URL on every save, its local compatibility patch
must carry a bridge-managed source's exclusion to the replacement URL. That is the durable
handoff boundary: the bridge owns the logical source; SillyTavern owns the per-URL exclusion.
Without that compatibility step, a save makes the replacement file eligible for a native
whole-file vector rebuild again.
