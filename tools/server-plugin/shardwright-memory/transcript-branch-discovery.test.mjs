import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getStoragePaths } from './core.js';
import { discoverTranscriptCharacterBranches } from './transcript-branch-discovery.js';

test('discovers review-only branch suggestions for the current character', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-discovery-'));
    const paths = getStoragePaths(path.join(root, 'user'));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const stable = (value) => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);
    const hash = (value) => `sha256:${crypto.createHash('sha256').update(stable(value)).digest('hex')}`;
    const receipts = [
        { sourceLogicalId: 'parent', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-parent', sourceCreationAtMs: 10, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: {} },
        { sourceLogicalId: 'child', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-child', sourceCreationAtMs: 20, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: {} },
    ];
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, receipts.map((receipt, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `revision-${index}`, operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt })).join('\n') + '\n');
    const batches = [
        { sourceLogicalId: 'parent', sourceRevisionHash: 'rev-parent', rows: [{ sourceLocalOrder: 0, contentHash: 'a', messageRecordId: 'parent-0' }, { sourceLocalOrder: 1, contentHash: 'b', messageRecordId: 'parent-1' }] },
        { sourceLogicalId: 'child', sourceRevisionHash: 'rev-child', rows: [{ sourceLocalOrder: 0, contentHash: 'a', messageRecordId: 'child-0' }, { sourceLocalOrder: 1, contentHash: 'c', messageRecordId: 'child-1' }] },
    ];
    fs.writeFileSync(paths.transcriptMessageLedgerPath, batches.map((batch, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `message-${index}`, batchHash: hash(batch), batch })).join('\n') + '\n');
    const result = discoverTranscriptCharacterBranches(paths, 'character-1');
    assert.equal(result.state, 'REVIEW_REQUIRED_SET');
    assert.equal(result.reviewRequired, true);
    assert.deepEqual(result.sourceLogicalIds, ['parent', 'child']);
});

test('does not infer across characters or mutate lineage', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-discovery-empty-'));
    const paths = getStoragePaths(path.join(root, 'user'));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    assert.deepEqual(discoverTranscriptCharacterBranches(paths, 'character-unknown'), { state: 'NO_DISCOVERY', reason: 'INSUFFICIENT_SOURCES', characterInstanceId: 'character-unknown', sourceCount: 0, sourceLogicalIds: [], suggestions: [], coverage: { registeredCount: 0, unregisteredCount: 0, state: 'REGISTERED_ONLY' }, unregisteredSources: [] });
});
