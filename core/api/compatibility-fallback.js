export function isAbortError(error) {
    return Boolean(error)
        && (typeof error === 'object' || typeof error === 'function')
        && error.name === 'AbortError';
}

/**
 * Execute the bounded compatibility fallback for chat-completions requests.
 * When remove-stop mode is requested and stop strings are present, try the
 * no-stop body first, then fall back once to the default body.
 *
 * @param {Object} params
 * @param {boolean} params.removeStopStrings
 * @param {boolean} params.hasStops
 * @param {Object} params.defaultBody
 * @param {Object} params.noStopBody
 * @param {(label: string, body: Object) => Promise<string>} params.runAttempt
 * @returns {Promise<string>}
 */
export async function runCompatibilityFallback({
    removeStopStrings,
    hasStops,
    defaultBody,
    noStopBody,
    runAttempt,
}) {
    if (typeof runAttempt !== 'function') {
        throw new Error('runAttempt is required');
    }

    const shouldTryNoStopFirst = removeStopStrings && hasStops;
    const attempts = shouldTryNoStopFirst
        ? [
            { label: 'no-stop', body: noStopBody },
            { label: 'default-stop', body: defaultBody },
        ]
        : [
            { label: 'default-stop', body: defaultBody },
        ];

    const errors = [];
    for (const attempt of attempts) {
        try {
            return await runAttempt(attempt.label, attempt.body);
        } catch (error) {
            if (isAbortError(error)) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error || `${attempt.label} compatibility request failed`);
            errors.push(message);
        }
    }

    throw new Error(errors.join('. ') || 'Compatibility fallback failed');
}
