import { TRANSCRIPT_RECALL_SENTINEL } from './host-dispatch-sentinel.js';

export const TRANSCRIPT_RECALL_PROMPT_TAG = '5_shardwright_transcript_recall';

export function stageTranscriptRecallSentinel(setExtensionPrompt, {
    tag = TRANSCRIPT_RECALL_PROMPT_TAG,
    sentinel = TRANSCRIPT_RECALL_SENTINEL,
    position = 0,
    depth = 0,
} = {}) {
    if (typeof setExtensionPrompt !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'HOST_PROMPT_WRITER_UNAVAILABLE' });
    try {
        setExtensionPrompt(tag, sentinel, position, depth);
        return Object.freeze({ state: 'STAGED', tag, sentinel });
    } catch {
        return Object.freeze({ state: 'REFUSED', reason: 'HOST_PROMPT_STAGE_FAILED', tag });
    }
}

export function clearTranscriptRecallSentinel(setExtensionPrompt, { tag = TRANSCRIPT_RECALL_PROMPT_TAG, position = 0, depth = 0 } = {}) {
    if (typeof setExtensionPrompt !== 'function') return Object.freeze({ state: 'REFUSED', reason: 'HOST_PROMPT_WRITER_UNAVAILABLE' });
    try {
        setExtensionPrompt(tag, '', position, depth);
        return Object.freeze({ state: 'CLEARED', tag });
    } catch {
        return Object.freeze({ state: 'REFUSED', reason: 'HOST_PROMPT_CLEAR_FAILED', tag });
    }
}
