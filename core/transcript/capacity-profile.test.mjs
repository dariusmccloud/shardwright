import assert from 'node:assert/strict';
import test from 'node:test';
import {
    createDefaultTranscriptCapacityProfile,
    ensureTranscriptCapacityProfileSettings,
    resolveTranscriptCapacityProfile,
} from './capacity-profile.js';

test('creates an independent complete default transcript capacity profile', () => {
    const profile = createDefaultTranscriptCapacityProfile();
    assert.deepEqual(resolveTranscriptCapacityProfile(profile), {
        state: 'PROFILE_AVAILABLE',
        schemaVersion: 2,
        retrievalCeilingTokens: 24576,
        safetyHeadroomTokens: 0,
    });
    assert.notEqual(profile, createDefaultTranscriptCapacityProfile());
});

test('adds a profile only when the transcript-recall setting is absent', () => {
    const settings = { rag: { insertCount: 999, scoreThreshold: 0.01 } };
    assert.equal(ensureTranscriptCapacityProfileSettings(settings), true);
    assert.equal(settings.rag.insertCount, 999);
    assert.equal(resolveTranscriptCapacityProfile(settings.transcriptRecall.capacityProfile).state, 'PROFILE_AVAILABLE');
    assert.equal(ensureTranscriptCapacityProfileSettings(settings), false);
});

test('does not repair an explicit malformed profile into a guessed profile', () => {
    const settings = { transcriptRecall: { capacityProfile: null } };
    assert.equal(ensureTranscriptCapacityProfileSettings(settings), false);
    assert.deepEqual(resolveTranscriptCapacityProfile(settings.transcriptRecall.capacityProfile), {
        state: 'PROFILE_UNAVAILABLE',
        reason: 'PROFILE_INVALID',
    });
});

test('migrates a valid v1 profile without reinterpreting its old reservations', () => {
    const legacy = {
        schemaVersion: 1,
        retrievalCeilingTokens: 24576,
        systemCardReservationTokens: 1024,
        activeChatReservationTokens: 2048,
        outputReservationTokens: 8192,
    };
    const settings = { transcriptRecall: { capacityProfile: legacy } };
    assert.equal(ensureTranscriptCapacityProfileSettings(settings), true);
    assert.deepEqual(settings.transcriptRecall.legacyCapacityProfileV1, legacy);
    assert.deepEqual(resolveTranscriptCapacityProfile(settings.transcriptRecall.capacityProfile), {
        state: 'PROFILE_AVAILABLE',
        schemaVersion: 2,
        retrievalCeilingTokens: 24576,
        safetyHeadroomTokens: 0,
    });
});

test('refuses incomplete, negative, fractional, and unsafe profile values', () => {
    const valid = createDefaultTranscriptCapacityProfile();
    for (const profile of [
        {},
        { ...valid, retrievalCeilingTokens: -1 },
        { ...valid, safetyHeadroomTokens: 1.5 },
        { ...valid, safetyHeadroomTokens: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
        assert.deepEqual(resolveTranscriptCapacityProfile(profile), {
            state: 'PROFILE_UNAVAILABLE',
            reason: 'PROFILE_INVALID',
        });
    }
});
