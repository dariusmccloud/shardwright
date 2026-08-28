import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getStoragePaths } from './core.js';
import {
    admitContextSheetMembershipValidation,
    admitContextSheetMembershipLink,
    admitContextSheetMembershipSuccessor,
    computeMembershipArtifactHash,
    nominateContextSheetMembership,
    readContextSheetMembershipLedger,
    validateMembershipValidationArtifact,
    validateMembershipLinkArtifact,
    validateMembershipSuccessorArtifact,
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

function makeExactNominationReference(nominationEntry) {
    return {
        artifactType: 'context-sheet-membership-nomination-v1',
        artifactId: nominationEntry.artifactId,
        memoryScopeId: nominationEntry.scopeId,
        expectedArtifactClass: 'NOMINATION',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: nominationEntry.artifactHash,
    };
}

function makeValidationArtifact(nominationEntry) {
    const artifact = loadFixture('context-sheet-membership-validation-event-v1.valid-accepted');
    const nominationRef = makeExactNominationReference(nominationEntry);
    artifact.envelope.memoryScopeId = nominationEntry.scopeId;
    artifact.envelope.authorityBasisRefs = [nominationRef];
    artifact.nominationRef = nominationRef;
    artifact.evaluatedCatalogRecordRef.memoryScopeId = nominationEntry.scopeId;
    artifact.evaluatedContextSheetRef.memoryScopeId = nominationEntry.scopeId;
    return artifact;
}

function makeExactValidationReference(validationEntry) {
    return {
        artifactType: 'context-sheet-membership-validation-event-v1',
        artifactId: validationEntry.artifactId,
        memoryScopeId: validationEntry.scopeId,
        expectedArtifactClass: 'EVENT',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: validationEntry.artifactHash,
    };
}

function makeLinkArtifact(nominationEntry, validationEntry) {
    const validation = validationEntry.artifact;
    const artifact = loadFixture('context-sheet-membership-link-v1.valid-direct');
    const nominationRef = makeExactNominationReference(nominationEntry);
    const validationRef = makeExactValidationReference(validationEntry);
    artifact.envelope.memoryScopeId = nominationEntry.scopeId;
    artifact.envelope.authorityBasisRefs = [validationRef];
    artifact.catalogRecordRef = JSON.parse(JSON.stringify(validation.evaluatedCatalogRecordRef));
    artifact.contextSheetRef.memoryScopeId = nominationEntry.scopeId;
    artifact.contextSheetLifecycleRef = JSON.parse(JSON.stringify(validation.evaluatedContextSheetRef));
    artifact.catalogClaimIds = [...validation.claimBasis.catalogClaimIds];
    artifact.linkType = validation.validatedLinkType;
    artifact.targetClaimIds = [...validation.claimBasis.targetClaimIds];
    artifact.claimBasisHash = validation.claimBasis.basisHash;
    artifact.boundedMeaning = validation.claimBasis.boundedMeaning;
    artifact.limitations = [...validation.claimBasis.limitations];
    artifact.jurisdiction.memoryScopeId = nominationEntry.scopeId;
    artifact.validationMethod = validation.validationMethod;
    artifact.governingPolicyVersion = validation.governingPolicyVersion;
    artifact.createdFromNominationRef = nominationRef;
    artifact.validatedBy = JSON.parse(JSON.stringify(validation.validator));
    artifact.validatedAt = validation.occurredAt;
    artifact.validationEventRef = validationRef;
    return artifact;
}

function admitAcceptedValidation(paths) {
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validation = admitContextSheetMembershipValidation(paths, makeValidationArtifact(nomination.entry));
    return { nomination: nomination.entry, validation: validation.entry };
}

function makeExactLinkReference(linkEntry) {
    return {
        artifactType: 'context-sheet-membership-link-v1',
        artifactId: linkEntry.artifactId,
        memoryScopeId: linkEntry.scopeId,
        expectedArtifactClass: 'IMMUTABLE_RECORD',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: linkEntry.artifactHash,
    };
}

function makeSuccessorArtifact(linkEntry) {
    const artifact = loadFixture('context-sheet-membership-successor-event-v1.valid-retyped');
    const linkRef = makeExactLinkReference(linkEntry);
    artifact.envelope.memoryScopeId = linkEntry.scopeId;
    artifact.envelope.authorityBasisRefs = [linkRef];
    artifact.predecessorLinkRef = linkRef;
    artifact.correctionType = 'LINK_REMOVED_FROM_CURRENT_USE';
    artifact.predecessorCurrentUseState = 'REMOVED';
    artifact.successorLinkRef = null;
    artifact.successorValidationEventRef = null;
    return artifact;
}

function admitInitialLink(paths) {
    const { nomination, validation } = admitAcceptedValidation(paths);
    const link = admitContextSheetMembershipLink(paths, makeLinkArtifact(nomination, validation));
    return link.entry;
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

test('a policy-bound validation event appends after exact nomination custody and survives an actual process restart', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validationArtifact = makeValidationArtifact(nomination.entry);

    const { entry, appended } = admitContextSheetMembershipValidation(paths, validationArtifact);
    assert.equal(appended, true);
    assert.equal(entry.sequence, 2);
    assert.equal(entry.operation, 'VALIDATE');
    assert.equal(entry.artifactHash, computeMembershipArtifactHash(validationArtifact));

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 2);
    assert.deepEqual(reopened[1], entry);
});

