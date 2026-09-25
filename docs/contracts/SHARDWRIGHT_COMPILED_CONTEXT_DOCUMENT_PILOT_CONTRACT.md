# Shardwright Compiled Context Document Pilot Contract

**Version:** 0.1.0
**Status:** PROPOSED — draft pilot boundary; not yet implementation authority.
**Classification:** Read-only document-compilation pilot; not chat retrieval, Phase X
memory authority, or prompt-delivery authority.

## 1. Purpose

This pilot tests whether Shardwright can compile two related EICF Markdown documents
into a rebuildable structural and dependency projection, then resolve a document task
to exact source sections without replacing the authoritative documents with a graph,
summary, embedding, or model answer.

The pilot preserves this causal bridge:

```text
document task → governing document → structural orientation
→ explicit dependency → exact authoritative source retrieval
→ bounded context plan
```

## 2. Authorized Sources

The pilot has exactly two source documents:

1. `EICF - Documentation Rulebook.md`
2. `EICF - Documentation Style Guide.md`

Each source is identified by a configured logical document identity and an exact
revision hash. The source file remains authoritative. Derived indexes, section maps,
relationships, and context plans are rebuildable projections. For this pilot, SQLite
is the operational projection store; it is never the authority for document content
or revision identity. The server plugin may materialize and query this projection
only from an explicitly supplied compiled registry; it must not discover or mutate
source files implicitly.

The Lexicon is intentionally **DEFERRED**. It is not an input to this pilot.

## 3. Canonical Names And Unresolved Aliases

The canonical rules document name is `EICF - Documentation Rulebook`.

`Rulebook` is a historical or possible alias, but aliases are authoritative only when
resolved through the future Lexicon intake. The pilot MUST NOT maintain a duplicate
alias table or infer that `Rulebook` means `EICF - Documentation Rulebook`.

Therefore:

- direct references to `EICF - Documentation Rulebook` MAY resolve;
- `Rulebook` references MUST remain visibly unresolved in this pilot;
- unresolved references MUST NOT be silently redirected by filename similarity,
  document proximity, or model judgment.

## 4. Derived Source Units

The compiler MUST derive source units from the document's structural headings and
their nesting. A source unit contains:

- `documentLogicalId`;
- deterministic `sourceUnitId` derived from the canonical document identity and
  normalized structural heading path;
- heading path and heading text;
- parent source-unit identity, when present;
- exact source line or byte span;
- exact source text;
- source revision hash.

The generated source-unit identity is a locator, not authority. A heading rename or
structural move MAY produce a new source-unit identity; continuity across such a
change requires an explicit migration or alias record in a later scope.

If a document region has no reliable heading boundary, the compiler MUST preserve it
as an enclosing source unit rather than inventing authoritative subdivisions.

## 5. Relationship Vocabulary

This pilot permits only explicit, bounded relationship types:

- `CONTAINS` — document or section contains a child section;
- `REFERENCES` — source text explicitly names another registered document or concept;
- `GOVERNS` — source text explicitly assigns governing responsibility;
- `REQUIRES` — source text explicitly requires another section or source;
- `APPLIES_TO` — source text explicitly identifies an application scope.

The compiler MUST NOT emit a generic `RELATED_TO` edge. Every derived relationship
MUST retain the source unit, source revision, exact supporting span, compiler version,
and derivation status. A derived relationship is not evidence authority.

## 6. Cross-Document Resolution

The Documentation Style Guide is the initial operational entry point for
document-authoring tasks. The Documentation Rulebook is a governing dependency
when the task reaches grammar, lexical
authority, operators, construction, jurisdiction, or scope.

The pilot MUST support this bounded resolution shape:

```text
DOCUMENT_AUTHORING
→ EICF Documentation Style Guide orientation
→ exact Documentation Style Guide source units
→ explicit dependency request
→ exact EICF Documentation Rulebook source units
```

The pilot MUST report unresolved references, including `Rulebook`, rather than
guessing their target.

## 7. Context Plan

The pilot MAY produce a context plan containing:

1. orientation units such as purpose, governance surfaces, structure, and provenance;
2. task-required source units;
3. conditional dependencies to be expanded when a governed concept is encountered;
4. exact source-unit identities and revision hashes.

The server projection boundary MAY return such a plan only after confirming that
the SQLite projection is current for the supplied registry. Returned units remain
exact source text; the plan does not authorize prompt injection or model-generated
substitution. Source loading, where used, requires explicit caller-supplied file
descriptors and fails closed on missing, unreadable, or empty files; the loader must
not infer paths from display names or discover additional files.

The context plan is not itself authoritative content. Runtime delivery, token
measurement, prompt placement, and host injection remain outside this contract.

## 8. Revision And Rebuild Behavior

When either source document changes:

- the exact source revision hash MUST change;
- affected source units and derived relationships MUST be invalidated or rebuilt;
- unchanged source units MAY be reused only when their source span and revision remain
  valid;
- no prior derived relationship may silently survive a changed supporting span.

A failed or incomplete compilation MUST leave the prior verified projection clearly
marked stale, pending, or unavailable. It MUST NOT be advertised as current.

## 9. Pilot Proof

The focused proof MUST use the actual two supplied EICF documents and demonstrate:

1. structural source units are derived from real headings;
2. exact source spans and revision hashes are retained;
3. `DOCUMENT_AUTHORING` selects the Documentation Style Guide as orientation;
4. an explicit Documentation Style Guide dependency resolves to exact
   Documentation Rulebook source units;
5. `Rulebook` remains unresolved without Lexicon intake;
6. changing a derived relationship does not change either source document;
7. changing a source document invalidates the affected derived projection;
8. no graph text, summary, or inferred answer is returned in place of source text.

## 10. Explicitly Out Of Scope

This pilot does not authorize:

- Lexicon migration or alias admission;
- sealed-prompt export or conversion;
- chat-message compilation;
- image or binary-source handling;
- semantic relationship admission;
- automatic or idle-triggered compilation;
- World Info or other host delivery integration;
- prompt injection or token-budget policy;
- cross-character or cross-chat sharing;
- Phase X authority, identity, membership, or governance decisions.

## 11. Failure Policy

The pilot MUST fail closed or remain visibly unresolved when:

- a source cannot be read or hashed;
- structural boundaries are ambiguous;
- a reference has no registered target;
- a supporting source span is missing or changed;
- a derived projection is stale or incomplete.

No failure may be repaired by title similarity, filename inference, model confidence,
or cached prompt text.

## 12. Exit Condition

The pilot remains a proposed contract until the focused proof succeeds and the
governing-document reconciliation gate confirms that the Delivery Register and any
related mission/capability entry accurately describe its status.

After proof, stop. Chat compilation, Lexicon intake, semantic relationship extraction,
and runtime delivery require separate bounded slices.
