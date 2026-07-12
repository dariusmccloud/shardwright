import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyStructuredOutputFormat,
    createJsonSchemaResponseFormat,
} from './structured-output.js';

const schema = {
    $id: 'https://summary-sharder/architectural-intermediate/v1',
    type: 'object',
    additionalProperties: false,
};

test('creates the strict OpenAI JSON Schema response-format shape', () => {
    assert.deepEqual(
        createJsonSchemaResponseFormat({
            name: 'architectural_intermediate_v1',
            schema,
        }),
        {
            type: 'json_schema',
            json_schema: {
                name: 'architectural_intermediate_v1',
                strict: true,
                schema,
            },
        },
    );
});

test('applies structured output without mutating the base request body', () => {
    const body = { model: 'test-model', messages: [] };
    const responseFormat = createJsonSchemaResponseFormat({
        name: 'architectural_intermediate_v1',
        schema,
    });

    const result = applyStructuredOutputFormat(body, responseFormat);

    assert.notEqual(result, body);
    assert.equal(Object.hasOwn(body, 'response_format'), false);
    assert.deepEqual(result, {
        ...body,
        response_format: responseFormat,
    });
});

test('leaves the original body unchanged when no structured output is requested', () => {
    const body = { model: 'test-model' };
    assert.equal(applyStructuredOutputFormat(body, null), body);
});

test('rejects malformed schema descriptors before a provider request is sent', () => {
    assert.throws(
        () => createJsonSchemaResponseFormat({ name: 'contains spaces', schema }),
        /schema name/,
    );
    assert.throws(
        () => createJsonSchemaResponseFormat({ name: 'valid_name', schema: [] }),
        /schema must be a JSON object/,
    );
    assert.throws(
        () => applyStructuredOutputFormat({}, { type: 'json_object' }),
        /must be a JSON Schema descriptor/,
    );
});
