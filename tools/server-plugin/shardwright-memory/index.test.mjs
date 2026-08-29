import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildManagedShardManifest } from './lib/core/summarization/shard-integrity-core.js';
import { renderFinalizedArchitecturalPayload } from './lib/core/summarization/architectural-finalized-semantic.js';
import { createArchitecturalSemanticReplayArtifact } from './lib/core/summarization/architectural-semantic-replay-artifact.js';
import {
    writeOperationalStateMarkerDescriptor,
    readOperationalStateMarker,
    getStoragePaths,
    openOperationalDatabase,
} from './core.js';
import { info, init } from './index.js';
import {
    admitContextSheetMembershipValidation,
    admitContextSheetMembershipLink,
    nominateContextSheetMembership,
    readContextSheetMembershipLedger,
} from './membership.js';
import { initCandidateRebuildRun, runCandidateRebuild } from './rebuild.js';
import { createPromotionAuthorization, executePromotionAuthorization } from './promotion.js';
import { replayInterpretiveLedger } from './interpretive.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..', '..');
const fixtureDir = path.join(repoRoot, 'docs', 'schemas', 'memory-catalog', 'fixtures');

function makeTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-routes-'));
}

function makeMessageId(suffix) {
    return `msg_${suffix.padEnd(32, '0').slice(0, 32)}`;
}

function loadMembershipFixture(name) {
    return JSON.parse(fs.readFileSync(path.join(fixtureDir, `${name}.json`), 'utf8'));
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

function makeMembershipValidationArtifact(nominationEntry) {
    const artifact = loadMembershipFixture('context-sheet-membership-validation-event-v1.valid-accepted');
    const nominationRef = makeExactNominationReference(nominationEntry);
    artifact.envelope.memoryScopeId = nominationEntry.scopeId;
    artifact.envelope.authorityBasisRefs = [nominationRef];
    artifact.nominationRef = nominationRef;
    artifact.evaluatedCatalogRecordRef.memoryScopeId = nominationEntry.scopeId;
    artifact.evaluatedContextSheetRef.memoryScopeId = nominationEntry.scopeId;
    return artifact;
}

function makeMembershipLinkArtifact(nominationEntry, validationEntry) {
    const validation = validationEntry.artifact;
    const artifact = loadMembershipFixture('context-sheet-membership-link-v1.valid-direct');
    const validationRef = makeExactValidationReference(validationEntry);
    artifact.envelope.memoryScopeId = nominationEntry.scopeId;
    artifact.envelope.authorityBasisRefs = [validationRef];
    artifact.catalogRecordRef = clone(validation.evaluatedCatalogRecordRef);
    artifact.contextSheetRef.memoryScopeId = nominationEntry.scopeId;
    artifact.contextSheetLifecycleRef = clone(validation.evaluatedContextSheetRef);
    artifact.catalogClaimIds = [...validation.claimBasis.catalogClaimIds];
    artifact.linkType = validation.validatedLinkType;
    artifact.targetClaimIds = [...validation.claimBasis.targetClaimIds];
    artifact.claimBasisHash = validation.claimBasis.basisHash;
    artifact.boundedMeaning = validation.claimBasis.boundedMeaning;
    artifact.limitations = [...validation.claimBasis.limitations];
    artifact.jurisdiction.memoryScopeId = nominationEntry.scopeId;
    artifact.validationMethod = validation.validationMethod;
    artifact.governingPolicyVersion = validation.governingPolicyVersion;
    artifact.createdFromNominationRef = makeExactNominationReference(nominationEntry);
    artifact.validatedBy = clone(validation.validator);
    artifact.validatedAt = validation.occurredAt;
    artifact.validationEventRef = validationRef;
    return artifact;
}

function seedAcceptedMembershipLink(paths) {
    const nomination = nominateContextSheetMembership(
        paths,
        loadMembershipFixture('context-sheet-membership-nomination-v1.valid-operator-direct'),
    );
    const validation = admitContextSheetMembershipValidation(paths, makeMembershipValidationArtifact(nomination.entry));
    const link = admitContextSheetMembershipLink(paths, makeMembershipLinkArtifact(nomination.entry, validation.entry));
    return { nomination: nomination.entry, validation: validation.entry, link: link.entry };
}
async function writeArchitecturalChat(root, options = {}) {
    const memoryScopeId = options.memoryScopeId || 'scope_alpha';
    const chatInstanceId = options.chatInstanceId || 'chat_alpha';
    const chatsRoot = path.join(root, 'chats');
    const charDir = path.join(chatsRoot, 'Jeep');
    fs.mkdirSync(charDir, { recursive: true });
    const chatFilePath = path.join(charDir, 'Session A.jsonl');

    const messages = [
        {
            name: 'Chris',
            is_user: true,
            is_system: false,
            send_date: '2026-06-24T10:00:00.000Z',
            mes: 'We should keep browser-local state non-authoritative.',
            extra: {
                shardwright: {
                    messageIdentity: {
                        schemaVersion: 1,
                        messageId: makeMessageId('a1'),
                        initFingerprint: 'sha256:init-a1',
                        revisionHash: 'sha256:rev-a1',
                    },
                    speakerIdentity: {
                        speakerEntityId: 'user:Chris',
                        sourceType: 'user',
                    },
                },
            },
        },
        {
            name: 'Jeep',
            is_user: false,
            is_system: false,
            send_date: '2026-06-24T10:00:05.000Z',
            mes: 'Agreed. The authority should live outside browser-local projection state.',
            extra: {
                shardwright: {
                    messageIdentity: {
                        schemaVersion: 1,
                        messageId: makeMessageId('b2'),
                        initFingerprint: 'sha256:init-b2',
                        revisionHash: 'sha256:rev-b2',
                    },
                    speakerIdentity: {
                        speakerEntityId: 'character:jeep.png',
                        sourceType: 'character',
                    },
                },
            },
        },
        {
            name: 'System',
            is_user: false,
            is_system: true,
            send_date: '2026-06-24T10:00:10.000Z',
            mes: options.shardMessageText || `[MEMORY SHARD: Messages 0-1]

[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1

[DECISIONS]
[S1:1] | STATUS: PROPOSED | ID: gain-modulation-boundary | DECISION: Jeep retains the architectural authority role outside browser-local projection state.

===END===`,
            extra: {
                shardwright: {
                    messageIdentity: {
                        schemaVersion: 1,
                        messageId: makeMessageId('c3'),
                        initFingerprint: 'sha256:init-c3',
                        revisionHash: 'sha256:rev-c3',
                    },
                    speakerIdentity: {
                        speakerEntityId: 'system:system',
                        sourceType: 'system',
                    },
                },
            },
        },
    ];

    const manifest = await buildManagedShardManifest(messages, {
        startIndex: 0,
        endIndex: 1,
        artifactKind: 'system-shard',
        outputUID: messages[2].send_date,
        promptPolicy: 'replace_source',
        now: Date.now(),
        cryptoApi: globalThis.crypto,
    });

    const header = {
        chat_metadata: {
            shardwright: {
                messageIdentity: {
                    schemaVersion: 1,
                    status: 'IDENTITY_COMPLETE',
                },
                architecturalMemoryBinding: {
                    memoryScopeId,
                    chatInstanceId,
                    chatId: 'Session A',
                    scopeAlias: '',
                    boundAt: Date.now(),
                    updatedAt: Date.now(),
                },
                shardManifests: [manifest],
            },
        },
        user_name: 'Chris',
        character_name: 'Jeep',
    };

    const lines = [JSON.stringify(header), ...messages.map((message) => JSON.stringify(message))];
    fs.writeFileSync(chatFilePath, `${lines.join('\n')}\n`, 'utf8');
    return {
        memoryScopeId,
        shardMessageId: messages[2].extra.shardwright.messageIdentity.messageId,
        avatarUrl: 'Jeep.png',
        chatLocator: 'Session A',
        chatFilePath,
        manifest,
    };
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

test('plugin emits only the canonical Shardwright identity', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);
    const capabilities = await invoke(router.routes.get.get('/capabilities'), buildRequest(root));

    assert.deepEqual(info, {
        id: 'shardwright-memory',
        name: 'Shardwright Memory',
        description: 'Architectural Memory operational database companion plugin.',
    });
    assert.equal(capabilities.payload.pluginId, 'shardwright-memory');
});

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

async function buildPromotedScope(root, memoryScopeId) {
    const request = buildRequest(root);
    const initResult = await initCandidateRebuildRun(request, {
        memoryScopeId,
        requestKey: `route-promo-${memoryScopeId}`,
        now: Date.now(),
    });
    await runCandidateRebuild(request, {
        reconstructionRunId: initResult.manifest.reconstructionRunId,
        now: Date.now(),
    });
    const auth = createPromotionAuthorization(request, {
        reconstructionRunId: initResult.manifest.reconstructionRunId,
        authorizedBy: 'route-test',
        now: Date.now(),
        expiresAt: Date.now() + 60000,
    });
    return executePromotionAuthorization(request, {
        authorizationId: auth.authorization.authorizationId,
        now: Date.now(),
    });
}

