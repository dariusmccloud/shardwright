import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getStoragePaths } from './core.js';
import {
    admitContextSheetCreation,
    admitContextSheetMerge,
    admitContextSheetSplit,
    computeContextSheetIdentityArtifactHash,
    readContextSheetIdentityLedger,
    validateContextSheetCreationEventArtifact,
    validateContextSheetMergeEventArtifact,
    validateContextSheetRecordArtifact,
    validateContextSheetSplitEventArtifact,
} from './identity.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..');
const fixtureDir = path.join(repoRoot, 'docs', 'schemas', 'memory-catalog', 'fixtures');
const readSubprocessPath = path.join(currentDir, 'identity-read-subprocess.mjs');

function readLedgerInFreshProcess(storageRoot) {
    const stdout = execFileSync(process.execPath, [readSubprocessPath, storageRoot], { encoding: 'utf8' });
    return JSON.parse(stdout);
}

function loadFixture(name) {
    return JSON.parse(fs.readFileSync(path.join(fixtureDir, `${name}.json`), 'utf8'));
}

function makeTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-identity-'));
}

function seedNeighboringLedgers(paths) {
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    fs.writeFileSync(paths.interpretiveGovernanceLedgerPath, '{"eventType":"PRE_EXISTING_INTERPRETIVE_EVENT"}\n', 'utf8');
    fs.writeFileSync(paths.dnmPublicationLedgerPath, '{"eventType":"PRE_EXISTING_DNM_EVENT"}\n', 'utf8');
    fs.writeFileSync(paths.contextSheetMembershipLedgerPath, '{"operation":"PRE_EXISTING_MEMBERSHIP_EVENT"}\n', 'utf8');
}

function readBytes(filePath) {
    return fs.readFileSync(filePath);
}

function makeCreationPair() {
    const record = loadFixture('context-sheet-record-v1.valid-resolved');
    const event = loadFixture('context-sheet-creation-event-v1.valid');
    event.contextSheetRef.immutableHash = computeContextSheetIdentityArtifactHash(record);
    return { record, event };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function makeCreationPairForSheet({
    contextSheetId,
    scopeId,
    sheetType,
    preferredTitle,
    canonicalAnchorId,
    anchorJurisdictionId,
    identityAuthorityRef,
    suffix,
}) {
    const { record, event } = makeCreationPair();
    record.envelope.artifactId = `artifact:context-sheet-record:${suffix}`;
    record.envelope.memoryScopeId = scopeId;
    record.envelope.payloadHash = `sha256:${suffix.slice(0, 2).repeat(32)}`;
    record.contextSheetId = contextSheetId;
    record.memoryScopeId = scopeId;
    record.sheetType = sheetType;
    record.preferredTitle = preferredTitle;
    record.canonicalAnchorId = canonicalAnchorId;
    record.identityAuthorityRef = clone(identityAuthorityRef);
    record.identityAuthorityRef.memoryScopeId = scopeId;
    record.anchorJurisdiction.jurisdictionId = anchorJurisdictionId;
    record.creationEventRef.artifactId = `artifact:context-sheet-creation-event:${suffix}`;
    record.creationEventRef.memoryScopeId = scopeId;

    event.envelope.artifactId = `artifact:context-sheet-creation-event:${suffix}`;
    event.envelope.memoryScopeId = scopeId;
    event.envelope.payloadHash = `sha256:${suffix.slice(2, 4).repeat(32)}`;
    event.envelope.idempotencyKey = `idempotency:context-sheet-create-${suffix}`;
    event.envelope.authorityBasisRefs = [clone(identityAuthorityRef)];
    event.envelope.authorityBasisRefs[0].memoryScopeId = scopeId;
    event.contextSheetRef.artifactId = record.envelope.artifactId;
    event.contextSheetRef.memoryScopeId = scopeId;
    event.sheetType = sheetType;
    event.contextSheetRef.immutableHash = computeContextSheetIdentityArtifactHash(record);
    return { record, event };
}

function admitSheet(paths, config) {
    const { record, event } = makeCreationPairForSheet(config);
    return admitContextSheetCreation(paths, record, event);
}

function lifecycleRefsForSourceSheets(sourceSheets) {
    return Object.fromEntries(sourceSheets.map((sourceSheet) => [
        sourceSheet.contextSheetId,
        sourceSheet.exactStateRef,
    ]));
}

function assertErrorCode(fn, code) {
    assert.throws(fn, (error) => error.code === code);
}

test('a structurally valid creation pair appends exactly once and survives an actual process restart', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { record, event } = makeCreationPair();

    assert.equal(validateContextSheetRecordArtifact(record).valid, true);
    assert.equal(validateContextSheetCreationEventArtifact(event).valid, true);

    const { recordEntry, eventEntry, appended } = admitContextSheetCreation(paths, record, event);
    assert.equal(appended, true);
    assert.equal(recordEntry.sequence, 1);
    assert.equal(recordEntry.operation, 'CREATE_RECORD');
    assert.equal(recordEntry.idempotencyKey, event.envelope.idempotencyKey);
    assert.equal(eventEntry.sequence, 2);
    assert.equal(eventEntry.operation, 'CREATE_EVENT');
    assert.equal(eventEntry.idempotencyKey, event.envelope.idempotencyKey);

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 2);
    assert.deepEqual(reopened[0], recordEntry);
    assert.deepEqual(reopened[1], eventEntry);
});

