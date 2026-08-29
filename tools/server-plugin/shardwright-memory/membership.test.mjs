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
    computeContextSheetIdentityArtifactHash,
} from './identity.js';
import {
    admitContextSheetMembershipImpactDecision,
    admitContextSheetMembershipReconciliationResult,
    admitContextSheetMembershipValidation,
    admitContextSheetMembershipLink,
    admitContextSheetMembershipSuccessor,
    computeMembershipArtifactHash,
    nominateContextSheetMembership,
    readContextSheetMembershipLedger,
    replayContextSheetMembershipCurrentUse,
    validateMembershipValidationArtifact,
    validateMembershipImpactDecisionArtifact,
    validateMembershipLinkArtifact,
    validateMembershipSuccessorArtifact,
    validateMembershipNominationArtifact,
    validateMembershipReconciliationResultArtifact,
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

function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

function writeMembershipLock(paths, overrides = {}) {
    fs.mkdirSync(paths.contextSheetMembershipLockPath, { recursive: true });
    const lease = {
        leaseVersion: 1,
        leaseId: 'csmlease_test',
        ownerProcessId: 999999,
        acquiredAt: '2026-08-29T00:00:00.000Z',
        heartbeatAt: '2026-08-29T00:00:00.000Z',
        operation: 'NOMINATE',
        scopeId: 'scope:phase-x-membership',
        idempotencyKey: 'idempotency:nominate-operator-direct',
        artifactHash: `sha256:${'a'.repeat(64)}`,
        ...overrides,
    };
    fs.writeFileSync(path.join(paths.contextSheetMembershipLockPath, 'lease.json'), `${JSON.stringify(lease, null, 2)}\n`, 'utf8');
    return lease;
}

function membershipLeaseRecoveryReports(paths) {
    const reportsRoot = path.join(paths.storageRoot, 'context-sheet-membership-diagnostics', 'lease-recovery');
    if (!fs.existsSync(reportsRoot)) {
        return [];
    }
    return fs.readdirSync(reportsRoot).sort();
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

function makeDistinctValidationArtifact(nominationEntry, suffix) {
    const artifact = makeValidationArtifact(nominationEntry);
    artifact.envelope.artifactId = `artifact:context-sheet-membership-validation-event:${suffix}`;
    artifact.envelope.idempotencyKey = `idempotency:validate-${suffix}`;
    artifact.envelope.payloadHash = `sha256:${'a'.repeat(64)}`;
    artifact.evaluatedCatalogRecordRef.artifactId = `artifact:memory-catalog-record:${suffix}`;
    artifact.evaluatedCatalogRecordRef.immutableHash = `sha256:${'b'.repeat(64)}`;
    artifact.evaluatedContextSheetRef.artifactId = `artifact:context-sheet-lifecycle-projection:${suffix}`;
    artifact.evaluatedContextSheetRef.immutableHash = `sha256:${'c'.repeat(64)}`;
    artifact.claimBasis.catalogClaimIds = [`claim:${suffix}`];
    artifact.claimBasis.basisHash = `sha256:${'d'.repeat(64)}`;
    artifact.claimBasis.boundedMeaning = `The governed decision directly concerns ${suffix}.`;
    artifact.semanticDeduplicationKey = `sha256:${'e'.repeat(64)}`;
    return artifact;
}

function makeDistinctLinkArtifact(nominationEntry, validationEntry, suffix) {
    const artifact = makeLinkArtifact(nominationEntry, validationEntry);
    artifact.envelope.artifactId = `artifact:context-sheet-membership-link:${suffix}`;
    artifact.envelope.idempotencyKey = `idempotency:link-${suffix}`;
    artifact.envelope.payloadHash = `sha256:${'1'.repeat(64)}`;
    artifact.membershipLinkId = `membership-link:${suffix}`;
    artifact.semanticDeduplicationKey = `sha256:${'2'.repeat(64)}`;
    artifact.evidenceAccountingKey = `sha256:${'3'.repeat(64)}`;
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

function makeExactSuccessorReference(successorEntry) {
    return {
        artifactType: 'context-sheet-membership-successor-event-v1',
        artifactId: successorEntry.artifactId,
        memoryScopeId: successorEntry.scopeId,
        expectedArtifactClass: 'EVENT',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: successorEntry.artifactHash,
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

function makeRetypedSuccessorArtifact(predecessorLinkEntry, successorLinkEntry, successorValidationEntry) {
    const artifact = loadFixture('context-sheet-membership-successor-event-v1.valid-retyped');
    const predecessorLinkRef = makeExactLinkReference(predecessorLinkEntry);
    const successorLinkRef = makeExactLinkReference(successorLinkEntry);
    const successorValidationEventRef = makeExactValidationReference(successorValidationEntry);
    artifact.envelope.memoryScopeId = predecessorLinkEntry.scopeId;
    artifact.envelope.authorityBasisRefs = [predecessorLinkRef, successorLinkRef, successorValidationEventRef];
    artifact.predecessorLinkRef = predecessorLinkRef;
    artifact.successorLinkRef = successorLinkRef;
    artifact.successorValidationEventRef = successorValidationEventRef;
    return artifact;
}

function admitInitialLink(paths) {
    const { nomination, validation } = admitAcceptedValidation(paths);
    const link = admitContextSheetMembershipLink(paths, makeLinkArtifact(nomination, validation));
    return link.entry;
}

function admitSuccessorCustodyScenario(paths) {
    const { nomination, validation } = admitAcceptedValidation(paths);
    const predecessorLink = admitContextSheetMembershipLink(paths, makeLinkArtifact(nomination, validation));
    const successorValidationArtifact = makeDistinctValidationArtifact(nomination, 'successor-custody');
    const successorValidation = admitContextSheetMembershipValidation(paths, successorValidationArtifact);
    const successorLinkArtifact = makeDistinctLinkArtifact(nomination, successorValidation.entry, 'successor-custody');
    const successorLink = admitContextSheetMembershipLink(paths, successorLinkArtifact);
    return {
        predecessorLink: predecessorLink.entry,
        successorValidation: successorValidation.entry,
        successorLink: successorLink.entry,
    };
}

function makeIdentityCreationPairForSheet({
    contextSheetId,
    scopeId,
    sheetType,
    preferredTitle,
    canonicalAnchorId,
    anchorJurisdictionId,
    identityAuthorityRef,
    suffix,
}) {
    const record = loadFixture('context-sheet-record-v1.valid-resolved');
    const event = loadFixture('context-sheet-creation-event-v1.valid');
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
    event.contextSheetRef.immutableHash = computeContextSheetIdentityArtifactHash(record);
    event.sheetType = sheetType;
    return { record, event };
}

function admitIdentitySheet(paths, config) {
    const { record, event } = makeIdentityCreationPairForSheet(config);
    admitContextSheetCreation(paths, record, event);
}

function lifecycleRefsForSourceSheets(sourceSheets) {
    return Object.fromEntries(sourceSheets.map((sourceSheet) => [
        sourceSheet.contextSheetId,
        sourceSheet.exactStateRef,
    ]));
}

function admitMergeStructuralEvent(paths) {
    const merge = loadFixture('context-sheet-merge-event-v1.valid');
    for (const sourceSheet of merge.sourceSheets) {
        admitIdentitySheet(paths, {
            contextSheetId: sourceSheet.contextSheetId,
            scopeId: merge.envelope.memoryScopeId,
            sheetType: merge.sheetType,
            preferredTitle: sourceSheet.contextSheetId,
            canonicalAnchorId: merge.sharedCanonicalAnchorId,
            anchorJurisdictionId: merge.anchorJurisdictionId,
            identityAuthorityRef: merge.mergeAuthorityRef,
            suffix: sourceSheet.contextSheetId.endsWith('duplicate') ? 'ababababababababababababab' : 'cdcdcdcdcdcdcdcdcdcdcdcdcd',
        });
    }
    return admitContextSheetMerge(paths, merge, {
        lifecycleStateRefsByContextSheetId: lifecycleRefsForSourceSheets(merge.sourceSheets),
    }).eventRef;
}

function admitImpactCustodyScenario(paths) {
    const structuralEventRef = admitMergeStructuralEvent(paths);
    const { predecessorLink, successorLink, successorValidation } = admitSuccessorCustodyScenario(paths);
    const successorArtifact = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    const successorEvent = admitContextSheetMembershipSuccessor(paths, successorArtifact);
    return {
        structuralEventRef,
        predecessorLink,
        successorEvent: successorEvent.entry,
    };
}

function makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent) {
    const artifact = loadFixture('context-sheet-membership-impact-decision-v1.valid-merge-remap');
    artifact.envelope.memoryScopeId = predecessorLink.scopeId;
    artifact.envelope.authorityBasisRefs = [clone(structuralEventRef)];
    artifact.structuralEventRef = clone(structuralEventRef);
    artifact.impactedLinkRef = makeExactLinkReference(predecessorLink);
    artifact.successorEventRefs = successorEvent ? [makeExactSuccessorReference(successorEvent)] : [];
    artifact.evidenceRefs = [clone(structuralEventRef)];
    return artifact;
}

function makeReconciliationResultArtifact(authoritativeInputRefs, replayThroughEventRef) {
    const artifact = loadFixture('context-sheet-membership-reconciliation-result-v1.valid-rebuild');
    artifact.envelope.memoryScopeId = replayThroughEventRef.memoryScopeId;
    artifact.envelope.artifactId = 'artifact:context-sheet-membership-reconciliation-result:runtime-rebuild';
    artifact.targetId = replayThroughEventRef.memoryScopeId;
    artifact.authoritativeInputRefs = authoritativeInputRefs.map((reference) => clone(reference));
    artifact.replayThroughEventRef = clone(replayThroughEventRef);
    artifact.reconstructedCounts = {
        nominations: 1,
        validationEvents: 2,
        acceptedLinks: 2,
        refusedDecisions: 0,
        successorEvents: 1,
        impactDecisions: 1,
        quarantinedItems: 0,
    };
    return artifact;
}

function assertErrorCode(fn, code) {
    assert.throws(fn, (error) => error.code === code);
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

test('structurally valid impact decision schema compiles and invalid authority changes refuse schema admission', () => {
    assert.equal(validateMembershipImpactDecisionArtifact(loadFixture('context-sheet-membership-impact-decision-v1.valid-merge-remap')).valid, true);
    assert.equal(validateMembershipImpactDecisionArtifact(loadFixture('context-sheet-membership-impact-decision-v1.invalid-authority-change')).valid, false);
    assert.equal(validateMembershipImpactDecisionArtifact(loadFixture('context-sheet-membership-impact-decision-v1.invalid-merge-multiple-successors')).valid, false);
});

test('an impact decision appends from exact link, successor, and Context Sheet structural-event custody', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const artifact = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);

    const { entry, appended } = admitContextSheetMembershipImpactDecision(paths, artifact);

    assert.equal(appended, true);
    assert.equal(entry.sequence, 7);
    assert.equal(entry.operation, 'IMPACT_DECIDE');
    assert.equal(entry.artifactHash, computeMembershipArtifactHash(artifact));

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 7);
    assert.deepEqual(reopened[6], entry);
});

test('same IMPACT_DECIDE idempotency key returns the original event while changed content refuses', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const artifact = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    const first = admitContextSheetMembershipImpactDecision(paths, artifact);
    const second = admitContextSheetMembershipImpactDecision(paths, artifact);
    const changed = clone(artifact);
    changed.reason = 'A different impact reason under the same request identity.';

    assert.equal(first.appended, true);
    assert.equal(second.appended, false);
    assert.deepEqual(second.entry, first.entry);
    assertErrorCode(
        () => admitContextSheetMembershipImpactDecision(paths, changed),
        'CSM_IMPACT_IDEMPOTENCY_COLLISION',
    );
    assert.equal(readContextSheetMembershipLedger(paths).length, 7);
});

test('IMPACT_DECIDE refuses an unknown policy binding with the impact error prefix', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const artifact = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    artifact.envelope.policyBindings = [{ id: 'membership-validation-policy', version: 'v2' }];

    assertErrorCode(
        () => admitContextSheetMembershipImpactDecision(paths, artifact),
        'CSM_IMPACT_POLICY_BINDING_UNSUPPORTED',
    );
    assert.equal(readContextSheetMembershipLedger(paths).filter((entry) => entry.operation === 'IMPACT_DECIDE').length, 0);
});

