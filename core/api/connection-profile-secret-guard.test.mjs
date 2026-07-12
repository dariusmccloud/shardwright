import assert from 'node:assert/strict';
import test from 'node:test';

import { runWithProfileSecretGuard } from './connection-profile-secret-guard.js';

test('request without explicit secret waits for temporary profile rotation to restore', async () => {
    const events = [];
    let releaseFirst;
    let markFirstStarted;
    const firstStarted = new Promise(resolve => { markFirstStarted = resolve; });
    const firstHold = new Promise(resolve => { releaseFirst = resolve; });

    const first = runWithProfileSecretGuard({
        requestedSecretId: 'profile-secret',
        secretKey: 'api-key',
        readSecretsState: async () => ({
            'api-key': [
                { id: 'default-secret', active: true },
                { id: 'profile-secret', active: false },
            ],
        }),
        rotateSecret: async (_key, id) => events.push(`rotate:${id}`),
        run: async () => {
            events.push('run:first');
            markFirstStarted();
            await firstHold;
            return 'first';
        },
        reportRestoreFailure: error => assert.fail(error),
    });

    await firstStarted;

    const second = runWithProfileSecretGuard({
        requestedSecretId: '',
        secretKey: 'api-key',
        readSecretsState: async () => assert.fail('bypass request must not read secret state'),
        rotateSecret: async () => assert.fail('bypass request must not rotate secrets'),
        run: async () => {
            events.push('run:second');
            return 'second';
        },
        reportRestoreFailure: error => assert.fail(error),
    });

    const unrelated = runWithProfileSecretGuard({
        requestedSecretId: '',
        secretKey: 'different-api-key',
        readSecretsState: async () => assert.fail('unrelated request must not read secret state'),
        rotateSecret: async () => assert.fail('unrelated request must not rotate secrets'),
        run: async () => {
            events.push('run:unrelated');
            return 'unrelated';
        },
        reportRestoreFailure: error => assert.fail(error),
    });

    await Promise.resolve();
    assert.equal(await unrelated, 'unrelated');
    assert.deepEqual(events, ['rotate:profile-secret', 'run:first', 'run:unrelated']);

    releaseFirst();
    assert.deepEqual(await Promise.all([first, second]), ['first', 'second']);
    assert.deepEqual(events, [
        'rotate:profile-secret',
        'run:first',
        'run:unrelated',
        'rotate:default-secret',
        'run:second',
    ]);
});
