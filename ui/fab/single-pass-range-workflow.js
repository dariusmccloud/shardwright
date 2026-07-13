/**
 * Own the range -> optional-baseline -> run navigation loop.
 * A baseline modal may request a revised range without starting generation.
 */
export async function runSinglePassRangeWorkflow({
    maxIndex,
    requestRange,
    parseRange,
    runSinglePass,
}) {
    if (!Number.isInteger(maxIndex) || maxIndex < 0
        || typeof requestRange !== 'function'
        || typeof parseRange !== 'function'
        || typeof runSinglePass !== 'function') {
        throw new TypeError('Single-pass range workflow requires a valid range boundary and callbacks.');
    }

    let defaultRange = `0-${maxIndex}`;
    while (true) {
        const rangeText = await requestRange(defaultRange);
        const range = parseRange(rangeText, maxIndex);
        if (!range) return { status: 'cancelled' };

        defaultRange = `${range.startIdx}-${range.endIdx}`;
        const result = await runSinglePass(range.startIdx, range.endIdx);
        if (result?.requestRangeRevision === true) continue;
        return result;
    }
}
