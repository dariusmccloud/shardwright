import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths, stableStringify } from './core.js';
import { admitTranscriptSourceToIndex } from './transcript-source-intake.js';
import { readTranscriptCoverage } from './transcript-coverage-diagnostic.js';

const hash = (value) => `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-source-intake-'));
    const paths = getStoragePaths(root);
    fs.mkdirSync(path.join(root, 'chats', 'Jeep'), { recursive: true });
    const sourceLogicalId = 'transcript_source_fixture';
    const characterInstanceId = 'transcript_character_fixture';
    const payload = {
        sourceLogicalId, characterInstanceId, sourceClass: 'DIRECT',
        hostLocator: 'Jeep.png:Fixture chat',
        sourceResolutionLocator: { kind: 'DIRECT', avatarUrl: 'Jeep.png', chatLocator: 'Fixture chat' },
        coverageState: 'NOT_SCANNED', historicalParticipantBasis: null,
        operatorActionId: 'operator:fixture', recordedAt: '2026-09-14T00:00:00.000Z',
    };
    const entry = { ledgerVersion: 1, sequence: 1, entryId: 'registration:fixture', operation: 'REGISTER_SOURCE', payloadHash: hash(payload), payload };
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    fs.writeFileSync(paths.transcriptSourceRegistryLedgerPath, `${JSON.stringify(entry)}\n`);
    const records = [
        { chat_metadata: { shardwright: {} } },
        { name: 'Chris', is_user: true, mes: 'first complete message', send_date: '2026-09-14T00:01:00.000Z' },
        { name: 'Jeep', is_user: false, mes: 'second complete message', send_date: '2026-09-14T00:02:00.000Z' },
    ];
    fs.writeFileSync(path.join(root, 'chats', 'Jeep', 'Fixture chat.jsonl'), `${records.map(JSON.stringify).join('\n')}\n`);
    const request = { user: { directories: { chats: path.join(root, 'chats'), groupChats: path.join(root, 'group chats') } } };
    return { paths, request, sourceLogicalId, characterInstanceId };
}

test('admits an observed source revision, complete rows, visibility, and current projection', () => {
    const { paths, request, sourceLogicalId, characterInstanceId } = fixture();
    const result = admitTranscriptSourceToIndex(paths, request, sourceLogicalId, { observedAt: '2026-09-14T23:30:00.000Z' });
    assert.equal(result.state, 'CURRENT');
    assert.equal(result.observation.observationState, 'OBSERVED');
    assert.equal(result.revision.appended, true);
    assert.equal(result.messages.rowCount, 2);
    assert.equal(result.visibility.rowCount, 2);
    assert.equal(result.projection.state, 'CURRENT');
    const coverage = readTranscriptCoverage(paths, characterInstanceId);
    assert.equal(coverage.state, 'CURRENT');
    assert.equal(coverage.documents, 2);
    assert.equal(coverage.occurrences, 2);
});

test('repeating intake for the same unchanged source is idempotent', () => {
    const { paths, request, sourceLogicalId } = fixture();
    const first = admitTranscriptSourceToIndex(paths, request, sourceLogicalId, { observedAt: '2026-09-14T23:30:00.000Z' });
    const second = admitTranscriptSourceToIndex(paths, request, sourceLogicalId, { observedAt: '2026-09-14T23:31:00.000Z' });
    assert.equal(first.state, 'CURRENT');
    assert.equal(second.state, 'CURRENT');
    assert.equal(second.revision.appended, false);
    assert.equal(second.messages.appended, false);
    assert.equal(second.visibility.appended, false);
    assert.equal(second.projection.changedDocuments, 0);
    assert.equal(second.projection.changedLinks, 0);
});