test('same VALIDATE idempotency key and same event returns the original entry without a second append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validationArtifact = makeValidationArtifact(nomination.entry);

    const first = admitContextSheetMembershipValidation(paths, validationArtifact);
    const second = admitContextSheetMembershipValidation(paths, validationArtifact);

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.deepEqual(second.entry, first.entry);
    assert.equal(readContextSheetMembershipLedger(paths).length, 2);
});

test('same VALIDATE idempotency key with different immutable content refuses without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validationArtifact = makeValidationArtifact(nomination.entry);
    const mutatedArtifact = JSON.parse(JSON.stringify(validationArtifact));
    mutatedArtifact.decisionReason = 'A different decision rationale under the same request identity.';

    admitContextSheetMembershipValidation(paths, validationArtifact);
    assert.throws(
        () => admitContextSheetMembershipValidation(paths, mutatedArtifact),
        (error) => error.code === 'CSM_VALIDATE_IDEMPOTENCY_COLLISION',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 2);
});

test('VALIDATE refuses a missing or mismatched exact NOMINATE reference without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const missingNominationArtifact = makeValidationArtifact(nomination.entry);
    missingNominationArtifact.nominationRef.artifactId = 'artifact:context-sheet-membership-nomination:missing';
    missingNominationArtifact.envelope.authorityBasisRefs[0].artifactId = missingNominationArtifact.nominationRef.artifactId;

    assert.throws(
        () => admitContextSheetMembershipValidation(paths, missingNominationArtifact),
        (error) => error.code === 'CSM_VALIDATE_NOMINATION_MISSING',
    );

    const mismatchedNominationArtifact = makeValidationArtifact(nomination.entry);
    mismatchedNominationArtifact.nominationRef.immutableHash = `sha256:${'0'.repeat(64)}`;
    mismatchedNominationArtifact.envelope.authorityBasisRefs[0].immutableHash = mismatchedNominationArtifact.nominationRef.immutableHash;
    assert.throws(
        () => admitContextSheetMembershipValidation(paths, mismatchedNominationArtifact),
        (error) => error.code === 'CSM_VALIDATE_NOMINATION_HASH_MISMATCH',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 1);
});

test('an invalid accepted validation event refuses schema admission before any validation append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const invalidArtifact = loadFixture('context-sheet-membership-validation-event-v1.invalid-accepted-failed-jurisdiction');
    const nominationRef = makeExactNominationReference(nomination.entry);
    invalidArtifact.envelope.memoryScopeId = nomination.entry.scopeId;
    invalidArtifact.envelope.authorityBasisRefs = [nominationRef];
    invalidArtifact.nominationRef = nominationRef;
    invalidArtifact.evaluatedCatalogRecordRef.memoryScopeId = nomination.entry.scopeId;
    invalidArtifact.evaluatedContextSheetRef.memoryScopeId = nomination.entry.scopeId;

    assert.equal(validateMembershipValidationArtifact(invalidArtifact).valid, false);
    assert.throws(
        () => admitContextSheetMembershipValidation(paths, invalidArtifact),
        (error) => error.code === 'CSM_VALIDATE_SCHEMA_INVALID',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 1);
});

