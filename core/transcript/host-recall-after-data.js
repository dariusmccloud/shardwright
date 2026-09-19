import { replaceTranscriptRecallSentinel, verifyTranscriptRecallReplacement, TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

export async function handleHostRecallAfterData(generateData, {
    dryRun = false,
    prepare,
    recordSnapshot,
    sentinel = TRANSCRIPT_RECALL_SENTINEL,
} = {}) {
    if (dryRun) return Object.freeze({ state: 'NOT_APPLICABLE', reason: 'DRY_RUN' });
    if (typeof prepare !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'RECALL_PREPARER_UNAVAILABLE' });
    let prepared;
    try { prepared = await prepare(generateData); } catch { return Object.freeze({ state: 'REFUSED', reason: 'RECALL_PREPARATION_FAILED' }); }
    if (!prepared || prepared.state !== 'APPROVED' || typeof prepared.bundleText !== 'string' || !prepared.bundleText.length) {
        return Object.freeze({ state: 'REFUSED', reason: prepared?.reason || 'RECALL_NOT_APPROVED', requestId: prepared?.requestId || '' });
    }
    const replacement = replaceTranscriptRecallSentinel(generateData, { sentinel, bundleText: prepared.bundleText });
    if (replacement.state !== 'REPLACED') return Object.freeze({ state: 'REFUSED', reason: replacement.reason, requestId: prepared.requestId || '' });
    const postcondition = verifyTranscriptRecallReplacement(generateData, { sentinel, bundleText: prepared.bundleText });
    if (postcondition.state !== 'VERIFIED') return Object.freeze({ state: 'REFUSED', reason: 'SENTINEL_REPLACEMENT_POSTCONDITION_FAILED', requestId: prepared.requestId || '' });
    if (typeof recordSnapshot === 'function') {
        try { await recordSnapshot({ prepared, generateData }); } catch { return Object.freeze({ state: 'REFUSED', reason: 'DISPATCH_SNAPSHOT_FAILED', requestId: prepared.requestId || '' }); }
    }
    return Object.freeze({ state: 'MATERIALIZED', reason: 'EXACT_APPROVED_BUNDLE_MATERIALIZED', requestId: prepared.requestId || '', bundleHash: prepared.bundleHash || null });
}

export function installHostRecallAfterDataCompatibility({ eventSource, eventType, prepare, recordSnapshot, sentinel = TRANSCRIPT_RECALL_SENTINEL } = {}) {
    if (!eventSource || !eventType || typeof prepare !== 'function') return false;
    const handler = (generateData, dryRun) => handleHostRecallAfterData(generateData, { dryRun, prepare, recordSnapshot, sentinel });
    if (typeof eventSource.makeLast === 'function') {
        eventSource.makeLast(eventType, handler);
    } else if (typeof eventSource.on === 'function') {
        eventSource.on(eventType, handler);
    } else return false;
    return true;
}
