const SECTION_OVERFLOW_PATH = /^\/sections\/(timeline|decisions|events|developments|dialogue|threads|current)$/u;
const SECTION_RECORD_DEFINITIONS = Object.freeze({
    timeline: 'timelineRecord',
    decisions: 'decisionRecord',
    events: 'eventRecord',
    developments: 'developmentRecord',
    dialogue: 'dialogueRecord',
    threads: 'threadRecord',
    current: 'currentRecord',
});

export const ARCHITECTURAL_OVERFLOW_REPAIR_VERSION = 1;
export const ARCHITECTURAL_OVERFLOW_REPAIR_ERROR_CODE = 'ARCH_OVERFLOW_REPAIR_RESPONSE_INVALID';

function refusal(reason) {
    return Object.freeze({ eligible: false, reason });
}

/**
 * Identifies schema failures that are safe to send to a section-bounded repair pass.
 * No payload content is changed here.
 *
 * @param {object} payload
 * @param {object[]} diagnostics
 * @returns {object}
 */
export function classifyArchitecturalOverflowRepair(payload, diagnostics) {
    const errors = Array.isArray(diagnostics) ? diagnostics : [];
    if (errors.length === 0 || errors.some((error) => error?.keyword !== 'maxItems')) {
        return refusal('NOT_EXCLUSIVE_OVERFLOW');
    }

    const targets = errors.map((error) => {
        const match = String(error?.instancePath || '').match(SECTION_OVERFLOW_PATH);
        const limit = Number(error?.params?.limit);
        return match && Number.isInteger(limit)
            ? { sectionKey: match[1], limit }
            : null;
    });
    if (targets.some((target) => !target)) {
        return refusal('INVALID_OVERFLOW_TARGET');
    }

    const sectionKeys = new Set(targets.map((target) => target.sectionKey));
    if (sectionKeys.size !== 1) {
        return refusal('MULTIPLE_OVERFLOW_SECTIONS');
    }

    const sectionKey = targets[0].sectionKey;
    const limits = new Set(targets.map((target) => target.limit));
    const items = payload?.sections?.[sectionKey];
    if (limits.size !== 1 || !Array.isArray(items) || items.length <= targets[0].limit) {
        return refusal('OVERFLOW_EVIDENCE_MISMATCH');
    }

    const limit = targets[0].limit;
    return Object.freeze({
        eligible: true,
        reason: 'SINGLE_SECTION_OVERFLOW',
        sectionKey,
        limit,
        actualCount: items.length,
        overflowCount: items.length - limit,
    });
}

function normalizeRepairResponseText(rawResponse) {
    if (typeof rawResponse !== 'string') return '';
    const normalized = rawResponse.replace(/^\uFEFF/u, '').trim();
    const fencedJson = normalized.match(/^```json[ \t]*\r?\n([\s\S]*)\r?\n```$/iu);
    return fencedJson ? fencedJson[1].trim() : normalized;
}

export function createArchitecturalOverflowRepairDescriptor(fullSchema, target, items) {
    const definitionName = SECTION_RECORD_DEFINITIONS[target?.sectionKey];
    const limit = Number(target?.limit);
    if (!definitionName || !Number.isInteger(limit) || limit < 1 || !Array.isArray(items)) {
        throw new TypeError('Architectural overflow repair requires one valid section target and its records.');
    }

    const schema = {
        type: 'object',
        additionalProperties: false,
        required: ['items'],
        properties: {
            items: {
                type: 'array',
                minItems: 1,
                maxItems: limit,
                items: { $ref: `#/$defs/${definitionName}` },
            },
        },
        $defs: fullSchema?.$defs || {},
    };

    return {
        systemPrompt: 'Consolidate only the supplied architectural section records to the stated cap. Preserve source-grounded meaning, identifiers, references, and lifecycle state. Do not add facts. Return only the required JSON object.',
        userPrompt: `SECTION: ${target.sectionKey}\nCAP: ${limit}\nRECORDS:\n${JSON.stringify(items)}`,
        structuredOutput: {
            type: 'json_schema',
            json_schema: {
                name: `architectural_${target.sectionKey}_repair_v${ARCHITECTURAL_OVERFLOW_REPAIR_VERSION}`,
                strict: true,
                schema,
            },
        },
    };
}

export function parseArchitecturalOverflowRepairResponse(rawResponse, target) {
    const responseText = normalizeRepairResponseText(rawResponse);
    let payload;
    try {
        payload = JSON.parse(responseText);
    } catch (cause) {
        const error = new Error('Architectural overflow repair did not return valid whole-response JSON.', { cause });
        error.code = ARCHITECTURAL_OVERFLOW_REPAIR_ERROR_CODE;
        throw error;
    }

    const keys = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? Object.keys(payload)
        : [];
    const limit = Number(target?.limit);
    if (keys.length !== 1
        || keys[0] !== 'items'
        || !Array.isArray(payload.items)
        || payload.items.length < 1
        || !Number.isInteger(limit)
        || payload.items.length > limit) {
        const error = new Error('Architectural overflow repair response does not satisfy the section repair contract.');
        error.code = ARCHITECTURAL_OVERFLOW_REPAIR_ERROR_CODE;
        throw error;
    }

    return payload.items;
}
