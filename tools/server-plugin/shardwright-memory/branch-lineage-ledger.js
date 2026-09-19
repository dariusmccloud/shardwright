import crypto from 'node:crypto';
import fs from 'node:fs';

import { createError, createId, ensureStorageRoot, stableStringify } from './core.js';
import { projectTranscriptBranchSourceSequences } from './transcript-branch-source-sequences.js';
import { suggestHistoricalFork } from './transcript-branch-lineage-suggestion.js';

export const BRANCH_LINEAGE_LEDGER_VERSION = 1;
export const BRANCH_LINEAGE_DECISION = 'BRANCH_LINEAGE_DECISION';

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function required(value, name) {
    const normalized = String(value || '').trim();
    if (!normalized) throw createError(400, `${name} is required.`, 'TIR_LINEAGE_INVALID_INPUT');
    return normalized;
}

function validateDecisionShape(decisionRecord) {
    const decision = required(decisionRecord.decision, 'decision');
    if (!['ACCEPT_PROPOSED', 'CHOOSE_PARENT', 'LEAVE_INDEPENDENT', 'REJECT'].includes(decision)) throw createError(400, 'decision is invalid.', 'TIR_LINEAGE_INVALID_INPUT');
    if (!Number.isInteger(decisionRecord.matchedPrefixLength) || decisionRecord.matchedPrefixLength < 1) throw createError(400, 'matchedPrefixLength must be a positive integer.', 'TIR_LINEAGE_INVALID_INPUT');
    const associationDecision = decision === 'ACCEPT_PROPOSED' || decision === 'CHOOSE_PARENT';
    if (associationDecision && !decisionRecord.parentSourceLogicalId) throw createError(400, 'parentSourceLogicalId is required for an association decision.', 'TIR_LINEAGE_INVALID_INPUT');
    if (associationDecision && (!decisionRecord.forkAnchor || !Number.isInteger(decisionRecord.forkAnchor.messageIndex) || decisionRecord.forkAnchor.messageIndex < 0 || typeof decisionRecord.forkAnchor.contentHash !== 'string' || !decisionRecord.forkAnchor.contentHash.trim())) throw createError(400, 'forkAnchor is required for an association decision.', 'TIR_LINEAGE_INVALID_INPUT');
    if (decisionRecord.forkAnchor != null && (!Number.isInteger(decisionRecord.forkAnchor.messageIndex) || decisionRecord.forkAnchor.messageIndex < 0 || typeof decisionRecord.forkAnchor.contentHash !== 'string' || !decisionRecord.forkAnchor.contentHash.trim())) throw createError(400, 'forkAnchor is malformed.', 'TIR_LINEAGE_INVALID_INPUT');
}

function validateAgainstCurrentCustody(paths, decisionRecord) {
    const sourceIds = Array.isArray(decisionRecord.sourceLogicalIds) && decisionRecord.sourceLogicalIds.length === 2 ? decisionRecord.sourceLogicalIds : [decisionRecord.proposedParentSourceLogicalId, decisionRecord.proposedChildSourceLogicalId];
    if (sourceIds[0] === sourceIds[1]) throw createError(409, 'Lineage decision must reference two distinct sources.', 'TIR_LINEAGE_EVIDENCE_INVALID');
    if (!paths.transcriptSourceRevisionLedgerPath || !paths.transcriptMessageLedgerPath) throw createError(409, 'Current source custody is unavailable.', 'TIR_LINEAGE_EVIDENCE_UNAVAILABLE');
    const projected = projectTranscriptBranchSourceSequences(paths, sourceIds);
    if (projected.sources.length !== 2) throw createError(409, 'Current source custody does not contain both reviewed sources.', 'TIR_LINEAGE_EVIDENCE_UNAVAILABLE');
    const suggestion = suggestHistoricalFork({ sources: projected.sources });
    if (suggestion.state !== 'REVIEW_REQUIRED') throw createError(409, 'Current source custody no longer supports the reviewed fork evidence.', 'TIR_LINEAGE_EVIDENCE_INVALID');
    if (suggestion.matchedPrefixLength !== decisionRecord.matchedPrefixLength || (decisionRecord.forkAnchor && (suggestion.forkAnchor.contentHash !== decisionRecord.forkAnchor.contentHash || suggestion.forkAnchor.messageIndex !== decisionRecord.forkAnchor.messageIndex))) {
        throw createError(409, 'Lineage review evidence is stale or contradictory.', 'TIR_LINEAGE_EVIDENCE_STALE');
    }
    const selectedParent = decisionRecord.parentSourceLogicalId;
    if (selectedParent && !sourceIds.includes(selectedParent)) throw createError(409, 'Selected parent is outside the reviewed source pair.', 'TIR_LINEAGE_PARENT_UNSUPPORTED');
    if (decisionRecord.decision === 'ACCEPT_PROPOSED' && suggestion.proposedParentSourceLogicalId !== selectedParent) throw createError(409, 'Proposed parent no longer matches current evidence.', 'TIR_LINEAGE_EVIDENCE_STALE');
    return Object.freeze({
        suggestion,
        sourceRevisions: Object.freeze(projected.sources.map((source) => Object.freeze({ sourceLogicalId: source.sourceLogicalId, sourceRevisionHash: source.sourceRevisionHash }))),
        timestampTiers: Object.freeze(projected.sources.map((source) => Object.freeze({ sourceLogicalId: source.sourceLogicalId, creationTimestampTier: source.creationTimestampTier, createdAtMs: source.createdAtMs }))),
        lineageEvidence: Object.freeze(projected.sources.map((source) => Object.freeze({ sourceLogicalId: source.sourceLogicalId, lineageHints: source.lineageHints }))),
        reviewEvidence: Object.freeze({ matchedPrefixLength: suggestion.matchedPrefixLength, forkAnchor: suggestion.forkAnchor, proposedParentSourceLogicalId: suggestion.proposedParentSourceLogicalId, proposedChildSourceLogicalId: suggestion.proposedChildSourceLogicalId }),
    });
}

