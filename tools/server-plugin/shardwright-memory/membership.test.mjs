import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getStoragePaths } from './core.js';
import {
    nominateContextSheetMembership,
    readContextSheetMembershipLedger,
    validateMembershipNominationArtifact,
} from './membership.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..');
const fixtureDir = path.join(repoRoot, 'docs', 'schemas', 'memory-catalog', 'fixtures');
const readSubprocessPath = path.join(currentDir, 'membership-read-subprocess.mjs');

function readLedgerInFreshProcess(storageRoot) {
    const stdout = execFileSync(process.execPath, [readSubprocessPath, storageRoot], { encoding: 'utf8' });
    return JSON.parse(stdout);
}

function loadFixture(name) {
    return JSON.parse(fs.readFileSync(path.join(fixtureDir, `${name}.json`), 'utf8'));
}

function makeTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'shardwright-membership-'));
}

function seedNeighboringLedgers(paths) {
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    fs.writeFileSync(paths.interpretiveGovernanceLedgerPath, '{"eventType":"PRE_EXISTING_INTERPRETIVE_EVENT"}\n', 'utf8');
    fs.writeFileSync(paths.dnmPublicationLedgerPath, '{"eventType":"PRE_EXISTING_DNM_EVENT"}\n', 'utf8');
}

function readBytes(filePath) {
    return fs.readFileSync(filePath);
}

test('a structurally valid nomination appends exactly once and survives an actual process restart', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');

    const { entry, appended } = nominateContextSheetMembership(paths, artifact);
    assert.equal(appended, true);
    assert.equal(entry.sequence, 1);
    assert.equal(entry.operation, 'NOMINATE');

    // Restart proof: a separate Node process, with its own fresh module graph, reads the
    // ledger back from disk and must recover the identical canonical entry.
    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 1);
    assert.deepEqual(reopened[0], entry);
});

test('same idempotency key and same artifact returns the original entry without a second append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');

    const first = nominateContextSheetMembership(paths, artifact);
    const second = nominateContextSheetMembership(paths, artifact);

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.deepEqual(second.entry, first.entry);

    const entries = readContextSheetMembershipLedger(paths);
    assert.equal(entries.length, 1);
});

test('same idempotency key with different immutable content refuses without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    const mutatedArtifact = JSON.parse(JSON.stringify(artifact));
    mutatedArtifact.reason = 'A different rationale reusing the same idempotency key.';

    nominateContextSheetMembership(paths, artifact);

    assert.throws(
        () => nominateContextSheetMembership(paths, mutatedArtifact),
        (error) => error.code === 'CSM_NOMINATION_IDEMPOTENCY_COLLISION',
    );

    const entries = readContextSheetMembershipLedger(paths);
    assert.equal(entries.length, 1);
});

test('interpretive and DNM publication ledgers remain byte-identical throughout membership intake', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedNeighboringLedgers(paths);

    const beforeInterpretive = readBytes(paths.interpretiveGovernanceLedgerPath);
    const beforeDnm = readBytes(paths.dnmPublicationLedgerPath);

    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    const deferredArtifact = loadFixture('context-sheet-membership-nomination-v1.valid-retrieval-deferred');
    const mutatedArtifact = JSON.parse(JSON.stringify(artifact));
    mutatedArtifact.reason = 'A different rationale reusing the same idempotency key.';

    nominateContextSheetMembership(paths, artifact);
    nominateContextSheetMembership(paths, artifact);
    nominateContextSheetMembership(paths, deferredArtifact);
    assert.throws(() => nominateContextSheetMembership(paths, mutatedArtifact));

    assert.deepEqual(readBytes(paths.interpretiveGovernanceLedgerPath), beforeInterpretive);
    assert.deepEqual(readBytes(paths.dnmPublicationLedgerPath), beforeDnm);
});

test('an authority-bearing nomination refuses schema admission before any append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const invalidArtifact = loadFixture('context-sheet-membership-nomination-v1.invalid-authority-bearing');

    const { valid } = validateMembershipNominationArtifact(invalidArtifact);
    assert.equal(valid, false);

    assert.throws(
        () => nominateContextSheetMembership(paths, invalidArtifact),
        (error) => error.code === 'CSM_NOMINATION_SCHEMA_INVALID',
    );
    assert.equal(fs.existsSync(paths.contextSheetMembershipLedgerPath), false);
});

test('an unsupported contract binding refuses admission before any append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    artifact.envelope.contractBindings = [{ id: 'phase-x-context-sheet-membership', version: '9.9.9' }];

    assert.throws(
        () => nominateContextSheetMembership(paths, artifact),
        (error) => error.code === 'CSM_NOMINATION_CONTRACT_BINDING_UNSUPPORTED',
    );
    assert.equal(fs.existsSync(paths.contextSheetMembershipLedgerPath), false);
});

test('a non-empty policy binding refuses admission before any append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    artifact.envelope.policyBindings = [{ id: 'some-future-policy', version: '1.0.0' }];

    assert.throws(
        () => nominateContextSheetMembership(paths, artifact),
        (error) => error.code === 'CSM_NOMINATION_POLICY_BINDING_UNSUPPORTED',
    );
    assert.equal(fs.existsSync(paths.contextSheetMembershipLedgerPath), false);
});
