import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    createAdapter,
    getUpgradeReplayPreflight,
    JOURNAL_MODE,
    MESSAGE_IDENTITY_SCAN_SCHEMA,
    readOperationalStateMarker,
    resolveOperationalDbPath,
    SCHEMA_VERSION,
    SERVICE_VERSION,
    getStoragePaths,
    loadManifest,
    openOperationalDatabase,
    resolveChatJsonlPath,
    scanPersistedChatMetadata,
    snapshotOperationalDatabase,
    summarizePersistedChatMetadata,
    writeOperationalStateMarkerDescriptor,
} from './core.js';

function makeTempRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-memory-'));
}

test('operational database initializes manifest and journal mode', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);

    try {
        const manifest = loadManifest(adapter);
        assert.equal(manifest.schemaVersion, SCHEMA_VERSION);
        assert.equal(manifest.serviceVersion, SERVICE_VERSION);
        assert.equal(manifest.journalMode, JOURNAL_MODE);
        assert.equal(adapter.getJournalMode(), JOURNAL_MODE);
        assert.equal(fs.existsSync(paths.statePath), true);
    } finally {
        adapter.close();
    }
});

test('managed snapshot is created and verified', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);

    try {
        const manifest = snapshotOperationalDatabase(adapter, paths);
        assert.equal(manifest.schemaVersion, SCHEMA_VERSION);
        assert.equal(fs.existsSync(paths.snapshotPath), true);
    } finally {
        adapter.close();
    }
});

test('reopening operational database does not rewrite an unchanged state marker', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);

    {
        const adapter = openOperationalDatabase(paths, { now: 1234567890 });
        adapter.close();
    }

    const before = fs.readFileSync(paths.statePath, 'utf8');

    {
        const adapter = openOperationalDatabase(paths, { now: 2234567890 });
        adapter.close();
    }

    const after = fs.readFileSync(paths.statePath, 'utf8');
    assert.equal(after, before);
});

test('state marker can point live authority to a generation-local DB path', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    writeOperationalStateMarkerDescriptor(paths, {
        liveAuthority: {
            generationId: 'livegen_test',
            dbRelativePath: 'generations/architectural-memory.live.livegen_test.db',
        },
    });

    const marker = readOperationalStateMarker(paths);
    assert.equal(marker.liveAuthority.generationId, 'livegen_test');
    assert.equal(
        resolveOperationalDbPath(paths, marker),
        path.join(paths.storageRoot, 'generations', 'architectural-memory.live.livegen_test.db'),
    );
});

test('corrupt operational database restores from verified snapshot', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);

    {
        const adapter = openOperationalDatabase(paths);
        try {
            snapshotOperationalDatabase(adapter, paths);
        } finally {
            adapter.close();
        }
    }

    fs.writeFileSync(paths.dbPath, Buffer.from('corrupt-db'));

    const restored = openOperationalDatabase(paths);
    try {
        const manifest = loadManifest(restored);
        assert.equal(manifest.schemaVersion, SCHEMA_VERSION);
        const quarantineFiles = fs.readdirSync(paths.storageRoot).filter((name) => name.includes('.quarantine.'));
        assert.equal(quarantineFiles.length > 0, true);
    } finally {
        restored.close();
    }
});

test('missing valid snapshot after corruption reaches rebuild boundary', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);

    {
        const adapter = openOperationalDatabase(paths);
        try {
            snapshotOperationalDatabase(adapter, paths);
        } finally {
            adapter.close();
        }
    }

    fs.writeFileSync(paths.dbPath, Buffer.from('corrupt-db'));
    fs.writeFileSync(paths.snapshotPath, Buffer.from('corrupt-snapshot'));

    assert.throws(
        () => openOperationalDatabase(paths),
        /requires rebuild/i,
    );
});

