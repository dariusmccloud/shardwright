import { validateCharacterIdentityMarker } from './character-identity-marker.js';

function markerFor(character) {
    return character?.data?.extensions?.shardwright
        ?? character?.json_data?.extensions?.shardwright
        ?? character?.extensions?.shardwright
        ?? null;
}

export function resolveGroupParticipantOptions(context = {}) {
    const groupId = String(context.groupId || '').trim();
    const groups = Array.isArray(context.groups) ? context.groups : [];
    const characters = Array.isArray(context.characters) ? context.characters : [];
    const group = groups.find((candidate) => String(candidate?.id || '') === groupId);
    if (!groupId || !group || !Array.isArray(group.members)) {
        return Object.freeze({ state: 'REFUSED', reason: 'GROUP_PARTICIPANTS_UNAVAILABLE' });
    }

    const participants = group.members.map((avatar) => {
        const matching = characters
            .map((character, characterId) => ({ character, characterId }))
            .filter(({ character }) => character?.avatar === avatar);
        if (matching.length !== 1) {
            return Object.freeze({ state: 'UNRESOLVED', avatar, characterId: null, name: '', marker: null, reason: 'CHARACTER_CARD_AMBIGUOUS' });
        }
        const { character, characterId } = matching[0];
        const marker = markerFor(character);
        const markerState = validateCharacterIdentityMarker(marker).state;
        return Object.freeze({
            state: markerState === 'VALID' ? 'RESOLVED' : 'UNRESOLVED',
            avatar,
            characterId,
            name: String(character?.name || avatar),
            marker: markerState === 'VALID' ? Object.freeze({ ...marker }) : null,
            reason: markerState === 'VALID' ? null : 'CHARACTER_IDENTITY_UNAVAILABLE',
        });
    });

    return Object.freeze({ state: 'PARTICIPANTS', groupId, participants: Object.freeze(participants) });
}