test('VALIDATE refuses an unknown policy binding before any validation append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validationArtifact = makeValidationArtifact(nomination.entry);
    validationArtifact.envelope.policyBindings = [{ id: 'membership-validation-policy', version: 'v2' }];

    assert.throws(
        () => admitContextSheetMembershipValidation(paths, validationArtifact),
        (error) => error.code === 'CSM_VALIDATE_POLICY_BINDING_UNSUPPORTED',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 1);
});

test('interpretive and DNM publication ledgers remain byte-identical throughout VALIDATE admission', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedNeighboringLedgers(paths);
    const beforeInterpretive = readBytes(paths.interpretiveGovernanceLedgerPath);
    const beforeDnm = readBytes(paths.dnmPublicationLedgerPath);
    const nomination = nominateContextSheetMembership(
        paths,
        loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validationArtifact = makeValidationArtifact(nomination.entry);

    admitContextSheetMembershipValidation(paths, validationArtifact);
    admitContextSheetMembershipValidation(paths, validationArtifact);

    assert.deepEqual(readBytes(paths.interpretiveGovernanceLedgerPath), beforeInterpretive);
    assert.deepEqual(readBytes(paths.dnmPublicationLedgerPath), beforeDnm);
});

test('an accepted LINK appends only from exact accepted validation custody and survives an actual process restart', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { nomination, validation } = admitAcceptedValidation(paths);
    const linkArtifact = makeLinkArtifact(nomination, validation);

    const { entry, appended } = admitContextSheetMembershipLink(paths, linkArtifact);
    assert.equal(appended, true);
    assert.equal(entry.sequence, 3);
    assert.equal(entry.operation, 'LINK');
    assert.equal(entry.artifactHash, computeMembershipArtifactHash(linkArtifact));

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 3);
    assert.deepEqual(reopened[2], entry);
});

test('same LINK idempotency key and same link returns the original entry without a second append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { nomination, validation } = admitAcceptedValidation(paths);
    const linkArtifact = makeLinkArtifact(nomination, validation);
    const first = admitContextSheetMembershipLink(paths, linkArtifact);
    const second = admitContextSheetMembershipLink(paths, linkArtifact);

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.deepEqual(second.entry, first.entry);
    assert.equal(readContextSheetMembershipLedger(paths).length, 3);
});

test('LINK refuses changed request content, stale validation custody, and duplicate semantic basis without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { nomination, validation } = admitAcceptedValidation(paths);
    const linkArtifact = makeLinkArtifact(nomination, validation);
    admitContextSheetMembershipLink(paths, linkArtifact);

    const changedRequest = JSON.parse(JSON.stringify(linkArtifact));
    changedRequest.envelope.payloadHash = `sha256:${'f'.repeat(64)}`;
    assert.throws(
        () => admitContextSheetMembershipLink(paths, changedRequest),
        (error) => error.code === 'CSM_LINK_IDEMPOTENCY_COLLISION',
    );

    const staleValidation = makeLinkArtifact(nomination, validation);
    staleValidation.envelope.idempotencyKey = 'idempotency:link-stale-validation';
    staleValidation.validationEventRef.immutableHash = `sha256:${'0'.repeat(64)}`;
    staleValidation.envelope.authorityBasisRefs[0].immutableHash = staleValidation.validationEventRef.immutableHash;
    assert.throws(
        () => admitContextSheetMembershipLink(paths, staleValidation),
        (error) => error.code === 'CSM_LINK_VALIDATION_HASH_MISMATCH',
    );

    const duplicateSemantic = makeLinkArtifact(nomination, validation);
    duplicateSemantic.envelope.idempotencyKey = 'idempotency:link-duplicate-semantic';
    duplicateSemantic.envelope.artifactId = 'artifact:context-sheet-membership-link:duplicate-semantic';
    duplicateSemantic.membershipLinkId = 'membership-link:duplicate-semantic';
    assert.throws(
        () => admitContextSheetMembershipLink(paths, duplicateSemantic),
        (error) => error.code === 'CSM_LINK_SEMANTIC_DUPLICATE',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 3);
});