test('missing operational database restores from verified snapshot', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);

    {
        const adapter = openOperationalDatabase(paths);
        try {
            snapshotOperationalDatabase(adapter, paths);
        } finally {
            adapter.close();
        }
    }

    fs.rmSync(paths.dbPath, { force: true });

    const restored = openOperationalDatabase(paths);
    try {
        const manifest = loadManifest(restored);
        assert.equal(manifest.schemaVersion, SCHEMA_VERSION);
    } finally {
        restored.close();
    }
});

test('missing operational database and snapshot fail closed after adoption', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);

    {
        const adapter = openOperationalDatabase(paths);
        try {
            snapshotOperationalDatabase(adapter, paths);
        } finally {
            adapter.close();
        }
    }

    fs.rmSync(paths.dbPath, { force: true });
    fs.rmSync(paths.snapshotPath, { force: true });

    assert.throws(
        () => openOperationalDatabase(paths),
        /requires rebuild/i,
    );
});

test('upgrade preflight reports ready for a fresh host', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);

    const preflight = getUpgradeReplayPreflight(paths);
    assert.equal(preflight.status, 'READY_TO_UPGRADE');
    assert.equal(preflight.canMutate, true);
    assert.match(preflight.summary, /fresh governed-memory install/i);
});

test('upgrade preflight requires backup when a live projection exists without a managed snapshot', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);
    adapter.close();

    const preflight = getUpgradeReplayPreflight(paths);
    assert.equal(preflight.status, 'BACKUP_REQUIRED');
    assert.equal(preflight.canMutate, false);
    assert.deepEqual(preflight.technicalCodes, ['ARCH_BACKUP_REQUIRED']);
});

test('upgrade preflight reports unsupported version when the operational manifest is newer than runtime', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    const adapter = openOperationalDatabase(paths);
    adapter.close();

    const direct = createAdapter(paths.dbPath);
    try {
        direct.run('UPDATE manifest SET schema_version = ? WHERE id = 1', [SCHEMA_VERSION + 1]);
    } finally {
        direct.close();
    }

    const preflight = getUpgradeReplayPreflight(paths);
    assert.equal(preflight.status, 'UNSUPPORTED_VERSION');
    assert.deepEqual(preflight.technicalCodes, ['ARCH_SCHEMA_VERSION_UNSUPPORTED']);
});

test('upgrade preflight reports a reference gap when the live authority DB pointer is missing', () => {
    const root = makeTempRoot();
    const paths = getStoragePaths(root);
    writeOperationalStateMarkerDescriptor(paths, {
        liveAuthority: {
            generationId: 'livegen_missing',
            dbRelativePath: 'generations/architectural-memory.live.livegen_missing.db',
        },
    });

    const preflight = getUpgradeReplayPreflight(paths);
    assert.equal(preflight.status, 'REFERENCE_GAP');
    assert.deepEqual(preflight.technicalCodes, ['ARCH_LIVE_AUTHORITY_DB_MISSING']);
});

