import crypto from 'node:crypto';

export const TranscriptCoverageState = Object.freeze({
    NOT_SCANNED: 'NOT_SCANNED',
    SCANNED_NO_RELEVANT_SOURCE: 'SCANNED_NO_RELEVANT_SOURCE',
    SCANNED_WITH_SOURCE: 'SCANNED_WITH_SOURCE',
    SUSPENDED_INTENTIONALLY: 'SUSPENDED_INTENTIONALLY',
    SCAN_FAILED: 'SCAN_FAILED',
});

export const TranscriptSourceClass = Object.freeze({
    DIRECT: 'DIRECT',
    GROUP: 'GROUP',
});

const COVERAGE_STATES = new Set(Object.values(TranscriptCoverageState));
const SOURCE_CLASSES = new Set(Object.values(TranscriptSourceClass));

export class TranscriptInventoryError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function requiredString(value, fieldName) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_INPUT', `${fieldName} is required.`);
    }
    return normalized;
}

function copyJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function hashCanonical(value) {
    return `sha256:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function normalizeBranchTopology(topology) {
    if (topology == null) return null;
    if (typeof topology !== 'object' || Array.isArray(topology)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_BRANCH', 'branchTopology must be an object when supplied.');
    }
    const branchId = requiredString(topology.branchId, 'branchTopology.branchId');
    const normalized = { branchId };
    for (const key of ['parentBranchId', 'parentSourceRevision', 'siblingRelation', 'branchPointLocator', 'lineage']) {
        if (topology[key] != null) normalized[key] = requiredString(topology[key], `branchTopology.${key}`);
    }
    return Object.freeze(normalized);
}

function normalizeParticipantBasis(sourceClass, value) {
    if (sourceClass === TranscriptSourceClass.DIRECT) {
        if (value != null) {
            throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_DIRECT_PARTICIPANT_BASIS', 'DIRECT sources cannot carry group participant basis.');
        }
        return null;
    }
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_GROUP_PARTICIPANT_BASIS_REQUIRED', 'GROUP sources require historicalParticipantBasis.');
    }
    return Object.freeze({
        groupSourceId: requiredString(value.groupSourceId, 'historicalParticipantBasis.groupSourceId'),
        participantId: requiredString(value.participantId, 'historicalParticipantBasis.participantId'),
        evidenceHash: requiredString(value.evidenceHash, 'historicalParticipantBasis.evidenceHash'),
    });
}

function normalizeSuspension(value, characterInstanceId, sourceIds) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_SUSPENSION', 'Suspension must be an object.');
    }
    const scope = requiredString(value.scope, 'suspension.scope');
    if (!['CORPUS', 'SOURCE'].includes(scope)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_SUSPENSION', 'Suspension scope must be CORPUS or SOURCE.');
    }
    const normalized = {
        suspensionId: requiredString(value.suspensionId, 'suspension.suspensionId'),
        characterInstanceId: requiredString(value.characterInstanceId, 'suspension.characterInstanceId'),
        scope,
        startedAt: requiredString(value.startedAt, 'suspension.startedAt'),
        reasonCategory: requiredString(value.reasonCategory, 'suspension.reasonCategory'),
    };
    if (normalized.characterInstanceId !== characterInstanceId) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_CROSS_CHARACTER_SUSPENSION', 'Suspension belongs to another character instance.');
    }
    if (value.endedAt != null) normalized.endedAt = requiredString(value.endedAt, 'suspension.endedAt');
    if (scope === 'SOURCE') {
        normalized.sourceLogicalId = requiredString(value.sourceLogicalId, 'suspension.sourceLogicalId');
        if (!sourceIds.has(normalized.sourceLogicalId)) {
            throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_UNKNOWN_SUSPENSION_SOURCE', 'Suspension references an unknown source.');
        }
    } else if (value.sourceLogicalId != null) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_SUSPENSION', 'CORPUS suspension cannot name one source.');
    }
    return Object.freeze(normalized);
}

function normalizeSource(value, characterInstanceId) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_SOURCE', 'Source descriptor must be an object.');
    }
    const sourceClass = requiredString(value.sourceClass, 'sourceClass');
    if (!SOURCE_CLASSES.has(sourceClass)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_SOURCE_CLASS', 'sourceClass must be DIRECT or GROUP.');
    }
    const coverageState = requiredString(value.coverageState, 'coverageState');
    if (!COVERAGE_STATES.has(coverageState)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_COVERAGE_STATE', 'coverageState is unknown.');
    }
    const normalized = {
        sourceLogicalId: requiredString(value.sourceLogicalId, 'sourceLogicalId'),
        characterInstanceId: requiredString(value.characterInstanceId, 'characterInstanceId'),
        sourceClass,
        hostLocator: requiredString(value.hostLocator, 'hostLocator'),
        coverageState,
        branchTopology: normalizeBranchTopology(value.branchTopology),
        historicalParticipantBasis: normalizeParticipantBasis(sourceClass, value.historicalParticipantBasis),
    };
    if (normalized.characterInstanceId !== characterInstanceId) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_CROSS_CHARACTER_SOURCE', 'Source belongs to another character instance.');
    }
    if (coverageState === TranscriptCoverageState.SCANNED_WITH_SOURCE) {
        normalized.sourceRevisionHash = requiredString(value.sourceRevisionHash, 'sourceRevisionHash');
    } else if (value.sourceRevisionHash != null) {
        normalized.sourceRevisionHash = requiredString(value.sourceRevisionHash, 'sourceRevisionHash');
    }
    if (coverageState === TranscriptCoverageState.SCAN_FAILED) {
        normalized.failureCode = requiredString(value.failureCode, 'failureCode');
    }
    return Object.freeze(normalized);
}

/**
 * Produces a read-only, character-scoped coverage projection. It does not open host
 * files, infer source identities, store messages, or persist any operational state.
 */
export function buildTranscriptInventory(input) {
    if (input == null || typeof input !== 'object' || Array.isArray(input)) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_INPUT', 'Inventory input must be an object.');
    }
    const characterInstanceId = requiredString(input.characterInstanceId, 'characterInstanceId');
    const sourceInput = Array.isArray(input.sources) ? input.sources : null;
    if (sourceInput == null) {
        throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_INVALID_INPUT', 'sources must be an array.');
    }
    const sources = sourceInput.map((source) => normalizeSource(source, characterInstanceId));
    const sourceIds = new Set();
    for (const source of sources) {
        if (sourceIds.has(source.sourceLogicalId)) {
            throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_DUPLICATE_SOURCE', 'sourceLogicalId must be unique within one character inventory.');
        }
        sourceIds.add(source.sourceLogicalId);
    }
    const suspensions = (input.suspensions == null ? [] : input.suspensions)
        .map((suspension) => normalizeSuspension(suspension, characterInstanceId, sourceIds));
    const suspensionIds = new Set();
    for (const suspension of suspensions) {
        if (suspensionIds.has(suspension.suspensionId)) {
            throw new TranscriptInventoryError('TRANSCRIPT_INVENTORY_DUPLICATE_SUSPENSION', 'suspensionId must be unique within one inventory.');
        }
        suspensionIds.add(suspension.suspensionId);
    }
    const coverageCounts = Object.fromEntries([...COVERAGE_STATES].map((state) => [state, 0]));
    for (const source of sources) coverageCounts[source.coverageState] += 1;
    const projection = {
        characterInstanceId,
        sources: Object.freeze(sources),
        suspensions: Object.freeze(suspensions),
        coverageCounts: Object.freeze(coverageCounts),
    };
    return Object.freeze({ ...projection, inventoryHash: hashCanonical(copyJson(projection)) });
}