test('route surface exposes candidate lifecycle routes and separate promotion routes', async () => {
    const router = createMockRouter();
    await init(router);

    assert.equal(router.routes.get.has('/upgrade/preflight'), true);
    assert.equal(router.routes.get.has('/context-sheet-membership/current-use'), true);
    assert.equal(router.routes.post.has('/upgrade/replay'), true);
    assert.equal(router.routes.get.has('/rebuild/candidate/report/:reconstructionRunId'), true);
    assert.equal(router.routes.get.has('/rebuild/candidate/runs/:memoryScopeId'), true);
    assert.equal(router.routes.post.has('/rebuild/candidate/init'), true);
    assert.equal(router.routes.post.has('/rebuild/candidate/run'), true);
    assert.equal(router.routes.post.has('/rebuild/candidate/pin'), true);
    assert.equal(router.routes.post.has('/rebuild/candidate/cleanup'), true);
    assert.equal(router.routes.post.has('/rebuild/candidate/promote'), false);
    assert.equal(router.routes.post.has('/rebuild/promote'), false);
    assert.equal(router.routes.post.has('/rebuild/promotion/authorize'), true);
    assert.equal(router.routes.post.has('/rebuild/promotion/execute'), true);
    assert.equal(router.routes.get.has('/interpretive/policies'), true);
    assert.equal(router.routes.get.has('/interpretive/delegation-policies'), true);
    assert.equal(router.routes.get.has('/interpretive/publication/policies'), true);
    assert.equal(router.routes.get.has('/interpretive/publication/records'), true);
    assert.equal(router.routes.get.has('/interpretive/publication/targets/:continuityTargetId/current'), true);
    assert.equal(router.routes.get.has('/interpretive/candidates/:interpretationRevisionId/publication-operator'), true);
    assert.equal(router.routes.get.has('/interpretive/synthesis/policies'), true);
    assert.equal(router.routes.get.has('/interpretive/synthesis/runs/:synthesisRunId'), true);
    assert.equal(router.routes.get.has('/interpretive/candidates/:interpretationRevisionId'), true);
    assert.equal(router.routes.get.has('/interpretive/reviews'), true);
    assert.equal(router.routes.post.has('/interpretive/synthesis/policies'), true);
    assert.equal(router.routes.post.has('/interpretive/subject-policy/profiles'), true);
    assert.equal(router.routes.post.has('/interpretive/subject-policy/assignments'), true);
    assert.equal(router.routes.post.has('/interpretive/subject-policy/fact-declarations'), true);
    assert.equal(router.routes.post.has('/interpretive/subject-policy/acknowledgments'), true);
    assert.equal(router.routes.get.has('/interpretive/subject-policy/status'), true);
    assert.equal(router.routes.get.has('/interpretive/subject-policy/synthesis/:synthesisRunId/status'), true);
    assert.equal(router.routes.post.has('/interpretive/synthesis/runs'), true);
    assert.equal(router.routes.post.has('/interpretive/synthesis/from-architectural-shard'), true);
    assert.equal(router.routes.post.has('/interpretive/synthesis/runs/:synthesisRunId/generate'), true);
    assert.equal(router.routes.post.has('/interpretive/candidates'), true);
    assert.equal(router.routes.post.has('/interpretive/delegation-policies'), true);
    assert.equal(router.routes.post.has('/interpretive/delegation-policies/:delegationPolicyId/revoke'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/policies'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/policies/bootstrap-standard'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/policies/:publicationPolicyId/revoke'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/authorizations'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/execute'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/supersede'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/withdraw'), true);
    assert.equal(router.routes.post.has('/interpretive/publication/delta-reviews'), true);
    assert.equal(router.routes.post.has('/interpretive/reviews/:reviewRequestId/dispositions'), true);
    assert.equal(router.routes.post.has('/interpretive/candidates/:interpretationRevisionId/subject-disposition'), true);
    assert.equal(router.routes.post.has('/interpretive/candidates/:interpretationRevisionId/revisions'), true);
    assert.equal(router.routes.post.has('/interpretive/candidates/:interpretationRevisionId/publication-qualifications'), true);
    assert.equal(router.routes.post.has('/interpretive/candidates/:interpretationRevisionId/publication-publish'), true);
});

test('membership current-use route returns disposable replay projection without mutating authority', async () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const { link } = seedAcceptedMembershipLink(paths);
    const beforeLedger = fs.readFileSync(paths.contextSheetMembershipLedgerPath, 'utf8');
    const router = createMockRouter();
    await init(router);

    const result = await invoke(
        router.routes.get.get('/context-sheet-membership/current-use'),
        buildRequest(root),
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.projection.projectionType, 'context-sheet-membership-current-use-v1');
    assert.equal(result.payload.projection.projectionAuthority, 'DISPOSABLE_REPLAY_DERIVED');
    assert.equal(result.payload.projection.sourceLedger, 'context-sheet-membership-ledger.jsonl');
    assert.equal(result.payload.projection.entriesReplayed, 3);
    assert.equal(result.payload.projection.links.length, 1);
    assert.equal(result.payload.projection.links[0].membershipLinkId, link.artifact.membershipLinkId);
    assert.equal(result.payload.projection.links[0].currentUseState, 'CURRENT');
    assert.equal(result.payload.projection.currentLinks.length, 1);
    assert.deepEqual(result.payload.projection.blockedLinks, []);
    assert.equal(fs.readFileSync(paths.contextSheetMembershipLedgerPath, 'utf8'), beforeLedger);
    assert.equal(readContextSheetMembershipLedger(paths).length, 3);
});

test('membership current-use route fails closed on unreadable replay authority', async () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    seedAcceptedMembershipLink(paths);
    fs.appendFileSync(paths.contextSheetMembershipLedgerPath, '{"entryId":', 'utf8');
    const router = createMockRouter();
    await init(router);

    const result = await invoke(
        router.routes.get.get('/context-sheet-membership/current-use'),
        buildRequest(root),
    );

    assert.equal(result.statusCode, 409);
    assert.equal(result.payload.ok, false);
    assert.equal(result.payload.code, 'CSM_LEDGER_MALFORMED');
});

test('capabilities and candidate lifecycle routes report no promotion and support report, pin, and cleanup', async () => {
    const root = makeTempRoot();
    const { memoryScopeId } = await writeArchitecturalChat(root);
    const router = createMockRouter();
    await init(router);

    const capabilities = await invoke(router.routes.get.get('/capabilities'), buildRequest(root));
    assert.equal(capabilities.statusCode, 200);
    assert.equal(capabilities.payload.capabilities.c0_5a.promotionAvailable, false);
    assert.equal(capabilities.payload.capabilities.c0_5a.candidatePinning, true);
    assert.equal(capabilities.payload.capabilities.c0_5a.candidateCleanup, true);
    assert.equal(capabilities.payload.capabilities.c0_75_1.candidateQualification, true);
    assert.equal(capabilities.payload.capabilities.c0_75_1.promotionAvailable, false);
    assert.equal(capabilities.payload.capabilities.c0_75_2.promotionAvailable, true);
    assert.equal(capabilities.payload.capabilities.c0_6_1.interpretiveLedgerAuthority, true);
    assert.equal(capabilities.payload.capabilities.c0_6_1.continuityPublicationAvailable, false);
    assert.equal(capabilities.payload.capabilities.c0_6_2.reviewerDispositionSubmission, true);
    assert.equal(capabilities.payload.capabilities.c0_6_2.delegatedDispositionProvenance, true);
    assert.equal(capabilities.payload.capabilities.c0_6_2.delegationPolicyStorage, true);
    assert.equal(capabilities.payload.capabilities.c0_6_2.continuityPublicationAvailable, false);
    assert.equal(capabilities.payload.capabilities.c0_6_3.boundedSynthesisRunContract, true);
    assert.equal(capabilities.payload.capabilities.c0_6_3.deterministicStubSynthesisAvailable, true);
    assert.equal(capabilities.payload.capabilities.c0_6_3.modelSynthesisAvailable, false);
    assert.equal(capabilities.payload.capabilities.c0_6_4.publicationPolicyStorage, true);
    assert.equal(capabilities.payload.capabilities.c0_6_4.publicationQualification, true);
    assert.equal(capabilities.payload.capabilities.c0_6_4.publicationAuthorizationAvailable, true);
    assert.equal(capabilities.payload.capabilities.c0_6_4.continuityPublicationAvailable, true);
    assert.equal(capabilities.payload.capabilities.c0_6_4.liveContinuityMutation, true);
    assert.equal(capabilities.payload.capabilities.c0_6_7.upgradeReplayPreflight, true);
    assert.equal(capabilities.payload.capabilities.c0_6_7.upgradeReplayRoute, true);
    assert.equal(capabilities.payload.capabilities.c0_6_7.failClosedUpgradeBoundary, true);

    const initResult = await invoke(
        router.routes.post.get('/rebuild/candidate/init'),
        buildRequest(root, {
            body: {
                memoryScopeId,
                requestKey: 'route-test',
                now: Date.now(),
            },
        }),
    );
    assert.equal(initResult.statusCode, 200);
    const reconstructionRunId = initResult.payload.manifest.reconstructionRunId;

    const runResult = await invoke(
        router.routes.post.get('/rebuild/candidate/run'),
        buildRequest(root, {
            body: {
                reconstructionRunId,
                now: Date.now(),
            },
        }),
    );
    assert.equal(runResult.statusCode, 200);
    assert.equal(runResult.payload.report.promotionAvailable, false);

    const reportResult = await invoke(
        router.routes.get.get('/rebuild/candidate/report/:reconstructionRunId'),
        buildRequest(root, {
            params: {
                reconstructionRunId,
            },
        }),
    );
    assert.equal(reportResult.statusCode, 200);
    assert.equal(reportResult.payload.report.reconstructionRunId, reconstructionRunId);

    const pinResult = await invoke(
        router.routes.post.get('/rebuild/candidate/pin'),
        buildRequest(root, {
            body: {
                reconstructionRunId,
                pinReason: 'route-smoke',
                now: Date.now(),
            },
        }),
    );
    assert.equal(pinResult.statusCode, 200);
    assert.equal(pinResult.payload.report.retention.pinned, true);

    const listResult = await invoke(
        router.routes.get.get('/rebuild/candidate/runs/:memoryScopeId'),
        buildRequest(root, {
            params: {
                memoryScopeId,
            },
        }),
    );
    assert.equal(listResult.statusCode, 200);
    assert.equal(listResult.payload.promotionAvailable, false);
    assert.equal(listResult.payload.runs.length, 1);
    assert.equal(listResult.payload.runs[0].retention.pinned, true);

    const cleanupResult = await invoke(
        router.routes.post.get('/rebuild/candidate/cleanup'),
        buildRequest(root, {
            body: {
                memoryScopeId,
            },
        }),
    );
    assert.equal(cleanupResult.statusCode, 200);
    assert.deepEqual(cleanupResult.payload.removedRunIds, []);
    assert.equal(cleanupResult.payload.promotionAvailable, false);
});

test('upgrade preflight route reports backup required when a live operational projection has no managed snapshot', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);
    adapter.close();

    const preflightResult = await invoke(
        router.routes.get.get('/upgrade/preflight'),
        buildRequest(root),
    );
    assert.equal(preflightResult.statusCode, 200);
    assert.equal(preflightResult.payload.status, 'BACKUP_REQUIRED');
    assert.deepEqual(preflightResult.payload.technicalCodes, ['ARCH_BACKUP_REQUIRED']);
});

test('scope commit route does not bump scope version or run counters on an identical no-op commit', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const firstCommit = await invoke(
        router.routes.post.get('/scopes/:memoryScopeId/commit'),
        buildRequest(root, {
            params: {
                memoryScopeId: 'scope_noop_commit',
            },
            body: {
                scopeAlias: 'noop-scope',
                sourceChatInstanceId: 'chat_alpha',
                decisions: [{
                    decisionId: 'noop-boundary',
                    status: 'ACCEPTED',
                    sourceRef: 'S1:1',
                    content: 'Keep browser-local projection state non-authoritative.',
                    fields: {
                        STATUS: 'ACCEPTED',
                        DECISION: 'Keep browser-local projection state non-authoritative.',
                    },
                    semanticPayload: 'noop-boundary semantic payload',
                    canonicalHash: 'sha256:noop-boundary-v1',
                    canonicalHashVersion: 1,
                    hashAlgorithm: 'SHA-256',
                    parserErrors: [],
                    parserWarnings: [],
                }],
                now: Date.parse('2026-06-27T00:00:00.000Z'),
            },
        }),
    );
    assert.equal(firstCommit.statusCode, 200);
    assert.equal(firstCommit.payload.registry.scopeVersion, 2);
    assert.equal(firstCommit.payload.registry.currentScopeRun, 1);
    assert.equal(firstCommit.payload.projectionState['noop-boundary'].currentRecordVersion, 1);

    const secondCommit = await invoke(
        router.routes.post.get('/scopes/:memoryScopeId/commit'),
        buildRequest(root, {
            params: {
                memoryScopeId: 'scope_noop_commit',
            },
            body: {
                scopeAlias: 'noop-scope',
                sourceChatInstanceId: 'chat_alpha',
                expectedScopeVersion: 2,
                decisions: [{
                    decisionId: 'noop-boundary',
                    status: 'ACCEPTED',
                    sourceRef: 'S1:1',
                    content: 'Keep browser-local projection state non-authoritative.',
                    fields: {
                        STATUS: 'ACCEPTED',
                        DECISION: 'Keep browser-local projection state non-authoritative.',
                    },
                    semanticPayload: 'noop-boundary semantic payload',
                    canonicalHash: 'sha256:noop-boundary-v1',
                    canonicalHashVersion: 1,
                    hashAlgorithm: 'SHA-256',
                    parserErrors: [],
                    parserWarnings: [],
                }],
                now: Date.parse('2026-06-27T00:00:05.000Z'),
            },
        }),
    );
    assert.equal(secondCommit.statusCode, 200);
    assert.equal(secondCommit.payload.registry.scopeVersion, 2);
    assert.equal(secondCommit.payload.registry.currentScopeRun, 1);
    assert.equal(secondCommit.payload.projectionState['noop-boundary'].currentRecordVersion, 1);
});

