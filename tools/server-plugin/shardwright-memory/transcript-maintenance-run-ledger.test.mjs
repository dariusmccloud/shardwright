import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getStoragePaths } from './core.js';
import {
    closeTranscriptMaintenanceRun,
    openTranscriptMaintenanceRun,
    readTranscriptMaintenanceRunLedger,
    replayTranscriptMaintenanceRuns,
    TranscriptMaintenanceTerminalState,
    TranscriptMaintenanceTrigger,
} from './transcript-maintenance-run-ledger.js';

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-maintenance-run-'));
    const paths = getStoragePaths(path.join(root, 'user'));
    const sourceScope = [{ sourceLogicalId: 'transcript_source_1', characterInstanceId: 'transcript_character_1', sourceClass: 'DIRECT' }];
    return { paths, sourceScope };
}

test('opens, closes, and replays a maintenance run with independent ledger entries', () => {
    const value = fixture();
    const opened = openTranscriptMaintenanceRun(value.paths, { triggerKind: TranscriptMaintenanceTrigger.ACTIVE_CHAT_CHANGE, sourceScope: value.sourceScope, startedAt: '2026-09-21T12:00:00.000Z' });
    const closed = closeTranscriptMaintenanceRun(value.paths, { runId: opened.entry.payload.runId, terminalState: TranscriptMaintenanceTerminalState.COMPLETED, completedCount: 1, expectedCount: 1, revisionBoundary: { byteLength: 42, modifiedAtMs: 10 }, outcome: 'UNCHANGED', recordedAt: '2026-09-21T12:00:01.000Z' });
    const entries = readTranscriptMaintenanceRunLedger(value.paths);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].operation, 'OPEN_MAINTENANCE_RUN');
    assert.equal(entries[1].operation, 'CLOSE_MAINTENANCE_RUN');
    assert.equal(replayTranscriptMaintenanceRuns(entries).get(opened.entry.payload.runId).state, 'COMPLETED');
    assert.equal(closed.state, 'COMPLETED');
});

test('an unclosed run replays as OPEN and cannot report success', () => {
    const value = fixture();
    const opened = openTranscriptMaintenanceRun(value.paths, { triggerKind: TranscriptMaintenanceTrigger.ACTIVE_CHAT_LOAD, sourceScope: value.sourceScope });
    const current = replayTranscriptMaintenanceRuns(readTranscriptMaintenanceRunLedger(value.paths)).get(opened.entry.payload.runId);
    assert.equal(current.state, 'OPEN');
    assert.throws(() => closeTranscriptMaintenanceRun(value.paths, { runId: 'missing', terminalState: TranscriptMaintenanceTerminalState.COMPLETED }), (error) => error?.code === 'TIR_MAINTENANCE_RUN_NOT_OPEN');
});

test('rejects malformed transitions and preserves the ledger boundary', () => {
    const value = fixture();
    assert.throws(() => openTranscriptMaintenanceRun(value.paths, { triggerKind: 'UNKNOWN', sourceScope: value.sourceScope }), (error) => error?.code === 'TIR_MAINTENANCE_TRIGGER_INVALID');
    assert.throws(() => openTranscriptMaintenanceRun(value.paths, { triggerKind: TranscriptMaintenanceTrigger.SCHEDULED, sourceScope: [] }), (error) => error?.code === 'TIR_MAINTENANCE_SCOPE_INVALID');
    fs.mkdirSync(value.paths.storageRoot, { recursive: true });
    fs.writeFileSync(value.paths.transcriptMaintenanceRunLedgerPath, '{not-json}\n');
    assert.throws(() => readTranscriptMaintenanceRunLedger(value.paths), (error) => error?.code === 'TIR_MAINTENANCE_LEDGER_MALFORMED');
});
