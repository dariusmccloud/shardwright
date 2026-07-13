import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSaveBlockerProjection } from './review-blocker-projection.js';

test('architectural blocker projection turns invalid decision type into plain-language guidance', () => {
    const projection = buildSaveBlockerProjection([
        {
            level: 'error',
            code: 'ARCH_DECISION_TYPE_INVALID',
            sectionKey: 'decisions',
            field: 'TYPE',
            invalidValue: 'ARCHITECTURE',
            allowedValues: ['GOVERNANCE', 'PROCEDURE'],
            message: 'This prose must not be parsed by the UI.',
        },
    ], { architectural: true });

    assert.equal(projection.blocked, true);
    assert.equal(projection.title, 'Blocked: Decisions failed validation');
    assert.equal(projection.reason, 'ERROR: Invalid TYPE "ARCHITECTURE" detected | Approved values: GOVERNANCE, PROCEDURE');
    assert.match(projection.nextStep, /allowed decision type/i);
});

test('architectural blocker projection turns invalid decision status into plain-language guidance', () => {
    const projection = buildSaveBlockerProjection([
        {
            level: 'error',
            code: 'ARCH_DECISION_STATUS_INVALID',
            sectionKey: 'decisions',
            field: 'STATUS',
            invalidValue: 'ACTIVE',
            allowedValues: ['PROPOSED', 'ACCEPTED', 'SEALED', 'SUPERSEDED'],
            message: 'This prose must not be parsed by the UI.',
        },
    ], { architectural: true });

    assert.equal(projection.blocked, true);
    assert.equal(projection.title, 'Blocked: Decisions failed validation');
    assert.equal(projection.reason, 'ERROR: Invalid STATUS "ACTIVE" detected | Approved values: PROPOSED, ACCEPTED, SEALED, SUPERSEDED');
    assert.match(projection.nextStep, /allowed decision status/i);
});

test('architectural blocker projection turns invalid thread reference into source-range guidance', () => {
    const projection = buildSaveBlockerProjection([
        {
            level: 'error',
            code: 'ARCH_THREAD_LAST_INVALID',
            sectionKey: 'threads',
            message: 'Thread last source reference is invalid: S297.',
        },
    ], { architectural: true });

    assert.equal(projection.blocked, true);
    assert.equal(projection.title, 'Blocked: Threads failed validation');
    assert.match(projection.reason, /outside the current extract range/i);
    assert.match(projection.nextStep, /adjust extraction scope/i);
});

test('architectural blocker projection renders other closed vocabularies from structured diagnostic data', () => {
    const projection = buildSaveBlockerProjection([
        {
            level: 'error',
            code: 'ARCH_THREAD_STATUS_INVALID',
            sectionKey: 'threads',
            field: 'STATUS',
            invalidValue: 'PAUSED',
            allowedValues: ['UNRESOLVED', 'DEVELOPING', 'ACTIVE', 'RESOLVED'],
            message: 'This prose must not be parsed by the UI.',
        },
    ], { architectural: true });

    assert.equal(projection.reason, 'ERROR: Invalid STATUS "PAUSED" detected | Approved values: UNRESOLVED, DEVELOPING, ACTIVE, RESOLVED');
});

test('generic blocker projection stays narrow for non-architectural save failures', () => {
    const projection = buildSaveBlockerProjection([
        {
            level: 'error',
            code: 'GENERIC_SAVE_ERROR',
            message: 'Section content is malformed.',
        },
    ]);

    assert.equal(projection.blocked, true);
    assert.equal(projection.title, 'Blocked: review output failed validation');
    assert.equal(projection.reason, 'Section content is malformed.');
    assert.match(projection.nextStep, /edit or regenerate/i);
});
