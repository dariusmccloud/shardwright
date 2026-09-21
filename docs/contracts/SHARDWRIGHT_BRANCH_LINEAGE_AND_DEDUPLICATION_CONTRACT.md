# Shardwright Branch Lineage and Deduplication Contract

**Version:** 0.1.3
**Status:** ENTERED — governing historical-branch and duplicate-representation policy; explicit governed source-scope retrieval and read-only source admission preview are implemented as projection boundaries. Further implementation requires separately declared slices.

## 1. Purpose and boundary

This contract governs how Shardwright represents chats that share a checkpoint
and then diverge, and how it reduces legitimately duplicated content without
destroying provenance. It applies to direct chats, imported chats, and future
branch-aware sources.

It does not authorize automatic parentage, source rewriting, deletion, merge of
distinct content, or replacement of the canonical transcript ledgers.

## 2. Authority and projection boundary

Raw chat files and append-only Shardwright custody/lineage ledgers remain the
authoritative source material. SQLite, deduplication indexes, fork suggestions,
and retrieval views are rebuildable projections.

A projection MAY identify equivalent content blocks for storage or retrieval
efficiency, but equivalence MUST NOT become a custody merge or an identity claim.

## 3. Source and branch identity

Every observed chat is initially an independent source with its own immutable
`sourceLogicalId`. A branch relationship exists only when one of these is true:

1. an explicit governed fork marker records the parent and fork anchor; or
2. an operator accepts a reviewed fork suggestion and that decision is appended
   to the lineage ledger.

The fork anchor MUST identify the exact message/content identity at which the
shared prefix ends. A chat title, filename, path, display name, or mutable chat
ID MUST NOT establish parentage by itself.

## 4. Historical fork suggestions

For sources without an explicit fork marker, the system MAY produce a review
suggestion when it finds an exact ordered prefix shared by two or more sources.
The suggestion SHOULD include:

- proposed parent and child source IDs;
- the exact fork anchor and matched prefix extent;
- divergent suffix ranges;
- character/source identity evidence;
- observed source creation timestamps;
- timestamp confidence and derivation tier; and
- the complete basis for the suggestion.

When no explicit fork marker exists, the oldest observed source creation
metadata, when available, is the primary ordering signal for proposing a parent. It is not proof
of parentage. Copying, migration, synchronization, export/import, or filesystem
restoration may change that metadata. The result MUST therefore be presented as
“likely fork” or equivalent review language, never as an inferred truth.

If exact-prefix evidence exists but creation metadata is unavailable, the system
MAY still surface the likely fork while leaving the proposed parent unresolved.
The operator must then choose a parent, leave the sources independent, or reject
the suggestion; absence of a timestamp MUST NOT be converted into an ordering.

For an observed source, `FILESYSTEM_NATIVE` is the preferred creation timestamp
tier when the authenticated resolver can read a native filesystem creation time.
If that value is unavailable, the source MUST carry `UNAVAILABLE`; the system
MUST NOT substitute registration time, modification time, a parsed chat date, or
an invented value as creation time. Lower-confidence import-normalized or
content-rendered timestamps may be added by a separately governed migration
slice, but they never outrank an explicit fork marker.

The system MUST NOT create a lineage edge merely because text is similar,
timestamps are ordered, or a filename appears related.

## 5. Operator review outcomes

Each suggestion requires an explicit operator outcome:

- accept the proposed parent and fork anchor;
- choose a different parent or anchor;
- leave the sources independent; or
- reject the suggestion.

An accepted association appends a durable lineage decision containing the
operator action, evidence, timestamp tiers, selected parent, selected anchor,
and source revisions. It MUST NOT rewrite or delete either source.

## 6. Block-level deduplication

Deduplication MAY canonicalize exact, provably identical message/content blocks
for efficient storage and retrieval. The canonical record MUST retain every
source occurrence, source revision, branch link, visibility state, and custody
reference.

Deduplication MUST NOT:

- remove divergent suffixes;
- collapse merely similar text;
- merge messages from different positions without occurrence links;
- transfer hidden, archived, or deleted state between sources; or
- overwrite a source record with a deduplicated projection.

Identical content at different logical positions remains distinct through its
occurrence identity even if it reuses one canonical content record.

## 7. Branch-aware retrieval and visibility

Continuity retrieval SHOULD use the active branch plus its governed inherited
prefix. Archaeology retrieval MAY inspect all reviewed descendants and compare
their divergent outcomes. An unreviewed possible fork remains separate for
continuity and may be shown as unresolved archaeology evidence.

Visibility, hidden state, archive state, and deletion tombstones are scoped to
the relevant source occurrence or branch link. A state change in one branch
MUST NOT silently mutate the corresponding occurrence in another branch.

