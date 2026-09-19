import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { getStoragePaths } from './core.js';
import { registerBranchLineageRoute } from './branch-lineage-route.js';

function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; return value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value); }
function hash(value) { return `sha256:${crypto.createHash('sha256').update(stable(value)).digest('hex')}`; }
function seedCustody(root) {
    const paths = getStoragePaths(root);
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const receipts = [
        { sourceLogicalId: 'parent', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-parent', sourceCreationAtMs: 10, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: { mainChat: null, bookmarkLinks: [] } },
        { sourceLogicalId: 'child', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-child', sourceCreationAtMs: 20, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: { mainChat: 'parent.jsonl', bookmarkLinks: [] } },
    ];
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, receipts.map((receipt, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `revision-${index}`, operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt })).join('\n') + '\n');
    const batches = [
        { sourceLogicalId: 'parent', sourceRevisionHash: 'rev-parent', rows: [{ sourceLocalOrder: 0, contentHash: 'sha256:a', messageRecordId: 'parent-0' }, { sourceLocalOrder: 1, contentHash: 'sha256:b', messageRecordId: 'parent-1' }, { sourceLocalOrder: 2, contentHash: 'sha256:c', messageRecordId: 'parent-2' }] },
        { sourceLogicalId: 'child', sourceRevisionHash: 'rev-child', rows: [{ sourceLocalOrder: 0, contentHash: 'sha256:a', messageRecordId: 'child-0' }, { sourceLocalOrder: 1, contentHash: 'sha256:b', messageRecordId: 'child-1' }, { sourceLocalOrder: 2, contentHash: 'sha256:d', messageRecordId: 'child-2' }] },
    ];
    fs.writeFileSync(paths.transcriptMessageLedgerPath, batches.map((batch, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `message-${index}`, batchHash: hash(batch), batch })).join('\n') + '\n');
}

function routerFixture() {
    const routes = {};
    registerBranchLineageRoute({ post: (route, handler) => { routes[route] = handler; } });
    return routes;
}

function request(root, body = {}) {
    return { body, user: { directories: { root } } };
}

function response() {
    return { value: null, send(value) { this.value = value; return value; }, status() { return this; } };
}

test('lineage routes are registered at the explicit transport boundary', () => {
    const routes = routerFixture();
    assert.equal(typeof routes['/transcript-recall/branches/suggest'], 'function');
    assert.equal(typeof routes['/transcript-recall/branches/lineage/list'], 'function');
    assert.equal(typeof routes['/transcript-recall/branches/lineage/append'], 'function');
});

test('suggest route refuses without two explicit source IDs', async () => {
    const routes = routerFixture();
    const result = response();
    await routes['/transcript-recall/branches/suggest'](request(fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-lineage-suggest-')), { sourceLogicalIds: ['one'] }), result);
    assert.deepEqual(result.value, { ok: true, state: 'REFUSED', reason: 'FORK_SUGGESTION_REQUIRES_TWO_SOURCES' });
});

test('suggest route accepts a review set of three explicit source IDs', async () => {
    const routes = routerFixture();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-lineage-set-'));
    const result = response();
    await routes['/transcript-recall/branches/suggest'](request(root, { sourceLogicalIds: ['one', 'two', 'three'] }), result);
    assert.deepEqual(result.value, { ok: true, state: 'REFUSED', reason: 'FORK_SUGGESTION_SOURCE_SET_INCOMPLETE' });
});

test('append and list route use authenticated storage projection', async () => {
    const routes = routerFixture();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-lineage-route-'));
    seedCustody(root);
    const appendResponse = response();
    await routes['/transcript-recall/branches/lineage/append'](request(root, {
        state: 'DECISION_READY', decision: 'LEAVE_INDEPENDENT', operatorActionId: 'operator-1', recordedAt: '2026-09-20T00:00:00.000Z',
        proposedParentSourceLogicalId: 'parent', proposedChildSourceLogicalId: 'child', matchedPrefixLength: 2, forkAnchor: { messageIndex: 1, contentHash: 'sha256:b' },
    }), appendResponse);
    assert.equal(appendResponse.value.ok, true);
    const listResponse = response();
    await routes['/transcript-recall/branches/lineage/list'](request(root), listResponse);
    assert.equal(listResponse.value.ok, true);
    assert.equal(listResponse.value.entries.length, 1);
});