test('IMPACT_DECIDE refuses missing or stale Context Sheet structural-event custody without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const link = admitInitialLink(paths);
    const artifact = makeImpactDecisionArtifact(loadFixture('context-sheet-membership-impact-decision-v1.valid-merge-remap').structuralEventRef, link, null);
    artifact.successorEventRefs = [];
    artifact.impactDecision = 'REMAINS_HISTORICAL_ONLY';
    artifact.predecessorCurrentUseState = 'HISTORICAL_ONLY';
    artifact.compatibilityChecks = {
        type: 'NOT_APPLICABLE',
        anchor: 'NOT_APPLICABLE',
        claim: 'NOT_APPLICABLE',
        jurisdiction: 'NOT_APPLICABLE',
        temporal: 'NOT_APPLICABLE',
    };

    assertErrorCode(
        () => admitContextSheetMembershipImpactDecision(paths, artifact),
        'CSM_IMPACT_STRUCTURAL_EVENT_MISSING',
    );

    const { structuralEventRef } = admitImpactCustodyScenario(paths);
    const stale = clone(artifact);
    stale.envelope.idempotencyKey = 'idempotency:impact-stale-structural';
    stale.envelope.artifactId = 'artifact:context-sheet-membership-impact-decision:stale-structural';
    stale.structuralEventRef = {
        ...structuralEventRef,
        immutableHash: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    };
    stale.envelope.authorityBasisRefs = [clone(stale.structuralEventRef)];
    stale.evidenceRefs = [clone(stale.structuralEventRef)];
    stale.impactedLinkRef = makeExactLinkReference(link);
    assertErrorCode(
        () => admitContextSheetMembershipImpactDecision(paths, stale),
        'CSM_IMPACT_STRUCTURAL_EVENT_HASH_MISMATCH',
    );
    assert.equal(readContextSheetMembershipLedger(paths).filter((entry) => entry.operation === 'IMPACT_DECIDE').length, 0);
});

