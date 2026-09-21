import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHostGenerationInvocation } from './host-generation-resolver.js';

const marker = { characterInstanceId: 'transcript_character_jeep', copyUuid: 'copy-jeep' };
const context = { characterId: 0, chatId: 'Jeep/chat', characters: [{ data: { extensions: { shardwright: marker } } }], chat: [{ extra: { shardwright: { messageIdentity: { messageId: 'msg-7' } } } }] };

test('resolves a generation from synchronous host context and durable card/message markers', () => {
    const result = resolveHostGenerationInvocation({ options: { force_chid: 0, generationType: 'normal' }, context, queryTextOverride: 'hello', attemptId: 'attempt-1' });
    assert.equal(result.state, 'ELIGIBLE');
    assert.deepEqual(result.context, { generationId: 'attempt-1', generationType: 'normal', characterInstanceId: 'transcript_character_jeep', sourceMessageId: 'msg-7', chatId: 'Jeep/chat', queryText: 'hello', copyUuid: 'copy-jeep', characterIndex: 0 });
    assert.equal(Object.isFrozen(result.context), true);
});

test('requires captured typed input for normal generations', () => {
    const result = resolveHostGenerationInvocation({ options: { force_chid: 0, generationType: 'normal' }, context, attemptId: 'attempt-typed-required' });
    assert.equal(result.reason, 'QUERY_UNAVAILABLE');
});

test('uses force_chid for invocation selection and refuses missing durable identity', () => {
    const selected = resolveHostGenerationInvocation({ options: { force_chid: 1, generationType: 'normal' }, context: { ...context, characters: [{}, { data: { extensions: { shardwright: marker } } }] }, queryTextOverride: 'hello', attemptId: 'attempt-2' });
    assert.equal(selected.context.characterIndex, 1);
    const refused = resolveHostGenerationInvocation({ options: { force_chid: 0 }, context: { ...context, characters: [{}] }, attemptId: 'attempt-3' });
    assert.equal(refused.reason, 'CHARACTER_INSTANCE_UNAVAILABLE');
});

test('uses the synchronously captured host input before the user message enters chat', () => {
    const result = resolveHostGenerationInvocation({
        options: { force_chid: 0 },
        context,
        queryTextOverride: 'the message currently typed by the operator',
        attemptId: 'attempt-typed-input',
    });
    assert.equal(result.state, 'ELIGIBLE');
    assert.equal(result.context.queryText, 'the message currently typed by the operator');
});

test('refuses absent or ambiguous message and card metadata without filename fallback', () => {
    assert.equal(resolveHostGenerationInvocation({ context: { ...context, chat: [{ mes: 'text' }] }, attemptId: 'attempt-4' }).reason, 'SOURCE_MESSAGE_ID_UNAVAILABLE');
    const ambiguous = resolveHostGenerationInvocation({ context: { ...context, characters: [{ data: { extensions: { shardwright: marker } }, json_data: { extensions: { shardwright: { ...marker, characterInstanceId: 'other' } } } }] }, attemptId: 'attempt-5' });
    assert.equal(ambiguous.reason, 'CHARACTER_MARKER_AMBIGUOUS');
});