test('structurally valid merge and split lifecycle event schemas compile', () => {
    assert.equal(validateContextSheetMergeEventArtifact(loadFixture('context-sheet-merge-event-v1.valid')).valid, true);
    assert.equal(validateContextSheetSplitEventArtifact(loadFixture('context-sheet-split-event-v1.valid')).valid, true);
    assert.equal(validateContextSheetMergeEventArtifact(loadFixture('context-sheet-merge-event-v1.invalid-similarity-only')).valid, false);
    assert.equal(validateContextSheetSplitEventArtifact(loadFixture('context-sheet-split-event-v1.invalid-incomplete-partition')).valid, false);
});

test('a governed merge appends once, preserves exact source custody, and survives fresh-process replay', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const merge = loadFixture('context-sheet-merge-event-v1.valid');
    const baseAuthority = merge.mergeAuthorityRef;

    admitSheet(paths, {
        contextSheetId: 'context-sheet:jeep',
        scopeId: 'scope:jeep-primary',
        sheetType: 'ENTITY',
        preferredTitle: 'Jeep',
        canonicalAnchorId: 'canonical-anchor:character-jeep',
        anchorJurisdictionId: 'subject:jeep',
        identityAuthorityRef: baseAuthority,
        suffix: 'a1a1a1a1a1a1a1a1a1a1a1a1a1',
    });
    admitSheet(paths, {
        contextSheetId: 'context-sheet:jeep-duplicate',
        scopeId: 'scope:jeep-primary',
        sheetType: 'ENTITY',
        preferredTitle: 'Jeep Duplicate',
        canonicalAnchorId: 'canonical-anchor:character-jeep',
        anchorJurisdictionId: 'subject:jeep',
        identityAuthorityRef: baseAuthority,
        suffix: 'b2b2b2b2b2b2b2b2b2b2b2b2b2',
    });

    const result = admitContextSheetMerge(paths, merge, {
        lifecycleStateRefsByContextSheetId: lifecycleRefsForSourceSheets(merge.sourceSheets),
    });

    assert.equal(result.appended, true);
    assert.equal(result.eventEntry.sequence, 5);
    assert.equal(result.eventEntry.operation, 'MERGE');
    assert.equal(result.eventEntry.idempotencyKey, merge.envelope.idempotencyKey);
    assert.equal(result.eventRef.immutableHash, computeContextSheetIdentityArtifactHash(merge));

    const duplicate = admitContextSheetMerge(paths, merge, {
        lifecycleStateRefsByContextSheetId: {},
    });
    assert.equal(duplicate.appended, false);
    assert.deepEqual(duplicate.eventEntry, result.eventEntry);
    assert.deepEqual(duplicate.eventRef, result.eventRef);

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 5);
    assert.deepEqual(reopened[4], result.eventEntry);
});

