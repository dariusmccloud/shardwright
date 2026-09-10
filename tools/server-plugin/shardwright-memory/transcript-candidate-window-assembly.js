// Read-only assembly of already selected candidate windows. It requires an explicit
// source occurrence anchor for every document so shared text never silently chooses a
// preferred branch, chat, or revision. It performs no scoring, reranking, or injection.

import { createError } from './core.js';
import { reconstructTranscriptContextWindow } from './transcript-context-window.js';

function assertAssembly(request) {
    if (!request?.selection || !Array.isArray(request.anchors) || !Number.isInteger(request.before) || request.before < 0 || !Number.isInteger(request.after) || request.after < 0) {
        throw createError(400, 'Candidate-window assembly requires selection, explicit anchors, and non-negative bounds.', 'TIR_ASSEMBLY_REQUEST_INVALID');
    }
    const { selection } = request;
    if (selection.state === 'NO_QUERY' || selection.state === 'NO_MATCH') return selection;
    if (selection.state !== 'CANDIDATES' || !Array.isArray(selection.candidates) || typeof selection.characterInstanceId !== 'string' || typeof selection.posture !== 'string') {
        throw createError(400, 'A complete candidate-selection result is required.', 'TIR_ASSEMBLY_SELECTION_INVALID');
    }
    const expected = new Set(selection.candidates.map((candidate) => candidate.documentId));
    const anchors = new Map();
    for (const anchor of request.anchors) {
        if (!anchor?.documentId || !anchor?.anchorMessageRecordId || !expected.has(anchor.documentId) || anchors.has(anchor.documentId)) {
            throw createError(409, 'Each selected document requires one unambiguous explicit anchor occurrence.', 'TIR_ASSEMBLY_ANCHOR_INVALID');
        }
        anchors.set(anchor.documentId, anchor.anchorMessageRecordId);
    }
    if (anchors.size !== expected.size) {
        throw createError(409, 'Candidate-window assembly cannot choose a source occurrence implicitly.', 'TIR_ASSEMBLY_ANCHOR_REQUIRED');
    }
    return { selection, anchors };
}

export function assembleTranscriptCandidateWindows(paths, request) {
    const validated = assertAssembly(request);
    if (validated.state === 'NO_QUERY' || validated.state === 'NO_MATCH') {
        return Object.freeze({ state: validated.state, characterInstanceId: validated.characterInstanceId, posture: validated.posture, windows: Object.freeze([]) });
    }
    const { selection, anchors } = validated;
    const windows = selection.candidates.map((candidate) => Object.freeze({
        documentId: candidate.documentId,
        contentHash: candidate.contentHash,
        admissionScope: candidate.admissionScope,
        anchorMessageRecordId: anchors.get(candidate.documentId),
        window: reconstructTranscriptContextWindow(paths, {
            characterInstanceId: selection.characterInstanceId,
            posture: selection.posture,
            documentId: candidate.documentId,
            anchorMessageRecordId: anchors.get(candidate.documentId),
            before: request.before,
            after: request.after,
        }),
    }));
    return Object.freeze({
        state: 'WINDOWS', characterInstanceId: selection.characterInstanceId, posture: selection.posture,
        availableCandidateCount: selection.availableCandidateCount, candidateLimit: selection.candidateLimit,
        truncated: selection.truncated, windows: Object.freeze(windows),
    });
}