test('scope commit route rejects expected decision versions for missing decisions', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const result = await invoke(
        router.routes.post.get('/scopes/:memoryScopeId/commit'),
        buildRequest(root, {
            params: {
                memoryScopeId: 'scope_missing_decision_conflict',
            },
            body: {
                scopeAlias: 'missing-decision-conflict',
                sourceChatInstanceId: 'chat_alpha',
                expectedDecisionVersionsById: {
                    'missing-boundary': 1,
                },
                decisions: [{
                    decisionId: 'missing-boundary',
                    status: 'ACCEPTED',
                    sourceRef: 'S1:1',
                    content: 'Keep browser-local projection state non-authoritative.',
                    fields: {
                        STATUS: 'ACCEPTED',
                        DECISION: 'Keep browser-local projection state non-authoritative.',
                    },
                    semanticPayload: 'missing-boundary semantic payload',
                    canonicalHash: 'sha256:missing-boundary-v1',
                    canonicalHashVersion: 1,
                    hashAlgorithm: 'SHA-256',
                    parserErrors: [],
                    parserWarnings: [],
                }],
                now: Date.parse('2026-06-27T00:00:00.000Z'),
            },
        }),
    );

    assert.equal(result.statusCode, 409);
    assert.equal(result.payload?.code, 'ARCH_DECISION_VERSION_CONFLICT');
    assert.equal(result.payload?.recordId, 'missing-boundary');
    assert.equal(result.payload?.expectedRecordVersion, 1);
    assert.equal(result.payload?.currentRecordVersion, null);
});

test('publication policy, qualification, authorization, and execute routes enforce governed DNM publication', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const createResult = await invoke(
        router.routes.post.get('/interpretive/candidates'),
        buildRequest(root, {
            body: {
                interpretationId: 'interp_route_publication_case',
                interpretationRevisionId: 'interprev_route_publication_case_v1',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                type: 'ROLE_EVOLUTION',
                statement: 'Jeep evolved into the primary continuity authority within a shared architecture.',
                assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                sharedRelationshipAsserted: true,
                personalMeaningAsserted: true,
                materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                groundingLinks: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRecordId: 'decision:promotion-jurisdiction',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:promotion-jurisdiction',
                        speakerEntityId: 'character:jeep.png',
                        groundingRole: 'PRIMARY',
                        groundingAssessment: 'SUPPORTS',
                    },
                ],
                evidenceEnvelopeVersion: 1,
                evidencePreviews: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRef: 'decision:promotion-jurisdiction',
                        previewKind: 'STRUCTURAL_FIELDS',
                        sourceLabel: 'Promotion jurisdiction decision record',
                        sourceRevisionIdentity: { recordVersion: 1, recordHash: 'sha256:promotion-jurisdiction' },
                        previewContent: { fields: [{ label: 'Decision', value: 'Structural grounding for this proposal.' }] },
                    },
                ],
                now: Date.parse('2026-06-26T00:14:00.000Z'),
            },
        }),
    );
    assert.equal(createResult.statusCode, 200);
    const interpretation = createResult.payload.interpretation;
    const subjectRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    const policyResult = await invoke(
        router.routes.post.get('/interpretive/publication/policies'),
        buildRequest(root, {
            body: {
                publicationPolicyId: 'dnm-publication-v1',
                policyVersion: 1,
                continuityTargetType: 'MEMORY_SUBJECT',
                subjectIdentityMode: 'EXACT_SUBJECT',
                permittedInterpretationTypes: ['ROLE_EVOLUTION'],
                requiredFinalSubjectState: 'GRANTED',
                requiredGroundingOutcome: 'SUPPORTED',
                participantDisagreementBlocksPublication: true,
                contestOrDeferBlocksPublication: true,
                immutableChildRequiredForTypes: [],
                postGrantHumanPublicationAuthorizationRequired: true,
                details: {
                    policyClass: 'dnm-publication-v1',
                },
                now: Date.parse('2026-06-26T00:14:05.000Z'),
            },
        }),
    );
    assert.equal(policyResult.statusCode, 200);
    assert.equal(policyResult.payload.created, true);

    const subjectReview = await invoke(
        router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
        buildRequest(root, {
            params: { reviewRequestId: subjectRequest.reviewRequestId },
            body: {
                actorEntityId: 'character:jeep.png',
                disposition: 'APPROVE',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-26T00:14:06.000Z'),
            },
        }),
    );
    assert.equal(subjectReview.statusCode, 200);
    const participantReview = await invoke(
        router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
        buildRequest(root, {
            params: { reviewRequestId: participantRequest.reviewRequestId },
            body: {
                actorEntityId: 'user:Chris',
                disposition: 'APPROVE',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-26T00:14:07.000Z'),
            },
        }),
    );
    assert.equal(participantReview.statusCode, 200);
    const granted = await invoke(
        router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/subject-disposition'),
        buildRequest(root, {
            params: {
                interpretationRevisionId: 'interprev_route_publication_case_v1',
            },
            body: {
                actorEntityId: 'character:jeep.png',
                state: 'GRANTED',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-26T00:14:08.000Z'),
            },
        }),
    );
    assert.equal(granted.statusCode, 200);

    const qualificationResult = await invoke(
        router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/publication-qualifications'),
        buildRequest(root, {
            params: {
                interpretationRevisionId: 'interprev_route_publication_case_v1',
            },
            body: {
                publicationPolicyId: 'dnm-publication-v1',
                continuityTargetId: 'character:jeep.png',
                proposalContentHash: granted.payload.interpretation.proposalContentHash,
                reviewEnvelopeHash: granted.payload.interpretation.reviewEnvelopeHash,
                subjectDispositionRecordId: granted.payload.subjectDisposition.subjectDispositionId,
                now: Date.parse('2026-06-26T00:14:10.000Z'),
            },
        }),
    );
    assert.equal(qualificationResult.statusCode, 200);
    assert.equal(qualificationResult.payload.publicationAvailable, false);
    assert.equal(qualificationResult.payload.continuityActivationAvailable, false);
    assert.equal(qualificationResult.payload.qualification.eligibilityVerdict, 'ELIGIBLE');

    const authorizationResult = await invoke(
        router.routes.post.get('/interpretive/publication/authorizations'),
        buildRequest(root, {
            body: {
                qualificationId: qualificationResult.payload.qualification.qualificationId,
                authorizedBy: 'user:Chris',
                expiresAt: Date.parse('2026-06-26T01:14:10.000Z'),
                now: Date.parse('2026-06-26T00:14:12.000Z'),
            },
        }),
    );
    assert.equal(authorizationResult.statusCode, 200);
    assert.equal(authorizationResult.payload.publicationAuthorizationAvailable, true);
    assert.equal(authorizationResult.payload.continuityPublicationAvailable, false);
    assert.equal(authorizationResult.payload.authorization.status, 'AUTHORIZED');

    const executeResult = await invoke(
        router.routes.post.get('/interpretive/publication/execute'),
        buildRequest(root, {
            body: {
                publicationAuthorizationId: authorizationResult.payload.authorization.publicationAuthorizationId,
                now: Date.parse('2026-06-26T00:14:15.000Z'),
            },
        }),
    );
    assert.equal(executeResult.statusCode, 200);
    assert.equal(executeResult.payload.continuityPublicationAvailable, true);
    assert.equal(executeResult.payload.liveContinuityMutation, true);
    assert.equal(executeResult.payload.authorization.status, 'CONSUMED');
    assert.equal(executeResult.payload.publishedRecord.publicationState, 'PUBLISHED');
    assert.equal(executeResult.payload.interpretation.publicationState, 'PUBLISHED');
    assert.equal(executeResult.payload.interpretation.authorityEffect, 'DEVELOPMENTAL_MEMORY');
});