A caller MAY supply an explicit `sourceLogicalIds` or bounded `sourceScopes`
scope derived from a governed branch/source-sequence projection. A bounded scope
may cap an inherited source at its accepted fork-anchor message index. Candidate selection MAY use that scope only as
a read-only family-eligibility filter. It MUST NOT infer scope from names,
filenames, paths, timestamps, or similarity. Returned occurrence links MUST
retain every custody-bearing occurrence for each selected content family; the
scope MUST NOT transfer visibility or deduplicate custody. A missing, malformed,
or empty scope MUST refuse rather than widen implicitly. An unreviewed possible
fork remains unresolved and MUST NOT silently merge or widen the scope.

The scope resolver MUST derive inherited source IDs only from accepted
`ACCEPT_PROPOSED` or `CHOOSE_PARENT` lineage decisions in the append-only
lineage ledger. Review suggestions, rejected decisions, independent outcomes,
and absent decisions MUST return an unresolved result rather than a guessed
scope. Conflicting parent assignments or lineage cycles MUST refuse.

A caller-facing retrieval helper MAY compose this resolver with candidate
selection, but it MUST require the caller's active `sourceLogicalId` and MUST
refuse when accepted lineage scope is unavailable. It MUST NOT infer the active
source from chat names, paths, filenames, or ambient host state.

Character-scoped discovery MAY run automatically as a read-only projection. It
MAY detect exact-prefix candidates, host lineage hints, and timestamp evidence,
but MUST return review-required suggestions and MUST NOT append lineage, choose
a parent, mutate source scope, or alter custody.

The operator surface MAY expose those discovery results, but it MUST present
them as evidence and review candidates only. Mutation controls belong to a
separate explicit decision surface. That decision surface MUST prepare and
append only the selected operator outcome; it MUST never mutate source files or
silently apply retrieval scope.

Discovery MAY report direct chat files that are visible under the authenticated
host chat directory but absent from the source-registration ledger. Such files
MUST be labeled `NOT_SCANNED`; discovery MUST NOT register, observe, ingest, or
derive identity from them.

An operator MAY request an admission preview for a discovered source. The
preview MUST resolve the structured locator, distinguish missing, unresolved,
unreadable, and malformed JSONL sources, and report custody facts including
byte length and revision hash when readable. A preview MUST NOT append a
registration event or ingest messages. Registration remains a separate,
explicit operator action and MUST use the same structured locator rather than
any display-only path or title.

After registration, observation and message intake MUST remain separate
explicit actions. Registration MUST NOT observe the file, and observation MUST
NOT ingest or project message rows. Intake MAY be offered only after an
observation receipt, and any refusal MUST leave the source ledger and raw file
unchanged.

## 8. Host-native lineage evidence

SillyTavern-compatible chat headers and message metadata MAY carry native
lineage hints. In the verified sample, `chat_metadata.main_chat` identifies the
source chat named by a derived checkpoint/branch, while a message-level
`extra.bookmark_link` points toward a continuation or checkpoint target. These
fields are stronger evidence than filenames, titles, or paths, but their
direction and semantics remain host-provided evidence rather than Shardwright
authority.

An observer MUST preserve the raw values, source location, and observed revision
when recording these hints. It MUST NOT silently convert either field into a
parent edge, merge, or deletion. A lineage edge still requires an explicit fork
marker or operator-approved review decision. If the fields disagree, are absent,
or point to an unavailable source, the relationship remains unresolved.

## 9. Future capture requirement

When Shardwright controls branch creation, it SHOULD record the parent source,
fork anchor, creation event, and branch identity at creation time. That explicit
record takes precedence over later timestamp-based suggestions.

## 10. Required proof for implementation

Any implementation slice against this contract MUST prove, at minimum:

1. identical blocks deduplicate while all source occurrences remain queryable;
2. divergent blocks and suffixes are preserved without overwrite or deletion;
3. hidden/deleted/archive state remains occurrence- or branch-scoped;
4. historical fork suggestions expose evidence and remain unresolved until an
   operator decision;
5. accepted lineage appends a decision without mutating source content; and
6. explicit branch metadata outranks timestamp-based ordering; and
7. an explicit governed source scope, including accepted fork-anchor ranges,
   limits candidate families while retaining complete occurrence custody and
   refusing malformed scope; and
8. accepted lineage scope resolves only governed ancestors, while unresolved,
   conflicting, or cyclic lineage refuses without widening retrieval.
9. admission preview distinguishes readable JSONL from missing, unresolved,
   unreadable, and malformed sources without registering or ingesting.

Until those proofs are recorded, this contract claims policy only, not branch
inference or deduplication runtime behavior.
