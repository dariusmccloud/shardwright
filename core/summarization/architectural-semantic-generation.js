import { prepareArchitecturalSemanticShardForSave } from './architectural-semantic-pre-save.js';
import { createArchitecturalSemanticRequestDescriptor } from './architectural-semantic-request.js';
import { parseArchitecturalSemanticResponse } from './architectural-semantic-response.js';

export const ARCHITECTURAL_SEMANTIC_GENERATION_ERROR_CODES = Object.freeze({
    SOURCE_ENVELOPE_INVALID: 'ARCH_SEMANTIC_SOURCE_ENVELOPE_INVALID',
    SOURCE_ENVELOPE_MISMATCH: 'ARCH_SEMANTIC_SOURCE_ENVELOPE_MISMATCH',
});

export class ArchitecturalSemanticGenerationError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'ArchitecturalSemanticGenerationError';
        this.code = code;
        this.details = { ...details };
    }
}

function authoritativeSourceEnvelope(context) {
    const rangeStart = Number(context?.startIndex);
    const rangeEnd = Number(context?.endIndex);
    const messageIds = Array.isArray(context?.messageIds)
        ? context.messageIds.map((value) => String(value || '').trim())
        : [];

    const valid = Number.isInteger(rangeStart)
        && Number.isInteger(rangeEnd)
        && rangeEnd >= rangeStart
        && messageIds.length > 0
        && messageIds.every(Boolean)
        && new Set(messageIds).size === messageIds.length;

    if (!valid) {
        throw new ArchitecturalSemanticGenerationError(
            ARCHITECTURAL_SEMANTIC_GENERATION_ERROR_CODES.SOURCE_ENVELOPE_INVALID,
            'Architectural semantic generation requires a valid persisted source-message envelope.',
            { rangeStart, rangeEnd, messageIds },
        );
    }

    return { rangeStart, rangeEnd, messageIds };
}

function sameSourceEnvelope(actual, expected) {
    return Number(actual?.rangeStart) === expected.rangeStart
        && Number(actual?.rangeEnd) === expected.rangeEnd
        && Array.isArray(actual?.messageIds)
        && actual.messageIds.length === expected.messageIds.length
        && actual.messageIds.every((value, index) => value === expected.messageIds[index]);
}

function baselineShardText(context) {
    const blocks = (Array.isArray(context?.existingShards) ? context.existingShards : [])
        .map((shard, index) => {
            const content = String(shard?.content || '').trim();
            if (!content) return '';
            const label = String(shard?.identifier || `Selected Shard ${index + 1}`);
            return `--- BASELINE SHARD: ${label} ---\n${content}`;
        })
        .filter(Boolean);

    return blocks.length > 0
        ? `\n\nBASELINE SHARDS\nThese are context only. Preserve their stable decisions where relevant, but do not use their source references as evidence for new records.\n\n${blocks.join('\n\n')}`
        : '';
}

export function buildArchitecturalSemanticUserPrompt(chatText, context) {
    const source = authoritativeSourceEnvelope(context);
    return `AUTHORITATIVE SOURCE ENVELOPE
Copy this object exactly into the response source property:
${JSON.stringify(source)}

SOURCE REFERENCE RULE
Each [Msg N] label below identifies source ordinal SN. Use S<N>:<record-number> for exact record references.

CURRENT SOURCE CONTENT
${String(chatText || '').trim()}${baselineShardText(context)}`;
}

/**
 * Generates and proves one architectural semantic shard without permitting a
 * fallback to model-authored canonical syntax.
 */
export async function generateArchitecturalSemanticShard(options) {
    const {
        chatText,
        context,
        baselineDecisions = {},
        callApi,
        requestDescriptorOptions = {},
    } = options || {};

    if (typeof callApi !== 'function') {
        throw new TypeError('Architectural semantic generation requires an API caller.');
    }

    const source = authoritativeSourceEnvelope(context);
    const request = await createArchitecturalSemanticRequestDescriptor(requestDescriptorOptions);
    const userPrompt = buildArchitecturalSemanticUserPrompt(chatText, context);
    const rawResponse = await callApi(request.systemPrompt, userPrompt, {
        structuredOutput: request.structuredOutput,
    });
    const parsed = parseArchitecturalSemanticResponse(rawResponse);

    if (!sameSourceEnvelope(parsed.payload.source, source)) {
        throw new ArchitecturalSemanticGenerationError(
            ARCHITECTURAL_SEMANTIC_GENERATION_ERROR_CODES.SOURCE_ENVELOPE_MISMATCH,
            'Architectural semantic response source envelope does not match the persisted source messages.',
            { expected: source, actual: parsed.payload.source },
        );
    }

    const prepared = prepareArchitecturalSemanticShardForSave(parsed.payload, { baselineDecisions });
    return {
        ...prepared,
        rawResponse,
        promptVersion: request.promptVersion,
        semanticSchemaId: request.schemaId,
        semanticSchemaVersion: request.schemaVersion,
    };
}