test('guided publication routes bootstrap the standard policy and publish without a separate authorization step', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const createResult = await invoke(
        router.routes.post.get('/interpretive/candidates'),
        buildRequest(root, {
            body: {
                interpretationId: 'interp_route_guided_publish_case',
                interpretationRevisionId: 'interprev_route_guided_publish_case_v1',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                type: 'ROLE_EVOLUTION',
                statement: 'Jeep evolved into the primary continuity authority within a shared architecture.',
                assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                sharedRelationshipAsserted: true,
                personalMeaningAsserted: true,
                materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                groundingLinks: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRecordId: 'decision:guided-publication',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:guided-publication',
                        speakerEntityId: 'character:jeep.png',
                        groundingRole: 'PRIMARY',
                        groundingAssessment: 'SUPPORTS',
                    },
                ],
                evidenceEnvelopeVersion: 1,
                evidencePreviews: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRef: 'decision:guided-publication',
                        previewKind: 'STRUCTURAL_FIELDS',
                        sourceLabel: 'Guided publication decision record',
                        sourceRevisionIdentity: { recordVersion: 1, recordHash: 'sha256:guided-publication' },
                        previewContent: { fields: [{ label: 'Decision', value: 'Structural grounding for this proposal.' }] },
                    },
                ],
                now: Date.parse('2026-06-26T00:30:00.000Z'),
            },
        }),
    );
    assert.equal(createResult.statusCode, 200);

    const interpretation = createResult.payload.interpretation;
    const subjectRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    await invoke(
        router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
        buildRequest(root, {
            params: { reviewRequestId: subjectRequest.reviewRequestId },
            body: {
                actorEntityId: 'character:jeep.png',
                disposition: 'APPROVE',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-26T00:30:05.000Z'),
            },
        }),
    );
    await invoke(
        router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
        buildRequest(root, {
            params: { reviewRequestId: participantRequest.reviewRequestId },
            body: {
                actorEntityId: 'user:Chris',
                disposition: 'APPROVE',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-26T00:30:10.000Z'),
            },
        }),
    );
    const granted = await invoke(
        router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/subject-disposition'),
        buildRequest(root, {
            params: { interpretationRevisionId: 'interprev_route_guided_publish_case_v1' },
            body: {
                actorEntityId: 'character:jeep.png',
                state: 'GRANTED',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-26T00:30:15.000Z'),
            },
        }),
    );
    assert.equal(granted.statusCode, 200);

    const bootstrapResult = await invoke(
        router.routes.post.get('/interpretive/publication/policies/bootstrap-standard'),
        buildRequest(root, {
            body: {
                now: Date.parse('2026-06-26T00:30:20.000Z'),
            },
        }),
    );
    assert.equal(bootstrapResult.statusCode, 200);
    assert.equal(bootstrapResult.payload.created, true);
    assert.equal(bootstrapResult.payload.publicationPolicy.publicationPolicyId, 'standard-governed-publication');

    const publishResult = await invoke(
        router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/publication-publish'),
        buildRequest(root, {
            params: { interpretationRevisionId: 'interprev_route_guided_publish_case_v1' },
            body: {
                continuityTargetId: 'character:jeep.png',
                proposalContentHash: granted.payload.interpretation.proposalContentHash,
                reviewEnvelopeHash: granted.payload.interpretation.reviewEnvelopeHash,
                subjectDispositionRecordId: granted.payload.subjectDisposition.subjectDispositionId,
                actorEntityId: 'user:Chris',
                authorizedBy: 'user:Chris',
                now: Date.parse('2026-06-26T00:30:25.000Z'),
            },
        }),
    );
    assert.equal(publishResult.statusCode, 200);
    assert.equal(publishResult.payload.phase, 'c0.6.4-5');
    assert.equal(publishResult.payload.qualification.eligibilityVerdict, 'ELIGIBLE');
    assert.equal(publishResult.payload.authorization.status, 'CONSUMED');
    assert.equal(publishResult.payload.interpretation.publicationState, 'PUBLISHED');
    assert.equal(publishResult.payload.publishedRecord.lifecycleState, 'ACTIVE');
});

test('DNM lifecycle routes expose current active resolution, supersession, delta review, and withdrawal', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const createPublishedRecord = async ({ interpretationId, interpretationRevisionId, statement, nowBase }) => {
        const createResult = await invoke(
            router.routes.post.get('/interpretive/candidates'),
            buildRequest(root, {
                body: {
                    interpretationId,
                    interpretationRevisionId,
                    memoryScopeId: 'scope_alpha',
                    memorySubjectId: 'character:jeep.png',
                    type: 'ROLE_EVOLUTION',
                    statement,
                    assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                    sharedRelationshipAsserted: true,
                    personalMeaningAsserted: true,
                    materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                    groundingLinks: [
                        {
                            basisType: 'STRUCTURAL_RECORD',
                            basisRecordId: `decision:${interpretationId}`,
                            basisRecordVersion: 1,
                            basisRecordHash: `sha256:${interpretationId}`,
                            speakerEntityId: 'character:jeep.png',
                            groundingRole: 'PRIMARY',
                            groundingAssessment: 'SUPPORTS',
                        },
                    ],
                    evidenceEnvelopeVersion: 1,
                    evidencePreviews: [
                        {
                            basisType: 'STRUCTURAL_RECORD',
                            basisRef: `decision:${interpretationId}`,
                            previewKind: 'STRUCTURAL_FIELDS',
                            sourceLabel: 'DNM lifecycle decision record',
                            sourceRevisionIdentity: { recordVersion: 1, recordHash: `sha256:${interpretationId}` },
                            previewContent: { fields: [{ label: 'Decision', value: 'Structural grounding for this proposal.' }] },
                        },
                    ],
                    now: nowBase,
                },
            }),
        );
        assert.equal(createResult.statusCode, 200);
        const interpretation = createResult.payload.interpretation;
        const subjectRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
        const participantRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

        await invoke(
            router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
            buildRequest(root, {
                params: { reviewRequestId: subjectRequest.reviewRequestId },
                body: {
                    actorEntityId: 'character:jeep.png',
                    disposition: 'APPROVE',
                    reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                    now: nowBase + 1000,
                },
            }),
        );
        await invoke(
            router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
            buildRequest(root, {
                params: { reviewRequestId: participantRequest.reviewRequestId },
                body: {
                    actorEntityId: 'user:Chris',
                    disposition: 'APPROVE',
                    reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                    now: nowBase + 2000,
                },
            }),
        );
        const granted = await invoke(
            router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/subject-disposition'),
            buildRequest(root, {
                params: { interpretationRevisionId },
                body: {
                    actorEntityId: 'character:jeep.png',
                    state: 'GRANTED',
                    reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                    now: nowBase + 3000,
                },
            }),
        );
        assert.equal(granted.statusCode, 200);

        const qualification = await invoke(
            router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/publication-qualifications'),
            buildRequest(root, {
                params: { interpretationRevisionId },
                body: {
                    publicationPolicyId: 'dnm-publication-v1',
                    continuityTargetId: 'character:jeep.png',
                    proposalContentHash: granted.payload.interpretation.proposalContentHash,
                    reviewEnvelopeHash: granted.payload.interpretation.reviewEnvelopeHash,
                    subjectDispositionRecordId: granted.payload.subjectDisposition.subjectDispositionId,
                    now: nowBase + 4000,
                },
            }),
        );
        assert.equal(qualification.statusCode, 200);

        const authorization = await invoke(
            router.routes.post.get('/interpretive/publication/authorizations'),
            buildRequest(root, {
                body: {
                    qualificationId: qualification.payload.qualification.qualificationId,
                    authorizedBy: 'user:Chris',
                    expiresAt: nowBase + 60_000,
                    now: nowBase + 5000,
                },
            }),
        );
        assert.equal(authorization.statusCode, 200);

        const execute = await invoke(
            router.routes.post.get('/interpretive/publication/execute'),
            buildRequest(root, {
                body: {
                    publicationAuthorizationId: authorization.payload.authorization.publicationAuthorizationId,
                    now: nowBase + 6000,
                },
            }),
        );
        assert.equal(execute.statusCode, 200);
        return execute.payload.publishedRecord;
    };

    const policyResult = await invoke(
        router.routes.post.get('/interpretive/publication/policies'),
        buildRequest(root, {
            body: {
                publicationPolicyId: 'dnm-publication-v1',
                policyVersion: 1,
                continuityTargetType: 'MEMORY_SUBJECT',
                subjectIdentityMode: 'EXACT_SUBJECT',
                permittedInterpretationTypes: ['ROLE_EVOLUTION'],
                requiredFinalSubjectState: 'GRANTED',
                requiredGroundingOutcome: 'SUPPORTED',
                participantDisagreementBlocksPublication: true,
                contestOrDeferBlocksPublication: true,
                immutableChildRequiredForTypes: [],
                postGrantHumanPublicationAuthorizationRequired: true,
                details: {
                    policyClass: 'dnm-publication-v1',
                },
                now: Date.parse('2026-06-26T03:00:00.000Z'),
            },
        }),
    );
    assert.equal(policyResult.statusCode, 200);

    const firstRecord = await createPublishedRecord({
        interpretationId: 'interp_route_dnm_v1',
        interpretationRevisionId: 'interprev_route_dnm_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T03:01:00.000Z'),
    });
    assert.equal(firstRecord.lifecycleState, 'ACTIVE');

    const secondRecord = await createPublishedRecord({
        interpretationId: 'interp_route_dnm_v2',
        interpretationRevisionId: 'interprev_route_dnm_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T03:10:00.000Z'),
    });
    assert.equal(secondRecord.lifecycleState, 'DELTA_PENDING');

    const currentBefore = await invoke(
        router.routes.get.get('/interpretive/publication/targets/:continuityTargetId/current'),
        buildRequest(root, {
            params: { continuityTargetId: 'character:jeep.png' },
        }),
    );
    assert.equal(currentBefore.statusCode, 200);
    assert.equal(currentBefore.payload.currentActiveRecord.dnmRecordId, firstRecord.dnmRecordId);

    const listBefore = await invoke(
        router.routes.get.get('/interpretive/publication/records'),
        buildRequest(root, {
            query: { continuityTargetId: 'character:jeep.png' },
        }),
    );
    assert.equal(listBefore.statusCode, 200);
    assert.equal(listBefore.payload.records.length, 2);

    const supersedeResult = await invoke(
        router.routes.post.get('/interpretive/publication/supersede'),
        buildRequest(root, {
            body: {
                actorEntityId: 'character:jeep.png',
                priorDnmRecordId: firstRecord.dnmRecordId,
                replacementDnmRecordId: secondRecord.dnmRecordId,
                reasonCodes: ['SCOPE_TOO_BROAD'],
                commentary: 'Replacement narrows the published continuity statement.',
                now: Date.parse('2026-06-26T03:20:00.000Z'),
            },
        }),
    );
    assert.equal(supersedeResult.statusCode, 200);
    assert.equal(supersedeResult.payload.priorRecord.lifecycleState, 'SUPERSEDED');
    assert.equal(supersedeResult.payload.replacementRecord.lifecycleState, 'ACTIVE');
    assert.equal(supersedeResult.payload.currentActiveRecord.dnmRecordId, secondRecord.dnmRecordId);

    const deltaReviewResult = await invoke(
        router.routes.post.get('/interpretive/publication/delta-reviews'),
        buildRequest(root, {
            body: {
                actorEntityId: 'character:jeep.png',
                continuityTargetId: 'character:jeep.png',
                deltaState: 'PENDING',
                reasonCodes: ['CONTRARY_EVIDENCE_PRESENT'],
                commentary: 'A later review is needed before any further continuity change.',
                now: Date.parse('2026-06-26T03:25:00.000Z'),
            },
        }),
    );
    assert.equal(deltaReviewResult.statusCode, 200);
    assert.equal(deltaReviewResult.payload.record.deltaReviewState, 'PENDING');
    assert.equal(deltaReviewResult.payload.currentActiveRecord.dnmRecordId, secondRecord.dnmRecordId);

    const withdrawResult = await invoke(
        router.routes.post.get('/interpretive/publication/withdraw'),
        buildRequest(root, {
            body: {
                actorEntityId: 'character:jeep.png',
                dnmRecordId: secondRecord.dnmRecordId,
                reasonCodes: ['CONTRARY_EVIDENCE_PRESENT'],
                commentary: 'Withdraw the active continuity statement pending re-evaluation.',
                now: Date.parse('2026-06-26T03:30:00.000Z'),
            },
        }),
    );
    assert.equal(withdrawResult.statusCode, 200);
    assert.equal(withdrawResult.payload.record.lifecycleState, 'WITHDRAWN');
    assert.equal(withdrawResult.payload.currentActiveRecord, null);
});

