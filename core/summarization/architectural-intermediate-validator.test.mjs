import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { validateArchitecturalIntermediatePayload as validateBrowserPayload } from './architectural-intermediate-validator.js';
import { validateArchitecturalIntermediatePayload as validateServerPayload } from '../../tools/server-plugin/summary-sharder-memory/architectural-intermediate-validator.js';

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

test('browser ESM validator contains no CommonJS or Ajv runtime dependency', () => {
    const source = fs.readFileSync(
        new URL('./architectural-intermediate-validator.generated.js', import.meta.url),
        'utf8',
    );

    assert.equal(source.includes('module.exports'), false);
    assert.equal(source.includes('require('), false);
    assert.equal(source.includes('ajv/dist/runtime'), false);
});

test('browser and server validators accept the same valid payload', () => {
    const payload = validPayload();
    assert.deepEqual(validateBrowserPayload(payload), validateServerPayload(payload));
    assert.equal(validateBrowserPayload(payload).ok, true);
});

test('browser and server validators reject the same invalid semantic payload', () => {
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

    const browserResult = validateBrowserPayload(payload);
    const serverResult = validateServerPayload(payload);

    assert.deepEqual(browserResult, serverResult);
    assert.equal(browserResult.ok, false);
    assert.equal(browserResult.errors.some((error) => error.keyword === 'enum' && error.field === 'types'), true);
    assert.equal(browserResult.errors.some((error) => error.keyword === 'enum' && error.field === 'status'), true);
    assert.equal(browserResult.errors.some((error) => error.keyword === 'additionalProperties' && error.field === 'invented'), true);
});

test('browser and server validators enforce unique semantic values identically', () => {
    const payload = validPayload();
    payload.source.messageIds.push('msg_alpha');

    const browserResult = validateBrowserPayload(payload);
    const serverResult = validateServerPayload(payload);

    assert.deepEqual(browserResult, serverResult);
    assert.equal(browserResult.ok, false);
    assert.equal(browserResult.errors.some((error) => error.keyword === 'uniqueItems'), true);
});
