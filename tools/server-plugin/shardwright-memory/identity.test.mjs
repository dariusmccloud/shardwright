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
    computeContextSheetIdentityArtifactHash,
    readContextSheetIdentityLedger,
    validateContextSheetCreationEventArtifact,
    validateContextSheetRecordArtifact,
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