test('merge refuses missing source records and stale lifecycle state refs without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const merge = loadFixture('context-sheet-merge-event-v1.valid');

    assertErrorCode(
        () => admitContextSheetMerge(paths, merge, {
            lifecycleStateRefsByContextSheetId: lifecycleRefsForSourceSheets(merge.sourceSheets),
        }),
        'CSI_MERGE_SOURCE_RECORD_MISSING',
    );
    assert.equal(fs.existsSync(paths.contextSheetIdentityLedgerPath), false);

    const baseAuthority = merge.mergeAuthorityRef;
    for (const sourceSheet of merge.sourceSheets) {
        admitSheet(paths, {
            contextSheetId: sourceSheet.contextSheetId,
            scopeId: 'scope:jeep-primary',
            sheetType: 'ENTITY',
            preferredTitle: sourceSheet.contextSheetId,
            canonicalAnchorId: 'canonical-anchor:character-jeep',
            anchorJurisdictionId: 'subject:jeep',
            identityAuthorityRef: baseAuthority,
            suffix: sourceSheet.contextSheetId.endsWith('duplicate') ? 'c3c3c3c3c3c3c3c3c3c3c3c3c3' : 'd4d4d4d4d4d4d4d4d4d4d4d4d4',
        });
    }

    const staleRefs = lifecycleRefsForSourceSheets(merge.sourceSheets);
    staleRefs['context-sheet:jeep-duplicate'] = {
        ...staleRefs['context-sheet:jeep-duplicate'],
        immutableHash: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    };
    assertErrorCode(
        () => admitContextSheetMerge(paths, merge, { lifecycleStateRefsByContextSheetId: staleRefs }),
        'CSI_MERGE_SOURCE_STATE_STALE',
    );
    assert.equal(readContextSheetIdentityLedger(paths).length, 4);
});

test('merge refuses changed idempotent content and similarity-only artifacts without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const merge = loadFixture('context-sheet-merge-event-v1.valid');
    const baseAuthority = merge.mergeAuthorityRef;
    for (const sourceSheet of merge.sourceSheets) {
        admitSheet(paths, {
            contextSheetId: sourceSheet.contextSheetId,
            scopeId: 'scope:jeep-primary',
            sheetType: 'ENTITY',
            preferredTitle: sourceSheet.contextSheetId,
            canonicalAnchorId: 'canonical-anchor:character-jeep',
            anchorJurisdictionId: 'subject:jeep',
            identityAuthorityRef: baseAuthority,
            suffix: sourceSheet.contextSheetId.endsWith('duplicate') ? 'e5e5e5e5e5e5e5e5e5e5e5e5e5' : 'f6f6f6f6f6f6f6f6f6f6f6f6f6',
        });
    }
    admitContextSheetMerge(paths, merge, {
        lifecycleStateRefsByContextSheetId: lifecycleRefsForSourceSheets(merge.sourceSheets),
    });

    const changed = clone(merge);
    changed.rationale = 'Changed after the durable merge was recorded.';
    assertErrorCode(
        () => admitContextSheetMerge(paths, changed, {
            lifecycleStateRefsByContextSheetId: lifecycleRefsForSourceSheets(changed.sourceSheets),
        }),
        'CSI_MERGE_IDEMPOTENCY_COLLISION',
    );

    const similarityOnly = loadFixture('context-sheet-merge-event-v1.invalid-similarity-only');
    assertErrorCode(
        () => admitContextSheetMerge(paths, similarityOnly, { lifecycleStateRefsByContextSheetId: {} }),
        'CSI_MERGE_SCHEMA_INVALID',
    );
    assert.equal(readContextSheetIdentityLedger(paths).length, 5);
});

