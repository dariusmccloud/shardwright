import test from 'node:test';
import assert from 'node:assert/strict';

import {
    METADATA_MIGRATION_MARKER,
    migrateShardwrightMetadataIdentity,
} from './shardwright-metadata-migration.js';

test('migrates recognized chat and message metadata while preserving legacy sources', async () => {
    const chatMetadata = {
        summary_sharder: {
            chatId: 'chat-1',
            summarizedRanges: [{ start: 0, end: 2 }],
            unknownLegacyField: 'legacy-only',
        },
    };
    const messages = [{
        mes: 'hello',
        extra: {
            summary_sharder: {
                evidencePolicy: 'exclude',
                messageIdentity: { messageId: 'msg_00000000000000000000000000000001' },
                unknownMessageField: true,
            },
        },
    }];
    const legacyChat = structuredClone(chatMetadata.summary_sharder);
    const legacyMessage = structuredClone(messages[0].extra.summary_sharder);

    const result = await migrateShardwrightMetadataIdentity({
        chatMetadata,
        messages,
        now: 1785585600000,
    });

    assert.deepEqual(result, { changed: true, chatMetadataMigrated: true, messagesMigrated: 1 });
    assert.deepEqual(chatMetadata.summary_sharder, legacyChat);
    assert.deepEqual(messages[0].extra.summary_sharder, legacyMessage);
    assert.equal(chatMetadata.shardwright.chatId, 'chat-1');
    assert.equal(messages[0].extra.shardwright.evidencePolicy, 'exclude');
    assert.equal(chatMetadata.shardwright.unknownLegacyField, undefined);
    assert.equal(messages[0].extra.shardwright.unknownMessageField, undefined);
    assert.deepEqual(chatMetadata.shardwright[METADATA_MIGRATION_MARKER].unrecognizedKeys, ['unknownLegacyField']);
    assert.deepEqual(messages[0].extra.shardwright[METADATA_MIGRATION_MARKER].unrecognizedKeys, ['unknownMessageField']);
    assert.match(messages[0].extra.shardwright[METADATA_MIGRATION_MARKER].sourceHash, /^sha256:/u);
});

test('metadata migration is idempotent after canonical activation', async () => {
    const chatMetadata = { summary_sharder: { chatId: 'chat-1' } };
    const messages = [{ extra: { summary_sharder: { evidencePolicy: 'include' } } }];
    await migrateShardwrightMetadataIdentity({ chatMetadata, messages, now: 1785585600000 });
    const canonicalChat = chatMetadata.shardwright;
    const canonicalMessage = messages[0].extra.shardwright;

    const repeated = await migrateShardwrightMetadataIdentity({ chatMetadata, messages, now: 1785585601000 });
    assert.deepEqual(repeated, { changed: false, chatMetadataMigrated: false, messagesMigrated: 0 });
    assert.equal(chatMetadata.shardwright, canonicalChat);
    assert.equal(messages[0].extra.shardwright, canonicalMessage);
});

test('one metadata conflict refuses the entire migration before mutation', async () => {
    const chatMetadata = { summary_sharder: { chatId: 'chat-1' } };
    const messages = [
        { extra: { summary_sharder: { evidencePolicy: 'include' } } },
        {
            extra: {
                summary_sharder: { evidencePolicy: 'exclude' },
                shardwright: { evidencePolicy: 'include' },
            },
        },
    ];

    await assert.rejects(
        migrateShardwrightMetadataIdentity({ chatMetadata, messages, now: 1785585600000 }),
        { code: 'SHARDWRIGHT_METADATA_MIGRATION_CONFLICT', scope: 'MESSAGE', messageIndex: 1 }
    );
    assert.equal(chatMetadata.shardwright, undefined);
    assert.equal(messages[0].extra.shardwright, undefined);
    assert.deepEqual(messages[1].extra.shardwright, { evidencePolicy: 'include' });
});

test('post-migration legacy drift refuses replay instead of trusting a stale marker', async () => {
    const chatMetadata = { summary_sharder: { chatId: 'chat-1' } };
    await migrateShardwrightMetadataIdentity({ chatMetadata, now: 1785585600000 });
    chatMetadata.summary_sharder.chatId = 'chat-2';

    await assert.rejects(
        migrateShardwrightMetadataIdentity({ chatMetadata, now: 1785585601000 }),
        { code: 'SHARDWRIGHT_METADATA_MIGRATION_CONFLICT', scope: 'CHAT' }
    );
});
