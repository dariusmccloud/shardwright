import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES,
    ArchitecturalSemanticResponseError,
    parseArchitecturalSemanticResponse,
} from './architectural-semantic-response.js';
import { ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID } from './architectural-semantic-request.js';

function validPayload() {
    return {
        schemaVersion: 1,
        profile: 'architectural-memory',
        source: {
            rangeStart: 10,
            rangeEnd: 12,
            messageIds: ['msg_alpha', 'msg_beta'],
        },
        sections: {
            timeline: [],
            decisions: [],
            events: [],
            developments: [],
            dialogue: [],
            threads: [],
            current: [],
        },
    };
}

function captureError(rawResponse) {
    assert.throws(
        () => parseArchitecturalSemanticResponse(rawResponse),
        (error) => {
            assert.equal(error instanceof ArchitecturalSemanticResponseError, true);
            captureError.last = error;
            return true;
        },
    );
    return captureError.last;
}

test('accepts a valid complete semantic response with outer whitespace and BOM', () => {
    const payload = validPayload();
    const result = parseArchitecturalSemanticResponse(`\uFEFF  ${JSON.stringify(payload)}\n`);

    assert.deepEqual(result.payload, payload);
    assert.equal(result.schemaId, ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID);
});

test('accepts exactly one outer JSON fence without changing the payload', () => {
    const payload = validPayload();
    const result = parseArchitecturalSemanticResponse(`\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``);

    assert.deepEqual(result.payload, payload);
    assert.equal(result.schemaId, ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID);
});

test('rejects empty and non-string responses', () => {
    for (const rawResponse of ['', '  ', null, { response: '{}' }]) {
        const error = captureError(rawResponse);
        assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.EMPTY);
        assert.equal(error.phase, 'parse');
        assert.deepEqual(error.diagnostics, []);
    }
});

test('rejects malformed, multiple-block, and trailing response content without repair', () => {
    const secret = 'private-model-output-marker';
    const invalidResponses = [
        '{"schemaVersion":',
        `\`\`\`json\n${JSON.stringify(validPayload())}\n\`\`\`\n\`\`\`json\n{}\n\`\`\``,
        `${JSON.stringify(validPayload())}\n${secret}`,
    ];

    for (const rawResponse of invalidResponses) {
        const error = captureError(rawResponse);
        assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.JSON_INVALID);
        assert.equal(error.phase, 'parse');
        assert.equal(error.message.includes(secret), false);
        assert.deepEqual(error.diagnostics, []);
    }
});

test('rejects schema-invalid JSON with structured validator diagnostics', () => {
    const payload = validPayload();
    payload.sections.decisions.push({
        sourceRef: 'S10',
        weight: 5,
        id: 'invalid-decision',
        types: ['ARCHITECTURE'],
        decision: 'Invalid semantic record.',
        why: 'unstated',
        scope: 'test',
        status: 'ACTIVE',
        evidence: ['S10'],
        invented: true,
    });

    const error = captureError(JSON.stringify(payload));
    assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.SCHEMA_INVALID);
    assert.equal(error.phase, 'validate');
    assert.equal(error.schemaId, ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID);
    assert.match(error.message, /First violation: \/sections\/decisions\/0\/invented must NOT have additional properties/u);
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.keyword === 'enum' && diagnostic.field === 'types'), true);
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.keyword === 'enum' && diagnostic.field === 'status'), true);
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.keyword === 'additionalProperties' && diagnostic.field === 'invented'), true);
    assert.equal(error.repairTarget, null);
});

test('root contract mismatch reports only the expected and received version values', () => {
    const payload = validPayload();
    payload.schemaVersion = 'architectural-intermediate/v1';

    const error = captureError(JSON.stringify(payload));

    assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.SCHEMA_INVALID);
    assert.match(
        error.message,
        /\/schemaVersion must be equal to constant \(expected 1; received "architectural-intermediate\/v1"\)/u,
    );
    assert.equal(error.message.includes(JSON.stringify(payload.source)), false);
});

test('removes exact duplicate section records before cap validation with stable metadata', () => {
    const payload = validPayload();
    const uniqueEvents = Array.from({ length: 12 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        description: `Event ${index + 1}`,
    }));
    payload.sections.events = [...uniqueEvents, { ...uniqueEvents[4] }];
    const rawResponse = JSON.stringify(payload);

    const first = parseArchitecturalSemanticResponse(rawResponse);
    const second = parseArchitecturalSemanticResponse(rawResponse);

    assert.deepEqual(first, second);
    assert.deepEqual(first.payload.sections.events, uniqueEvents);
    assert.deepEqual(first.normalization, {
        strategy: 'EXACT_DUPLICATE_SECTION_RECORDS_V1',
        removedCount: 1,
        sections: [{
            sectionKey: 'events',
            beforeCount: 13,
            afterCount: 12,
            removedCount: 1,
        }],
    });
});

test('deterministically prunes decision overflow while preserving sealed and correction-chain records', () => {
    const payload = validPayload();
    const decisions = Array.from({ length: 14 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: index < 2 ? 1 : 3,
        id: `decision-${String(index + 1).padStart(2, '0')}`,
        types: index === 1 ? ['CORRECTION'] : ['IMPLEMENTATION'],
        decision: `Decision ${index + 1}`,
        why: 'Source-grounded reason.',
        scope: 'decision cap proof',
        status: index === 0 ? 'SEALED' : 'PROPOSED',
        evidence: [`S10:${index + 1}`],
    }));
    payload.sections.decisions = decisions;
    const reversedPayload = structuredClone(payload);
    reversedPayload.sections.decisions.reverse();

    const first = parseArchitecturalSemanticResponse(JSON.stringify(payload));
    const second = parseArchitecturalSemanticResponse(JSON.stringify(reversedPayload));
    const retainedIds = first.payload.sections.decisions.map((decision) => decision.id);

    assert.deepEqual(retainedIds, second.payload.sections.decisions.map((decision) => decision.id));
    assert.equal(retainedIds.includes('decision-01'), true);
    assert.equal(retainedIds.includes('decision-02'), true);
    assert.equal(retainedIds.includes('decision-13'), false);
    assert.equal(retainedIds.includes('decision-14'), false);
    assert.deepEqual(first.normalization, {
        strategy: 'DETERMINISTIC_DECISION_CAP_V1',
        sectionKey: 'decisions',
        beforeCount: 14,
        afterCount: 12,
        removedCount: 2,
        protectedCount: 2,
        droppedDecisionIds: ['decision-13', 'decision-14'],
    });
});

test('exposes a repair target only for one exclusively overflowing section', () => {
    const payload = validPayload();
    payload.sections.events = Array.from({ length: 13 }, (_, index) => ({
        sourceRef: `S10:${index + 1}`,
        weight: 2,
        description: `Event ${index + 1}`,
    }));

    const error = captureError(JSON.stringify(payload));

    assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.SCHEMA_INVALID);
    assert.deepEqual(error.repairTarget, {
        eligible: true,
        reason: 'SINGLE_SECTION_OVERFLOW',
        sectionKey: 'events',
        limit: 12,
        actualCount: 13,
        overflowCount: 1,
    });
});
