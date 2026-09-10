// Read-only complete-message candidate parser. Input bytes must match an immutable
// observed source revision; output is in-memory only and never establishes retrieval
// or memory authority.

import crypto from 'node:crypto';

import { createError, parseJsonlRecords } from './core.js';
import { TranscriptObservationState } from './transcript-source-observer.js';

export const TranscriptTimestampTier = Object.freeze({ METADATA_NATIVE: 'METADATA_NATIVE', UNAVAILABLE: 'UNAVAILABLE' });

function bytesHash(bytes) { return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`; }
function contentHash(content) { return `sha256:${crypto.createHash('sha256').update(content, 'utf8').digest('hex')}`; }

function assertRevision(revision) {
    const receipt = revision?.receipt;
    if (!receipt || receipt.observationState !== TranscriptObservationState.OBSERVED || !receipt.sourceRevisionHash || !receipt.sourceLogicalId || !receipt.characterInstanceId) {
        throw createError(400, 'A complete immutable observed source revision is required.', 'TIR_PARSE_REVISION_INELIGIBLE');
    }
    return receipt;
}

function timestamp(record) {
    const value = record?.send_date;
    return value == null || String(value).trim() === ''
        ? { value: null, tier: TranscriptTimestampTier.UNAVAILABLE }
        : { value: String(value), tier: TranscriptTimestampTier.METADATA_NATIVE };
}

export function parseTranscriptMessageCandidates(revision, rawBytes) {
    const receipt = assertRevision(revision);
    const bytes = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(String(rawBytes ?? ''), 'utf8');
    if (bytesHash(bytes) !== receipt.sourceRevisionHash) {
        throw createError(409, 'Source bytes do not match the immutable observed revision.', 'TIR_PARSE_REVISION_HASH_MISMATCH');
    }
    const { records, invalidLines } = parseJsonlRecords(bytes.toString('utf8'));
    const candidates = [];
    for (let sourceLocalOrder = 0; sourceLocalOrder < records.length; sourceLocalOrder += 1) {
        const record = records[sourceLocalOrder];
        if (!Object.hasOwn(record, 'mes') || typeof record.mes !== 'string') continue;
        const time = timestamp(record);
        candidates.push(Object.freeze({
            characterInstanceId: receipt.characterInstanceId,
            sourceLogicalId: receipt.sourceLogicalId,
            sourceRevisionHash: receipt.sourceRevisionHash,
            sourceLocalOrder,
            nativeMessageId: record.mesid == null ? null : String(record.mesid),
            shardwrightMessageId: typeof record.extra?.shardwright?.messageIdentity?.messageId === 'string' ? record.extra.shardwright.messageIdentity.messageId : null,
            senderName: typeof record.name === 'string' ? record.name : null,
            senderIsUser: record.is_user === true,
            timestampValue: time.value,
            timestampTier: time.tier,
            completeContent: record.mes,
            contentHash: contentHash(record.mes),
        }));
    }
    return Object.freeze({ sourceRevisionHash: receipt.sourceRevisionHash, candidates: Object.freeze(candidates), invalidLines: Object.freeze(invalidLines) });
}