test('persisted chat metadata scan summarizes namespaced message state without mutation', () => {
    const root = makeTempRoot();
    const chatsRoot = path.join(root, 'chats');
    const charDir = path.join(chatsRoot, 'Jeep');
    fs.mkdirSync(charDir, { recursive: true });

    const chatFilePath = path.join(charDir, 'Session A.jsonl');
    const lines = [
        JSON.stringify({
            chat_metadata: {
                summary_sharder: {
                    messageIdentity: {
                        schemaVersion: 1,
                        status: 'IDENTITY_PARTIAL',
                    },
                },
            },
            user_name: 'unused',
            character_name: 'unused',
        }),
        JSON.stringify({
            is_user: true,
            is_system: false,
            mes: 'hello',
            extra: {
                summary_sharder: {
                    messageIdentity: {
                        schemaVersion: 1,
                        messageId: 'msg_alpha',
                        initFingerprint: 'sha256:init-a',
                        revisionHash: 'sha256:rev-a',
                    },
                    evidencePolicy: 'include',
                    speakerIdentity: {
                        speakerEntityId: 'user',
                    },
                },
            },
        }),
        JSON.stringify({
            is_user: false,
            is_system: true,
            mes: 'hidden',
            swipes: ['a', 'b'],
            extra: {
                summary_sharder: {
                    messageIdentity: {
                        schemaVersion: 1,
                        messageId: 'msg_beta',
                        initFingerprint: 'sha256:init-b',
                        revisionHash: 'sha256:rev-b',
                    },
                    archive: {
                        isArchived: true,
                        archivedAt: '2026-06-23T00:00:00.000Z',
                        promptVisibilityBeforeArchive: 'hidden',
                    },
                    evidencePolicy: 'exclude',
                },
            },
        }),
    ];
    fs.writeFileSync(chatFilePath, `${lines.join('\n')}\n`, 'utf8');

    const request = {
        user: {
            directories: {
                chats: chatsRoot,
                groupChats: path.join(root, 'group chats'),
            },
        },
    };

    const result = scanPersistedChatMetadata(request, {
        avatarUrl: 'Jeep.png',
        chatLocator: 'Session A',
    });

    assert.equal(result.file.fileName, 'Session A.jsonl');
    assert.equal(result.summary.schema.messageIdentityPath, MESSAGE_IDENTITY_SCAN_SCHEMA.messageIdentityPath);
    assert.equal(result.summary.headerPresent, true);
    assert.equal(result.summary.messageCount, 2);
    assert.equal(result.summary.promptHiddenCount, 1);
    assert.equal(result.summary.identity.presentCount, 2);
    assert.equal(result.summary.archive.archivedCount, 1);
    assert.equal(result.summary.evidencePolicy.excludeCount, 1);
    assert.equal(result.summary.speakerIdentityCount, 1);
    assert.equal(result.summary.chatIdentityStatus.status, 'IDENTITY_PARTIAL');
});

test('chat path resolver supports group and character chats without arbitrary paths', () => {
    const request = {
        user: {
            directories: {
                chats: 'C:\\data\\chats',
                groupChats: 'C:\\data\\group chats',
            },
        },
    };

    const direct = resolveChatJsonlPath(request, {
        avatarUrl: 'Jeep.png',
        chatLocator: 'Session A',
    });
    const group = resolveChatJsonlPath(request, {
        isGroup: true,
        groupId: '2026-05-16@19h17m39s788ms',
        chatLocator: '2026-05-16@19h17m39s788ms',
    });

    assert.match(direct.chatFilePath, /Jeep[\\/]Session A\.jsonl$/);
    assert.match(group.chatFilePath, /group chats[\\/]2026-05-16@19h17m39s788ms\.jsonl$/);
    assert.throws(
        () => resolveChatJsonlPath(request, { avatarUrl: '..\\bad.png', chatLocator: 'x' }),
        /(invalid|path separators)/i,
    );
});

test('persisted chat metadata summary tracks duplicate ids and unexpected evidence values', () => {
    const summary = summarizePersistedChatMetadata([
        { chat_metadata: {} },
        {
            is_system: false,
            extra: {
                summary_sharder: {
                    messageIdentity: {
                        messageId: 'msg_dup',
                        initFingerprint: 'sha256:a',
                        revisionHash: 'sha256:b',
                    },
                    evidencePolicy: 'surprising',
                },
            },
        },
        {
            is_system: false,
            extra: {
                summary_sharder: {
                    messageIdentity: {
                        messageId: 'msg_dup',
                        initFingerprint: 'sha256:c',
                        revisionHash: 'sha256:d',
                    },
                },
            },
        },
        {
            is_system: false,
            extra: {
                summary_sharder: {
                    messageIdentity: {
                        messageId: '',
                        initFingerprint: '',
                        revisionHash: '',
                    },
                },
            },
        },
    ], []);

    assert.deepEqual(summary.identity.duplicateIds, ['msg_dup']);
    assert.equal(summary.identity.malformedCount, 1);
    assert.deepEqual(summary.evidencePolicy.unexpectedValues, ['surprising']);
});