test('IMPACT_DECIDE refuses missing impacted link or successor-event custody without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);

    const missingLink = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    missingLink.envelope.idempotencyKey = 'idempotency:impact-missing-link';
    missingLink.envelope.artifactId = 'artifact:context-sheet-membership-impact-decision:missing-link';
    missingLink.impactedLinkRef.artifactId = 'artifact:context-sheet-membership-link:missing';
    assertErrorCode(
        () => admitContextSheetMembershipImpactDecision(paths, missingLink),
        'CSM_IMPACT_LINK_MISSING',
    );

    const missingSuccessor = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    missingSuccessor.envelope.idempotencyKey = 'idempotency:impact-missing-successor';
    missingSuccessor.envelope.artifactId = 'artifact:context-sheet-membership-impact-decision:missing-successor';
    missingSuccessor.successorEventRefs[0].artifactId = 'artifact:context-sheet-membership-successor-event:missing';
    assertErrorCode(
        () => admitContextSheetMembershipImpactDecision(paths, missingSuccessor),
        'CSM_IMPACT_SUCCESSOR_EVENT_MISSING',
    );

    assert.equal(readContextSheetMembershipLedger(paths).filter((entry) => entry.operation === 'IMPACT_DECIDE').length, 0);
});

test('identity and neighboring authority ledgers remain byte-identical throughout IMPACT_DECIDE admission', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedNeighboringLedgers(paths);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const artifact = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    const beforeIdentity = readBytes(paths.contextSheetIdentityLedgerPath);
    const beforeInterpretive = readBytes(paths.interpretiveGovernanceLedgerPath);
    const beforeDnm = readBytes(paths.dnmPublicationLedgerPath);

    admitContextSheetMembershipImpactDecision(paths, artifact);
    admitContextSheetMembershipImpactDecision(paths, artifact);

    assert.deepEqual(readBytes(paths.contextSheetIdentityLedgerPath), beforeIdentity);
    assert.deepEqual(readBytes(paths.interpretiveGovernanceLedgerPath), beforeInterpretive);
    assert.deepEqual(readBytes(paths.dnmPublicationLedgerPath), beforeDnm);
});

