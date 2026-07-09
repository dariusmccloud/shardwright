import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { init } from './index.js';
import {
    createAdapter,
    getStoragePaths,
    openOperationalDatabase,
} from './core.js';
import {
    createInterpretiveCandidate,
    getCurrentActiveDnmRecord,
    getInterpretiveCandidate,
    getInterpretivePublicationOperatorState,
    publishInterpretiveMemory,
    recordInterpretiveSubjectDisposition,
    submitInterpretiveReviewDisposition,
} from './interpretive.js';

function makeTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-upgrade-'));
}

function buildRequest(root, overrides = {}) {
    return {
        user: {
            directories: {
                root,
                chats: path.join(root, 'chats'),
                groupChats: path.join(root, 'group chats'),
            },
        },
        body: {},
        query: {},
        params: {},
        ...overrides,
    };
}

function createMockRouter() {
    const routes = {
        get: new Map(),
        post: new Map(),
    };
    return {
        routes,
        get(pathname, handler) {
            routes.get.set(pathname, handler);
        },
        post(pathname, handler) {
            routes.post.set(pathname, handler);
        },
    };
}

async function invoke(handler, request) {
    const state = {
        statusCode: 200,
        payload: null,
    };
    const response = {
        status(code) {
            state.statusCode = code;
            return this;
        },
        send(payload) {
            state.payload = payload;
            return this;
        },
    };
    await handler(request, response);
    return state;
}

function makeBasePayload(overrides = {}) {
    return {
        interpretationId: 'interp_jeep_upgrade_replay',
        interpretationRevisionId: 'interprev_jeep_upgrade_replay_v1',
        revisionReason: 'INITIAL_PROPOSAL',
        memoryScopeId: 'scope_alpha',
        memorySubjectId: 'character:jeep.png',
        type: 'ROLE_EVOLUTION',
        statement: 'Jeep evolved into the primary architectural authority for continuity and memory requirements within the shared architecture.',
        assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
        sharedRelationshipAsserted: true,
        personalMeaningAsserted: true,
        materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
        groundingLinks: [
            {
                basisType: 'STRUCTURAL_RECORD',
                basisRecordId: 'decision:architectural-sharder-fork',
                basisRecordVersion: 1,
                basisRecordHash: 'sha256:decision-fork',
                speakerEntityId: 'character:jeep.png',
                groundingRole: 'PRIMARY',
                groundingAssessment: 'SUPPORTS',
            },
            {
                basisType: 'SOURCE_OCCURRENCE',
                chatInstanceId: 'chat_alpha',
                messageId: 'msg_alpha0000000000000000000000000',
                messageRevisionHash: 'sha256:msg-alpha',
                speakerEntityId: 'user:Chris',
                groundingRole: 'SUPPORTING',
                groundingAssessment: 'SUPPORTS',
            },
        ],
        now: Date.parse('2026-07-09T11:00:00.000Z'),
        ...overrides,
    };
}

async function assertReplayBlocked(root, expected) {
    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(root, {
            body: {
                now: Date.parse('2026-07-09T11:30:00.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 409);
    assert.equal(replayResult.payload.ok, false);
    assert.equal(replayResult.payload.code, 'ARCH_UPGRADE_REPLAY_BLOCKED');
    assert.equal(replayResult.payload.preflightStatus, expected.preflightStatus);
    assert.deepEqual(replayResult.payload.technicalCodes, expected.technicalCodes);
    assert.match(replayResult.payload.error, expected.messagePattern);
}

function seedPublishedReplaySource() {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_jeep_upgrade_replay_seeded',
        interpretationRevisionId: 'interprev_jeep_upgrade_replay_seeded_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:09:00.000Z'),
    });
    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:09:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(sourceRequest, created.interpretation.interpretationRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:09:10.000Z'),
    });
    publishInterpretiveMemory(sourceRequest, created.interpretation.interpretationRevisionId, {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-07-09T11:09:25.000Z'),
    });
    return {
        sourceRoot,
        sourcePaths: getStoragePaths(sourceRoot),
    };
}

