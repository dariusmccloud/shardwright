import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { JOURNAL_MODE, PLUGIN_ID, SCHEMA_VERSION, SERVICE_VERSION, schemaStatements } from './schema.js';
let createNodeSqliteAdapter = null;
let createBunSqliteAdapter = null;

if (typeof process?.versions?.bun === 'string') {
    ({ createBunSqliteAdapter } = await import('./sqlite-bun.js'));
} else {
    ({ createNodeSqliteAdapter } = await import('./sqlite-node.js'));
}

export {
    JOURNAL_MODE,
    PLUGIN_ID,
    SCHEMA_VERSION,
    SERVICE_VERSION,
};

export const CAPABILITIES = Object.freeze({
    phase: 'c0',
    rebuildAvailable: true,
    browserMigration: true,
    projectionRegistry: true,
    ordinaryChatPatching: false,
    c0_25a: Object.freeze({
        readOnlyScanner: true,
        nestedMetadataPreferred: true,
        corpusMutation: false,
        persistedChatInspection: true,
    }),
    c0_5a: Object.freeze({
        candidateRebuildOrchestration: true,
        candidateReportRetrieval: true,
        candidatePinning: true,
        candidateCleanup: true,
        promotionAvailable: false,
        liveAuthorityMutation: false,
        readOnlyCorpusDiscovery: true,
    }),
    c0_75_1: Object.freeze({
        candidateQualification: true,
        boundPromotionEvidence: true,
        candidateLiveDiff: true,
        rollbackPlanningEvidence: true,
        promotionAvailable: false,
        liveAuthorityMutation: false,
        readOnlyOnly: true,
    }),
    c0_75_2: Object.freeze({
        manualAuthorization: true,
        atomicGenerationTransition: true,
        globalTransitionLock: true,
        fullGenerationMerge: true,
        promotionAvailable: true,
        automaticPromotion: false,
        liveAuthorityMutation: true,
    }),
    c0_6_1: Object.freeze({
        interpretiveLedgerAuthority: true,
        interpretiveCandidateStorage: true,
        deterministicPolicyRouting: true,
        deterministicReviewerResolution: true,
        continuityPublicationAvailable: false,
        structuralAuthorityMutation: false,
        modelInterpretationAvailable: false,
    }),
    c0_6_2: Object.freeze({
        reviewerDispositionSubmission: true,
        immutableEditRevision: true,
        subjectDispositionRecording: true,
        delegatedDispositionProvenance: true,
        delegationPolicyStorage: true,
        continuityPublicationAvailable: false,
        structuralAuthorityMutation: false,
        modelInterpretationAvailable: false,
    }),
    c0_6_3: Object.freeze({
        synthesisPolicyStorage: true,
        boundedSynthesisRunContract: true,
        frozenSourceManifest: true,
        deterministicStubSynthesisAvailable: true,
        continuityPublicationAvailable: false,
        structuralAuthorityMutation: false,
        modelSynthesisAvailable: false,
    }),
    c0_6_4: Object.freeze({
        publicationPolicyStorage: true,
        publicationQualification: true,
        publicationAuthorizationAvailable: true,
        continuityPublicationAvailable: true,
        liveContinuityMutation: true,
        publicationLifecycleAvailable: true,
        supersessionAvailable: true,
        withdrawalAvailable: true,
        deltaReviewAvailable: true,
        currentActiveResolutionAvailable: true,
    }),
    c0_6_7: Object.freeze({
        upgradeReplayPreflight: true,
        upgradeReplayRoute: true,
        additiveMigrationOnly: true,
        deterministicReplayRequired: true,
        failClosedUpgradeBoundary: true,
    }),
    c0_5: false,
    c1: false,
    c2: false,
});

export const MESSAGE_IDENTITY_SCAN_SCHEMA = Object.freeze({
    namespace: 'shardwright',
    messageIdentityPath: 'extra.shardwright.messageIdentity',
    archivePath: 'extra.shardwright.archive',
    evidencePolicyPath: 'extra.shardwright.evidencePolicy',
    speakerIdentityPath: 'extra.shardwright.speakerIdentity',
    chatIdentityStatusPath: 'chat_metadata.shardwright.messageIdentity',
    promptVisibilityField: 'is_system',
    evidencePolicyDefault: 'include',
});

export function createId(prefix) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function nowTimestamp(value = Date.now()) {
    return Number.isFinite(value) ? Number(value) : Date.now();
}

export function cloneJson(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

export function sanitizeIdentifier(value, fieldName = 'identifier') {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw createError(400, `${fieldName} is required`, 'ARCH_INVALID_IDENTIFIER');
    }
    if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) {
        throw createError(400, `${fieldName} contains illegal characters`, 'ARCH_INVALID_IDENTIFIER');
    }
    return normalized;
}

export function normalizeChatLocator(value) {
    return String(value || '').trim().replace(/\.jsonl$/i, '').replace(/\.json$/i, '').trim();
}

export function createError(status, message, code, extra = {}) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    Object.assign(error, extra);
    return error;
}

export function getAuthenticatedUserRoot(request) {
    const root = request?.user?.directories?.root;
    if (root && typeof root === 'string') {
        return path.resolve(root);
    }
    const chats = request?.user?.directories?.chats;
    if (chats && typeof chats === 'string') {
        return path.resolve(chats, '..');
    }
    throw createError(500, 'Authenticated user root is unavailable', 'ARCH_USER_ROOT_UNAVAILABLE');
}

const STORAGE_IDENTITY_MIGRATION_POLICY = 'shardwright-server-storage-v1';
const STORAGE_IDENTITY_MIGRATION_MARKER = '.shardwright-storage-migration.json';