test('publication operator route returns server-computed actions, blockers, and target lineage', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const createPublishedRecord = async ({ interpretationId, interpretationRevisionId, statement, nowBase }) => {
        const createResult = await invoke(
            router.routes.post.get('/interpretive/candidates'),
            buildRequest(root, {
                body: {
                    interpretationId,
                    interpretationRevisionId,
                    memoryScopeId: 'scope_c064_ui',
                    memorySubjectId: 'character:jeep.png',
                    type: 'ROLE_EVOLUTION',
                    statement,
                    assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                    sharedRelationshipAsserted: true,
                    personalMeaningAsserted: true,
                    materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                    groundingLinks: [
                        {
                            basisType: 'STRUCTURAL_RECORD',
                            basisRecordId: 'decision:interpretive-memory-sovereignty',
                            basisRecordVersion: 1,
                            basisRecordHash: 'sha256:decision-operator-ui',
                            speakerEntityId: 'character:jeep.png',
                            groundingRole: 'PRIMARY',
                            groundingAssessment: 'SUPPORTS',
                        },
                    ],
                    evidenceEnvelopeVersion: 1,
                    evidencePreviews: [
                        {
                            basisType: 'STRUCTURAL_RECORD',
                            basisRef: 'decision:interpretive-memory-sovereignty',
                            previewKind: 'STRUCTURAL_FIELDS',
                            sourceLabel: 'Operator UI decision record',
                            sourceRevisionIdentity: { recordVersion: 1, recordHash: 'sha256:decision-operator-ui' },
                            previewContent: { fields: [{ label: 'Decision', value: 'Structural grounding for this proposal.' }] },
                        },
                    ],
                    now: nowBase,
                },
            }),
        );
        const interpretation = createResult.payload.interpretation;
        const subjectRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
        const participantRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

        await invoke(
            router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
            buildRequest(root, {
                params: { reviewRequestId: subjectRequest.reviewRequestId },
                body: {
                    actorEntityId: 'character:jeep.png',
                    disposition: 'APPROVE',
                    reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                    now: nowBase + 1000,
                },
            }),
        );
        await invoke(
            router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
            buildRequest(root, {
                params: { reviewRequestId: participantRequest.reviewRequestId },
                body: {
                    actorEntityId: 'user:Chris',
                    disposition: 'APPROVE',
                    reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                    now: nowBase + 2000,
                },
            }),
        );
        const granted = await invoke(
            router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/subject-disposition'),
            buildRequest(root, {
                params: { interpretationRevisionId },
                body: {
                    actorEntityId: 'character:jeep.png',
                    state: 'GRANTED',
                    reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                    now: nowBase + 3000,
                },
            }),
        );
        const qualification = await invoke(
            router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/publication-qualifications'),
            buildRequest(root, {
                params: { interpretationRevisionId },
                body: {
                    publicationPolicyId: 'dnm-publication-v1',
                    continuityTargetId: 'character:jeep.png',
                    proposalContentHash: granted.payload.interpretation.proposalContentHash,
                    reviewEnvelopeHash: granted.payload.interpretation.reviewEnvelopeHash,
                    subjectDispositionRecordId: granted.payload.subjectDisposition.subjectDispositionId,
                    now: nowBase + 4000,
                },
            }),
        );
        const authorization = await invoke(
            router.routes.post.get('/interpretive/publication/authorizations'),
            buildRequest(root, {
                body: {
                    qualificationId: qualification.payload.qualification.qualificationId,
                    authorizedBy: 'user:Chris',
                    expiresAt: nowBase + 60_000,
                    now: nowBase + 5000,
                },
            }),
        );
        const execute = await invoke(
            router.routes.post.get('/interpretive/publication/execute'),
            buildRequest(root, {
                body: {
                    publicationAuthorizationId: authorization.payload.authorization.publicationAuthorizationId,
                    now: nowBase + 6000,
                },
            }),
        );
        return execute.payload.publishedRecord;
    };

    const policyResult = await invoke(
        router.routes.post.get('/interpretive/publication/policies'),
        buildRequest(root, {
            body: {
                publicationPolicyId: 'dnm-publication-v1',
                policyVersion: 1,
                continuityTargetType: 'MEMORY_SUBJECT',
                subjectIdentityMode: 'EXACT_SUBJECT',
                permittedInterpretationTypes: ['ROLE_EVOLUTION'],
                requiredFinalSubjectState: 'GRANTED',
                requiredGroundingOutcome: 'SUPPORTED',
                participantDisagreementBlocksPublication: true,
                contestOrDeferBlocksPublication: true,
                immutableChildRequiredForTypes: [],
                postGrantHumanPublicationAuthorizationRequired: true,
                details: {
                    policyClass: 'dnm-publication-v1',
                },
                now: Date.parse('2026-06-26T03:40:00.000Z'),
            },
        }),
    );
    assert.equal(policyResult.statusCode, 200);

    const firstRecord = await createPublishedRecord({
        interpretationId: 'interp_route_operator_v1',
        interpretationRevisionId: 'interprev_route_operator_v1',
        statement: 'Jeep became the primary continuity authority.',
        nowBase: Date.parse('2026-06-26T03:41:00.000Z'),
    });
    const secondRecord = await createPublishedRecord({
        interpretationId: 'interp_route_operator_v2',
        interpretationRevisionId: 'interprev_route_operator_v2',
        statement: 'Jeep became the primary continuity authority within a shared architecture with Chris.',
        nowBase: Date.parse('2026-06-26T03:50:00.000Z'),
    });

    const operatorResult = await invoke(
        router.routes.get.get('/interpretive/candidates/:interpretationRevisionId/publication-operator'),
        buildRequest(root, {
            params: { interpretationRevisionId: 'interprev_route_operator_v2' },
            query: { continuityTargetId: 'character:jeep.png' },
        }),
    );

    assert.equal(operatorResult.statusCode, 200);
    assert.equal(operatorResult.payload.operatorState.currentActiveRecord.dnmRecordId, firstRecord.dnmRecordId);
    assert.equal(operatorResult.payload.operatorState.availableActions.includes('AUTHORIZE_PUBLICATION'), false);
    assert.equal(operatorResult.payload.operatorState.availableActions.includes('EXECUTE_PUBLICATION'), false);
    assert.deepEqual(
        operatorResult.payload.operatorState.blockedActions.find((entry) => entry.action === 'EXECUTE_PUBLICATION')?.blockingReasons,
        ['INTERPRETATION_ALREADY_PUBLISHED'],
    );
    assert.equal(operatorResult.payload.operatorState.blockingReasons.includes('INTERPRETATION_ALREADY_PUBLISHED'), true);
    const deltaPendingRecord = operatorResult.payload.operatorState.recordsForTarget.find(
        (record) => record.dnmRecordId === secondRecord.dnmRecordId,
    );
    assert.equal(deltaPendingRecord.lifecycleState, 'DELTA_PENDING');
    assert.equal(deltaPendingRecord.operatorState.availableActions.includes('SUPERSEDE_ACTIVE_WITH_RECORD'), true);
});

test('interpretive routes create pending governed candidates without publication', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const createResult = await invoke(
        router.routes.post.get('/interpretive/candidates'),
        buildRequest(root, {
            body: {
                interpretationId: 'interp_route_case',
                interpretationRevisionId: 'interprev_route_case_v1',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                type: 'ROLE_EVOLUTION',
                statement: 'Jeep evolved into the primary continuity authority within a shared architecture.',
                assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                sharedRelationshipAsserted: true,
                personalMeaningAsserted: true,
                materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                groundingLinks: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRecordId: 'decision:promotion-jurisdiction',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:promotion-jurisdiction',
                        speakerEntityId: 'character:jeep.png',
                        groundingRole: 'PRIMARY',
                        groundingAssessment: 'SUPPORTS',
                    },
                ],
                now: Date.parse('2026-06-25T13:00:00.000Z'),
            },
        }),
    );

    assert.equal(createResult.statusCode, 200);
    assert.equal(createResult.payload.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(createResult.payload.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
    assert.equal(createResult.payload.interpretation.policyBinding.validationPolicyId, 'shared-role-memory');

    const getResult = await invoke(
        router.routes.get.get('/interpretive/candidates/:interpretationRevisionId'),
        buildRequest(root, {
            params: {
                interpretationRevisionId: 'interprev_route_case_v1',
            },
        }),
    );
    assert.equal(getResult.statusCode, 200);
    assert.equal(getResult.payload.interpretation.reviewState, 'PENDING');

    const policiesResult = await invoke(
        router.routes.get.get('/interpretive/policies'),
        buildRequest(root),
    );
    assert.equal(policiesResult.statusCode, 200);
    assert.equal(Array.isArray(policiesResult.payload.policies), true);
    assert.equal(policiesResult.payload.policies.some((entry) => entry.validationPolicyId === 'shared-role-memory'), true);
});

