import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths, stableStringify } from './core.js';
import { projectDurableTranscriptExactContentEquivalence, projectTranscriptExactContentEquivalence, TranscriptFtsAdmissionScope } from './transcript-exact-content-equivalence.js';

const hash = (content) => `sha256:${crypto.createHash('sha256').update(content, 'utf8').digest('hex')}`;
const ledgerHash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
function row(id, sourceRevisionHash, content, sourceLogicalId = 'source') {
    return { messageRecordId: id, sourceLogicalId, sourceRevisionHash, sourceLocalOrder: 0, nativeMessageId: null, shardwrightMessageId: null, completeContent: content, contentHash: hash(content) };
}
function messageEntries(rows) {
    return rows.map((entry) => ({ batch: { sourceRevisionHash: entry.sourceRevisionHash, rows: [entry] } }));
}
function visibilityEntries(states) {
    return states.map(({ sourceRevisionHash, messageRecordId, visibilityState }) => ({ sourceRevisionHash, projection: { rows: [{ messageRecordId, visibilityState }] } }));
}
function sourceRevisionEntry(sequence, sourceLogicalId, characterInstanceId, sourceRevisionHash) {
    const receipt = { observationState: 'OBSERVED', sourceLogicalId, characterInstanceId, sourceRevisionHash, byteLength: 1 };
    return { ledgerVersion: 1, sequence, entryId: `revision-${sequence}`, operation: 'OBSERVED_REVISION', receiptHash: ledgerHash(receipt), receipt };
}

test('preserves duplicate source occurrences while making mixed visibility explicit', () => {
    const first = row('visible', 'sha256:revision-a', 'same exact text', 'branch-a');
    const second = row('hidden', 'sha256:revision-b', 'same exact text', 'branch-b');
    const result = projectTranscriptExactContentEquivalence(
        messageEntries([first, second]),
        visibilityEntries([
            { sourceRevisionHash: first.sourceRevisionHash, messageRecordId: first.messageRecordId, visibilityState: 'VISIBLE' },
            { sourceRevisionHash: second.sourceRevisionHash, messageRecordId: second.messageRecordId, visibilityState: 'HIDDEN' },
        ]),
    );
    assert.equal(result.families.length, 1);
    const family = result.families[0];
    assert.equal(family.occurrenceCount, 2);
    assert.equal(family.mixedEligibility, true);
    assert.deepEqual(family.occurrences.map((occurrence) => occurrence.messageRecordId), ['visible', 'hidden']);
    assert.deepEqual(family.occurrences.map((occurrence) => occurrence.admissionScope), [TranscriptFtsAdmissionScope.ORDINARY, TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY]);
});

test('keeps archived material archaeology-only and unrecoverable material out of FTS admission', () => {
    const archived = row('archived', 'sha256:revision-a', 'archive text');
    const deleted = row('deleted', 'sha256:revision-b', 'deleted text');
    const result = projectTranscriptExactContentEquivalence(
        messageEntries([archived, deleted]),
        visibilityEntries([
            { sourceRevisionHash: archived.sourceRevisionHash, messageRecordId: archived.messageRecordId, visibilityState: 'ARCHIVED' },
            { sourceRevisionHash: deleted.sourceRevisionHash, messageRecordId: deleted.messageRecordId, visibilityState: 'DELETED_OR_UNAVAILABLE' },
        ]),
    );
    assert.equal(result.families[0].occurrences[0].admissionScope, TranscriptFtsAdmissionScope.ARCHAEOLOGY_ONLY);
    assert.equal(result.families[1].occurrences[0].admissionScope, TranscriptFtsAdmissionScope.EXCLUDED);
});