test('membership replay reconstructs current-use state from LINK, SUCCEED, and IMPACT_DECIDE authority', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const artifact = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    admitContextSheetMembershipImpactDecision(paths, artifact);

    const projection = replayContextSheetMembershipCurrentUse(paths);
    const predecessor = projection.links.find((link) => link.linkRef.artifactId === predecessorLink.artifactId);
    const successor = projection.links.find((link) => link.linkRef.artifactId === successorEvent.artifact.successorLinkRef.artifactId);

    assert.equal(projection.projectionAuthority, 'DISPOSABLE_REPLAY_DERIVED');
    assert.equal(projection.entriesReplayed, 7);
    assert.equal(predecessor.currentUseState, 'SUPERSEDED');
    assert.deepEqual(predecessor.successorLinkRefs, [successorEvent.artifact.successorLinkRef]);
    assert.equal(successor.currentUseState, 'CURRENT');
    assert.equal(projection.currentLinks.length, 1);
    assert.deepEqual(projection.currentLinks[0], successor.linkRef);
});

test('membership replay refuses missing Context Sheet structural-event custody without repairing authority', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    admitContextSheetMembershipImpactDecision(paths, makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent));
    const beforeMembership = readBytes(paths.contextSheetMembershipLedgerPath);
    fs.writeFileSync(paths.contextSheetIdentityLedgerPath, '', 'utf8');

    assertErrorCode(
        () => replayContextSheetMembershipCurrentUse(paths),
        'CSM_REPLAY_STRUCTURAL_EVENT_MISSING',
    );
    assert.deepEqual(readBytes(paths.contextSheetMembershipLedgerPath), beforeMembership);
});