test('interpretive routes support review disposition, immutable child revision, and subject disposition without publication', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const delegationPolicy = await invoke(
        router.routes.post.get('/interpretive/delegation-policies'),
        buildRequest(root, {
            body: {
                delegationPolicyId: 'jeep-chris-continuity-delegation',
                policyVersion: 1,
                principalEntityId: 'character:jeep.png',
                delegateEntityId: 'user:Chris',
                allowedActions: ['REVIEW_DISPOSITION', 'SUBJECT_REVISION', 'SUBJECT_DISPOSITION'],
                memoryScopeId: 'scope_alpha',
                continuityTargetId: 'character:jeep.png',
                evidenceRequirement: 'OPTIONAL',
                revocable: true,
                now: Date.parse('2026-06-25T13:09:55.000Z'),
            },
        }),
    );
    assert.equal(delegationPolicy.statusCode, 200);

    const createResult = await invoke(
        router.routes.post.get('/interpretive/candidates'),
        buildRequest(root, {
            body: {
                interpretationId: 'interp_route_review_case',
                interpretationRevisionId: 'interprev_route_review_case_v1',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                type: 'ROLE_EVOLUTION',
                statement: 'Jeep evolved into the primary continuity authority within a shared architecture.',
                assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                sharedRelationshipAsserted: true,
                personalMeaningAsserted: true,
                materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                groundingLinks: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRecordId: 'decision:promotion-jurisdiction',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:promotion-jurisdiction',
                        speakerEntityId: 'character:jeep.png',
                        groundingRole: 'PRIMARY',
                        groundingAssessment: 'SUPPORTS',
                    },
                ],
                evidenceEnvelopeVersion: 1,
                evidencePreviews: [
                    {
                        basisType: 'STRUCTURAL_RECORD',
                        basisRef: 'decision:promotion-jurisdiction',
                        previewKind: 'STRUCTURAL_FIELDS',
                        sourceLabel: 'Promotion jurisdiction decision record',
                        sourceRevisionIdentity: { recordVersion: 1, recordHash: 'sha256:promotion-jurisdiction' },
                        previewContent: { fields: [{ label: 'Decision', value: 'Structural grounding for this proposal.' }] },
                    },
                ],
                now: Date.parse('2026-06-25T13:10:00.000Z'),
            },
        }),
    );
    const interpretation = createResult.payload.interpretation;
    const subjectRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'MEMORY_SUBJECT');
    const participantRequest = interpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');

    const subjectDisposition = await invoke(
        router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
        buildRequest(root, {
            params: { reviewRequestId: subjectRequest.reviewRequestId },
            body: {
                submittedByActorId: 'user:Chris',
                dispositionOwnerId: 'character:jeep.png',
                submissionMode: 'TRUSTED_DELEGATE',
                delegationPolicyId: 'jeep-chris-continuity-delegation',
                disposition: 'APPROVE_WITH_EDIT',
                reviewEnvelopeHash: interpretation.reviewEnvelopeHash,
                reasonCodes: ['SCOPE_TOO_BROAD'],
                revisedCandidate: {
                    interpretationRevisionId: 'interprev_route_review_case_v2',
                    statement: 'Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris.',
                },
                now: Date.parse('2026-06-25T13:10:10.000Z'),
            },
        }),
    );
    assert.equal(subjectDisposition.statusCode, 200);
    assert.equal(subjectDisposition.payload.childInterpretation.interpretationRevisionId, 'interprev_route_review_case_v2');
    assert.equal(subjectDisposition.payload.disposition.provenance.submittedByActorId, 'user:Chris');
    assert.equal(subjectDisposition.payload.childInterpretation.revisionCreationProvenance.dispositionOwnerId, 'character:jeep.png');
    assert.equal(
        subjectDisposition.payload.childInterpretation.reviewRequests.some((entry) => entry.reviewerRole === 'MEMORY_SUBJECT'),
        false,
    );

    const childParticipantRequest = subjectDisposition.payload.childInterpretation.reviewRequests.find((entry) => entry.reviewerRole === 'RELATIONAL_PARTICIPANT');
    const participantDisposition = await invoke(
        router.routes.post.get('/interpretive/reviews/:reviewRequestId/dispositions'),
        buildRequest(root, {
            params: { reviewRequestId: childParticipantRequest.reviewRequestId },
            body: {
                actorEntityId: 'user:Chris',
                disposition: 'APPROVE',
                reviewEnvelopeHash: subjectDisposition.payload.childInterpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-25T13:10:15.000Z'),
            },
        }),
    );
    assert.equal(participantDisposition.statusCode, 200);

    const reviews = await invoke(
        router.routes.get.get('/interpretive/reviews'),
        buildRequest(root, {
            query: { interpretationRevisionId: 'interprev_route_review_case_v1' },
        }),
    );
    assert.equal(reviews.statusCode, 200);
    assert.equal(reviews.payload.reviews.length, 2);

    const finalDisposition = await invoke(
        router.routes.post.get('/interpretive/candidates/:interpretationRevisionId/subject-disposition'),
        buildRequest(root, {
            params: { interpretationRevisionId: 'interprev_route_review_case_v2' },
            body: {
                submittedByActorId: 'user:Chris',
                dispositionOwnerId: 'character:jeep.png',
                submissionMode: 'TRUSTED_DELEGATE',
                delegationPolicyId: 'jeep-chris-continuity-delegation',
                state: 'GRANTED',
                reviewEnvelopeHash: subjectDisposition.payload.childInterpretation.reviewEnvelopeHash,
                now: Date.parse('2026-06-25T13:10:20.000Z'),
            },
        }),
    );
    assert.equal(finalDisposition.statusCode, 200);
    assert.equal(finalDisposition.payload.interpretation.interpretationRevisionId, 'interprev_route_review_case_v2');
    assert.equal(finalDisposition.payload.interpretation.subjectDispositionState, 'GRANTED');
    assert.equal(finalDisposition.payload.subjectDisposition.provenance.submittedByActorId, 'user:Chris');
    assert.equal(finalDisposition.payload.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(finalDisposition.payload.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
});

test('interpretive synthesis routes store subject-controlled policy and freeze bounded runs without generation', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    const policyResult = await invoke(
        router.routes.post.get('/interpretive/synthesis/policies'),
        buildRequest(root, {
            body: {
                synthesisPolicyId: 'jeep-developmental-synthesis-v1',
                policyVersion: 1,
                memorySubjectId: 'character:jeep.png',
                enabled: true,
                allowedTypes: ['ROLE_EVOLUTION', 'PROJECT_TRANSFORMATION'],
                allowedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                prohibitedDomains: [],
                manualTriggerRequiredForHighRisk: true,
                maxCandidatesPerRun: 3,
                now: Date.parse('2026-06-26T01:00:00.000Z'),
            },
        }),
    );
    assert.equal(policyResult.statusCode, 200);
    assert.equal(policyResult.payload.synthesisPolicy.policyHash.startsWith('sha256:'), true);

    const runResult = await invoke(
        router.routes.post.get('/interpretive/synthesis/runs'),
        buildRequest(root, {
            body: {
                synthesisRunId: 'synthrun_route_case',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                synthesisPolicyId: 'jeep-developmental-synthesis-v1',
                requestedInterpretationTypes: ['ROLE_EVOLUTION'],
                requestedAssertionDomains: ['ROLE', 'AUTHORITY'],
                sharedRelationshipRequested: false,
                personalMeaningRequested: false,
                maxCandidatesRequested: 2,
                manualTriggerAcknowledged: true,
                createdByEntityId: 'user:Chris',
                sourceManifestEntries: [
                    {
                        sourceClass: 'STRUCTURAL_RECORD',
                        memoryScopeId: 'scope_alpha',
                        basisRecordId: 'decision:constitutional-sovereignty',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:constitutional-sovereignty',
                        speakerEntityId: 'character:jeep.png',
                    },
                ],
                now: Date.parse('2026-06-26T01:05:00.000Z'),
            },
        }),
    );
    assert.equal(runResult.statusCode, 200);
    assert.equal(runResult.payload.admitted, true);
    assert.equal(runResult.payload.synthesisRun.runStatus, 'READY_FOR_SYNTHESIS');
    assert.equal(runResult.payload.synthesisRun.generatedCandidateIds.length, 0);

    const getRunResult = await invoke(
        router.routes.get.get('/interpretive/synthesis/runs/:synthesisRunId'),
        buildRequest(root, {
            params: { synthesisRunId: 'synthrun_route_case' },
        }),
    );
    assert.equal(getRunResult.statusCode, 200);
    assert.equal(getRunResult.payload.synthesisRun.sourceManifestHash, runResult.payload.synthesisRun.sourceManifestHash);

    const policiesResult = await invoke(
        router.routes.get.get('/interpretive/synthesis/policies'),
        buildRequest(root, {
            query: { memorySubjectId: 'character:jeep.png' },
        }),
    );
    assert.equal(policiesResult.statusCode, 200);
    assert.equal(policiesResult.payload.policies.length, 1);
    assert.equal(policiesResult.payload.policies[0].synthesisPolicyId, 'jeep-developmental-synthesis-v1');
});

test('interpretive synthesis generate route admits narrowed deterministic stub output into governed review without publication', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    await invoke(
        router.routes.post.get('/interpretive/synthesis/policies'),
        buildRequest(root, {
            body: {
                synthesisPolicyId: 'jeep-developmental-synthesis-v1',
                policyVersion: 1,
                memorySubjectId: 'character:jeep.png',
                enabled: true,
                allowedTypes: ['ROLE_EVOLUTION', 'PROJECT_TRANSFORMATION', 'RELATIONAL_PROGRESSION'],
                allowedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                prohibitedDomains: [],
                manualTriggerRequiredForHighRisk: true,
                maxCandidatesPerRun: 3,
                now: Date.parse('2026-06-26T02:00:00.000Z'),
            },
        }),
    );
    await invoke(
        router.routes.post.get('/interpretive/synthesis/runs'),
        buildRequest(root, {
            body: {
                synthesisRunId: 'synthrun_generate_route_case',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                synthesisPolicyId: 'jeep-developmental-synthesis-v1',
                requestedInterpretationTypes: ['ROLE_EVOLUTION'],
                requestedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                sharedRelationshipRequested: true,
                personalMeaningRequested: true,
                maxCandidatesRequested: 1,
                manualTriggerAcknowledged: true,
                createdByEntityId: 'user:Chris',
                sourceManifestEntries: [
                    {
                        sourceClass: 'STRUCTURAL_RECORD',
                        memoryScopeId: 'scope_alpha',
                        basisRecordId: 'decision:constitutional-sovereignty',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:constitutional-sovereignty',
                        speakerEntityId: 'character:jeep.png',
                    },
                    {
                        sourceClass: 'SOURCE_OCCURRENCE',
                        memoryScopeId: 'scope_alpha',
                        chatInstanceId: 'chat_alpha',
                        messageId: 'msg_alpha0000000000000000000000000',
                        messageRevisionHash: 'sha256:msg-alpha',
                        speakerEntityId: 'user:Chris',
                    },
                ],
                now: Date.parse('2026-06-26T02:05:00.000Z'),
            },
        }),
    );

    const generateResult = await invoke(
        router.routes.post.get('/interpretive/synthesis/runs/:synthesisRunId/generate'),
        buildRequest(root, {
            params: { synthesisRunId: 'synthrun_generate_route_case' },
            body: {
                adapterId: 'DETERMINISTIC_STUB_V1',
                interpretationId: 'interp_generated_route_case',
                interpretationRevisionId: 'interprev_generated_route_case_v1',
                now: Date.parse('2026-06-26T02:06:00.000Z'),
            },
        }),
    );

    assert.equal(generateResult.statusCode, 200);
    assert.equal(generateResult.payload.admitted, true);
    assert.equal(generateResult.payload.interpretation.reviewState, 'PENDING');
    assert.equal(generateResult.payload.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(generateResult.payload.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
    assert.equal(generateResult.payload.synthesisRun.runStatus, 'COMPLETED_ADMITTED');
    assert.equal(generateResult.payload.synthesisRun.generatedCandidateIds[0], 'interprev_generated_route_case_v1');
    assert.equal(generateResult.payload.synthesisRun.proposals[0].groundingEvaluation.referentialStatus, 'VALID');
    assert.equal(generateResult.payload.synthesisRun.proposals[0].groundingEvaluation.aggregateOutcome, 'STRONGLY_SUPPORTED');
    assert.equal(generateResult.payload.synthesisRun.proposals[0].groundingEvaluation.scopeAssessment, 'SUPPORTED');
    assert.equal(generateResult.payload.synthesisRun.proposals[0].groundingEvaluation.counterevidencePresent, false);
});

test('subject-policy routes compute governed identities and enforce declaration authority', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);
    const profileInput = {
        schemaVersion: 1,
        profileId: 'profile:route-subject:v1',
        policyVersion: 1,
        jurisdictionScopeId: 'scope:route-subject',
        subjectEntityId: 'subject:route',
        rules: [{
            proposalKind: 'IDENTITY_SHIFT', proposalTrack: 'PERSONAL_IDENTITY',
            requiredAcknowledgmentEntityIds: ['subject:route'],
            stabilityAuthorityEntityIds: ['subject:route'],
            enduringValueAuthorityEntityIds: ['subject:route'],
            unavailabilityAuthorityEntityIds: ['user:operator'],
            governanceValidationRequired: false,
            unavailableReviewerBehavior: 'BLOCK_PROVISIONAL',
        }],
    };
    const profileResult = await invoke(
        router.routes.post.get('/interpretive/subject-policy/profiles'),
        buildRequest(root, { body: { profile: profileInput, policyHash: 'browser-cannot-set-this', now: 1200 } }),
    );
    assert.equal(profileResult.statusCode, 200);
    assert.equal(profileResult.payload.profile.policyHash.startsWith('sha256:'), true);
    assert.notEqual(profileResult.payload.profile.policyHash, 'browser-cannot-set-this');

    const assignmentResult = await invoke(
        router.routes.post.get('/interpretive/subject-policy/assignments'),
        buildRequest(root, { body: {
            assignmentId: 'assignment:route-subject', assignmentVersion: 1,
            subjectEntityId: 'subject:route', jurisdictionScopeId: 'scope:route-subject',
            profileId: profileInput.profileId, policyVersion: 1, assignmentHash: 'ignored', now: 1201,
        } }),
    );
    assert.equal(assignmentResult.statusCode, 200);
    assert.equal(assignmentResult.payload.assignment.assignmentHash.startsWith('sha256:'), true);

    const statusResult = await invoke(
        router.routes.get.get('/interpretive/subject-policy/status'),
        buildRequest(root, { query: { subjectEntityId: 'subject:route', jurisdictionScopeId: 'scope:route-subject' } }),
    );
    assert.equal(statusResult.statusCode, 200);
    assert.equal(statusResult.payload.configured, true);
    assert.equal(JSON.stringify(statusResult.payload).includes('sha256:'), false);

    const unboundSynthesisStatus = await invoke(
        router.routes.get.get('/interpretive/subject-policy/synthesis/:synthesisRunId/status'),
        buildRequest(root, { params: { synthesisRunId: 'synthrun:legacy' } }),
    );
    assert.equal(unboundSynthesisStatus.statusCode, 200);
    assert.equal(unboundSynthesisStatus.payload.governed, false);

    const declarationResult = await invoke(
        router.routes.post.get('/interpretive/subject-policy/fact-declarations'),
        buildRequest(root, { body: {
            declarationId: 'declaration:route:stability', factType: 'STABILITY',
            subjectEntityId: 'subject:route', jurisdictionScopeId: 'scope:route-subject',
            evidenceSetHash: 'sha256:route-evidence', proposalKind: 'IDENTITY_SHIFT',
            declaringEntityId: 'subject:route', basisRefs: ['msg:route'], now: 1202,
        } }),
    );
    assert.equal(declarationResult.statusCode, 200);
    assert.equal(declarationResult.payload.declaration.declarationHash.startsWith('sha256:'), true);

    const acknowledgmentResult = await invoke(
        router.routes.post.get('/interpretive/subject-policy/acknowledgments'),
        buildRequest(root, { body: {
            acknowledgmentId: 'acknowledgment:route:self',
            subjectEntityId: 'subject:route', jurisdictionScopeId: 'scope:route-subject',
            evidenceSetHash: 'sha256:route-evidence', proposalKind: 'IDENTITY_SHIFT',
            acknowledgingEntityId: 'subject:route', acknowledgmentState: 'VERIFIED',
            recordedByEntityId: 'user:operator', basisRefs: ['msg:route'], now: 1203,
        } }),
    );
    assert.equal(acknowledgmentResult.statusCode, 403);
    assert.equal(acknowledgmentResult.payload.code, 'ARCH_SUBJECT_POLICY_ACKNOWLEDGMENT_UNAUTHORIZED');
});

