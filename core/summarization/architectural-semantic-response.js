import { validateArchitecturalIntermediatePayload } from './architectural-intermediate-validator.js';

export const ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES = Object.freeze({
    EMPTY: 'ARCH_SEMANTIC_RESPONSE_EMPTY',
    JSON_INVALID: 'ARCH_SEMANTIC_RESPONSE_JSON_INVALID',
    SCHEMA_INVALID: 'ARCH_SEMANTIC_RESPONSE_SCHEMA_INVALID',
});

export class ArchitecturalSemanticResponseError extends Error {
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'ArchitecturalSemanticResponseError';
        this.code = code;
        this.phase = options.phase || null;
        this.schemaId = options.schemaId || null;
        this.diagnostics = Array.isArray(options.diagnostics)
            ? options.diagnostics.map((diagnostic) => ({ ...diagnostic }))
            : [];
        if (options.cause) {
            this.cause = options.cause;
        }
    }
}

function normalizeResponseText(rawResponse) {
    if (typeof rawResponse !== 'string') {
        return '';
    }
    const normalized = rawResponse.replace(/^\uFEFF/u, '').trim();
    const fencedJson = normalized.match(/^```json[ \t]*\r?\n([\s\S]*)\r?\n```$/iu);
    return fencedJson ? fencedJson[1].trim() : normalized;
}

function summarizeSchemaDiagnostic(diagnostic) {
    const instancePath = String(diagnostic?.instancePath || '');
    const field = String(diagnostic?.field || '');
    const location = field && !instancePath.endsWith(`/${field}`)
        ? `${instancePath}/${field}`.replace(/^\/$/u, '')
        : (instancePath || field || 'response');
    const message = String(diagnostic?.message || 'is invalid').trim();
    return `${location} ${message}`;
}

/**
 * Parses and validates a complete architectural semantic response.
 * Accepts one outer JSON fence but does not extract partial JSON or repair content.
 *
 * @param {string} rawResponse
 * @returns {{ payload: object, schemaId: string }}
 */
export function parseArchitecturalSemanticResponse(rawResponse) {
    const responseText = normalizeResponseText(rawResponse);
    if (!responseText) {
        throw new ArchitecturalSemanticResponseError(
            ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.EMPTY,
            'Architectural semantic response is empty.',
            { phase: 'parse' },
        );
    }

    let payload;
    try {
        payload = JSON.parse(responseText);
    } catch (cause) {
        throw new ArchitecturalSemanticResponseError(
            ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.JSON_INVALID,
            'Architectural semantic response is not valid whole-response JSON.',
            { phase: 'parse', cause },
        );
    }

    const validation = validateArchitecturalIntermediatePayload(payload);
    if (!validation.ok) {
        const firstViolation = summarizeSchemaDiagnostic(validation.errors[0]);
        throw new ArchitecturalSemanticResponseError(
            ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.SCHEMA_INVALID,
            `Architectural semantic response does not satisfy the required schema. First violation: ${firstViolation}.`,
            {
                phase: 'validate',
                schemaId: validation.schemaId,
                diagnostics: validation.errors,
            },
        );
    }

    return {
        payload,
        schemaId: validation.schemaId,
    };
}