test('admits a visible legacy occurrence only within its exact observed revision', () => {
    const legacy = row('legacy', 'sha256:revision-legacy', 'legacy visible text');
    const result = projectTranscriptExactContentEquivalence(
        messageEntries([legacy]),
        visibilityEntries([{ sourceRevisionHash: legacy.sourceRevisionHash, messageRecordId: legacy.messageRecordId, visibilityState: 'VISIBLE' }]),
    );
    assert.equal(result.families[0].occurrences[0].nativeMessageId, null);
    assert.equal(result.families[0].occurrences[0].shardwrightMessageId, null);
    assert.equal(result.families[0].occurrences[0].admissionScope, TranscriptFtsAdmissionScope.ORDINARY);
});

test('refuses message custody without an exact durable visibility projection', () => {
    const source = row('missing-visibility', 'sha256:revision-a', 'text');
    assert.throws(() => projectTranscriptExactContentEquivalence(messageEntries([source]), []), (error) => error?.code === 'TIR_EQUIVALENCE_VISIBILITY_UNAVAILABLE');
});

test('refuses a content hash that does not prove byte-exact complete text', () => {
    const source = { ...row('bad-hash', 'sha256:revision-a', 'text'), contentHash: 'sha256:wrong' };
    assert.throws(() => projectTranscriptExactContentEquivalence(
        messageEntries([source]),
        visibilityEntries([{ sourceRevisionHash: source.sourceRevisionHash, messageRecordId: source.messageRecordId, visibilityState: 'VISIBLE' }]),
    ), (error) => error?.code === 'TIR_EQUIVALENCE_CONTENT_HASH_MISMATCH');
});

test('reads only the current exact-content family from validated durable ledgers', () => {
    const paths = getStoragePaths(fs.mkdtempSync(path.join(os.tmpdir(), 'sw-equivalence-')));
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    const oldRow = { ...row('old', 'sha256:revision-old', 'old exact text'), characterInstanceId: 'character:jeep' };
    const durableRow = { ...row('durable', 'sha256:revision-current', 'durable exact text'), characterInstanceId: 'character:jeep' };
    const oldBatch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash: oldRow.sourceRevisionHash, rows: [oldRow] };
    const batch = { sourceLogicalId: 'source', characterInstanceId: 'character:jeep', sourceRevisionHash: durableRow.sourceRevisionHash, rows: [durableRow] };
    const messageEntries = [
        { ledgerVersion: 1, sequence: 1, entryId: 'old-message', batchHash: ledgerHash(oldBatch), batch: oldBatch },
        { ledgerVersion: 1, sequence: 2, entryId: 'message', batchHash: ledgerHash(batch), batch },
    ];
    const oldProjection = { rows: [{ messageRecordId: oldRow.messageRecordId, visibilityState: 'VISIBLE' }], tombstones: [] };
    const projection = { rows: [{ messageRecordId: durableRow.messageRecordId, visibilityState: 'VISIBLE' }], tombstones: [] };
    const visibilityEntries = [
        { sequence: 1, entryId: 'old-visibility', sourceRevisionHash: oldRow.sourceRevisionHash, projectionHash: ledgerHash(oldProjection), projection: oldProjection },
        { sequence: 2, entryId: 'visibility', sourceRevisionHash: durableRow.sourceRevisionHash, projectionHash: ledgerHash(projection), projection },
    ];
    fs.writeFileSync(paths.transcriptSourceRevisionLedgerPath, `${JSON.stringify(sourceRevisionEntry(1, 'source', 'character:jeep', oldRow.sourceRevisionHash))}\n${JSON.stringify(sourceRevisionEntry(2, 'source', 'character:jeep', durableRow.sourceRevisionHash))}\n`);
    fs.writeFileSync(paths.transcriptMessageLedgerPath, `${messageEntries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    fs.writeFileSync(paths.transcriptVisibilityLedgerPath, `${visibilityEntries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    const result = projectDurableTranscriptExactContentEquivalence(paths);
    assert.equal(result.families.length, 1);
    assert.equal(result.families[0].occurrences[0].messageRecordId, durableRow.messageRecordId);
});
