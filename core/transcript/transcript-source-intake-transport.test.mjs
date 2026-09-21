import test from 'node:test';
import assert from 'node:assert/strict';
import { intakeTranscriptSource } from './transcript-source-intake-transport.js';

test('intake transport is an explicit source-scoped action', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
        calls.push({ url, options });
        return url === '/csrf-token'
            ? { ok: true, json: async () => ({ token: 'csrf' }) }
            : { ok: true, json: async () => ({ ok: true, state: 'CURRENT', messages: { rowCount: 4 } }) };
    };
    const result = await intakeTranscriptSource('source-1', fetchImpl);
    assert.equal(result.state, 'CURRENT');
    assert.equal(JSON.parse(calls[1].options.body).sourceLogicalId, 'source-1');
});

test('intake transport refuses missing source identity', async () => {
    assert.equal((await intakeTranscriptSource('', async () => null)).reason, 'SOURCE_INTAKE_INPUT_INVALID');
});
