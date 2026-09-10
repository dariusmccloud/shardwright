// Immutable source-revision custody ledger. Receipts are operational evidence only;
// this module does not parse or retain transcript content and creates no retrieval data.

import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, createId, ensureStorageRoot, stableStringify } from './core.js';
import { TranscriptObservationState } from './transcript-source-observer.js';
import { readTranscriptSourceRegistryLedger } from './transcript-source-registry.js';

export const TRANSCRIPT_SOURCE_REVISION_LEDGER_VERSION = 1;
export const TRANSCRIPT_SOURCE_REVISION_OBSERVED = 'OBSERVED_REVISION';

function hash(value) { return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`; }
function lock(paths) { ensureStorageRoot(paths.locksRoot); try { fs.mkdirSync(paths.transcriptSourceRevisionLockPath); } catch (error) { if (error?.code === 'EEXIST') throw createError(409, 'Another source-revision append is in progress.', 'TIR_REVISION_LOCK_HELD'); throw error; } }
function unlock(paths) { fs.rmSync(paths.transcriptSourceRevisionLockPath, { recursive: true, force: true }); }

export function readTranscriptSourceRevisionLedger(paths) {
    if (!fs.existsSync(paths.transcriptSourceRevisionLedgerPath)) return [];
    return Object.freeze(fs.readFileSync(paths.transcriptSourceRevisionLedgerPath, 'utf8').split('\n').filter(Boolean).map((line, index) => {
        let entry; try { entry = JSON.parse(line); } catch { throw createError(409, `Source-revision ledger line ${index + 1} is malformed.`, 'TIR_REVISION_LEDGER_MALFORMED'); }
        if (entry.ledgerVersion !== TRANSCRIPT_SOURCE_REVISION_LEDGER_VERSION || entry.sequence !== index + 1 || entry.operation !== TRANSCRIPT_SOURCE_REVISION_OBSERVED || !entry.receipt || hash(entry.receipt) !== entry.receiptHash) {
            throw createError(409, 'Source-revision ledger entry is invalid.', 'TIR_REVISION_LEDGER_INVALID');
        }
        return Object.freeze(entry);
    }));
}

function assertObservedReceipt(paths, receipt) {
    if (!receipt || receipt.observationState !== TranscriptObservationState.OBSERVED || !receipt.sourceLogicalId || !receipt.characterInstanceId || !receipt.sourceRevisionHash || !Number.isInteger(receipt.byteLength)) {
        throw createError(400, 'Only a complete OBSERVED custody receipt may create a source revision.', 'TIR_REVISION_RECEIPT_INELIGIBLE');
    }
    const source = readTranscriptSourceRegistryLedger(paths).map((entry) => entry.payload).find((candidate) => candidate.sourceLogicalId === receipt.sourceLogicalId);
    if (!source || source.characterInstanceId !== receipt.characterInstanceId || source.sourceClass !== receipt.sourceClass) {
        throw createError(409, 'Observation receipt does not match registered source custody.', 'TIR_REVISION_RECEIPT_CUSTODY_MISMATCH');
    }
}

export function admitTranscriptSourceObservation(paths, receipt) {
    assertObservedReceipt(paths, receipt);
    lock(paths);
    try {
        const entries = readTranscriptSourceRevisionLedger(paths);
        const current = [...entries].reverse().find((entry) => entry.receipt.sourceLogicalId === receipt.sourceLogicalId);
        if (current && current.receipt.sourceRevisionHash === receipt.sourceRevisionHash) return Object.freeze({ entry: current, appended: false });
        const entry = Object.freeze({
            ledgerVersion: TRANSCRIPT_SOURCE_REVISION_LEDGER_VERSION,
            sequence: entries.length + 1,
            entryId: createId('transcript_source_revision'),
            operation: TRANSCRIPT_SOURCE_REVISION_OBSERVED,
            receiptHash: hash(receipt),
            receipt: Object.freeze({ ...receipt }),
        });
        const fd = fs.openSync(paths.transcriptSourceRevisionLedgerPath, 'a');
        try { fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        return Object.freeze({ entry, appended: true });
    } finally { unlock(paths); }
}
