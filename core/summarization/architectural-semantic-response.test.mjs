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

test('rejects empty and non-string responses', () => {
    for (const rawResponse of ['', '  ', null, { response: '{}' }]) {
        const error = captureError(rawResponse);
        assert.equal(error.code, ARCHITECTURAL_SEMANTIC_RESPONSE_ERROR_CODES.EMPTY);
        assert.equal(error.phase, 'parse');
        assert.deepEqual(error.diagnostics, []);
    }
});

test('rejects fenced, malformed, and trailing response content without repair', () => {
    const secret = 'private-model-output-marker';
    const invalidResponses = [
        `\`\`\`json\n${JSON.stringify(validPayload())}\n\`\`\``,
        '{"schemaVersion":',
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
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.keyword === 'enum' && diagnostic.field === 'types'), true);
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.keyword === 'enum' && diagnostic.field === 'status'), true);
    assert.equal(error.diagnostics.some((diagnostic) => diagnostic.keyword === 'additionalProperties' && diagnostic.field === 'invented'), true);
});
