import assert from 'node:assert/strict';
import test from 'node:test';
import {
    OPERATOR_SETTINGS_CATALOG,
    SETTINGS_CATALOG_SCOPES,
    canEditCatalogEntry,
    createCatalogDefaults,
    getSettingsCatalogEntry,
    getSettingsScopeDefinition,
    isValidCatalogValue,
} from './settings-catalog.js';

test('declares the transcript capacity profile once with operator and UI metadata', () => {
    const entry = getSettingsCatalogEntry('transcript-recall-capacity-profile');
    assert.deepEqual(entry.path, ['transcriptRecall', 'capacityProfile']);
    assert.equal(entry.scope, 'global');
    assert.equal(entry.settings.length, 2);
    for (const setting of entry.settings) {
        assert.equal(setting.type, 'integer');
        assert.equal(typeof setting.label, 'string');
        assert.equal(typeof setting.help, 'string');
        assert.equal(setting.ui.control, 'number');
    }
    assert.equal(Object.isFrozen(OPERATOR_SETTINGS_CATALOG), true);
    assert.equal(Object.isFrozen(entry.settings), true);
});

test('treats scope as editing and storage jurisdiction, never display metadata', () => {
    const entry = getSettingsCatalogEntry('transcript-recall-capacity-profile');
    assert.equal(entry.scope, SETTINGS_CATALOG_SCOPES.GLOBAL);
    assert.deepEqual(getSettingsScopeDefinition(entry.scope), {
        persistenceAuthority: 'extension_settings.shardwright',
        editAuthority: 'extension-settings',
    });
    assert.equal(canEditCatalogEntry(entry), true);

    assert.equal(getSettingsScopeDefinition(SETTINGS_CATALOG_SCOPES.CHARACTER).persistenceAuthority, null);
    assert.equal(canEditCatalogEntry({ scope: SETTINGS_CATALOG_SCOPES.CHARACTER }), false);
    assert.equal(canEditCatalogEntry({ scope: 'unknown' }), false);
});

test('derives safe-base defaults from the catalog rather than duplicated literals', () => {
    assert.deepEqual(createCatalogDefaults('transcript-recall-capacity-profile'), {
        retrievalCeilingTokens: 24576,
        safetyHeadroomTokens: 0,
    });
    assert.equal(createCatalogDefaults('unknown-setting'), null);
});

test('validates values only against the declared catalog bounds', () => {
    const setting = getSettingsCatalogEntry('transcript-recall-capacity-profile').settings[0];
    assert.equal(isValidCatalogValue(setting, 0), true);
    assert.equal(isValidCatalogValue(setting, -1), false);
    assert.equal(isValidCatalogValue(setting, 1.5), false);
    assert.equal(isValidCatalogValue(setting, Number.MAX_SAFE_INTEGER + 1), false);
});
