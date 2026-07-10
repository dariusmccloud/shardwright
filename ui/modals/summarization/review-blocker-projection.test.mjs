import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSaveBlockerProjection } from './review-blocker-projection.js';

test('architectural blocker projection turns invalid decision type into plain-language guidance', () => {
    const projection = buildSaveBlockerProjection([
        {
            level: 'error',
            code: 'ARCH_DECISION_TYPE_INVALID',
            sectionKey: 'decisions',
            message: 'Decision TYPE is invalid: ARCHITECTURE.',
        },
    ], { architectural: true });

    assert.equal(projection.blocked, true);
    assert.equal(projection.title, 'Blocked: Decisions failed validation');
    assert.match(projection.reason, /approved architectural vocabulary/i);
    assert.match(projection.nextStep, /allowed decision type/i);
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
