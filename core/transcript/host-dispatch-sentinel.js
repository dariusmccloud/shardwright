export const TRANSCRIPT_RECALL_SENTINEL = '[Shardwright transcript recall sentinel]';

function replaceContent(content, sentinel, bundleText) {
    if (typeof content !== 'string' || !content.includes(sentinel)) return { content, replaced: false };
    return { content: content.split(sentinel).join(bundleText), replaced: true };
}

export function replaceTranscriptRecallSentinel(generateData, { sentinel = TRANSCRIPT_RECALL_SENTINEL, bundleText } = {}) {
    if (!generateData || typeof bundleText !== 'string' || !bundleText.length) return Object.freeze({ state: 'REFUSED', reason: 'SENTINEL_INPUT_INVALID' });
    if (typeof generateData.prompt === 'string') {
        const replacement = replaceContent(generateData.prompt, sentinel, bundleText);
        if (replacement.replaced) generateData.prompt = replacement.content;
        return Object.freeze({ state: replacement.replaced ? 'REPLACED' : 'REFUSED', reason: replacement.replaced ? 'SENTINEL_REPLACED' : 'SENTINEL_NOT_FOUND', replacedCount: replacement.replaced ? 1 : 0 });
    }
    if (Array.isArray(generateData.prompt)) {
        let replacedCount = 0;
        generateData.prompt = generateData.prompt.map((message) => {
            const replacement = replaceContent(message?.content, sentinel, bundleText);
            if (!replacement.replaced) return message;
            replacedCount += 1;
            return { ...message, content: replacement.content };
        });
        return Object.freeze({ state: replacedCount ? 'REPLACED' : 'REFUSED', reason: replacedCount ? 'SENTINEL_REPLACED' : 'SENTINEL_NOT_FOUND', replacedCount });
    }
    return Object.freeze({ state: 'REFUSED', reason: 'PROMPT_SHAPE_UNSUPPORTED', replacedCount: 0 });
}

export function verifyTranscriptRecallReplacement(generateData, { sentinel = TRANSCRIPT_RECALL_SENTINEL, bundleText } = {}) {
    const prompt = generateData?.prompt;
    const values = typeof prompt === 'string' ? [prompt] : Array.isArray(prompt) ? prompt.map((message) => message?.content) : [];
    const sentinelPresent = values.some((value) => typeof value === 'string' && value.includes(sentinel));
    const bundlePresent = typeof bundleText === 'string' && bundleText.length > 0
        && values.some((value) => typeof value === 'string' && value.includes(bundleText));
    return Object.freeze({ state: !sentinelPresent && bundlePresent ? 'VERIFIED' : 'REFUSED', reason: !sentinelPresent && bundlePresent ? 'SENTINEL_GONE_BUNDLE_PRESENT' : 'SENTINEL_REPLACEMENT_POSTCONDITION_FAILED', sentinelPresent, bundlePresent });
}