test('upgrade replay route restores governed published state from ledgers without a live projection', async () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);

    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload());
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:01:00.000Z'),
    });
    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:01:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(sourceRequest, created.interpretation.interpretationRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:01:10.000Z'),
    });
    const published = publishInterpretiveMemory(sourceRequest, created.interpretation.interpretationRevisionId, {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-07-09T11:01:25.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(targetRoot, {
            body: {
                now: Date.parse('2026-07-09T11:02:00.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 200);
    assert.equal(replayResult.payload.ok, true);
    assert.equal(replayResult.payload.preflightStatus, 'PROJECTION_STALE');
    assert.deepEqual(replayResult.payload.domainOrder, [
        'promotion-state',
        'interpretive-governance',
        'publication-lifecycle',
    ]);
    assert.deepEqual(
        replayResult.payload.domains.map((entry) => `${entry.domain}:${entry.result}`),
        ['promotion-state:noop', 'interpretive-governance:replayed', 'publication-lifecycle:replayed'],
    );

    const replayedCandidate = getInterpretiveCandidate(buildRequest(targetRoot), created.interpretation.interpretationRevisionId);
    assert.equal(replayedCandidate.interpretation.publicationState, 'PUBLISHED');
    assert.equal(replayedCandidate.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');

    const current = getCurrentActiveDnmRecord(buildRequest(targetRoot), 'character:jeep.png');
    assert.equal(current.currentActiveRecord.dnmRecordId, published.publishedRecord.dnmRecordId);

    const operatorState = getInterpretivePublicationOperatorState(
        buildRequest(targetRoot),
        created.interpretation.interpretationRevisionId,
    );
    assert.equal(operatorState.operatorState.guidedFlow.status, 'ALREADY_PUBLISHED');
});

test('upgrade replay route preserves published truth from carried pre-v1 host data', async () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);

    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_jeep_upgrade_replay_carried',
        interpretationRevisionId: 'interprev_jeep_upgrade_replay_carried_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:06:00.000Z'),
    });
    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:06:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(sourceRequest, created.interpretation.interpretationRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:06:10.000Z'),
    });
    const published = publishInterpretiveMemory(sourceRequest, created.interpretation.interpretationRevisionId, {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-07-09T11:06:25.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.dbPath, targetPaths.dbPath);
    fs.copyFileSync(sourcePaths.snapshotPath, targetPaths.snapshotPath);
    fs.copyFileSync(sourcePaths.statePath, targetPaths.statePath);
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const legacyState = JSON.parse(fs.readFileSync(targetPaths.statePath, 'utf8'));
    legacyState.serviceVersion = 'c0-pre-v1';
    fs.writeFileSync(targetPaths.statePath, JSON.stringify(legacyState, null, 2));

    for (const dbPath of [targetPaths.dbPath, targetPaths.snapshotPath]) {
        const direct = createAdapter(dbPath);
        try {
            direct.run('UPDATE manifest SET service_version = ? WHERE id = 1', ['c0-pre-v1']);
        } finally {
            direct.close();
        }
    }

    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(targetRoot, {
            body: {
                now: Date.parse('2026-07-09T11:07:00.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 200);
    assert.equal(replayResult.payload.ok, true);
    assert.equal(replayResult.payload.preflightStatus, 'READY_TO_UPGRADE');

    const current = getCurrentActiveDnmRecord(buildRequest(targetRoot), 'character:jeep.png');
    assert.equal(current.currentActiveRecord.dnmRecordId, published.publishedRecord.dnmRecordId);

    const replayedCandidate = getInterpretiveCandidate(buildRequest(targetRoot), created.interpretation.interpretationRevisionId);
    assert.equal(replayedCandidate.interpretation.publicationState, 'PUBLISHED');

    const operatorState = getInterpretivePublicationOperatorState(
        buildRequest(targetRoot),
        created.interpretation.interpretationRevisionId,
    );
    assert.equal(operatorState.operatorState.guidedFlow.status, 'ALREADY_PUBLISHED');
});

test('upgrade replay route preserves corrected-child published truth from carried pre-v1 host data', async () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);

    const parentRevisionId = 'interprev_jeep_upgrade_replay_child_parent_v1';
    const childRevisionId = 'interprev_jeep_upgrade_replay_child_v2';
    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_jeep_upgrade_replay_child_parent',
        interpretationRevisionId: parentRevisionId,
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:16:05.000Z'),
    });

    const subjectEdit = submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE_WITH_EDIT',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        reasonCodes: ['SCOPE_TOO_BROAD'],
        revisedCandidate: {
            interpretationRevisionId: childRevisionId,
            statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
        },
        now: Date.parse('2026-07-09T11:16:10.000Z'),
    });

    const childAfterCreate = getInterpretiveCandidate(sourceRequest, childRevisionId);
    const childParticipantRequest = childAfterCreate.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    submitInterpretiveReviewDisposition(sourceRequest, childParticipantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: childAfterCreate.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:16:15.000Z'),
    });

    const childGrant = recordInterpretiveSubjectDisposition(sourceRequest, childRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: childAfterCreate.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:16:20.000Z'),
    });

    const published = publishInterpretiveMemory(sourceRequest, childRevisionId, {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: childGrant.interpretation.proposalContentHash,
        reviewEnvelopeHash: childGrant.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: childGrant.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-07-09T11:16:25.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.dbPath, targetPaths.dbPath);
    fs.copyFileSync(sourcePaths.snapshotPath, targetPaths.snapshotPath);
    fs.copyFileSync(sourcePaths.statePath, targetPaths.statePath);
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const legacyState = JSON.parse(fs.readFileSync(targetPaths.statePath, 'utf8'));
    legacyState.serviceVersion = 'c0-pre-v1';
    fs.writeFileSync(targetPaths.statePath, JSON.stringify(legacyState, null, 2));

    for (const dbPath of [targetPaths.dbPath, targetPaths.snapshotPath]) {
        const direct = createAdapter(dbPath);
        try {
            direct.run('UPDATE manifest SET service_version = ? WHERE id = 1', ['c0-pre-v1']);
        } finally {
            direct.close();
        }
    }

    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(targetRoot, {
            body: {
                now: Date.parse('2026-07-09T11:17:00.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 200);
    assert.equal(replayResult.payload.ok, true);
    assert.equal(replayResult.payload.preflightStatus, 'READY_TO_UPGRADE');

    const replayedParent = getInterpretiveCandidate(buildRequest(targetRoot), parentRevisionId);
    const replayedChild = getInterpretiveCandidate(buildRequest(targetRoot), childRevisionId);
    const current = getCurrentActiveDnmRecord(buildRequest(targetRoot), 'character:jeep.png');
    const parentOperatorState = getInterpretivePublicationOperatorState(
        buildRequest(targetRoot),
        parentRevisionId,
        { continuityTargetId: 'character:jeep.png' },
    );
    const childOperatorState = getInterpretivePublicationOperatorState(
        buildRequest(targetRoot),
        childRevisionId,
        { continuityTargetId: 'character:jeep.png' },
    );

    assert.equal(replayedParent.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(replayedParent.interpretation.childRevisionIds.includes(childRevisionId), true);
    assert.equal(replayedChild.interpretation.parentRevisionId, parentRevisionId);
    assert.equal(replayedChild.interpretation.publicationState, 'PUBLISHED');
    assert.equal(replayedChild.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');
    assert.equal(current.currentActiveRecord.dnmRecordId, published.publishedRecord.dnmRecordId);
    assert.equal(current.currentActiveRecord.sourceInterpretationRevisionId, childRevisionId);
    assert.equal(parentOperatorState.operatorState.guidedFlow.status, 'REVISION_REQUIRED');
    assert.equal(parentOperatorState.operatorState.guidedFlow.nextAction.action, 'OPEN_CHILD_REVISION');
    assert.equal(parentOperatorState.operatorState.guidedFlow.nextAction.interpretationRevisionId, childRevisionId);
    assert.equal(childOperatorState.operatorState.guidedFlow.status, 'ALREADY_PUBLISHED');
    assert.equal(subjectEdit.childInterpretation.interpretationRevisionId, childRevisionId);
});

test('upgrade replay route fails closed when the interpretive ledger contains malformed JSON', async () => {
    const { sourcePaths } = seedPublishedReplaySource();
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);
    fs.appendFileSync(targetPaths.interpretiveGovernanceLedgerPath, '\n{"eventType":"BROKEN"\n');

    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(targetRoot, {
            body: {
                now: Date.parse('2026-07-09T11:10:00.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 500);
    assert.equal(replayResult.payload.ok, false);
    assert.equal(replayResult.payload.code, 'ARCH_INTERPRETIVE_LEDGER_INVALID');
    assert.match(replayResult.payload.error, /Interpretive ledger line \d+ is not valid JSON/);
});

test('upgrade replay route fails closed when the publication ledger contains malformed JSON', async () => {
    const { sourcePaths } = seedPublishedReplaySource();
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.interpretiveGovernanceLedgerPath, targetPaths.interpretiveGovernanceLedgerPath);
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);
    fs.appendFileSync(targetPaths.dnmPublicationLedgerPath, '\n{"eventType":"BROKEN"\n');

    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(targetRoot, {
            body: {
                now: Date.parse('2026-07-09T11:10:30.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 500);
    assert.equal(replayResult.payload.ok, false);
    assert.equal(replayResult.payload.code, 'ARCH_PUBLICATION_LEDGER_INVALID');
    assert.match(replayResult.payload.error, /Publication ledger line \d+ is not valid JSON/);
    assert.equal(fs.existsSync(targetPaths.dbPath), false);
    assert.equal(fs.existsSync(targetPaths.snapshotPath), false);
    assert.equal(fs.existsSync(targetPaths.statePath), false);
});

test('upgrade replay route fails closed when publication ledger is restored without the governance ledger', async () => {
    const sourceRoot = makeTempRoot();
    const sourceRequest = buildRequest(sourceRoot);

    const created = createInterpretiveCandidate(sourceRequest, makeBasePayload({
        interpretationId: 'interp_jeep_upgrade_replay_incomplete',
        interpretationRevisionId: 'interprev_jeep_upgrade_replay_incomplete_v1',
    }));
    const subjectRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = created.interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    submitInterpretiveReviewDisposition(sourceRequest, subjectRequest.reviewRequestId, {
        actorEntityId: 'character:jeep.png',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:11:00.000Z'),
    });
    submitInterpretiveReviewDisposition(sourceRequest, participantRequest.reviewRequestId, {
        actorEntityId: 'user:Chris',
        disposition: 'APPROVE',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:11:05.000Z'),
    });
    const granted = recordInterpretiveSubjectDisposition(sourceRequest, created.interpretation.interpretationRevisionId, {
        actorEntityId: 'character:jeep.png',
        state: 'GRANTED',
        reviewEnvelopeHash: created.interpretation.reviewEnvelopeHash,
        now: Date.parse('2026-07-09T11:11:10.000Z'),
    });
    publishInterpretiveMemory(sourceRequest, created.interpretation.interpretationRevisionId, {
        continuityTargetId: 'character:jeep.png',
        proposalContentHash: granted.interpretation.proposalContentHash,
        reviewEnvelopeHash: granted.interpretation.reviewEnvelopeHash,
        subjectDispositionRecordId: granted.subjectDisposition.subjectDispositionId,
        actorEntityId: 'user:Chris',
        authorizedBy: 'user:Chris',
        now: Date.parse('2026-07-09T11:11:25.000Z'),
    });

    const sourcePaths = getStoragePaths(sourceRoot);
    const targetRoot = makeTempRoot();
    const targetPaths = getStoragePaths(targetRoot);
    fs.mkdirSync(targetPaths.storageRoot, { recursive: true });
    fs.copyFileSync(sourcePaths.dnmPublicationLedgerPath, targetPaths.dnmPublicationLedgerPath);

    const router = createMockRouter();
    await init(router);

    const replayResult = await invoke(
        router.routes.post.get('/upgrade/replay'),
        buildRequest(targetRoot, {
            body: {
                now: Date.parse('2026-07-09T11:12:00.000Z'),
            },
        }),
    );

    assert.equal(replayResult.statusCode, 500);
    assert.equal(replayResult.payload.ok, false);
    assert.equal(replayResult.payload.code, 'ARCH_PUBLICATION_LEDGER_INCOMPLETE');
    assert.match(
        replayResult.payload.error,
        /Interpretation revision .* is missing during DNM publication replay/,
    );
});

test('upgrade replay route refuses backup-required hosts before mutating governed state', async () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);
    adapter.close();

    await assertReplayBlocked(root, {
        preflightStatus: 'BACKUP_REQUIRED',
        technicalCodes: ['ARCH_BACKUP_REQUIRED'],
        messagePattern: /managed snapshot is required before upgrade/i,
    });
});

test('upgrade replay route refuses unsupported-schema hosts before mutating governed state', async () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);
    adapter.close();

    const direct = createAdapter(paths.dbPath);
    try {
        direct.run('UPDATE manifest SET schema_version = ? WHERE id = 1', [2]);
    } finally {
        direct.close();
    }

    await assertReplayBlocked(root, {
        preflightStatus: 'UNSUPPORTED_VERSION',
        technicalCodes: ['ARCH_SCHEMA_VERSION_UNSUPPORTED'],
        messagePattern: /stored governed-memory data is newer than this runtime can safely interpret/i,
    });
});

test('upgrade replay route refuses missing live-authority references before mutating governed state', async () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    fs.mkdirSync(paths.storageRoot, { recursive: true });
    fs.writeFileSync(paths.interpretiveGovernanceLedgerPath, '');
    fs.writeFileSync(paths.dnmPublicationLedgerPath, '');
    fs.writeFileSync(paths.statePath, JSON.stringify({
        schemaVersion: 1,
        updatedAt: Date.parse('2026-07-09T11:29:00.000Z'),
        liveAuthority: {
            generationId: 'livegen_missing',
            dbRelativePath: 'generations/architectural-memory.live.livegen_missing.db',
        },
    }, null, 2));

    await assertReplayBlocked(root, {
        preflightStatus: 'REFERENCE_GAP',
        technicalCodes: ['ARCH_LIVE_AUTHORITY_DB_MISSING'],
        messagePattern: /missing live-authority database/i,
    });
});
