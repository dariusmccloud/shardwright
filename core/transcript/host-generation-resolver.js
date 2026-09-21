// Resolve one generation invocation from the synchronous SillyTavern context.
// Volatile host indexes select records only; Shardwright markers provide identity.

function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function createAttemptId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    return `attempt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function refusal(reason) { return Object.freeze({ state: 'REFUSED', reason }); }
const TYPED_QUERY_GENERATION_TYPES = new Set(['normal']);
function markerFor(character) {
    const candidates = [character?.data?.extensions?.shardwright, character?.json_data?.extensions?.shardwright, character?.extensions?.shardwright].filter(Boolean);
    if (candidates.length === 0) return null;
    const ids = new Set(candidates.map((value) => text(value?.characterInstanceId)).filter(Boolean));
    if (ids.size !== 1) return refusal('CHARACTER_MARKER_AMBIGUOUS');
    const copyUuids = new Set(candidates.map((value) => text(value?.copyUuid)).filter(Boolean));
    if (copyUuids.size > 1) return refusal('CHARACTER_MARKER_AMBIGUOUS');
    return { characterInstanceId: [...ids][0], copyUuid: [...copyUuids][0] || null };
}

export function resolveHostGenerationInvocation({ options = {}, context = {}, queryTextOverride, attemptId = createAttemptId() } = {}) {
    if (!context || typeof context !== 'object') return refusal('HOST_CONTEXT_UNAVAILABLE');
    const generationType = text(options?.generationType) || text(options?.type) || 'normal';
    const rawIndex = options?.force_chid ?? context.characterId;
    const characterIndex = Number(rawIndex);
    if (!Number.isInteger(characterIndex) || characterIndex < 0 || !Array.isArray(context.characters)) return refusal('SPEAKING_CHARACTER_UNAVAILABLE');
    const character = context.characters[characterIndex];
    const marker = markerFor(character);
    if (!marker || marker.state === 'REFUSED') return marker?.state === 'REFUSED' ? marker : refusal('CHARACTER_INSTANCE_UNAVAILABLE');
    const chatId = text(context.chatId);
    if (!chatId) return refusal('CHAT_ID_UNAVAILABLE');
    const message = Array.isArray(context.chat) ? context.chat.at(-1) : null;
    const sourceMessageId = text(message?.extra?.shardwright?.messageIdentity?.messageId);
    if (!sourceMessageId) return refusal('SOURCE_MESSAGE_ID_UNAVAILABLE');
    const queryMessage = Array.isArray(context.chat)
        ? [...context.chat].reverse().find((entry) => entry?.is_user === true && text(entry?.mes))
        : null;
    const typedGeneration = TYPED_QUERY_GENERATION_TYPES.has(generationType.toLowerCase());
    const queryText = queryTextOverride !== undefined ? text(queryTextOverride) : typedGeneration ? null : text(queryMessage?.mes);
    if (typedGeneration && !queryText) return refusal('QUERY_UNAVAILABLE');
    const generationId = text(attemptId);
    if (!generationId) return refusal('GENERATION_ID_UNAVAILABLE');
    return Object.freeze({
        state: 'ELIGIBLE',
        context: Object.freeze({
            generationId,
            generationType,
            characterInstanceId: marker.characterInstanceId,
            sourceMessageId,
            chatId,
            ...(queryText ? { queryText } : {}),
            copyUuid: marker.copyUuid,
            characterIndex,
        }),
    });
}