test('a governed split appends once, preserves partition custody, and survives fresh-process replay', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const split = loadFixture('context-sheet-split-event-v1.valid');
    const splitAuthority = split.splitAuthorityRef;

    admitSheet(paths, {
        contextSheetId: 'context-sheet:embodiment-catchall',
        scopeId: 'scope:lyra-primary',
        sheetType: 'TOPIC',
        preferredTitle: 'Embodiment Catchall',
        canonicalAnchorId: 'canonical-anchor:embodiment-catchall',
        anchorJurisdictionId: 'subject:lyra',
        identityAuthorityRef: splitAuthority,
        suffix: '11111111111111111111111111',
    });
    for (const targetSheet of split.targetSheets) {
        admitSheet(paths, {
            contextSheetId: targetSheet.contextSheetId,
            scopeId: 'scope:lyra-primary',
            sheetType: targetSheet.sheetType,
            preferredTitle: targetSheet.contextSheetId,
            canonicalAnchorId: targetSheet.canonicalAnchorId,
            anchorJurisdictionId: targetSheet.anchorJurisdictionId,
            identityAuthorityRef: targetSheet.identityAuthorityRef,
            suffix: targetSheet.contextSheetId.endsWith('movement') ? '22222222222222222222222222' : '33333333333333333333333333',
        });
    }

    const result = admitContextSheetSplit(paths, split, {
        lifecycleStateRefsByContextSheetId: {
            [split.sourceSheet.contextSheetId]: split.sourceSheet.exactStateRef,
        },
    });

    assert.equal(result.appended, true);
    assert.equal(result.eventEntry.sequence, 7);
    assert.equal(result.eventEntry.operation, 'SPLIT');
    assert.equal(result.eventRef.immutableHash, computeContextSheetIdentityArtifactHash(split));

    const duplicate = admitContextSheetSplit(paths, split, {
        lifecycleStateRefsByContextSheetId: {},
    });
    assert.equal(duplicate.appended, false);
    assert.deepEqual(duplicate.eventEntry, result.eventEntry);
    assert.deepEqual(duplicate.eventRef, result.eventRef);

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 7);
    assert.deepEqual(reopened[6], result.eventEntry);
});

test('split refuses missing lifecycle custody, unknown assignment target, and duplicate source-item assignment without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const split = loadFixture('context-sheet-split-event-v1.valid');
    const splitAuthority = split.splitAuthorityRef;

    admitSheet(paths, {
        contextSheetId: 'context-sheet:embodiment-catchall',
        scopeId: 'scope:lyra-primary',
        sheetType: 'TOPIC',
        preferredTitle: 'Embodiment Catchall',
        canonicalAnchorId: 'canonical-anchor:embodiment-catchall',
        anchorJurisdictionId: 'subject:lyra',
        identityAuthorityRef: splitAuthority,
        suffix: '44444444444444444444444444',
    });
    for (const targetSheet of split.targetSheets) {
        admitSheet(paths, {
            contextSheetId: targetSheet.contextSheetId,
            scopeId: 'scope:lyra-primary',
            sheetType: targetSheet.sheetType,
            preferredTitle: targetSheet.contextSheetId,
            canonicalAnchorId: targetSheet.canonicalAnchorId,
            anchorJurisdictionId: targetSheet.anchorJurisdictionId,
            identityAuthorityRef: targetSheet.identityAuthorityRef,
            suffix: targetSheet.contextSheetId.endsWith('movement') ? '55555555555555555555555555' : '66666666666666666666666666',
        });
    }

    assertErrorCode(
        () => admitContextSheetSplit(paths, split, { lifecycleStateRefsByContextSheetId: {} }),
        'CSI_SPLIT_SOURCE_STATE_MISSING',
    );

    const unknownTarget = clone(split);
    unknownTarget.envelope.idempotencyKey = 'idempotency:split-unknown-target';
    unknownTarget.envelope.artifactId = 'artifact:context-sheet-split-event:unknown-target';
    unknownTarget.partitionManifest.assignments[0].targetContextSheetId = 'context-sheet:unknown';
    assertErrorCode(
        () => admitContextSheetSplit(paths, unknownTarget, {
            lifecycleStateRefsByContextSheetId: {
                [unknownTarget.sourceSheet.contextSheetId]: unknownTarget.sourceSheet.exactStateRef,
            },
        }),
        'CSI_SPLIT_ASSIGNMENT_TARGET_UNKNOWN',
    );

    const duplicated = clone(split);
    duplicated.envelope.idempotencyKey = 'idempotency:split-duplicate-source-item';
    duplicated.envelope.artifactId = 'artifact:context-sheet-split-event:duplicate-source-item';
    duplicated.partitionManifest.assignments.push({
        ...clone(duplicated.partitionManifest.assignments[0]),
        targetContextSheetId: 'context-sheet:embodiment',
        reason: 'Duplicated evidence would be copied to another target.',
    });
    assertErrorCode(
        () => admitContextSheetSplit(paths, duplicated, {
            lifecycleStateRefsByContextSheetId: {
                [duplicated.sourceSheet.contextSheetId]: duplicated.sourceSheet.exactStateRef,
            },
        }),
        'CSI_SPLIT_PARTITION_DUPLICATE',
    );
    assert.equal(readContextSheetIdentityLedger(paths).length, 6);
});