test('membership replay blocks conflicting current-use events instead of choosing by write order', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const link = admitInitialLink(paths);
    const removed = makeSuccessorArtifact(link);
    admitContextSheetMembershipSuccessor(paths, removed);

    const disputed = makeSuccessorArtifact(link);
    disputed.envelope.artifactId = 'artifact:context-sheet-membership-successor-event:conflicting-dispute';
    disputed.envelope.idempotencyKey = 'idempotency:conflicting-dispute';
    disputed.correctionType = 'LINK_DISPUTED';
    disputed.predecessorCurrentUseState = 'BLOCKED';
    disputed.reason = 'Separate review disputed this link after removal.';
    admitContextSheetMembershipSuccessor(paths, disputed);

    const projection = replayContextSheetMembershipCurrentUse(paths);
    const predecessor = projection.links.find((item) => item.linkRef.artifactId === link.artifactId);

    assert.equal(predecessor.currentUseState, 'BLOCKED');
    assert.deepEqual(predecessor.successorLinkRefs, []);
    assert.deepEqual(predecessor.blockers, ['CSM_REPLAY_CONFLICTING_CURRENT_USE_EVENTS']);
    assert.deepEqual(projection.blockedLinks, [predecessor.linkRef]);
});

test('structurally valid reconciliation result schema compiles and authority repair variants refuse schema admission', () => {
    assert.equal(validateMembershipReconciliationResultArtifact(loadFixture('context-sheet-membership-reconciliation-result-v1.valid-rebuild')).valid, true);
    assert.equal(validateMembershipReconciliationResultArtifact(loadFixture('context-sheet-membership-reconciliation-result-v1.invalid-authority-repair')).valid, false);
    assert.equal(validateMembershipReconciliationResultArtifact(loadFixture('context-sheet-membership-reconciliation-result-v1.invalid-clean-discrepancy')).valid, false);
});

