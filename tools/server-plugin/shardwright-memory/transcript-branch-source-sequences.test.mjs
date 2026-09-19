import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getStoragePaths } from './core.js';
import { projectTranscriptBranchSourceSequences } from './transcript-branch-source-sequences.js';

function hash(value) {
    const stable = Array.isArray(value)
        ? `[${value.map(stableStringify).join(',')}]`
        : stableStringify(value);
    return `sha256:${crypto.createHash('sha256').update(stable).digest('hex')}`;
}
function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
}

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-branch-sequences-'));
    const paths = getStoragePaths(path.join(root, 'user'));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const receiptA = { sourceLogicalId: 'source-a', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-a', sourceCreationAtMs: 10, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: { mainChat: null, bookmarkLinks: [] } };
    const receiptB = { sourceLogicalId: 'source-b', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-b', sourceCreationAtMs: 20, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: { mainChat: 'source-a.jsonl', bookmarkLinks: [{ sourceLocalOrder: 1, value: 'child-checkpoint.jsonl' }] } };
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, [receiptA, receiptB].map((receipt, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `revision-${index}`, operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt })).join('\n') + '\n');
    const batches = [
        { sourceLogicalId: 'source-a', sourceRevisionHash: 'rev-a', rows: [{ sourceLocalOrder: 0, contentHash: 'a', messageRecordId: 'a-0' }, { sourceLocalOrder: 1, contentHash: 'b', messageRecordId: 'a-1' }] },
        { sourceLogicalId: 'source-b', sourceRevisionHash: 'rev-b', rows: [{ sourceLocalOrder: 0, contentHash: 'a', messageRecordId: 'b-0' }, { sourceLocalOrder: 1, contentHash: 'c', messageRecordId: 'b-1' }] },
    ];
    fs.writeFileSync(paths.transcriptMessageLedgerPath, batches.map((batch, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `message-${index}`, batchHash: hash(batch), batch })).join('\n') + '\n');
    return paths;
}

test('projects current ordered source sequences with creation evidence', () => {
    const result = projectTranscriptBranchSourceSequences(fixture());
    assert.equal(result.state, 'PROJECTED');
    assert.deepEqual(result.sources.map((source) => source.messages.map((row) => row.contentHash)), [['a', 'b'], ['a', 'c']]);
    assert.equal(result.sources[0].creationTimestampTier, 'FILESYSTEM_NATIVE');
    assert.equal(result.sources[1].lineageHints.mainChat, 'source-a.jsonl');
});

test('source selection remains explicit', () => {
    const result = projectTranscriptBranchSourceSequences(fixture(), ['source-b']);
    assert.deepEqual(result.sources.map((source) => source.sourceLogicalId), ['source-b']);
});

test('invalid source selection refuses', () => {
    assert.throws(() => projectTranscriptBranchSourceSequences(fixture(), ['']), (error) => error.code === 'TIR_BRANCH_SOURCE_IDS_INVALID');
});