test('a copied-authority LINK refuses schema admission before any link append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { nomination, validation } = admitAcceptedValidation(paths);
    const invalidArtifact = loadFixture('context-sheet-membership-link-v1.invalid-copied-authority');
    const linkedArtifact = makeLinkArtifact(nomination, validation);
    Object.assign(invalidArtifact, linkedArtifact, {
        catalogAuthorityCopied: true,
    });

    assert.equal(validateMembershipLinkArtifact(invalidArtifact).valid, false);
    assert.throws(
        () => admitContextSheetMembershipLink(paths, invalidArtifact),
        (error) => error.code === 'CSM_LINK_SCHEMA_INVALID',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 2);
});

test('interpretive and DNM publication ledgers remain byte-identical throughout LINK admission', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedNeighboringLedgers(paths);
    const beforeInterpretive = readBytes(paths.interpretiveGovernanceLedgerPath);
    const beforeDnm = readBytes(paths.dnmPublicationLedgerPath);
    const { nomination, validation } = admitAcceptedValidation(paths);
    const linkArtifact = makeLinkArtifact(nomination, validation);

    admitContextSheetMembershipLink(paths, linkArtifact);
    assert.deepEqual(readBytes(paths.interpretiveGovernanceLedgerPath), beforeInterpretive);
    assert.deepEqual(readBytes(paths.dnmPublicationLedgerPath), beforeDnm);
});

test('a successor correction appends from exact predecessor custody and survives an actual process restart', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const link = admitInitialLink(paths);
    const successorArtifact = makeSuccessorArtifact(link);
    const { entry, appended } = admitContextSheetMembershipSuccessor(paths, successorArtifact);

    assert.equal(appended, true);
    assert.equal(entry.sequence, 4);
    assert.equal(entry.operation, 'SUCCEED');
    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 4);
    assert.deepEqual(reopened[3], entry);
});

test('same SUCCEED idempotency key returns the original event while changed content refuses', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const successorArtifact = makeSuccessorArtifact(admitInitialLink(paths));
    const first = admitContextSheetMembershipSuccessor(paths, successorArtifact);
    const second = admitContextSheetMembershipSuccessor(paths, successorArtifact);
    const changed = JSON.parse(JSON.stringify(successorArtifact));
    changed.envelope.payloadHash = `sha256:${'f'.repeat(64)}`;

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, changed),
        (error) => error.code === 'CSM_SUCCEED_IDEMPOTENCY_COLLISION',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 4);
});

test('SUCCEED refuses missing predecessor custody and schema-invalid authority changes without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const link = admitInitialLink(paths);
    const missingPredecessor = makeSuccessorArtifact(link);
    missingPredecessor.predecessorLinkRef.artifactId = 'artifact:context-sheet-membership-link:missing';
    missingPredecessor.envelope.authorityBasisRefs[0].artifactId = missingPredecessor.predecessorLinkRef.artifactId;
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, missingPredecessor),
        (error) => error.code === 'CSM_SUCCEED_PREDECESSOR_MISSING',
    );

    const invalidArtifact = makeSuccessorArtifact(link);
    invalidArtifact.catalogAuthorityChanged = true;
    assert.equal(validateMembershipSuccessorArtifact(invalidArtifact).valid, false);
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, invalidArtifact),
        (error) => error.code === 'CSM_SUCCEED_SCHEMA_INVALID',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 3);
});

test('interpretive and DNM publication ledgers remain byte-identical throughout SUCCEED admission', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedNeighboringLedgers(paths);
    const successorArtifact = makeSuccessorArtifact(admitInitialLink(paths));
    const beforeInterpretive = readBytes(paths.interpretiveGovernanceLedgerPath);
    const beforeDnm = readBytes(paths.dnmPublicationLedgerPath);
    admitContextSheetMembershipSuccessor(paths, successorArtifact);
    assert.deepEqual(readBytes(paths.interpretiveGovernanceLedgerPath), beforeInterpretive);
    assert.deepEqual(readBytes(paths.dnmPublicationLedgerPath), beforeDnm);
});