test('a reconciliation result appends from exact authoritative input and replay-through custody', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const impactArtifact = makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent);
    const impact = admitContextSheetMembershipImpactDecision(paths, impactArtifact);
    const impactRef = {
        artifactType: 'context-sheet-membership-impact-decision-v1',
        artifactId: impact.entry.artifactId,
        memoryScopeId: impact.entry.scopeId,
        expectedArtifactClass: 'EVENT',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: impact.entry.artifactHash,
    };
    const artifact = makeReconciliationResultArtifact([
        makeExactLinkReference(predecessorLink),
        makeExactSuccessorReference(successorEvent),
        impactRef,
    ], impactRef);

    const { entry, appended } = admitContextSheetMembershipReconciliationResult(paths, artifact);

    assert.equal(appended, true);
    assert.equal(entry.sequence, 8);
    assert.equal(entry.operation, 'RECONCILE');
    assert.equal(entry.idempotencyKey, artifact.envelope.artifactId);
    assert.equal(entry.artifactHash, computeMembershipArtifactHash(artifact));

    const duplicate = admitContextSheetMembershipReconciliationResult(paths, artifact);
    assert.equal(duplicate.appended, false);
    assert.deepEqual(duplicate.entry, entry);

    const reopened = readLedgerInFreshProcess(root);
    assert.equal(reopened.length, 8);
    assert.deepEqual(reopened[7], entry);
});

test('RECONCILE refuses missing or stale authoritative input custody without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const impact = admitContextSheetMembershipImpactDecision(
        paths,
        makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent),
    );
    const impactRef = {
        artifactType: 'context-sheet-membership-impact-decision-v1',
        artifactId: impact.entry.artifactId,
        memoryScopeId: impact.entry.scopeId,
        expectedArtifactClass: 'EVENT',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: impact.entry.artifactHash,
    };
    const missing = makeReconciliationResultArtifact([
        {
            ...makeExactLinkReference(predecessorLink),
            artifactId: 'artifact:context-sheet-membership-link:missing',
        },
    ], impactRef);

    assertErrorCode(
        () => admitContextSheetMembershipReconciliationResult(paths, missing),
        'CSM_RECONCILE_AUTHORITY_INPUT_MISSING',
    );

    const stale = makeReconciliationResultArtifact([{
        ...impactRef,
        immutableHash: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    }], impactRef);
    stale.envelope.artifactId = 'artifact:context-sheet-membership-reconciliation-result:stale-input';
    assertErrorCode(
        () => admitContextSheetMembershipReconciliationResult(paths, stale),
        'CSM_RECONCILE_AUTHORITY_INPUT_HASH_MISMATCH',
    );
    assert.equal(readContextSheetMembershipLedger(paths).filter((entry) => entry.operation === 'RECONCILE').length, 0);
});