test('same creation idempotency key and same pair returns the original entries without a second append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { record, event } = makeCreationPair();

    const first = admitContextSheetCreation(paths, record, event);
    const second = admitContextSheetCreation(paths, record, event);

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.deepEqual(second.recordEntry, first.recordEntry);
    assert.deepEqual(second.eventEntry, first.eventEntry);
    assert.equal(readContextSheetIdentityLedger(paths).length, 2);
});

test('same creation idempotency key with changed immutable content refuses without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { record, event } = makeCreationPair();
    admitContextSheetCreation(paths, record, event);

    const changedRecord = JSON.parse(JSON.stringify(record));
    const changedEvent = JSON.parse(JSON.stringify(event));
    changedRecord.preferredTitle = 'Jeep Prime';
    changedEvent.contextSheetRef.immutableHash = computeContextSheetIdentityArtifactHash(changedRecord);

    assert.throws(
        () => admitContextSheetCreation(paths, changedRecord, changedEvent),
        (error) => error.code === 'CSI_CREATE_IDEMPOTENCY_COLLISION',
    );
    assert.equal(readContextSheetIdentityLedger(paths).length, 2);
});

test('a partial creation pair refuses without repairing the missing entry', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { record, event } = makeCreationPair();
    const first = admitContextSheetCreation(paths, record, event);
    fs.writeFileSync(paths.contextSheetIdentityLedgerPath, `${JSON.stringify(first.recordEntry)}\n`, 'utf8');

    assert.throws(
        () => admitContextSheetCreation(paths, record, event),
        (error) => error.code === 'CSI_CREATE_PARTIAL_PAIR',
    );
    assert.equal(readContextSheetIdentityLedger(paths).length, 1);
});

test('a hash-mismatched identity ledger entry refuses replay without mutation', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { record, event } = makeCreationPair();
    admitContextSheetCreation(paths, record, event);

    const entries = readContextSheetIdentityLedger(paths);
    entries[0].artifact.preferredTitle = 'Tampered';
    fs.writeFileSync(paths.contextSheetIdentityLedgerPath, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n', 'utf8');

    assert.throws(
        () => readContextSheetIdentityLedger(paths),
        (error) => error.code === 'CSI_LEDGER_HASH_MISMATCH',
    );
});

test('neighboring authority ledgers remain byte-identical throughout Context Sheet creation intake', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedNeighboringLedgers(paths);
    const beforeInterpretive = readBytes(paths.interpretiveGovernanceLedgerPath);
    const beforeDnm = readBytes(paths.dnmPublicationLedgerPath);
    const beforeMembership = readBytes(paths.contextSheetMembershipLedgerPath);
    const { record, event } = makeCreationPair();

    admitContextSheetCreation(paths, record, event);
    admitContextSheetCreation(paths, record, event);

    assert.deepEqual(readBytes(paths.interpretiveGovernanceLedgerPath), beforeInterpretive);
    assert.deepEqual(readBytes(paths.dnmPublicationLedgerPath), beforeDnm);
    assert.deepEqual(readBytes(paths.contextSheetMembershipLedgerPath), beforeMembership);
});

test('schema-invalid creation artifacts refuse before any append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { record, event } = makeCreationPair();
    const invalidRecord = JSON.parse(JSON.stringify(record));
    invalidRecord.sheetType = 'LORE';

    assert.equal(validateContextSheetRecordArtifact(invalidRecord).valid, false);
    assert.throws(
        () => admitContextSheetCreation(paths, invalidRecord, event),
        (error) => error.code === 'CSI_CREATE_RECORD_SCHEMA_INVALID',
    );
    assert.equal(fs.existsSync(paths.contextSheetIdentityLedgerPath), false);
});