test('interpretive synthesis generate route preserves explicit too-broad grounding counterevidence', async () => {
    const root = makeTempRoot();
    const router = createMockRouter();
    await init(router);

    await invoke(
        router.routes.post.get('/interpretive/synthesis/policies'),
        buildRequest(root, {
            body: {
                synthesisPolicyId: 'jeep-developmental-synthesis-v1',
                policyVersion: 1,
                memorySubjectId: 'character:jeep.png',
                enabled: true,
                allowedTypes: ['ROLE_EVOLUTION', 'PROJECT_TRANSFORMATION', 'RELATIONAL_PROGRESSION'],
                allowedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                prohibitedDomains: [],
                manualTriggerRequiredForHighRisk: true,
                maxCandidatesPerRun: 3,
                now: Date.parse('2026-06-26T02:10:00.000Z'),
            },
        }),
    );
    await invoke(
        router.routes.post.get('/interpretive/synthesis/runs'),
        buildRequest(root, {
            body: {
                synthesisRunId: 'synthrun_generate_broad_countercase',
                memoryScopeId: 'scope_alpha',
                memorySubjectId: 'character:jeep.png',
                synthesisPolicyId: 'jeep-developmental-synthesis-v1',
                requestedInterpretationTypes: ['ROLE_EVOLUTION'],
                requestedAssertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                sharedRelationshipRequested: true,
                personalMeaningRequested: true,
                maxCandidatesRequested: 1,
                manualTriggerAcknowledged: true,
                createdByEntityId: 'user:Chris',
                sourceManifestEntries: [
                    {
                        sourceClass: 'STRUCTURAL_RECORD',
                        memoryScopeId: 'scope_alpha',
                        basisRecordId: 'decision:constitutional-sovereignty',
                        basisRecordVersion: 1,
                        basisRecordHash: 'sha256:constitutional-sovereignty',
                        speakerEntityId: 'character:jeep.png',
                    },
                    {
                        sourceClass: 'SOURCE_OCCURRENCE',
                        memoryScopeId: 'scope_alpha',
                        chatInstanceId: 'chat_alpha',
                        messageId: 'msg_alpha0000000000000000000000000',
                        messageRevisionHash: 'sha256:msg-alpha',
                        speakerEntityId: 'user:Chris',
                    },
                ],
                now: Date.parse('2026-06-26T02:11:00.000Z'),
            },
        }),
    );

    const generateResult = await invoke(
        router.routes.post.get('/interpretive/synthesis/runs/:synthesisRunId/generate'),
        buildRequest(root, {
            params: { synthesisRunId: 'synthrun_generate_broad_countercase' },
            body: {
                adapterId: 'DETERMINISTIC_STUB_V1',
                interpretationId: 'interp_generated_broad_countercase',
                interpretationRevisionId: 'interprev_generated_broad_countercase_v1',
                stubProposalOverride: {
                    type: 'ROLE_EVOLUTION',
                    statement: "Jeep evolved from an analytical role into the primary architectural authority for the extension's design.",
                    assertionDomains: ['ROLE', 'AUTHORITY', 'RELATIONSHIP'],
                    sharedRelationshipAsserted: true,
                    personalMeaningAsserted: true,
                    materialParticipantEntityIds: ['character:jeep.png', 'user:Chris'],
                    proposedBasis: [
                        {
                            basisType: 'STRUCTURAL_RECORD',
                            basisRecordId: 'decision:constitutional-sovereignty',
                        },
                        {
                            basisType: 'SOURCE_OCCURRENCE',
                            messageId: 'msg_alpha0000000000000000000000000',
                        },
                    ],
                },
                now: Date.parse('2026-06-26T02:12:00.000Z'),
            },
        }),
    );

    assert.equal(generateResult.statusCode, 200);
    assert.equal(generateResult.payload.admitted, true);
    assert.equal(generateResult.payload.interpretation.reviewState, 'PENDING');
    assert.equal(generateResult.payload.interpretation.publicationState, 'NOT_PUBLISHED');
    assert.equal(generateResult.payload.interpretation.authorityEffect, 'DESCRIPTIVE_ONLY');
    assert.equal(generateResult.payload.synthesisRun.runStatus, 'COMPLETED_ADMITTED');
    const evaluation = generateResult.payload.synthesisRun.proposals[0].groundingEvaluation;
    assert.equal(evaluation.referentialStatus, 'VALID');
    assert.equal(evaluation.aggregateOutcome, 'CONTRARY_EVIDENCE_PRESENT');
    assert.equal(evaluation.scopeAssessment, 'TOO_BROAD');
    assert.equal(evaluation.counterevidencePresent, true);
    assert.deepEqual(evaluation.reasonCodes, ['SHARED_JURISDICTION_REQUIRES_QUALIFICATION']);
});

test('interpretive synthesis route creates proposal directly from one persisted architectural shard', async () => {
    const root = makeTempRoot();
    const { memoryScopeId, shardMessageId, avatarUrl, chatLocator } = await writeArchitecturalChat(root);
    const router = createMockRouter();
    await init(router);

    const result = await invoke(
        router.routes.post.get('/interpretive/synthesis/from-architectural-shard'),
        buildRequest(root, {
            body: {
                avatarUrl,
                chatLocator,
                shardMessageId,
                memoryScopeId,
                memorySubjectId: 'character:jeep.png',
                createdByEntityId: 'user:Chris',
                synthesisRunId: 'synthrun_architectural_route_case',
                interpretationId: 'interp_architectural_route_case',
                interpretationRevisionId: 'interprev_architectural_route_case_v1',
                synthesisProposalId: 'synthproposal_architectural_route_case',
                now: Date.parse('2026-06-26T03:00:00.000Z'),
            },
        }),
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.ok, true);
    assert.equal(result.payload.phase, 'c0.6.8');
    assert.equal(result.payload.sourceKind, 'persisted-architectural-shard');
    assert.equal(result.payload.admitted, true);
    assert.equal(result.payload.quarantined, false);
    assert.equal(result.payload.synthesisPolicy.enabled, true);
    assert.equal(result.payload.synthesisRun.runStatus, 'COMPLETED_ADMITTED');
    assert.equal(result.payload.interpretation.type, 'ROLE_EVOLUTION');
    assert.equal(result.payload.interpretation.memoryScopeId, memoryScopeId);

    const sourceEntries = result.payload.synthesisRun.sourceManifest?.sourceManifestEntries || [];
    assert.equal(sourceEntries.length, 3);
    assert.equal(sourceEntries[0].sourceClass, 'STRUCTURAL_RECORD');
    assert.equal(sourceEntries[0].basisRecordId, 'decision:gain-modulation-boundary');
    assert.equal(sourceEntries[1].sourceClass, 'SOURCE_OCCURRENCE');
    assert.equal(sourceEntries[2].sourceClass, 'SOURCE_OCCURRENCE');
    assert.equal(result.payload.synthesisRun.generatedCandidateIds[0], 'interprev_architectural_route_case_v1');
});