test('RECONCILE refuses unsupported policy bindings and changed result content without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { structuralEventRef, predecessorLink, successorEvent } = admitImpactCustodyScenario(paths);
    const impact = admitContextSheetMembershipImpactDecision(
        paths,
        makeImpactDecisionArtifact(structuralEventRef, predecessorLink, successorEvent),
    );
    const impactRef = {
        artifactType: 'context-sheet-membership-impact-decision-v1',
        artifactId: impact.entry.artifactId,
        memoryScopeId: impact.entry.scopeId,
        expectedArtifactClass: 'EVENT',
        resolutionRequirement: 'EXACT_HASH',
        immutableHash: impact.entry.artifactHash,
    };
    const artifact = makeReconciliationResultArtifact([impactRef], impactRef);
    admitContextSheetMembershipReconciliationResult(paths, artifact);

    const changed = clone(artifact);
    changed.reconstructedCounts.quarantinedItems = 1;
    assertErrorCode(
        () => admitContextSheetMembershipReconciliationResult(paths, changed),
        'CSM_RECONCILE_IDEMPOTENCY_COLLISION',
    );

    const unsupportedPolicy = makeReconciliationResultArtifact([impactRef], impactRef);
    unsupportedPolicy.envelope.artifactId = 'artifact:context-sheet-membership-reconciliation-result:unsupported-policy';
    unsupportedPolicy.envelope.policyBindings = [{ id: 'membership-reconcile-policy', version: 'v1' }];
    assertErrorCode(
        () => admitContextSheetMembershipReconciliationResult(paths, unsupportedPolicy),
        'CSM_RECONCILE_POLICY_BINDING_UNSUPPORTED',
    );
    assert.equal(readContextSheetMembershipLedger(paths).filter((entry) => entry.operation === 'RECONCILE').length, 1);
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

test('stale membership write lease is reclaimed without treating the lease as authority', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    const first = nominateContextSheetMembership(paths, artifact, { now: Date.parse('2026-08-29T00:01:00.000Z') });
    const beforeLedger = readBytes(paths.contextSheetMembershipLedgerPath);
    writeMembershipLock(paths, {
        acquiredAt: '2026-08-29T00:00:00.000Z',
        heartbeatAt: '2026-08-29T00:00:00.000Z',
        artifactHash: computeMembershipArtifactHash(artifact),
    });

    const second = nominateContextSheetMembership(paths, artifact, {
        now: Date.parse('2026-08-29T00:10:00.000Z'),
        staleLeaseMs: 1000,
    });

    assert.equal(second.appended, false);
    assert.deepEqual(second.entry, first.entry);
    assert.deepEqual(readBytes(paths.contextSheetMembershipLedgerPath), beforeLedger);
    assert.equal(fs.existsSync(paths.contextSheetMembershipLockPath), false);
    const reports = membershipLeaseRecoveryReports(paths);
    assert.equal(reports.length, 1);
    const report = JSON.parse(fs.readFileSync(path.join(paths.storageRoot, 'context-sheet-membership-diagnostics', 'lease-recovery', reports[0]), 'utf8'));
    assert.equal(report.reportAuthority, 'NON_AUTHORITATIVE_DIAGNOSTIC');
    assert.equal(report.reason, 'STALE_LEASE_RECLAIMED');
});

test('active membership write lease refuses admission without mutating authority', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    writeMembershipLock(paths, {
        acquiredAt: '2026-08-29T00:09:59.000Z',
        heartbeatAt: '2026-08-29T00:09:59.000Z',
    });

    assert.throws(
        () => nominateContextSheetMembership(paths, artifact, {
            now: Date.parse('2026-08-29T00:10:00.000Z'),
            staleLeaseMs: 60 * 1000,
        }),
        (error) => error.code === 'CSM_LEDGER_LOCK_HELD',
    );
    assert.equal(fs.existsSync(paths.contextSheetMembershipLedgerPath), false);
    assert.equal(fs.existsSync(paths.contextSheetMembershipLockPath), true);
    assert.deepEqual(membershipLeaseRecoveryReports(paths), []);
});

