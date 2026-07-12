import assert from 'node:assert/strict';
import test from 'node:test';

import { buildConnectionProfileOverridePayload } from './connection-profile-request-options.js';
import { createJsonSchemaResponseFormat } from './structured-output.js';

const structuredOutput = createJsonSchemaResponseFormat({
    name: 'architectural_intermediate_v1',
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {},
    },
});

test('forwards SillyTavern json_schema for chat-completions profiles', () => {
    const payload = buildConnectionProfileOverridePayload({
        temperature: 0.3,
        topP: 1,
        removeStopStrings: true,
        structuredOutput,
        supportsStructuredOutput: true,
    });

    assert.equal(payload.temperature, 0.3);
    assert.equal(payload.top_p, 1);
    assert.deepEqual(payload.stop, []);
    assert.deepEqual(payload.json_schema, {
        name: structuredOutput.json_schema.name,
        value: structuredOutput.json_schema.schema,
        strict: true,
    });
    assert.equal(Object.hasOwn(payload, 'response_format'), false);
});

test('does not send json_schema to text-completion profiles', () => {
    const payload = buildConnectionProfileOverridePayload({
        temperature: 0.3,
        topP: 1,
        structuredOutput,
        supportsStructuredOutput: false,
    });

    assert.equal(Object.hasOwn(payload, 'json_schema'), false);
});