function lock(paths) {
    ensureStorageRoot(paths.locksRoot);
    try { fs.mkdirSync(paths.branchLineageLockPath); } catch (error) {
        if (error?.code === 'EEXIST') throw createError(409, 'Another branch lineage append is in progress.', 'TIR_LINEAGE_LOCK_HELD');
        throw error;
    }
}

function unlock(paths) {
    fs.rmSync(paths.branchLineageLockPath, { recursive: true, force: true });
}

function append(paths, entry) {
    const fd = fs.openSync(paths.branchLineageLedgerPath, 'a');
    try { fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

export function readBranchLineageLedger(paths) {
    if (!fs.existsSync(paths.branchLineageLedgerPath)) return [];
    return Object.freeze(fs.readFileSync(paths.branchLineageLedgerPath, 'utf8').split('\n').filter(Boolean).map((line, index) => {
        let entry;
        try { entry = JSON.parse(line); } catch { throw createError(409, `Branch lineage ledger line ${index + 1} is malformed.`, 'TIR_LINEAGE_LEDGER_MALFORMED'); }
        if (entry.ledgerVersion !== BRANCH_LINEAGE_LEDGER_VERSION || entry.sequence !== index + 1 || entry.operation !== BRANCH_LINEAGE_DECISION || !entry.payload || hash(entry.payload) !== entry.payloadHash) {
            throw createError(409, 'Branch lineage ledger entry is invalid.', 'TIR_LINEAGE_LEDGER_INVALID');
        }
        return Object.freeze(entry);
    }));
}

export function appendBranchLineageDecision(paths, decisionRecord) {
    if (!decisionRecord || decisionRecord.state !== 'DECISION_READY') throw createError(400, 'An append-ready lineage decision is required.', 'TIR_LINEAGE_DECISION_NOT_READY');
    validateDecisionShape(decisionRecord);
    const custody = validateAgainstCurrentCustody(paths, decisionRecord);
    const payload = Object.freeze({
        schemaVersion: 1,
        decision: required(decisionRecord.decision, 'decision'),
        operatorActionId: required(decisionRecord.operatorActionId, 'operatorActionId'),
        recordedAt: required(decisionRecord.recordedAt, 'recordedAt'),
        sourceLogicalIds: Object.freeze(custody.sourceRevisions.map((source) => source.sourceLogicalId)),
        proposedParentSourceLogicalId: custody.suggestion.proposedParentSourceLogicalId,
        proposedChildSourceLogicalId: custody.suggestion.proposedChildSourceLogicalId,
        parentSourceLogicalId: decisionRecord.parentSourceLogicalId ? required(decisionRecord.parentSourceLogicalId, 'parentSourceLogicalId') : null,
        forkAnchor: decisionRecord.forkAnchor ?? null,
        matchedPrefixLength: custody.suggestion.matchedPrefixLength,
        sourceRevisions: custody.sourceRevisions,
        timestampTiers: custody.timestampTiers,
        lineageEvidence: custody.lineageEvidence,
        reviewEvidence: custody.reviewEvidence,
    });
    lock(paths);
    try {
        const entries = readBranchLineageLedger(paths);
        const payloadHash = hash(payload);
        const prior = entries.find((entry) => entry.payload.operatorActionId === payload.operatorActionId);
        if (prior) {
            if (prior.payloadHash !== payloadHash) throw createError(409, 'operatorActionId has an idempotency collision.', 'TIR_LINEAGE_IDEMPOTENCY_COLLISION');
            return Object.freeze({ entry: prior, appended: false });
        }
        const entry = Object.freeze({
            ledgerVersion: BRANCH_LINEAGE_LEDGER_VERSION,
            sequence: entries.length + 1,
            entryId: createId('branch_lineage_decision'),
            operation: BRANCH_LINEAGE_DECISION,
            payloadHash,
            payload,
        });
        append(paths, entry);
        return Object.freeze({ entry, appended: true });
    } finally { unlock(paths); }
}