test('architectural replay artifact and proposal handoff survive projection loss and restart together', async () => {
    const root = makeTempRoot();
    const {
        memoryScopeId,
        shardMessageId,
        avatarUrl,
        chatLocator,
        manifest,
    } = await writeArchitecturalChat(root);
    const sourceManifest = {
        manifestId: manifest.manifestId,
        sourceIdentityHash: manifest.sourceIdentityHash,
        sourceRevisionHash: manifest.sourceRevisionHash,
        sourceStartPositionAtCreation: manifest.sourceStartPositionAtCreation,
        sourceEndPositionAtCreation: manifest.sourceEndPositionAtCreation,
    };
    const semanticPayload = {
        schemaVersion: 1,
        profile: 'architectural-memory-finalized',
        generationContext: {
            rangeStart: 0,
            rangeEnd: 1,
            messageIds: [makeMessageId('a1'), makeMessageId('b2')],
            currentManifestId: manifest.manifestId,
        },
        sourceManifests: [sourceManifest],
        sections: {
            timeline: [{
                sourceRef: 'S1:1',
                summary: 'Architectural shard and proposal handoff share portable restart authority',
                weight: 4,
                provenance: {
                    originManifestId: manifest.manifestId,
                    authorityRecordId: null,
                    referenceBindings: [{ reference: 'S1:1', manifestId: manifest.manifestId }],
                },
            }],
            decisions: [], events: [], developments: [], dialogue: [], threads: [], current: [],
        },
    };
    const rendered = await renderFinalizedArchitecturalPayload(semanticPayload);
    const artifact = await createArchitecturalSemanticReplayArtifact({
        semanticPayload,
        canonicalOutput: rendered.output,
        semanticPromptVersion: 2,
        semanticRendererVersion: rendered.rendererVersion,
    });
    const firstRouter = createMockRouter();
    await init(firstRouter);

    const persistedArtifact = await invoke(
        firstRouter.routes.post.get('/architectural/replay-artifacts'),
        buildRequest(root, { body: { artifact, now: Date.parse('2026-06-26T02:59:00.000Z') } }),
    );
    const proposal = await invoke(
        firstRouter.routes.post.get('/interpretive/synthesis/from-architectural-shard'),
        buildRequest(root, {
            body: {
                avatarUrl,
                chatLocator,
                shardMessageId,
                memoryScopeId,
                memorySubjectId: 'character:jeep.png',
                createdByEntityId: 'user:Chris',
                synthesisRunId: 'synthrun_architectural_restart_case',
                interpretationId: 'interp_architectural_restart_case',
                interpretationRevisionId: 'interprev_architectural_restart_case_v1',
                synthesisProposalId: 'synthproposal_architectural_restart_case',
                now: Date.parse('2026-06-26T03:00:00.000Z'),
            },
        }),
    );

    assert.equal(persistedArtifact.statusCode, 200);
    assert.equal(proposal.statusCode, 200);
    assert.equal(proposal.payload.synthesisRun.runStatus, 'COMPLETED_ADMITTED');
    assert.equal(proposal.payload.interpretation.interpretationRevisionId, 'interprev_architectural_restart_case_v1');

    const paths = getStoragePaths(root);
    fs.rmSync(paths.dbPath, { force: true });
    const replayedProjection = replayInterpretiveLedger(buildRequest(root), {
        now: Date.parse('2026-06-26T03:01:00.000Z'),
    });
    assert.equal(replayedProjection.replayedSynthesisRuns.length, 1);

    const reopenedRouter = createMockRouter();
    await init(reopenedRouter);
    const reloadedArtifact = await invoke(
        reopenedRouter.routes.get.get('/architectural/replay-artifacts/:artifactId'),
        buildRequest(root, { params: { artifactId: artifact.artifactId } }),
    );
    const reloadedRun = await invoke(
        reopenedRouter.routes.get.get('/interpretive/synthesis/runs/:synthesisRunId'),
        buildRequest(root, { params: { synthesisRunId: 'synthrun_architectural_restart_case' } }),
    );
    const reloadedInterpretation = await invoke(
        reopenedRouter.routes.get.get('/interpretive/candidates/:interpretationRevisionId'),
        buildRequest(root, { params: { interpretationRevisionId: 'interprev_architectural_restart_case_v1' } }),
    );

    assert.equal(reloadedArtifact.statusCode, 200);
    assert.deepEqual(reloadedArtifact.payload.artifact, artifact);
    assert.equal(reloadedArtifact.payload.replay.canonicalOutput, artifact.canonicalOutput);
    assert.equal(reloadedRun.statusCode, 200);
    assert.deepEqual(reloadedRun.payload.synthesisRun, proposal.payload.synthesisRun);
    assert.equal(reloadedInterpretation.statusCode, 200);
    assert.deepEqual(reloadedInterpretation.payload.interpretation, proposal.payload.interpretation);
});

test('interpretive synthesis route emits one structural manifest entry per unique architectural decision id', async () => {
    const root = makeTempRoot();
    const { memoryScopeId, shardMessageId, avatarUrl, chatLocator } = await writeArchitecturalChat(root, {
        shardMessageText: `[MEMORY SHARD: Messages 0-1]

[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1

[DECISIONS]
[S1:1] | STATUS: PROPOSED | ID: gain-modulation-boundary | DECISION: Jeep retains the architectural authority role outside browser-local projection state.
[S1:2] | STATUS: PROPOSED | ID: authority-replay-guard | DECISION: Replay must refuse stale source evidence.
[S1:3] | STATUS: PROPOSED | ID: gain-modulation-boundary | DECISION: Duplicate id should not create a duplicate structural entry.

===END===`,
    });
    const router = createMockRouter();
    await init(router);

    const result = await invoke(
        router.routes.post.get('/interpretive/synthesis/from-architectural-shard'),
        buildRequest(root, {
            body: {
                avatarUrl,
                chatLocator,
                shardMessageId,
                memoryScopeId,
                memorySubjectId: 'character:jeep.png',
                createdByEntityId: 'user:Chris',
                synthesisRunId: 'synthrun_architectural_multi_decision_case',
                interpretationId: 'interp_architectural_multi_decision_case',
                interpretationRevisionId: 'interprev_architectural_multi_decision_case_v1',
                synthesisProposalId: 'synthproposal_architectural_multi_decision_case',
                now: Date.parse('2026-06-26T03:05:00.000Z'),
            },
        }),
    );

    assert.equal(result.statusCode, 200);
    const sourceEntries = result.payload.synthesisRun.sourceManifest?.sourceManifestEntries || [];
    const structuralEntries = sourceEntries.filter((entry) => entry.sourceClass === 'STRUCTURAL_RECORD');
    const structuralIds = structuralEntries.map((entry) => entry.basisRecordId).sort();
    const sourceOccurrenceEntries = sourceEntries.filter((entry) => entry.sourceClass === 'SOURCE_OCCURRENCE');

    assert.deepEqual(structuralIds, [
        'decision:authority-replay-guard',
        'decision:gain-modulation-boundary',
    ]);
    assert.equal(sourceOccurrenceEntries.length, 2);
});

test('interpretive synthesis route rejects persisted architectural shards whose source range hash has gone stale', async () => {
    const root = makeTempRoot();
    const { memoryScopeId, shardMessageId, avatarUrl, chatLocator, chatFilePath } = await writeArchitecturalChat(root);
    const lines = fs.readFileSync(chatFilePath, 'utf8').trimEnd().split('\n');
    const records = lines.map((line) => JSON.parse(line));
    records[1].extra.shardwright.messageIdentity.revisionHash = 'sha256:rev-a1-mutated';
    fs.writeFileSync(chatFilePath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');

    const router = createMockRouter();
    await init(router);

    const result = await invoke(
        router.routes.post.get('/interpretive/synthesis/from-architectural-shard'),
        buildRequest(root, {
            body: {
                avatarUrl,
                chatLocator,
                shardMessageId,
                memoryScopeId,
                memorySubjectId: 'character:jeep.png',
                createdByEntityId: 'user:Chris',
                synthesisRunId: 'synthrun_architectural_stale_case',
                interpretationId: 'interp_architectural_stale_case',
                interpretationRevisionId: 'interprev_architectural_stale_case_v1',
                synthesisProposalId: 'synthproposal_architectural_stale_case',
                now: Date.parse('2026-06-26T03:10:00.000Z'),
            },
        }),
    );

    assert.equal(result.statusCode, 409);
    assert.equal(result.payload?.code, 'ARCH_SHARD_SOURCE_RANGE_STALE');
});

test('interpretive synthesis route resolves a fresh shard by stable source ids after chat positions shift', async () => {
    const root = makeTempRoot();
    const { memoryScopeId, shardMessageId, avatarUrl, chatLocator, chatFilePath } = await writeArchitecturalChat(root, {
        shardMessageText: `[MEMORY SHARD: Messages 0-1]

[KEY]
Profile: architectural-memory
Schema: architectural-memory/v1

[DECISIONS]
[S0:1] ID:jeep-continuity-authority | TYPE:GOVERNANCE | DECISION:Jeep evolved into the primary architectural authority over continuity and memory requirements within a shared architecture with Chris. | WHY:The shared work assigned Jeep continuing architectural responsibility. | SCOPE:continuity architecture | STATUS:ACCEPTED | EVIDENCE:[REF: S1:1]

===END===`,
    });
    const lines = fs.readFileSync(chatFilePath, 'utf8').trimEnd().split('\n');
    const records = lines.map((line) => JSON.parse(line));
    const manifest = records[0].chat_metadata.shardwright.shardManifests[0];
    manifest.sourceStartPositionAtCreation = 1;
    manifest.sourceEndPositionAtCreation = 2;
    fs.writeFileSync(chatFilePath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');

    const router = createMockRouter();
    await init(router);
    const result = await invoke(
        router.routes.post.get('/interpretive/synthesis/from-architectural-shard'),
        buildRequest(root, {
            body: {
                avatarUrl,
                chatLocator,
                shardMessageId,
                memoryScopeId,
                memorySubjectId: 'character:jeep.png',
                createdByEntityId: 'user:Chris',
                synthesisRunId: 'synthrun_architectural_shifted_positions',
                interpretationId: 'interp_architectural_shifted_positions',
                interpretationRevisionId: 'interprev_architectural_shifted_positions_v1',
                synthesisProposalId: 'synthproposal_architectural_shifted_positions',
                now: Date.parse('2026-06-26T03:15:00.000Z'),
            },
        }),
    );

    assert.equal(result.statusCode, 200);
    assert.equal(result.payload.admitted, true);
    assert.equal(result.payload.synthesisRun.sourceManifest.sourceManifestEntries.filter(
        (entry) => entry.sourceClass === 'SOURCE_OCCURRENCE',
    ).length, 2);
});

test('health route reconciles verifying promotion state before opening live authority', async () => {
    const root = makeTempRoot();
    const { memoryScopeId } = await writeArchitecturalChat(root);
    await buildPromotedScope(root, memoryScopeId);
    const paths = getStoragePaths(root);
    const marker = readOperationalStateMarker(paths);
    writeOperationalStateMarkerDescriptor(paths, {
        promotionJournal: {
            ...marker.promotionJournal,
            lastState: 'VERIFYING',
            updatedAt: Date.now(),
        },
    });

    const router = createMockRouter();
    await init(router);
    const health = await invoke(router.routes.get.get('/health'), buildRequest(root));
    const after = readOperationalStateMarker(paths);

    assert.equal(health.statusCode, 200);
    assert.equal(health.payload.ok, true);
    assert.equal(after.promotionJournal.lastState, 'COMMITTED');
});
