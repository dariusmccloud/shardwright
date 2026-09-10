# Shardwright Operator Settings Catalog Contract

**Version:** 0.2.0  
**Status:** ENTERED — governing catalog boundary; individual settings and UI work
require separately declared slices.

## 1. Purpose

Operator-facing settings must be legible as part of a system, not a collection of
unexplained controls. A setting needs one declared path, type, safe base, bounds,
scope, label, help text, and UI metadata so defaults, validation, migration, and a
future renderer do not independently re-invent its meaning.

The catalog prevents an apparently harmless UI control from writing to the wrong
scope, silently inventing a default, or presenting an operational preference as
evidence authority.

## 2. Authority and projection boundary

`extension_settings.shardwright` remains the sole global persisted settings authority.
The catalog is code-owned declarative metadata. It is not a second settings store,
does not persist values, and does not override host settings persistence.

The catalog is a specification consumed by defaults, validators, migrations, and UI.
It is not evidence, memory authority, retrieval relevance, or a governance decision.

## 3. Required declaration

Every cataloged operator setting MUST declare:

- stable identifier and full settings path;
- type, safe-base default, and machine-enforced bounds;
- scope and the authority that owns that scope;
- plain-language label and help text explaining effect and boundary; and
- UI metadata sufficient for a renderer to present the intended control without
  inventing semantics.

Adding a value to a settings object does not make it cataloged. A catalog entry does
not authorize rendering or persistence beyond its declared scope.

## 4. Scope is jurisdiction

Scope controls both where a value may be edited and where it may persist. It is never
display-only metadata.

| Scope | Persisted authority | Editing rule |
| --- | --- | --- |
| `global` | `extension_settings.shardwright` | May be edited only through the extension-settings authority. |
| `character` | No owner yet declared | MUST refuse editing/persistence until a separate contract declares a character-owned store. It MUST NOT fall back to global state. |
| `chat` | `chat_metadata.shardwright` | May be edited only through the current chat-metadata authority. |
| `session` | None | May exist only in runtime memory and MUST NOT be persisted. |
| unknown | None | MUST refuse. |

A renderer MUST receive the authority adapter for the declared scope. It MUST NOT
derive an owner from a dotted path, display label, active character name, or title.

## 5. Safe bases and malformed values

A safe-base default is an explicit operator preference supplied for out-of-box
operation. It is not an inferred model capacity, a claim that a value is sufficient,
or permission to repair an explicit invalid choice.

When an existing setting is absent, a migration may add its declared safe base. When
an explicit value is malformed, a consumer MUST return an explicit unavailable or
invalid result rather than silently replace it with a guessed default.

## 6. Initial entry and boundary

The initial catalog entry is the global Transcript Recall capacity profile. It declares
the retrieval ceiling and one explicit additional-safety-headroom value. Its two controls may be rendered
only through the declared global owner and may persist only accepted values. This
does not create a generic renderer, catalog legacy settings, or authorize transcript
selection or injection.

## 7. Required proof

Initial closure requires proof that the entry has complete declaration metadata, its
safe bases are sourced from the catalog, bound checks use the catalog, and recognized,
unsupported, and unknown scopes are distinguishable without global fallback.

## 8. Initial proof record

The initial capacity-profile catalog and scope semantics are `PROVEN` by
`node --test core/settings-catalog.test.mjs core/transcript/capacity-profile.test.mjs`
on 2026-09-07 (8/8). The proof includes global ownership, character-scope refusal,
and unknown-scope refusal. It does not prove a generic renderer, a character-scoped owner,
or catalog coverage of legacy settings.

The initial control surface is `PROVEN` by
`node --test core/settings-catalog.test.mjs core/settings-catalog-ui.test.mjs core/transcript/capacity-profile.test.mjs`
on 2026-09-07 (13/13), plus a live local-panel inspection on the same date. It
renders exactly the four declared global capacity fields. Invalid field values and
malformed explicit profiles refuse before mutation; persistence remains the existing
global settings caller's responsibility. This proof does not establish a generic
renderer, a character-scoped owner, or catalog coverage of legacy settings.

## 9. Capacity-profile correction and migration proof

Version 0.2.0 replaces the ambiguous three-reservation profile with a two-field
profile: `retrievalCeilingTokens` and `safetyHeadroomTokens`. The latter is an
optional, plainly named cushion after the host has already measured assembled
prompt content and reserved its configured reply limit. A valid v1 profile is
migrated once to v2 with headroom zero and its exact old values retained at
`transcriptRecall.legacyCapacityProfileV1`; malformed v1 state still refuses.

The revised catalog, UI adapter, and profile migration are `PROVEN` by
`node --test core/settings-catalog.test.mjs core/settings-catalog-ui.test.mjs core/transcript/capacity-profile.test.mjs`
on 2026-09-07 (14/14). This does not authorize host settings mutation or generic
settings rendering.
