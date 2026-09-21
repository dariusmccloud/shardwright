import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSourceInventoryView } from './source-inventory-view.js';

test('source inventory renders only entries for the active character', () => {
    const html = renderSourceInventoryView({ state: 'LISTED', entries: [
        { characterInstanceId: 'character-jeep', sourceClass: 'DIRECT', hostLocator: 'Jeep.png:chat-a', coverageState: 'NOT_SCANNED' },
        { characterInstanceId: 'character-other', sourceClass: 'GROUP', hostLocator: 'group-chat', coverageState: 'SCANNED_WITH_SOURCE' },
    ] }, 'character-jeep');
    assert.match(html, /Found 1 registered source/);
    assert.match(html, /Jeep\.png:chat-a/);
    assert.doesNotMatch(html, /group-chat/);
    assert.match(html, /Not scanned/);
});

test('source inventory renders empty and refusal states without implying a scan', () => {
    assert.match(renderSourceInventoryView({ state: 'LISTED', entries: [] }, 'character-jeep'), /No registered sources/);
    assert.match(renderSourceInventoryView({ state: 'REFUSED', reason: 'SOURCE_LIST_ROUTE_UNAVAILABLE' }, 'character-jeep'), /could not be loaded/);
});

test('source inventory escapes display-only locator text', () => {
    const html = renderSourceInventoryView({ state: 'LISTED', entries: [{ characterInstanceId: 'character-jeep', sourceClass: 'DIRECT', hostLocator: '<script>alert(1)</script>', coverageState: 'SCAN_FAILED', failureCode: 'READ_FAILED' }] }, 'character-jeep');
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /Scan failed/);
});
