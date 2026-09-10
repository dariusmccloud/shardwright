import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildTranscriptInventory,
    TranscriptCoverageState,
    TranscriptInventoryError,
    TranscriptSourceClass,
} from './transcript-inventory.js';

function direct(overrides = {}) {
    return {
        sourceLogicalId: 'source-direct-1',
        characterInstanceId: 'character-jeep',
        sourceClass: TranscriptSourceClass.DIRECT,
        hostLocator: 'chats/Jeep/direct-1.jsonl',
        coverageState: TranscriptCoverageState.SCANNED_WITH_SOURCE,
        sourceRevisionHash: 'sha256:direct',
        branchTopology: { branchId: 'branch-main' },
        ...overrides,
    };
}

function group(overrides = {}) {
    return {
        sourceLogicalId: 'source-group-1',
        characterInstanceId: 'character-jeep',
        sourceClass: TranscriptSourceClass.GROUP,
        hostLocator: 'group chats/group-1.jsonl',
        coverageState: TranscriptCoverageState.NOT_SCANNED,
        historicalParticipantBasis: {
            groupSourceId: 'group-definition-1',
            participantId: 'character-jeep',
            evidenceHash: 'sha256:participant-basis',
        },
        branchTopology: { branchId: 'group-main', parentBranchId: 'parent-group' },
        ...overrides,
    };
}

test('builds a deterministic character-scoped direct and group coverage inventory', () => {
    const input = {
        characterInstanceId: 'character-jeep',
        sources: [direct(), group()],
        suspensions: [{
            suspensionId: 'suspension-1',
            characterInstanceId: 'character-jeep',
            scope: 'SOURCE',
            sourceLogicalId: 'source-group-1',
            startedAt: '2026-09-06T10:00:00.000Z',
            reasonCategory: 'CONVERGENCE_TEST',
        }],
    };
    const first = buildTranscriptInventory(input);
    const second = buildTranscriptInventory(input);

    assert.equal(first.inventoryHash, second.inventoryHash);
    assert.equal(first.coverageCounts.SCANNED_WITH_SOURCE, 1);
    assert.equal(first.coverageCounts.NOT_SCANNED, 1);
    assert.equal(first.sources[1].historicalParticipantBasis.participantId, 'character-jeep');
    assert.equal(first.suspensions[0].sourceLogicalId, 'source-group-1');
});

test('refuses cross-character source and suspension descriptors', () => {
    assert.throws(
        () => buildTranscriptInventory({ characterInstanceId: 'character-jeep', sources: [direct({ characterInstanceId: 'character-lyra' })] }),
        (error) => error instanceof TranscriptInventoryError && error.code === 'TRANSCRIPT_INVENTORY_CROSS_CHARACTER_SOURCE',
    );
    assert.throws(
        () => buildTranscriptInventory({
            characterInstanceId: 'character-jeep',
            sources: [direct()],
            suspensions: [{
                suspensionId: 'suspension-cross-scope',
                characterInstanceId: 'character-lyra',
                scope: 'CORPUS',
                startedAt: '2026-09-06T10:00:00.000Z',
                reasonCategory: 'TEST',
            }],
        }),
        (error) => error instanceof TranscriptInventoryError && error.code === 'TRANSCRIPT_INVENTORY_CROSS_CHARACTER_SUSPENSION',
    );
});

test('refuses group admission without historical participant evidence', () => {
    assert.throws(
        () => buildTranscriptInventory({ characterInstanceId: 'character-jeep', sources: [group({ historicalParticipantBasis: null })] }),
        (error) => error instanceof TranscriptInventoryError && error.code === 'TRANSCRIPT_INVENTORY_GROUP_PARTICIPANT_BASIS_REQUIRED',
    );
});

test('keeps scan failure distinct from unscanned and requires a failure code', () => {
    const inventory = buildTranscriptInventory({
        characterInstanceId: 'character-jeep',
        sources: [direct({ coverageState: TranscriptCoverageState.SCAN_FAILED, sourceRevisionHash: undefined, failureCode: 'SOURCE_READ_FAILED' })],
    });
    assert.equal(inventory.coverageCounts.SCAN_FAILED, 1);
    assert.equal(inventory.coverageCounts.NOT_SCANNED, 0);
    assert.throws(
        () => buildTranscriptInventory({
            characterInstanceId: 'character-jeep',
            sources: [direct({ coverageState: TranscriptCoverageState.SCAN_FAILED, sourceRevisionHash: undefined, failureCode: null })],
        }),
        (error) => error instanceof TranscriptInventoryError && error.code === 'TRANSCRIPT_INVENTORY_INVALID_INPUT',
    );
});

test('refuses duplicate source identity and an unmarked source suspension', () => {
    assert.throws(
        () => buildTranscriptInventory({ characterInstanceId: 'character-jeep', sources: [direct(), direct()] }),
        (error) => error instanceof TranscriptInventoryError && error.code === 'TRANSCRIPT_INVENTORY_DUPLICATE_SOURCE',
    );
    assert.throws(
        () => buildTranscriptInventory({
            characterInstanceId: 'character-jeep',
            sources: [direct()],
            suspensions: [{
                suspensionId: 'suspension-unknown-source',
                characterInstanceId: 'character-jeep',
                scope: 'SOURCE',
                sourceLogicalId: 'source-missing',
                startedAt: '2026-09-06T10:00:00.000Z',
                reasonCategory: 'TEST',
            }],
        }),
        (error) => error instanceof TranscriptInventoryError && error.code === 'TRANSCRIPT_INVENTORY_UNKNOWN_SUSPENSION_SOURCE',
    );
});
