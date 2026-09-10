import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultTranscriptCapacityProfile } from './transcript/capacity-profile.js';
import {
    applyCatalogIntegerEdit,
    getEditableCatalogEntry,
    parseCatalogIntegerEdit,
} from './settings-catalog-ui.js';

const ENTRY_ID = 'transcript-recall-capacity-profile';

function settingsWithProfile(profile = createDefaultTranscriptCapacityProfile()) {
    return { transcriptRecall: { capacityProfile: profile } };
}

test('exposes only the declared global capacity entry to an editable consumer', () => {
    const entry = getEditableCatalogEntry(ENTRY_ID);
    assert.equal(entry.scope, 'global');
    assert.deepEqual(entry.settings.map((setting) => setting.key), [
        'retrievalCeilingTokens',
        'safetyHeadroomTokens',
    ]);
    assert.equal(getEditableCatalogEntry('unknown'), null);
});

test('accepts an in-bounds integer and leaves persistence to the caller', () => {
    const settings = settingsWithProfile();
    const result = applyCatalogIntegerEdit(settings, ENTRY_ID, 'retrievalCeilingTokens', '32768');
    assert.deepEqual(result, { accepted: true, value: 32768 });
    assert.equal(settings.transcriptRecall.capacityProfile.retrievalCeilingTokens, 32768);
});

test('rejects non-integers, negative values, and unsafe values without mutation', () => {
    const settings = settingsWithProfile();
    const original = settings.transcriptRecall.capacityProfile.retrievalCeilingTokens;
    for (const rawValue of ['-1', '1.5', 'words', String(Number.MAX_SAFE_INTEGER + 1)]) {
        assert.deepEqual(applyCatalogIntegerEdit(settings, ENTRY_ID, 'retrievalCeilingTokens', rawValue), {
            accepted: false,
            reason: 'SETTING_VALUE_INVALID',
        });
        assert.equal(settings.transcriptRecall.capacityProfile.retrievalCeilingTokens, original);
    }
    assert.equal(parseCatalogIntegerEdit(null, '10'), null);
});

test('refuses to edit when the declared global target is unavailable', () => {
    assert.deepEqual(applyCatalogIntegerEdit({}, ENTRY_ID, 'retrievalCeilingTokens', '10'), {
        accepted: false,
        reason: 'SETTING_SCOPE_UNAVAILABLE',
    });
});

test('refuses to repair a malformed capacity profile through an individual control', () => {
    const profile = createDefaultTranscriptCapacityProfile();
    profile.safetyHeadroomTokens = -1;
    const settings = settingsWithProfile(profile);
    assert.deepEqual(applyCatalogIntegerEdit(settings, ENTRY_ID, 'retrievalCeilingTokens', '32768'), {
        accepted: false,
        reason: 'SETTING_PROFILE_UNAVAILABLE',
    });
    assert.equal(settings.transcriptRecall.capacityProfile.retrievalCeilingTokens, 24576);
});
