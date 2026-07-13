import { validateArchitecturalIntermediatePayload } from './architectural-intermediate-validator.js';
import { classifyArchitecturalOverflowRepair } from './architectural-overflow-repair.js';

const ARCHITECTURAL_SECTION_KEYS = Object.freeze([
    'timeline', 'decisions', 'events', 'developments', 'dialogue', 'threads', 'current',
]);

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
        this.repairTarget = options.repairTarget?.eligible === true
            ? { ...options.repairTarget }
            : null;
        this.invalidPayload = options.invalidPayload && typeof options.invalidPayload === 'object'
            ? options.invalidPayload
            : null;
        this.normalization = options.normalization && typeof options.normalization === 'object'
            ? JSON.parse(JSON.stringify(options.normalization))
            : null;
        if (options.cause) {
            this.cause = options.cause;
        }
    }
}

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function removeExactDuplicateSectionRecords(payload) {
    if (!payload?.sections || typeof payload.sections !== 'object' || Array.isArray(payload.sections)) {
        return null;
    }
    const sections = [];
    let removedCount = 0;
    for (const sectionKey of ARCHITECTURAL_SECTION_KEYS) {
        const records = payload.sections[sectionKey];
        if (!Array.isArray(records) || records.length < 2) continue;
        const seen = new Set();
        const normalized = [];
        for (const record of records) {
            const signature = stableStringify(record);
            if (seen.has(signature)) {
                removedCount += 1;
                continue;
            }
            seen.add(signature);
            normalized.push(record);
        }
        if (normalized.length !== records.length) {
            payload.sections[sectionKey] = normalized;
            sections.push({
                sectionKey,
                beforeCount: records.length,
                afterCount: normalized.length,
                removedCount: records.length - normalized.length,
            });
        }
    }
    return removedCount > 0 ? {
        strategy: 'EXACT_DUPLICATE_SECTION_RECORDS_V1',
        removedCount,
        sections,
    } : null;
}

function normalizeResponseText(rawResponse) {
    if (typeof rawResponse !== 'string') {
        return '';
    }
    const normalized = rawResponse.replace(/^\uFEFF/u, '').trim();
    const fencedJson = normalized.match(/^```json[ \t]*\r?\n([\s\S]*)\r?\n```$/iu);
    return fencedJson ? fencedJson[1].trim() : normalized;
}

function summarizeSchemaDiagnostic(diagnostic, payload) {
    const instancePath = String(diagnostic?.instancePath || '');
    const field = String(diagnostic?.field || '');
    const location = field && !instancePath.endsWith(`/${field}`)
        ? `${instancePath}/${field}`.replace(/^\/$/u, '')
        : (instancePath || field || 'response');
    const message = String(diagnostic?.message || 'is invalid').trim();
    if (diagnostic?.keyword === 'const' && (instancePath === '/schemaVersion' || instancePath === '/profile')) {
        const fieldName = instancePath.slice(1);
        return `${location} ${message} (expected ${JSON.stringify(diagnostic?.params?.allowedValue)}; received ${JSON.stringify(payload?.[fieldName])})`;
    }
    return `${location} ${message}`;
}

/**
 * Parses and validates a complete architectural semantic response.
 * Accepts one outer JSON fence but does not extract partial JSON or repair content.
 *
 * @param {string} rawResponse
 * @returns {{ payload: object, schemaId: string, normalization: object|null }}
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

    const normalization = removeExactDuplicateSectionRecords(payload);

    const validation = validateArchitecturalIntermediatePayload(payload);
    if (!validation.ok) {
        const firstViolation = summarizeSchemaDiagnostic(validation.errors[0], payload);
        const repairTarget = classifyArchitecturalOverflowRepair(payload, validation.errors);
        throw new ArchitecturalSemanticResponseError(
            ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.SCHEMA_INVALID,
            `Architectural semantic response does not satisfy the required schema. First violation: ${firstViolation}.`,
            {
                phase: 'validate',
                schemaId: validation.schemaId,
                diagnostics: validation.errors,
                repairTarget,
                invalidPayload: payload,
                normalization,
            },
        );
    }

    return {
        payload,
        schemaId: validation.schemaId,
        normalization,
    };
}
