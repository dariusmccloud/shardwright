import test from 'node:test';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendBranchLineageDecision, readBranchLineageLedger } from './branch-lineage-ledger.js';

function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; return value && typeof value === 'object' ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value); }
function hash(value) { return `sha256:${crypto.createHash('sha256').update(stable(value)).digest('hex')}`; }

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-lineage-'));
    const paths = { root, locksRoot: path.join(root, 'locks'), branchLineageLedgerPath: path.join(root, 'branch-lineage.jsonl'), branchLineageLockPath: path.join(root, 'locks', 'branch-lineage.lock'), transcriptSourceRevisionLedgerPath: path.join(root, 'source-revisions.jsonl'), transcriptMessageLedgerPath: path.join(root, 'messages.jsonl') };
    fs.mkdirSync(paths.locksRoot, { recursive: true });
    const receipts = [
        { sourceLogicalId: 'parent', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-parent', sourceCreationAtMs: 10, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: { mainChat: null, bookmarkLinks: [] } },
        { sourceLogicalId: 'child', characterInstanceId: 'character-1', sourceRevisionHash: 'rev-child', sourceCreationAtMs: 20, sourceCreationTimestampTier: 'FILESYSTEM_NATIVE', lineageHints: { mainChat: 'parent.jsonl', bookmarkLinks: [] } },
    ];
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, receipts.map((receipt, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `revision-${index}`, operation: 'OBSERVED_REVISION', receiptHash: hash(receipt), receipt })).join('\n') + '\n');
    const batches = [
        { sourceLogicalId: 'parent', sourceRevisionHash: 'rev-parent', rows: [{ sourceLocalOrder: 0, contentHash: 'a', messageRecordId: 'parent-0' }, { sourceLocalOrder: 1, contentHash: 'b', messageRecordId: 'parent-1' }, { sourceLocalOrder: 2, contentHash: 'c', messageRecordId: 'parent-2' }] },
        { sourceLogicalId: 'child', sourceRevisionHash: 'rev-child', rows: [{ sourceLocalOrder: 0, contentHash: 'a', messageRecordId: 'child-0' }, { sourceLocalOrder: 1, contentHash: 'b', messageRecordId: 'child-1' }, { sourceLocalOrder: 2, contentHash: 'd', messageRecordId: 'child-2' }] },
    ];
    fs.writeFileSync(paths.transcriptMessageLedgerPath, batches.map((batch, index) => JSON.stringify({ ledgerVersion: 1, sequence: index + 1, entryId: `message-${index}`, batchHash: hash(batch), batch })).join('\n') + '\n');
    return paths;
}

function decision(overrides = {}) {
    return {
        state: 'DECISION_READY', decision: 'ACCEPT_PROPOSED', operatorActionId: 'operator-1', recordedAt: '2026-09-20T00:00:00.000Z',
        proposedParentSourceLogicalId: 'parent', proposedChildSourceLogicalId: 'child', parentSourceLogicalId: 'parent', forkAnchor: { messageIndex: 1, contentHash: 'b' }, matchedPrefixLength: 2, ...overrides,
    };
}

test('appends and replays a hashed lineage decision', () => {
    const paths = fixture();
    const result = appendBranchLineageDecision(paths, decision());
    assert.equal(result.appended, true);
    assert.equal(readBranchLineageLedger(paths).length, 1);
    assert.equal(result.entry.sequence, 1);
});

test('same operator action is idempotent', () => {
    const paths = fixture();
    const first = appendBranchLineageDecision(paths, decision());
    const second = appendBranchLineageDecision(paths, decision());
    assert.equal(second.appended, false);
    assert.equal(second.entry.entryId, first.entry.entryId);
});

test('operator action collision refuses', () => {
    const paths = fixture();
    appendBranchLineageDecision(paths, decision());
    assert.throws(() => appendBranchLineageDecision(paths, decision({ decision: 'REJECT', parentSourceLogicalId: null, forkAnchor: null })), (error) => error.code === 'TIR_LINEAGE_IDEMPOTENCY_COLLISION');
});

test('non-ready decision refuses without creating a ledger', () => {
    const paths = fixture();
    assert.throws(() => appendBranchLineageDecision(paths, { state: 'REFUSED' }), (error) => error.code === 'TIR_LINEAGE_DECISION_NOT_READY');
    assert.deepEqual(readBranchLineageLedger(paths), []);
});

test('malformed ready decisions refuse before any ledger write', () => {
    const paths = fixture();
    assert.throws(() => appendBranchLineageDecision(paths, decision({ matchedPrefixLength: 0 })), (error) => error.code === 'TIR_LINEAGE_INVALID_INPUT');
    assert.throws(() => appendBranchLineageDecision(paths, decision({ forkAnchor: { messageIndex: -1, contentHash: '' } })), (error) => error.code === 'TIR_LINEAGE_INVALID_INPUT');
    assert.deepEqual(readBranchLineageLedger(paths), []);
});
