/**
 * Retry one operation exactly once when its failure is classified as transient.
 *
 * @param {Object} options
 * @param {() => Promise<*>} options.run
 * @param {(error: unknown) => boolean} options.shouldRetry
 * @param {number} [options.delayMs=250]
 * @param {(delayMs: number) => Promise<void>} [options.wait]
 * @param {() => number} [options.now]
 * @param {(diagnostic: object) => void} [options.onRetryDiagnostic]
 * @returns {Promise<*>}
 */
export async function runWithOneTransientRetry({
    run,
    shouldRetry,
    delayMs = 250,
    wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds)),
    now = () => Date.now(),
    onRetryDiagnostic = null,
}) {
    if (typeof run !== 'function' || typeof shouldRetry !== 'function') {
        throw new TypeError('Transient retry requires run and shouldRetry functions.');
    }

    const firstStartedAt = now();
    try {
        return await run();
    } catch (error) {
        if (!shouldRetry(error)) {
            throw error;
        }
        const firstFailure = {
            attempt: 1,
            status: Number.isInteger(error?.status) ? error.status : null,
            code: error?.code ? String(error.code) : null,
            elapsedMs: Math.max(0, now() - firstStartedAt),
        };
        if (delayMs > 0) {
            await wait(delayMs);
        }
        const retryStartedAt = now();
        try {
            const result = await run();
            onRetryDiagnostic?.({
                outcome: 'RECOVERED',
                delayMs,
                firstFailure,
                retry: {
                    attempt: 2,
                    status: null,
                    code: null,
                    elapsedMs: Math.max(0, now() - retryStartedAt),
                },
            });
            return result;
        } catch (retryError) {
            onRetryDiagnostic?.({
                outcome: 'FAILED',
                delayMs,
                firstFailure,
                retry: {
                    attempt: 2,
                    status: Number.isInteger(retryError?.status) ? retryError.status : null,
                    code: retryError?.code ? String(retryError.code) : null,
                    elapsedMs: Math.max(0, now() - retryStartedAt),
                },
            });
            throw retryError;
        }
    }
}
