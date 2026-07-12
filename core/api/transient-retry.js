/**
 * Retry one operation exactly once when its failure is classified as transient.
 *
 * @param {Object} options
 * @param {() => Promise<*>} options.run
 * @param {(error: unknown) => boolean} options.shouldRetry
 * @param {number} [options.delayMs=250]
 * @param {(delayMs: number) => Promise<void>} [options.wait]
 * @returns {Promise<*>}
 */
export async function runWithOneTransientRetry({
    run,
    shouldRetry,
    delayMs = 250,
    wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds)),
}) {
    if (typeof run !== 'function' || typeof shouldRetry !== 'function') {
        throw new TypeError('Transient retry requires run and shouldRetry functions.');
    }

    try {
        return await run();
    } catch (error) {
        if (!shouldRetry(error)) {
            throw error;
        }
        if (delayMs > 0) {
            await wait(delayMs);
        }
        return await run();
    }
}
