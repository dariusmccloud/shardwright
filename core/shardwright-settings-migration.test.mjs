import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SETTINGS_MIGRATION_MARKER,
    migrateShardwrightBrowserState,
    migrateShardwrightSettingsIdentity,
    migrateShardwrightThemeVariables,
} from './shardwright-settings-migration.js';

function createStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return map.has(key) ? map.get(key) : null;
        },
        setItem(key, value) {
            map.set(key, String(value));
        },
        removeItem(key) {
            map.delete(key);
        },
        snapshot() {
            return Object.fromEntries(map);
        },
    };
}

const fixedNow = () => '2026-08-01T12:00:00.000Z';

test('migrates recognized settings once and preserves the legacy source', async () => {
    const legacy = { enabled: true, count: 7, obsoleteUnknown: 'preserve-at-source' };
    const extensionSettings = { summary_sharder: structuredClone(legacy) };

    const migrated = await migrateShardwrightSettingsIdentity({
        extensionSettings,
        defaults: { enabled: false, count: 1, addedDefault: 'yes' },
        normalizeSettings(settings) {
            settings.count += 1;
        },
        now: fixedNow,
    });

    assert.deepEqual(extensionSettings.summary_sharder, legacy);
    assert.equal(migrated.enabled, true);
    assert.equal(migrated.count, 8);
    assert.equal(migrated.addedDefault, 'yes');
    assert.equal(migrated.obsoleteUnknown, undefined);
    assert.deepEqual(migrated[SETTINGS_MIGRATION_MARKER].unrecognizedKeys, ['obsoleteUnknown']);
    assert.equal(migrated[SETTINGS_MIGRATION_MARKER].status, 'MIGRATED');
    assert.match(migrated[SETTINGS_MIGRATION_MARKER].sourceHash, /^sha256:/u);

    const repeated = await migrateShardwrightSettingsIdentity({
        extensionSettings,
        defaults: { enabled: false, count: 1, addedDefault: 'yes' },
        normalizeSettings() {
            throw new Error('idempotent migration must not normalize again');
        },
        now: fixedNow,
    });
    assert.equal(repeated, migrated);
});

test('refuses unmarked canonical settings when legacy settings also exist', async () => {
    const extensionSettings = {
        summary_sharder: { enabled: true },
        shardwright: { enabled: false },
    };

    await assert.rejects(
        migrateShardwrightSettingsIdentity({
            extensionSettings,
            defaults: { enabled: false },
            now: fixedNow,
        }),
        { code: 'SHARDWRIGHT_SETTINGS_MIGRATION_CONFLICT' }
    );
    assert.deepEqual(extensionSettings, {
        summary_sharder: { enabled: true },
        shardwright: { enabled: false },
    });
});

test('migrates browser state atomically, preserves legacy keys, and replays idempotently', async () => {
    const localStorage = createStorage({
        ss_debug: 'true',
        summarySharderProfilingBypass: '1',
    });
    const sessionStorage = createStorage({
        'summary_sharder:architectural_integration_trace': '[{"type":"TRACE_STARTED"}]',
    });

    const first = await migrateShardwrightBrowserState({ localStorage, sessionStorage, now: fixedNow });
    assert.equal(first.local.status, 'COMPLETED');
    assert.equal(localStorage.getItem('shardwright:debug'), 'true');
    assert.equal(localStorage.getItem('ss_debug'), 'true');
    assert.equal(localStorage.getItem('shardwright:profiling-bypass'), '1');
    assert.equal(sessionStorage.getItem('shardwright:architectural-integration-trace'), '[{"type":"TRACE_STARTED"}]');
    assert.notEqual(localStorage.getItem('shardwright:identity-migration:local:v1'), null);

    const snapshot = localStorage.snapshot();
    const second = await migrateShardwrightBrowserState({ localStorage, sessionStorage, now: fixedNow });
    assert.equal(second.local.status, 'COMPLETED');
    assert.deepEqual(localStorage.snapshot(), snapshot);
});

test('refuses browser destination conflicts without writing a migration marker', async () => {
    const localStorage = createStorage({
        ss_debug: 'true',
        'shardwright:debug': 'false',
    });

    await assert.rejects(
        migrateShardwrightBrowserState({
            localStorage,
            sessionStorage: createStorage(),
            now: fixedNow,
        }),
        { code: 'SHARDWRIGHT_BROWSER_STATE_MIGRATION_CONFLICT' }
    );
    assert.equal(localStorage.getItem('ss_debug'), 'true');
    assert.equal(localStorage.getItem('shardwright:debug'), 'false');
    assert.equal(localStorage.getItem('shardwright:identity-migration:local:v1'), null);
});

test('migrates legacy custom-theme variables without mutating the legacy settings source', async () => {
    const legacy = {
        customThemes: {
            ember: {
                colors: { '--ss-primary': '#f60', '--operator-owned': '#fff' },
                extraStyles: '.card { color: var(--ss-primary); }',
            },
        },
    };
    const extensionSettings = { summary_sharder: structuredClone(legacy) };

    const migrated = await migrateShardwrightSettingsIdentity({
        extensionSettings,
        defaults: { customThemes: {} },
        now: fixedNow,
    });

    assert.deepEqual(extensionSettings.summary_sharder, legacy);
    assert.deepEqual(migrated.customThemes.ember.colors, {
        '--shardwright-primary': '#f60',
        '--operator-owned': '#fff',
    });
    assert.equal(migrated.customThemes.ember.extraStyles, '.card { color: var(--shardwright-primary); }');
    assert.deepEqual(migrateShardwrightThemeVariables(migrated), { changed: false, migratedThemes: [] });
});

test('refuses conflicting legacy and canonical custom-theme variables', () => {
    const settings = {
        customThemes: {
            conflict: {
                colors: {
                    '--ss-primary': '#f60',
                    '--shardwright-primary': '#06f',
                },
            },
        },
    };

    assert.throws(
        () => migrateShardwrightThemeVariables(settings),
        { code: 'SHARDWRIGHT_THEME_VARIABLE_MIGRATION_CONFLICT' },
    );
});