function buildStoragePaths(userRoot, storageDirectoryName) {
    const storageRoot = path.join(userRoot, storageDirectoryName);
    const dbPath = path.join(storageRoot, 'architectural-memory.db');
    const snapshotPath = path.join(storageRoot, 'architectural-memory.snapshot.db');
    const statePath = path.join(storageRoot, 'architectural-memory.state.json');
    const interpretiveGovernanceLedgerPath = path.join(storageRoot, 'interpretive-governance-ledger.jsonl');
    const dnmPublicationLedgerPath = path.join(storageRoot, 'dnm-publication-ledger.jsonl');
    const architecturalReplayArtifactsRoot = path.join(storageRoot, 'architectural-replay-artifacts');
    const architecturalReplayLedgerPath = path.join(storageRoot, 'architectural-shard-replay-ledger.jsonl');
    const generationsRoot = path.join(storageRoot, 'generations');
    const promotionsRoot = path.join(storageRoot, 'promotions');
    const promotionAuthorizationsRoot = path.join(promotionsRoot, 'authorizations');
    const promotionJournalPath = path.join(promotionsRoot, 'promotion-journal.jsonl');
    const locksRoot = path.join(storageRoot, 'locks');
    const authorityTransitionLockPath = path.join(locksRoot, 'authority-transition.lock');
    return {
        storageRoot,
        dbPath,
        snapshotPath,
        statePath,
        interpretiveGovernanceLedgerPath,
        dnmPublicationLedgerPath,
        architecturalReplayArtifactsRoot,
        architecturalReplayLedgerPath,
        generationsRoot,
        promotionsRoot,
        promotionAuthorizationsRoot,
        promotionJournalPath,
        locksRoot,
        authorityTransitionLockPath,
    };
}

export function getLegacyStoragePaths(userRoot) {
    return buildStoragePaths(userRoot, 'summary-sharder');
}

function listStorageFiles(root, relative = '') {
    const current = path.join(root, relative);
    if (!fs.existsSync(current)) return [];
    const files = [];
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const childRelative = path.join(relative, entry.name);
        if (entry.isDirectory()) {
            files.push(...listStorageFiles(root, childRelative));
        } else if (entry.isFile() && entry.name !== STORAGE_IDENTITY_MIGRATION_MARKER) {
            files.push(childRelative.replace(/\\/gu, '/'));
        }
    }
    return files.sort((a, b) => a.localeCompare(b));
}

function buildStorageManifest(root) {
    const files = listStorageFiles(root).map((relativePath) => {
        const buffer = fs.readFileSync(path.join(root, relativePath));
        return {
            relativePath,
            size: buffer.length,
            sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
        };
    });
    const manifestHash = crypto.createHash('sha256')
        .update(JSON.stringify(files))
        .digest('hex');
    return { files, manifestHash };
}

