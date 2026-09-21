import test from 'node:test';
import assert from 'node:assert/strict';
import {
    recordContinuityRetrievalPreference,
    clearContinuityRetrievalPreference,
    resolveContinuityRetrievalPreference,
} from './operator-retrieval-preferences.js';

const base = { transcriptRecall: { operatorPreferences: {} } };
const input = {
    characterInstanceId: 'transcript_character_1',
    contentHash: 'sha256:family',
    messageRecordId: 'message-2',
    operatorActionId: 'operator-1',
    recordedAt: '2026-09-20T12:00:00Z',
};

test('records and resolves one explicit Continuity preference', () => {
    const recorded = recordContinuityRetrievalPreference(base, input);
    assert.equal(recorded.state, 'RECORDED');
    assert.deepEqual(resolveContinuityRetrievalPreference(recorded.settings, {
        ...input,
        eligibleMessageRecordIds: ['message-1', 'message-2'],
    }), { state: 'PREFERRED', messageRecordId: 'message-2', preference: recorded.preference });
});

test('preference is not applicable to Archaeology', () => {
    const recorded = recordContinuityRetrievalPreference(base, input);
    assert.deepEqual(resolveContinuityRetrievalPreference(recorded.settings, { ...input, posture: 'ARCHAEOLOGY' }), { state: 'NOT_APPLICABLE', reason: 'ARCHAEOLOGY_UNCHANGED' });
});

test('stale or ineligible preference remains unresolved without guessing', () => {
    const recorded = recordContinuityRetrievalPreference(base, input);
    assert.deepEqual(resolveContinuityRetrievalPreference(recorded.settings, { ...input, eligibleMessageRecordIds: ['message-other'] }), { state: 'UNRESOLVED', reason: 'PREFERENCE_STALE_OR_INELIGIBLE' });
});

test('clear removes only the operator preference mapping', () => {
    const recorded = recordContinuityRetrievalPreference(base, input);
    const cleared = clearContinuityRetrievalPreference(recorded.settings, input);
    assert.equal(cleared.state, 'CLEARED');
    assert.deepEqual(cleared.settings.transcriptRecall.operatorPreferences, {});
});

test('invalid records refuse before persistence', () => {
    const refused = recordContinuityRetrievalPreference(base, { ...input, messageRecordId: '' });
    assert.deepEqual(refused, { state: 'REFUSED', reason: 'PREFERENCE_INPUT_INVALID', settings: base });
});
