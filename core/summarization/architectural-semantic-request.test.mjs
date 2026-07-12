import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT } from './architectural-semantic-prompt.js';
import {
    ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID,
    ARCHITECTURAL_INTERMEDIATE_SCHEMA_URL,
    ARCHITECTURAL_INTERMEDIATE_SCHEMA_VERSION,
    ARCHITECTURAL_INTERMEDIATE_RESPONSE_NAME,
    createArchitecturalSemanticRequestDescriptor,
    loadArchitecturalIntermediateSchema,
} from './architectural-semantic-request.js';

test('canonical schema URL resolves beside the semantic request module', () => {
    assert.equal(
        ARCHITECTURAL_INTERMEDIATE_SCHEMA_URL.href.endsWith('/core/summarization/architectural-intermediate-schema-v1.json'),
        true,
    );
});

function validSchema() {
    return {
        $id: ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID,
        type: 'object',
        properties: {
            schemaVersion: { const: ARCHITECTURAL_INTERMEDIATE_SCHEMA_VERSION },
        },
    };
}

function jsonResponse(value, { ok = true, status = 200 } = {}) {
    return {
        ok,
        status,
        json: async () => value,
    };
}

test('loads and verifies the versioned schema from the supplied module-relative URL', async () => {
    const calls = [];
    const schemaUrl = new URL('https://example.test/architectural-intermediate-schema-v1.json');
    const schema = await loadArchitecturalIntermediateSchema({
        schemaUrl,
        fetchImpl: async (url) => {
            calls.push(String(url));
            return jsonResponse(validSchema());
        },
    });

    assert.deepEqual(calls, [String(schemaUrl)]);
    assert.equal(schema.$id, ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID);
});

test('assembles prompt, schema identity, and strict response format into one descriptor', async () => {
    const schema = validSchema();
    const descriptor = await createArchitecturalSemanticRequestDescriptor({
        schemaUrl: 'https://example.test/schema.json',
        fetchImpl: async () => jsonResponse(schema),
    });

    assert.equal(descriptor.schemaId, ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID);
    assert.equal(descriptor.schemaVersion, ARCHITECTURAL_INTERMEDIATE_SCHEMA_VERSION);
    assert.equal(descriptor.promptVersion, 1);
    assert.equal(descriptor.systemPrompt, DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT);
    assert.deepEqual(descriptor.structuredOutput, {
        type: 'json_schema',
        json_schema: {
            name: ARCHITECTURAL_INTERMEDIATE_RESPONSE_NAME,
            strict: true,
            schema,
        },
    });
});

test('rejects unavailable and identity-mismatched schemas truthfully', async () => {
    await assert.rejects(
        () => loadArchitecturalIntermediateSchema({
            schemaUrl: 'https://example.test/missing.json',
            fetchImpl: async () => jsonResponse({}, { ok: false, status: 404 }),
        }),
        /Could not load architectural intermediate schema \(404\)/,
    );

    await assert.rejects(
        () => loadArchitecturalIntermediateSchema({
            schemaUrl: 'https://example.test/wrong.json',
            fetchImpl: async () => jsonResponse({
                ...validSchema(),
                $id: 'https://example.test/wrong',
            }),
        }),
        /schema identity mismatch/,
    );

    await assert.rejects(
        () => loadArchitecturalIntermediateSchema({
            schemaUrl: 'https://example.test/wrong-version.json',
            fetchImpl: async () => jsonResponse({
                ...validSchema(),
                properties: { schemaVersion: { const: 2 } },
            }),
        }),
        /schema version mismatch/,
    );
});