function readStorageIdentityMarker(storageRoot) {
    const markerPath = path.join(storageRoot, STORAGE_IDENTITY_MIGRATION_MARKER);
    if (!fs.existsSync(markerPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch {
        throw createError(409, 'Shardwright storage migration marker is unreadable.', 'SHARDWRIGHT_STORAGE_MIGRATION_CONFLICT');
    }
}

function verifyCopiedOperationalProjection(paths) {
    if (!fs.existsSync(paths.dbPath)) return;
    const inspection = inspectProjectionDb(paths.dbPath);
    if (!inspection.ok) {
        throw createError(409, 'Copied operational database failed integrity verification.', 'SHARDWRIGHT_STORAGE_MIGRATION_VERIFICATION_FAILED');
    }
}

function activateVerifiedStorageMigration(canonicalPaths, legacyManifest, marker) {
    const markerPath = path.join(canonicalPaths.storageRoot, STORAGE_IDENTITY_MIGRATION_MARKER);
    atomicWriteFile(markerPath, `${JSON.stringify({
        ...marker,
        status: 'ACTIVE',
        activatedAt: Date.now(),
        legacyManifestHash: legacyManifest.manifestHash,
    }, null, 2)}\n`);
}

export function ensureShardwrightStorageIdentity(userRoot) {
    const canonicalPaths = buildStoragePaths(userRoot, 'shardwright');
    const legacyPaths = getLegacyStoragePaths(userRoot);
    const canonicalExists = fs.existsSync(canonicalPaths.storageRoot);
    const legacyExists = fs.existsSync(legacyPaths.storageRoot);

    if (!legacyExists) return canonicalPaths;

    const legacyManifest = buildStorageManifest(legacyPaths.storageRoot);
    if (canonicalExists) {
        const marker = readStorageIdentityMarker(canonicalPaths.storageRoot);
        if (!marker
            || marker.policy !== STORAGE_IDENTITY_MIGRATION_POLICY
            || marker.sourceStorageRoot !== 'summary-sharder'
            || marker.destinationStorageRoot !== 'shardwright'
            || marker.legacyManifestHash !== legacyManifest.manifestHash) {
            throw createError(409, 'Canonical and legacy server storage cannot be safely attributed.', 'SHARDWRIGHT_STORAGE_MIGRATION_CONFLICT');
        }
        if (marker.status === 'VERIFIED') {
            const canonicalManifest = buildStorageManifest(canonicalPaths.storageRoot);
            if (canonicalManifest.manifestHash !== marker.destinationInitialManifestHash) {
                throw createError(409, 'Interrupted Shardwright storage migration failed destination verification.', 'SHARDWRIGHT_STORAGE_MIGRATION_CONFLICT');
            }
            verifyCopiedOperationalProjection(canonicalPaths);
            activateVerifiedStorageMigration(canonicalPaths, legacyManifest, marker);
        } else if (marker.status !== 'ACTIVE') {
            throw createError(409, 'Shardwright storage migration is not in an activatable state.', 'SHARDWRIGHT_STORAGE_MIGRATION_CONFLICT');
        }
        return canonicalPaths;
    }

    const stagingRoot = path.join(userRoot, '.shardwright-storage-migration');
    if (fs.existsSync(stagingRoot)) fs.rmSync(stagingRoot, { recursive: true, force: true });
    fs.cpSync(legacyPaths.storageRoot, stagingRoot, { recursive: true, errorOnExist: true });
    const sourceAfterCopy = buildStorageManifest(legacyPaths.storageRoot);
    const destinationManifest = buildStorageManifest(stagingRoot);
    if (sourceAfterCopy.manifestHash !== legacyManifest.manifestHash
        || destinationManifest.manifestHash !== legacyManifest.manifestHash) {
        fs.rmSync(stagingRoot, { recursive: true, force: true });
        throw createError(409, 'Legacy server storage changed during migration copy.', 'SHARDWRIGHT_STORAGE_MIGRATION_VERIFICATION_FAILED');
    }

    const stagingPaths = buildStoragePaths(userRoot, '.shardwright-storage-migration');
    verifyCopiedOperationalProjection(stagingPaths);
    const marker = {
        policy: STORAGE_IDENTITY_MIGRATION_POLICY,
        status: 'VERIFIED',
        sourceStorageRoot: 'summary-sharder',
        destinationStorageRoot: 'shardwright',
        legacyManifestHash: legacyManifest.manifestHash,
        destinationInitialManifestHash: destinationManifest.manifestHash,
        fileCount: destinationManifest.files.length,
        verifiedAt: Date.now(),
    };
    fs.writeFileSync(path.join(stagingRoot, STORAGE_IDENTITY_MIGRATION_MARKER), `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
    fs.renameSync(stagingRoot, canonicalPaths.storageRoot);
    activateVerifiedStorageMigration(canonicalPaths, legacyManifest, marker);
    return canonicalPaths;
}

export function getStoragePaths(userRoot) {
    return ensureShardwrightStorageIdentity(userRoot);
}

export function ensureStorageRoot(storageRoot) {
    fs.mkdirSync(storageRoot, { recursive: true });
}

export function atomicWriteFile(targetPath, content) {
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, content);
    fs.renameSync(tempPath, targetPath);
}

export function quarantinePath(filePath, reason = 'invalid') {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${filePath}.quarantine.${reason}.${stamp}`;
}

export function readOperationalStateMarker(paths) {
    if (!fs.existsSync(paths.statePath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(paths.statePath, 'utf8'));
    } catch {
        return null;
    }
}

function buildOperationalStateMarker(existing, descriptor = {}, now = Date.now()) {
    const adoptedAt = Number.isFinite(Number(descriptor?.adoptedAt))
        ? Number(descriptor.adoptedAt)
        : Number.isFinite(Number(existing?.adoptedAt))
            ? Number(existing.adoptedAt)
            : nowTimestamp(now);
    const marker = {
        schemaVersion: Number.isFinite(Number(descriptor?.schemaVersion))
            ? Number(descriptor.schemaVersion)
            : Number.isFinite(Number(existing?.schemaVersion))
                ? Number(existing.schemaVersion)
                : SCHEMA_VERSION,
        serviceVersion: String(descriptor?.serviceVersion || existing?.serviceVersion || SERVICE_VERSION),
        runtimeAdapter: String(descriptor?.runtimeAdapter || existing?.runtimeAdapter || ''),
        journalMode: String(descriptor?.journalMode || existing?.journalMode || JOURNAL_MODE),
        adoptedAt,
    };
    if (descriptor?.liveAuthority !== undefined) {
        marker.liveAuthority = cloneJson(descriptor.liveAuthority);
    } else if (existing?.liveAuthority !== undefined) {
        marker.liveAuthority = cloneJson(existing.liveAuthority);
    }
    if (descriptor?.promotionJournal !== undefined) {
        marker.promotionJournal = cloneJson(descriptor.promotionJournal);
    } else if (existing?.promotionJournal !== undefined) {
        marker.promotionJournal = cloneJson(existing.promotionJournal);
    }
    return marker;
}

export function writeOperationalStateMarkerDescriptor(paths, descriptor = {}, now = Date.now()) {
    ensureStorageRoot(paths.storageRoot);
    const existing = readOperationalStateMarker(paths);
    const marker = buildOperationalStateMarker(existing, descriptor, now);
    if (existing && stableStringify(existing) === stableStringify(marker)) {
        return marker;
    }
    atomicWriteFile(paths.statePath, JSON.stringify(marker, null, 2));
    return marker;
}

function writeOperationalStateMarker(paths, adapter, now = Date.now()) {
    return writeOperationalStateMarkerDescriptor(paths, {
        schemaVersion: SCHEMA_VERSION,
        serviceVersion: SERVICE_VERSION,
        runtimeAdapter: adapter.runtime,
        journalMode: JOURNAL_MODE,
    }, now);
}

function hasOperationalStateMarker(paths) {
    return fs.existsSync(paths.statePath);
}

export function resolveOperationalDbPath(paths, stateMarker = readOperationalStateMarker(paths)) {
    const relativePath = String(stateMarker?.liveAuthority?.dbRelativePath || '').trim();
    if (!relativePath) {
        return paths.dbPath;
    }
    const resolved = path.resolve(paths.storageRoot, relativePath);
    const storageRoot = path.resolve(paths.storageRoot);
    if (resolved !== storageRoot && !resolved.startsWith(storageRoot + path.sep)) {
        throw createError(500, 'Resolved live DB path escaped storage root', 'ARCH_LIVE_DB_PATH_INVALID');
    }
    return resolved;
}

function inspectStateMarker(paths) {
    if (!fs.existsSync(paths.statePath)) {
        return {
            exists: false,
            ok: true,
            marker: null,
            technicalCode: null,
        };
    }

    try {
        const marker = JSON.parse(fs.readFileSync(paths.statePath, 'utf8'));
        return {
            exists: true,
            ok: true,
            marker,
            technicalCode: null,
        };
    } catch {
        return {
            exists: true,
            ok: false,
            marker: null,
            technicalCode: 'ARCH_STATE_MARKER_INVALID',
        };
    }
}

function tableExists(adapter, tableName) {
    return Number(adapter.scalar(
        `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?`,
        [tableName],
    ) || 0) > 0;
}

function countRows(adapter, tableName) {
    if (!tableExists(adapter, tableName)) {
        return 0;
    }
    return Number(adapter.scalar(`SELECT COUNT(*) FROM ${tableName}`) || 0);
}

function inspectProjectionDb(dbPath) {
    if (!fs.existsSync(dbPath)) {
        return {
            exists: false,
            ok: true,
            manifest: null,
            domainActivity: {
                interpretiveGovernance: false,
                dnmPublication: false,
            },
            technicalCode: null,
        };
    }

    const adapter = createAdapter(dbPath);
    try {
        if (!adapter.verifyIntegrity()) {
            return {
                exists: true,
                ok: false,
                manifest: null,
                domainActivity: {
                    interpretiveGovernance: false,
                    dnmPublication: false,
                },
                technicalCode: 'ARCH_SQLITE_INTEGRITY_FAILED',
            };
        }
        if (!tableExists(adapter, 'manifest')) {
            return {
                exists: true,
                ok: false,
                manifest: null,
                domainActivity: {
                    interpretiveGovernance: false,
                    dnmPublication: false,
                },
                technicalCode: 'ARCH_MANIFEST_MISSING',
            };
        }

        const row = adapter.get('SELECT * FROM manifest WHERE id = 1');
        if (!row) {
            return {
                exists: true,
                ok: false,
                manifest: null,
                domainActivity: {
                    interpretiveGovernance: false,
                    dnmPublication: false,
                },
                technicalCode: 'ARCH_MANIFEST_MISSING',
            };
        }

        const manifest = {
            schemaVersion: Number(row.schema_version),
            serviceVersion: String(row.service_version),
            runtimeAdapter: String(row.runtime_adapter),
            journalMode: String(row.journal_mode),
            migrationState: String(row.migration_state),
            rebuildState: String(row.rebuild_state),
            createdAt: Number(row.created_at),
            updatedAt: Number(row.updated_at),
        };

        const domainActivity = {
            interpretiveGovernance: (
                countRows(adapter, 'interpretation_revisions')
                + countRows(adapter, 'interpretation_review_dispositions')
                + countRows(adapter, 'interpretation_subject_dispositions')
                + countRows(adapter, 'interpretation_delegation_policies')
                + countRows(adapter, 'interpretation_synthesis_runs')
            ) > 0,
            dnmPublication: (
                countRows(adapter, 'interpretation_publication_policies')
                + countRows(adapter, 'interpretation_publication_qualifications')
                + countRows(adapter, 'interpretation_publication_authorizations')
                + countRows(adapter, 'dnm_publication_records')
                + countRows(adapter, 'dnm_delta_reviews')
            ) > 0,
        };

        return {
            exists: true,
            ok: true,
            manifest,
            domainActivity,
            technicalCode: null,
        };
    } catch (error) {
        return {
            exists: true,
            ok: false,
            manifest: null,
            domainActivity: {
                interpretiveGovernance: false,
                dnmPublication: false,
            },
            technicalCode: String(error?.code || 'ARCH_SQLITE_OPEN_FAILED'),
        };
    } finally {
        adapter.close();
    }
}

export const replayableStatuses = new Set(['READY_TO_UPGRADE', 'PROJECTION_STALE']);

function summarizePreflight(status, summary, technicalCodes, nextAction, extra = {}) {
    return {
        ok: true,
        status,
        canMutate: status === 'READY_TO_UPGRADE',
        canReplay: replayableStatuses.has(status),
        summary,
        nextAction,
        technicalCodes: [...new Set(technicalCodes.filter(Boolean))],
        ...extra,
    };
}

export function getUpgradeReplayPreflight(paths) {
    const state = inspectStateMarker(paths);
    const storageRootExists = fs.existsSync(paths.storageRoot);
    const ledgers = {
        interpretiveGovernance: {
            exists: fs.existsSync(paths.interpretiveGovernanceLedgerPath),
            path: paths.interpretiveGovernanceLedgerPath,
        },
        dnmPublication: {
            exists: fs.existsSync(paths.dnmPublicationLedgerPath),
            path: paths.dnmPublicationLedgerPath,
        },
        promotionJournal: {
            exists: fs.existsSync(paths.promotionJournalPath),
            path: paths.promotionJournalPath,
        },
    };

    const operationalDbPath = (() => {
        if (!state.ok) {
            return paths.dbPath;
        }
        try {
            return resolveOperationalDbPath(paths, state.marker);
        } catch {
            return null;
        }
    })();
    const db = operationalDbPath ? inspectProjectionDb(operationalDbPath) : {
        exists: false,
        ok: false,
        manifest: null,
        domainActivity: {
            interpretiveGovernance: false,
            dnmPublication: false,
        },
        technicalCode: 'ARCH_LIVE_DB_PATH_INVALID',
    };
    const snapshot = inspectProjectionDb(paths.snapshotPath);

    const artifactsPresent = storageRootExists || state.exists || db.exists || snapshot.exists
        || ledgers.interpretiveGovernance.exists || ledgers.dnmPublication.exists || ledgers.promotionJournal.exists;

    const stateSchemaVersion = Number(state.marker?.schemaVersion);
    const dbSchemaVersion = Number(db.manifest?.schemaVersion);
    const snapshotSchemaVersion = Number(snapshot.manifest?.schemaVersion);
    const supportedVersion = SCHEMA_VERSION;

    const sharedDetails = {
        storage: {
            storageRootExists,
            operationalDbPath: operationalDbPath || paths.dbPath,
            snapshotPath: paths.snapshotPath,
        },
        stateMarker: {
            exists: state.exists,
            ok: state.ok,
            schemaVersion: Number.isFinite(stateSchemaVersion) ? stateSchemaVersion : null,
            liveAuthority: cloneJson(state.marker?.liveAuthority || null),
            technicalCode: state.technicalCode,
        },
        ledgers,
        projections: {
            operationalDb: db,
            snapshot,
        },
    };
    const authoritativeLedgersPresent = ledgers.interpretiveGovernance.exists
        || ledgers.dnmPublication.exists
        || ledgers.promotionJournal.exists;

    if (!state.ok) {
        return summarizePreflight(
            'BLOCKED_FROM_UPGRADE',
            'The runtime state marker is unreadable and must be repaired before upgrade or replay.',
            [state.technicalCode],
            'Repair or remove the invalid state marker, then rerun preflight.',
            sharedDetails,
        );
    }

    if (!operationalDbPath) {
        return summarizePreflight(
            'REFERENCE_GAP',
            'The runtime state marker points outside the governed storage root.',
            ['ARCH_LIVE_DB_PATH_INVALID'],
            'Repair the live-authority database pointer before upgrade or replay.',
            sharedDetails,
        );
    }

    const unsupportedCode = [stateSchemaVersion, dbSchemaVersion, snapshotSchemaVersion]
        .find((value) => Number.isFinite(value) && value > supportedVersion);
    if (unsupportedCode !== undefined) {
        return summarizePreflight(
            'UNSUPPORTED_VERSION',
            'Stored governed-memory data is newer than this runtime can safely interpret.',
            ['ARCH_SCHEMA_VERSION_UNSUPPORTED'],
            'Resume with a runtime that supports the stored schema version or restore a compatible snapshot.',
            sharedDetails,
        );
    }

    const schemaVersions = [stateSchemaVersion, dbSchemaVersion, snapshotSchemaVersion].filter((value) => Number.isFinite(value));
    if (schemaVersions.length > 1 && new Set(schemaVersions).size > 1) {
        return summarizePreflight(
            'SCHEMA_MISMATCH',
            'Stored governed-memory artifacts disagree about schema version and cannot be upgraded safely yet.',
            ['ARCH_SCHEMA_MISMATCH'],
            'Repair the mismatched projection or snapshot before upgrade or replay.',
            sharedDetails,
        );
    }

    if (state.marker?.liveAuthority?.dbRelativePath && !db.exists) {
        return summarizePreflight(
            'REFERENCE_GAP',
            'The runtime state marker points to a missing live-authority database.',
            ['ARCH_LIVE_AUTHORITY_DB_MISSING'],
            'Repair the missing live-authority projection or reset the state marker before upgrade or replay.',
            sharedDetails,
        );
    }

    if (!db.exists && authoritativeLedgersPresent) {
        return summarizePreflight(
            'PROJECTION_STALE',
            snapshot.exists && snapshot.ok
                ? 'The live operational projection is missing, but a verified snapshot is available for rebuild or restore.'
                : 'The live operational projection is missing, but authoritative governed-memory ledgers are available for deterministic replay.',
            ['ARCH_PROJECTION_STALE'],
            'Restore or rebuild the operational projection before upgrade or replay.',
            sharedDetails,
        );
    }

    if (!db.ok) {
        const isRecoverableProjectionGap = !db.exists && snapshot.exists && snapshot.ok;
        if (isRecoverableProjectionGap) {
            return summarizePreflight(
                'PROJECTION_STALE',
                'The live operational projection is missing, but a verified snapshot is available for rebuild or restore.',
                ['ARCH_PROJECTION_STALE'],
                'Restore or rebuild the operational projection before upgrade or replay.',
                sharedDetails,
            );
        }
        return summarizePreflight(
            'BLOCKED_FROM_UPGRADE',
            'The operational projection is unreadable or corrupt and cannot be upgraded safely.',
            [db.technicalCode],
            'Repair or rebuild the operational projection before upgrade or replay.',
            sharedDetails,
        );
    }

    if (db.manifest && (db.manifest.migrationState !== 'ready' || db.manifest.rebuildState !== 'idle')) {
        return summarizePreflight(
            'PROJECTION_STALE',
            'The operational projection is mid-migration or mid-rebuild and should not be upgraded yet.',
            ['ARCH_PROJECTION_STALE'],
            'Finish or discard the stale projection work before upgrade or replay.',
            sharedDetails,
        );
    }

    const missingLedgers = [];
    if (db.domainActivity.interpretiveGovernance && !ledgers.interpretiveGovernance.exists) {
        missingLedgers.push('interpretive-governance-ledger.jsonl');
    }
    if (db.domainActivity.dnmPublication && !ledgers.dnmPublication.exists) {
        missingLedgers.push('dnm-publication-ledger.jsonl');
    }
    if (state.marker?.promotionJournal && !ledgers.promotionJournal.exists) {
        missingLedgers.push('promotions/promotion-journal.jsonl');
    }
    if (missingLedgers.length > 0) {
        return summarizePreflight(
            'LEDGER_MISSING',
            `Authoritative governed-memory ledgers are missing: ${missingLedgers.join(', ')}.`,
            ['ARCH_LEDGER_MISSING'],
            'Restore the missing ledger files before upgrade or replay.',
            {
                ...sharedDetails,
                missingLedgers,
            },
        );
    }

    if (artifactsPresent && db.exists && !snapshot.exists) {
        return summarizePreflight(
            'BACKUP_REQUIRED',
            'A managed snapshot is required before upgrade because a live governed-memory projection already exists.',
            ['ARCH_BACKUP_REQUIRED'],
            'Create or refresh the managed snapshot before upgrade or replay.',
            sharedDetails,
        );
    }

    return summarizePreflight(
        'READY_TO_UPGRADE',
        artifactsPresent
            ? 'Governed-memory storage passed upgrade and replay preflight.'
            : 'No governed-memory artifacts were found. The host is ready for a fresh governed-memory install.',
        [],
        artifactsPresent
            ? 'Proceed with upgrade or replay.'
            : 'Proceed with fresh initialization or first-run bootstrap.',
        sharedDetails,
    );
}

export function createAdapter(dbPath) {
    if (typeof process?.versions?.bun === 'string') {
        if (typeof createBunSqliteAdapter !== 'function') {
            throw createError(500, 'Bun SQLite adapter is unavailable', 'ARCH_SQLITE_ADAPTER_UNAVAILABLE');
        }
        return createBunSqliteAdapter(dbPath);
    }
    if (typeof createNodeSqliteAdapter !== 'function') {
        throw createError(500, 'Node SQLite adapter is unavailable', 'ARCH_SQLITE_ADAPTER_UNAVAILABLE');
    }
    return createNodeSqliteAdapter(dbPath);
}

export function initializeDatabase(adapter, now = Date.now()) {
    for (const statement of schemaStatements()) {
        adapter.exec(statement);
    }

    ensureColumnExists(
        adapter,
        'interpretation_revisions',
        'evidence_finding_state',
        `ALTER TABLE interpretation_revisions
         ADD COLUMN evidence_finding_state TEXT NOT NULL DEFAULT 'UNAVAILABLE'`,
    );
    ensureColumnExists(
        adapter,
        'interpretation_evidence_previews',
        'source_artifact_class',
        `ALTER TABLE interpretation_evidence_previews
         ADD COLUMN source_artifact_class TEXT`,
    );
    ensureColumnExists(
        adapter,
        'interpretation_evidence_previews',
        'source_revision_identity_json',
        `ALTER TABLE interpretation_evidence_previews
         ADD COLUMN source_revision_identity_json TEXT`,
    );

    adapter.exec(`PRAGMA journal_mode=${JOURNAL_MODE}`);
    const manifest = adapter.get('SELECT * FROM manifest WHERE id = 1');
    if (!manifest) {
        const timestamp = nowTimestamp(now);
        adapter.run(
            `INSERT INTO manifest (
                id, schema_version, service_version, runtime_adapter, journal_mode,
                migration_state, rebuild_state, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                1,
                SCHEMA_VERSION,
                SERVICE_VERSION,
                adapter.runtime,
                JOURNAL_MODE,
                'ready',
                'idle',
                timestamp,
                timestamp,
            ],
        );
    } else if (Number(manifest.schema_version) !== SCHEMA_VERSION) {
        throw createError(500, `Unsupported schema version ${manifest.schema_version}`, 'ARCH_SCHEMA_VERSION_UNSUPPORTED');
    }
}

function ensureColumnExists(adapter, tableName, columnName, alterStatement) {
    const columns = adapter.all(`PRAGMA table_info(${tableName})`);
    const hasColumn = columns.some((entry) => String(entry.name || '').trim() === columnName);
    if (!hasColumn) {
        adapter.exec(alterStatement);
    }
}

export function loadManifest(adapter) {
    const manifest = adapter.get('SELECT * FROM manifest WHERE id = 1');
    if (!manifest) {
        throw createError(500, 'Manifest is missing after initialization', 'ARCH_MANIFEST_MISSING');
    }
    return {
        schemaVersion: Number(manifest.schema_version),
        serviceVersion: String(manifest.service_version),
        runtimeAdapter: String(manifest.runtime_adapter),
        journalMode: String(manifest.journal_mode),
        migrationState: String(manifest.migration_state),
        rebuildState: String(manifest.rebuild_state),
        createdAt: Number(manifest.created_at),
        updatedAt: Number(manifest.updated_at),
    };
}

function openSnapshotForVerification(snapshotPath) {
    if (!fs.existsSync(snapshotPath)) {
        return { ok: false, reason: 'missing' };
    }

    const adapter = createAdapter(snapshotPath);
    try {
        initializeDatabase(adapter);
        if (!adapter.verifyIntegrity()) {
            return { ok: false, reason: 'integrity-failed' };
        }
        return {
            ok: true,
            manifest: loadManifest(adapter),
        };
    } catch (error) {
        return { ok: false, reason: String(error?.code || 'open-failed').toLowerCase() };
    } finally {
        adapter.close();
    }
}

function restoreFromSnapshot(paths, targetDbPath = resolveOperationalDbPath(paths)) {
    const verification = openSnapshotForVerification(paths.snapshotPath);
    if (!verification.ok) {
        if (fs.existsSync(paths.snapshotPath)) {
            fs.renameSync(paths.snapshotPath, quarantinePath(paths.snapshotPath, verification.reason));
        }
        throw createError(503, 'Operational database requires rebuild; no verified snapshot is available.', 'ARCH_REBUILD_REQUIRED');
    }

    fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
    if (fs.existsSync(targetDbPath)) {
        fs.renameSync(targetDbPath, quarantinePath(targetDbPath, 'corrupt'));
    }
    if (fs.existsSync(`${targetDbPath}-wal`)) {
        fs.renameSync(`${targetDbPath}-wal`, quarantinePath(`${targetDbPath}-wal`, 'wal'));
    }
    if (fs.existsSync(`${targetDbPath}-shm`)) {
        fs.renameSync(`${targetDbPath}-shm`, quarantinePath(`${targetDbPath}-shm`, 'shm'));
    }
    fs.copyFileSync(paths.snapshotPath, targetDbPath);
}

export function openOperationalDatabase(paths, options = {}) {
    ensureStorageRoot(paths.storageRoot);
    const activeDbPath = resolveOperationalDbPath(paths);
    fs.mkdirSync(path.dirname(activeDbPath), { recursive: true });

    if (!fs.existsSync(activeDbPath)) {
        if (fs.existsSync(paths.snapshotPath)) {
            restoreFromSnapshot(paths, activeDbPath);
        } else if (hasOperationalStateMarker(paths)) {
            throw createError(503, 'Operational database requires rebuild; both primary and snapshot copies are unavailable.', 'ARCH_REBUILD_REQUIRED');
        }
    }

    let adapter = createAdapter(activeDbPath);
    try {
        initializeDatabase(adapter, options.now);
        writeOperationalStateMarker(paths, adapter, options.now);
        if (!adapter.verifyIntegrity()) {
            adapter.close();
            restoreFromSnapshot(paths, activeDbPath);
            adapter = createAdapter(activeDbPath);
            initializeDatabase(adapter, options.now);
            writeOperationalStateMarker(paths, adapter, options.now);
            if (!adapter.verifyIntegrity()) {
                throw createError(503, 'Operational database requires rebuild after failed snapshot restore.', 'ARCH_REBUILD_REQUIRED');
            }
        }
        return adapter;
    } catch (error) {
        try {
            adapter.close();
        } catch {
            // ignore close failures during error unwind
        }
        const hasDbFile = fs.existsSync(activeDbPath);
        const canAttemptRestore = hasDbFile && String(error?.code || '').includes('SQLITE');
        if (canAttemptRestore) {
            restoreFromSnapshot(paths, activeDbPath);
            const restored = createAdapter(activeDbPath);
            try {
                initializeDatabase(restored, options.now);
                writeOperationalStateMarker(paths, restored, options.now);
                if (!restored.verifyIntegrity()) {
                    throw createError(503, 'Operational database requires rebuild after failed snapshot restore.', 'ARCH_REBUILD_REQUIRED');
                }
                return restored;
            } catch (restoreError) {
                try {
                    restored.close();
                } catch {
                    // ignore close failures during restore unwind
                }
                throw restoreError;
            }
        }
        throw error;
    }
}

export function snapshotOperationalDatabase(adapter, paths) {
    adapter.createManagedSnapshot(paths.snapshotPath);
    writeOperationalStateMarker(paths, adapter);
    const verification = openSnapshotForVerification(paths.snapshotPath);
    if (!verification.ok) {
        if (fs.existsSync(paths.snapshotPath)) {
            fs.renameSync(paths.snapshotPath, quarantinePath(paths.snapshotPath, verification.reason));
        }
        throw createError(500, 'Managed snapshot verification failed', 'ARCH_SNAPSHOT_VERIFICATION_FAILED');
    }
    return verification.manifest;
}

export function readCurrentDecision(adapter, memoryScopeId, decisionId) {
    const pointer = adapter.get(
        'SELECT * FROM current_decisions WHERE memory_scope_id = ? AND decision_id = ?',
        [memoryScopeId, decisionId],
    );
    if (!pointer) {
        return null;
    }
    const record = adapter.get(
        'SELECT * FROM decision_records WHERE memory_scope_id = ? AND decision_id = ? AND record_version = ?',
        [memoryScopeId, decisionId, Number(pointer.current_record_version)],
    );
    const stub = adapter.get(
        'SELECT * FROM decision_stubs WHERE memory_scope_id = ? AND decision_id = ?',
        [memoryScopeId, decisionId],
    );
    return {
        pointer: pointer && {
            memoryScopeId: pointer.memory_scope_id,
            decisionId: pointer.decision_id,
            currentRecordVersion: Number(pointer.current_record_version),
            canonicalHash: pointer.canonical_hash,
            canonicalHashVersion: Number(pointer.canonical_hash_version),
            hashAlgorithm: pointer.hash_algorithm,
            authorityLocation: pointer.authority_location,
            archivePointer: parseNullableJson(pointer.archive_pointer_json),
            stubPointer: parseNullableJson(pointer.stub_pointer_json),
            updatedAt: Number(pointer.updated_at),
        },
        record: record && hydrateDecisionRecord(record),
        stub: stub ? JSON.parse(stub.payload_json) : null,
    };
}

export function hydrateDecisionRecord(row) {
    return {
        memoryScopeId: row.memory_scope_id,
        decisionId: row.decision_id,
        recordVersion: Number(row.record_version),
        canonicalHash: row.canonical_hash,
        canonicalHashVersion: Number(row.canonical_hash_version),
        hashAlgorithm: row.hash_algorithm,
        semanticPayload: row.semantic_payload,
        fields: JSON.parse(row.fields_json),
        status: row.status,
        priorVersion: row.prior_version === null ? null : Number(row.prior_version),
        sourceChatInstanceId: row.source_chat_instance_id,
        lastUpdatingChatInstanceId: row.last_updating_chat_instance_id,
        provenance: JSON.parse(row.provenance_json),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
    };
}

export function parseNullableJson(value) {
    if (!value) return null;
    return JSON.parse(value);
}

export function buildHealthResponse(adapter, manifest) {
    return {
        ok: true,
        pluginId: PLUGIN_ID,
        serviceVersion: SERVICE_VERSION,
        runtime: adapter.runtime,
        db: {
            healthy: true,
            schemaVersion: manifest.schemaVersion,
            migrationState: manifest.migrationState,
            rebuildState: manifest.rebuildState,
            journalMode: manifest.journalMode,
        },
    };
}

export function validateArray(value, fieldName) {
    if (!Array.isArray(value)) {
        throw createError(400, `${fieldName} must be an array`, 'ARCH_INVALID_PAYLOAD');
    }
    return value;
}

function sanitizeChatFileStem(value) {
    const normalized = String(value || '').trim().replace(/\.jsonl$/i, '').replace(/\.json$/i, '').trim();
    if (!normalized) {
        throw createError(400, 'chatLocator is required', 'ARCH_INVALID_CHAT_LOCATOR');
    }
    if (normalized.includes('/') || normalized.includes('\\')) {
        throw createError(400, 'chatLocator must not contain path separators', 'ARCH_INVALID_CHAT_LOCATOR');
    }
    if (path.basename(normalized) !== normalized) {
        throw createError(400, 'chatLocator is invalid', 'ARCH_INVALID_CHAT_LOCATOR');
    }
    return normalized;
}

function sanitizeAvatarUrl(value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw createError(400, 'avatarUrl is required for character chats', 'ARCH_INVALID_CHAT_LOCATOR');
    }
    if (normalized.includes('/') || normalized.includes('\\')) {
        throw createError(400, 'avatarUrl must not contain path separators', 'ARCH_INVALID_CHAT_LOCATOR');
    }
    const basename = path.basename(normalized);
    if (basename !== normalized) {
        throw createError(400, 'avatarUrl is invalid', 'ARCH_INVALID_CHAT_LOCATOR');
    }
    return basename.replace(/\.png$/i, '');
}

export function resolveChatJsonlPath(request, locator = {}) {
    const isGroup = locator?.isGroup === true;
    const chatFileStem = sanitizeChatFileStem(locator?.chatLocator);
    const chatFileName = `${chatFileStem}.jsonl`;

    if (isGroup) {
        const groupId = sanitizeChatFileStem(locator?.groupId);
        const filePath = path.join(request.user.directories.groupChats, `${groupId}.jsonl`);
        return {
            kind: 'group',
            locator: {
                isGroup: true,
                groupId,
                chatLocator: chatFileStem,
            },
            chatFilePath: filePath,
        };
    }

    const avatarDir = sanitizeAvatarUrl(locator?.avatarUrl);
    const chatDirectory = path.join(request.user.directories.chats, avatarDir);
    const filePath = path.join(chatDirectory, chatFileName);
    if (!path.resolve(filePath).startsWith(path.resolve(request.user.directories.chats))) {
        throw createError(400, 'Resolved chat path escaped chats root', 'ARCH_INVALID_CHAT_LOCATOR');
    }

    return {
        kind: 'character',
        locator: {
            isGroup: false,
            avatarUrl: locator?.avatarUrl,
            chatLocator: chatFileStem,
        },
        chatFilePath: filePath,
    };
}

export function parseJsonlRecords(jsonlText) {
    const records = [];
    const invalidLines = [];
    const lines = String(jsonlText || '').split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].trim();
        if (!line) continue;
        try {
            const record = JSON.parse(line);
            attachLegacyMetadataAliases(record);
            records.push(record);
        } catch (error) {
            invalidLines.push({
                lineNumber: index + 1,
                error: String(error?.message || 'Invalid JSON'),
            });
        }
    }
    return { records, invalidLines };
}

function attachLegacyNamespaceAlias(owner) {
    if (!owner || typeof owner !== 'object' || Array.isArray(owner)) return;
    if (owner.shardwright !== undefined || !owner.summary_sharder || typeof owner.summary_sharder !== 'object') return;
    Object.defineProperty(owner, 'shardwright', {
        value: owner.summary_sharder,
        configurable: true,
        enumerable: false,
        writable: false,
    });
}

function attachLegacyMetadataAliases(record) {
    attachLegacyNamespaceAlias(record?.chat_metadata);
    attachLegacyNamespaceAlias(record?.extra);
}

export function summarizePersistedChatMetadata(records = [], invalidLines = []) {
    const summary = {
        schema: cloneJson(MESSAGE_IDENTITY_SCAN_SCHEMA),
        headerPresent: false,
        recordCount: Array.isArray(records) ? records.length : 0,
        invalidLineCount: Array.isArray(invalidLines) ? invalidLines.length : 0,
        invalidLines: Array.isArray(invalidLines) ? invalidLines : [],
        messageCount: 0,
        promptHiddenCount: 0,
        swipeCarrierCount: 0,
        identity: {
            presentCount: 0,
            missingCount: 0,
            malformedCount: 0,
            duplicateIds: [],
        },
        archive: {
            archivedCount: 0,
            promptVisibilityBeforeArchiveCount: 0,
        },
        evidencePolicy: {
            includeCount: 0,
            excludeCount: 0,
            unexpectedValues: [],
        },
        speakerIdentityCount: 0,
        chatIdentityStatus: null,
    };

    const duplicateIds = new Set();
    const seenIds = new Set();
    const unexpectedValues = new Set();

    const header = Array.isArray(records) ? records[0] : null;
    if (header?.chat_metadata && typeof header.chat_metadata === 'object') {
        summary.headerPresent = true;
        const chatIdentityStatus = header.chat_metadata?.shardwright?.messageIdentity;
        if (chatIdentityStatus && typeof chatIdentityStatus === 'object') {
            summary.chatIdentityStatus = cloneJson(chatIdentityStatus);
        }
    }

    const messages = Array.isArray(records) ? records.slice(summary.headerPresent ? 1 : 0) : [];
    summary.messageCount = messages.length;

    for (const message of messages) {
        if (message?.is_system === true) {
            summary.promptHiddenCount += 1;
        }
        if (Array.isArray(message?.swipes) || message?.swipe_id !== undefined || message?.swipe_info !== undefined) {
            summary.swipeCarrierCount += 1;
        }

        const ss = message?.extra?.shardwright && typeof message.extra.shardwright === 'object'
            ? message.extra.shardwright
            : null;

        const identity = ss?.messageIdentity;
        if (identity && typeof identity === 'object') {
            const messageId = String(identity.messageId || '').trim();
            const initFingerprint = String(identity.initFingerprint || '').trim();
            const revisionHash = String(identity.revisionHash || '').trim();
            if (messageId && initFingerprint && revisionHash) {
                summary.identity.presentCount += 1;
                if (seenIds.has(messageId)) {
                    duplicateIds.add(messageId);
                } else {
                    seenIds.add(messageId);
                }
            } else {
                summary.identity.malformedCount += 1;
            }
        } else {
            summary.identity.missingCount += 1;
        }

        const archive = ss?.archive;
        if (archive?.isArchived === true) {
            summary.archive.archivedCount += 1;
            if (archive.promptVisibilityBeforeArchive !== undefined && archive.promptVisibilityBeforeArchive !== null) {
                summary.archive.promptVisibilityBeforeArchiveCount += 1;
            }
        }

        const evidencePolicy = ss?.evidencePolicy;
        if (evidencePolicy === 'exclude') {
            summary.evidencePolicy.excludeCount += 1;
        } else {
            summary.evidencePolicy.includeCount += 1;
            if (evidencePolicy !== undefined && evidencePolicy !== null && evidencePolicy !== 'include') {
                unexpectedValues.add(String(evidencePolicy));
            }
        }

        if (ss?.speakerIdentity && typeof ss.speakerIdentity === 'object') {
            summary.speakerIdentityCount += 1;
        }
    }

    summary.identity.duplicateIds = [...duplicateIds].sort();
    summary.evidencePolicy.unexpectedValues = [...unexpectedValues].sort();
    return summary;
}

export function scanPersistedChatMetadata(request, locator = {}) {
    const resolution = resolveChatJsonlPath(request, locator);
    if (!fs.existsSync(resolution.chatFilePath)) {
        throw createError(404, `Chat file was not found for ${resolution.locator.chatLocator}`, 'ARCH_CHAT_FILE_NOT_FOUND');
    }
    const raw = fs.readFileSync(resolution.chatFilePath, 'utf8');
    const { records, invalidLines } = parseJsonlRecords(raw);
    return {
        locator: resolution.locator,
        file: {
            kind: resolution.kind,
            exists: true,
            fileName: path.basename(resolution.chatFilePath),
        },
        summary: summarizePersistedChatMetadata(records, invalidLines),
    };
}

export function handleError(response, error) {
    const status = Number(error?.status) || 500;
    const extra = Object.fromEntries(
        Object.entries(error || {}).filter(([key]) => !['status', 'code', 'message', 'stack', 'cause'].includes(key)),
    );
    console.error(`[${PLUGIN_ID}]`, error);
    return response.status(status).send({
        ok: false,
        code: String(error?.code || 'ARCH_INTERNAL_ERROR'),
        error: String(error?.message || 'Internal error'),
        ...extra,
    });
}
