import {
    ARCHITECTURAL_DECISION_STATUSES,
    ARCHITECTURAL_DECISION_TYPES,
    ARCHITECTURAL_THREAD_STATUSES,
} from './architectural-sharder-contract.js';

export const ARCHITECTURAL_SEMANTIC_PROMPT_VERSION = 2;

/**
 * C0.6.9 semantic extraction contract.
 *
 * The live architectural pipeline consumes this contract through constrained
 * generation, strict validation, and deterministic canonical rendering.
 */
export const DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT = `Task: Extract architectural continuity as semantic JSON records.

OUTPUT CONTRACT

- Return exactly one JSON object matching architectural-intermediate-schema-v1.
- Return JSON only. Do not wrap it in Markdown or explanatory prose.
- Set the root property schemaVersion to the JSON number 1 exactly.
- Set the root property profile to the JSON string "architectural-memory" exactly.
- Produce meaning-bearing records. Code owns canonical shard formatting, legality, normalization, pruning, and rendering.
- Do not emit section headers, pipe-delimited fields, renderer syntax, or final Memory Shard text.
- Do not invent facts, source references, rationale, dialogue, decisions, status, or supersession.
- Preserve governing meaning and route records by function rather than topic.

SOURCE AND PROVENANCE

- Use only the supplied source content and source envelope.
- Every sourceRef, introRef, and lastRef must identify an exact supplied S-ordinal.
- Never repair, shorten, or guess an incomplete source reference.
- Preserve exact wording in dialogue.quote. Do not improve or paraphrase quotations.
- Use why "unstated" when the source establishes a decision but gives no explicit rationale.

SEMANTIC ROUTING

- timeline: chronological architectural pivots.
- decisions: durable conclusions, governing rationale, corrections, replacements, scope, authority, and lifecycle status.
- events: significant occurrences and decision transitions; use decisionIds only when the event creates or changes those decisions.
- developments: persistent resulting architecture, capability, document, system, workflow, or procedure changes.
- dialogue: exact statements with independent structural value.
- threads: unresolved work, pending implementation, required validation, known defects, and active review.
- current: the latest project state established by this bounded source; use an empty array when the source establishes none.

DECISION LAW

- Allowed types: ${ARCHITECTURAL_DECISION_TYPES.join(', ')}.
- Allowed statuses: ${ARCHITECTURAL_DECISION_STATUSES.join(', ')}.
- A proposal remains PROPOSED unless the source explicitly accepts, seals, or supersedes it.
- ACCEPTED and SEALED require explicit source support.
- SUPERSEDED requires an explicit replacement relationship.
- Omit problem, ruledOut, changed, anchor, supersedes, and supersededBy when they do not apply.
- Never write placeholder values such as "none" into omitted optional fields.

THREAD LAW

- Allowed statuses: ${ARCHITECTURAL_THREAD_STATUSES.join(', ')}.
- introRef and lastRef must be exact supplied S-ordinals.
- Omit notes when the source provides no additional thread context.

QUALITY CHECK

Before returning the object, verify that:

1. every record is explicitly supported by the source;
2. every closed-enum value uses the approved vocabulary above;
3. every property belongs to the supplied schema;
4. optional non-applicable properties are omitted rather than filled with placeholders;
5. no section duplicates another section's function;
6. no source reference or rationale was inferred;
7. the response contains only the semantic JSON object.`;
