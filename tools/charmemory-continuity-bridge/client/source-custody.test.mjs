import assert from 'node:assert/strict';
import test from 'node:test';

import { readCurrentAttachment, SourceCustodyError } from './source-custody.js';

test('reads the active attachment without permitting a cache substitution', async () => {
    let observedUrl = null;
    let observedOptions = null;
    const content = await readCurrentAttachment(async (url, options) => {
        observedUrl = url;
        observedOptions = options;
        return { ok: true, text: async () => '<memory chat="Jeep">current record</memory>' };
    }, '/user/files/current-jeep-memory.txt', { 'X-CSRF-Token': 'test' });

    assert.equal(content, '<memory chat="Jeep">current record</memory>');
    assert.equal(observedUrl, '/user/files/current-jeep-memory.txt');
    assert.equal(observedOptions.cache, 'no-store');
    assert.deepEqual(observedOptions.headers, { 'X-CSRF-Token': 'test' });
});

test('refuses a missing active attachment instead of using stale cached content', async () => {
    await assert.rejects(
        () => readCurrentAttachment(async () => ({ ok: false, text: async () => 'missing' }), '/user/files/deleted-jeep-memory.txt'),
        (error) => error instanceof SourceCustodyError && error.code === 'CONTINUITY_SOURCE_UNAVAILABLE',
    );
});

test('refuses an empty active attachment', async () => {
    await assert.rejects(
        () => readCurrentAttachment(async () => ({ ok: true, text: async () => '  ' }), '/user/files/empty-jeep-memory.txt'),
        (error) => error instanceof SourceCustodyError && error.code === 'CONTINUITY_SOURCE_CONTENT_EMPTY',
    );
});