test('ambiguous membership write lease fails closed and leaves the lock for operator recovery', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const artifact = loadFixture('context-sheet-membership-nomination-v1.valid-operator-direct');
    fs.mkdirSync(paths.contextSheetMembershipLockPath, { recursive: true });
    fs.writeFileSync(path.join(paths.contextSheetMembershipLockPath, 'lease.json'), '{not-json}\n', 'utf8');

    assert.throws(
        () => nominateContextSheetMembership(paths, artifact, {
            now: Date.parse('2026-08-29T00:10:00.000Z'),
            staleLeaseMs: 1000,
        }),
        (error) => error.code === 'CSM_LEDGER_LOCK_AMBIGUOUS',
    );
    assert.equal(fs.existsSync(paths.contextSheetMembershipLedgerPath), false);
    assert.equal(fs.existsSync(paths.contextSheetMembershipLockPath), true);
    assert.deepEqual(membershipLeaseRecoveryReports(paths), []);
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

test('a successor correction appends with populated successor link and validation custody', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { predecessorLink, successorLink, successorValidation } = admitSuccessorCustodyScenario(paths);
    const successorArtifact = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    const { entry, appended } = admitContextSheetMembershipSuccessor(paths, successorArtifact);

    assert.equal(appended, true);
    assert.equal(entry.sequence, 6);
    assert.equal(entry.operation, 'SUCCEED');
    assert.deepEqual(entry.artifact.successorLinkRef, makeExactLinkReference(successorLink));
    assert.deepEqual(entry.artifact.successorValidationEventRef, makeExactValidationReference(successorValidation));
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

test('SUCCEED refuses populated successor link custody gaps without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { predecessorLink, successorLink, successorValidation } = admitSuccessorCustodyScenario(paths);

    const missingSuccessorLink = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    missingSuccessorLink.successorLinkRef.artifactId = 'artifact:context-sheet-membership-link:missing-successor';
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, missingSuccessorLink),
        (error) => error.code === 'CSM_SUCCEED_SUCCESSOR_LINK_MISSING',
    );

    const mismatchedSuccessorLink = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    mismatchedSuccessorLink.successorLinkRef.immutableHash = `sha256:${'0'.repeat(64)}`;
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, mismatchedSuccessorLink),
        (error) => error.code === 'CSM_SUCCEED_SUCCESSOR_LINK_HASH_MISMATCH',
    );

    const outOfScopeSuccessorLink = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    outOfScopeSuccessorLink.successorLinkRef.memoryScopeId = 'scope:other';
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, outOfScopeSuccessorLink),
        (error) => error.code === 'CSM_SUCCEED_SUCCESSOR_SCOPE_MISMATCH',
    );

    assert.equal(readContextSheetMembershipLedger(paths).length, 5);
});

test('SUCCEED refuses populated successor validation custody gaps without append', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { predecessorLink, successorLink, successorValidation } = admitSuccessorCustodyScenario(paths);

    const missingSuccessorValidation = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    missingSuccessorValidation.successorValidationEventRef.artifactId = 'artifact:context-sheet-membership-validation-event:missing-successor';
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, missingSuccessorValidation),
        (error) => error.code === 'CSM_SUCCEED_SUCCESSOR_VALIDATION_MISSING',
    );

    const mismatchedSuccessorValidation = makeRetypedSuccessorArtifact(predecessorLink, successorLink, successorValidation);
    mismatchedSuccessorValidation.successorValidationEventRef.immutableHash = `sha256:${'0'.repeat(64)}`;
    assert.throws(
        () => admitContextSheetMembershipSuccessor(paths, mismatchedSuccessorValidation),
        (error) => error.code === 'CSM_SUCCEED_SUCCESSOR_VALIDATION_HASH_MISMATCH',
    );

    assert.equal(readContextSheetMembershipLedger(paths).length, 5);
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
