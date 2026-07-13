const secretRotationLocks = new Map();

/**
 * Serialize Connection Profile requests around process-wide secret rotation.
 * Every request for the same secret key participates so requests without an
 * explicit secret cannot observe another profile's temporary credential.
 *
 * @param {object} options
 * @param {string} options.requestedSecretId
 * @param {string|null} options.secretKey
 * @param {() => Promise<object>} options.readSecretsState
 * @param {(secretKey: string, secretId: string) => Promise<void>} options.rotateSecret
 * @param {() => Promise<*>} options.run
 * @param {(error: unknown) => void} options.reportRestoreFailure
 * @returns {Promise<*>}
 */
export async function runWithProfileSecretGuard({
    requestedSecretId,
    secretKey,
    readSecretsState,
    rotateSecret,
    run,
    reportRestoreFailure,
}) {
    if (!secretKey) {
        return await run();
    }

    const executeLocked = async () => {
        if (!requestedSecretId) {
            return await run();
        }

        const state = await readSecretsState();
        const secrets = Array.isArray(state?.[secretKey]) ? state[secretKey] : [];
        if (secrets.length === 0) {
            throw new Error(`Profile secret key ${secretKey} has no configured secrets`);
        }

        const targetSecret = secrets.find(secret => secret?.id === requestedSecretId);
        if (!targetSecret) {
            throw new Error(`Profile secret ${requestedSecretId} is missing for key ${secretKey}`);
        }

        const activeSecret = secrets.find(secret => secret?.active);
        const activeSecretId = String(activeSecret?.id || '').trim() || null;
        const needsRotation = activeSecretId !== requestedSecretId;

        if (needsRotation) {
            await rotateSecret(secretKey, requestedSecretId);
        }

        try {
            return await run();
        } finally {
            if (needsRotation && activeSecretId) {
                try {
                    await rotateSecret(secretKey, activeSecretId);
                } catch (restoreError) {
                    reportRestoreFailure(restoreError);
                }
            }
        }
    };

    const previous = secretRotationLocks.get(secretKey) || Promise.resolve();
    const queued = previous.then(executeLocked, executeLocked);
    const tail = queued.catch(() => {});
    secretRotationLocks.set(secretKey, tail);

    try {
        return await queued;
    } finally {
        if (secretRotationLocks.get(secretKey) === tail) {
            secretRotationLocks.delete(secretKey);
        }
    }
}
