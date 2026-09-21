// Deterministic presentation of already-assembled source windows. This is a
// projection, not an interpretation: every row remains source-tethered and no
// row is deduplicated, summarized, ranked, or truncated here.

import { createError } from './core.js';

export const TRANSCRIPT_MATERIALIZATION_CEILING_DEFAULT = 1_000_000;

function assertWindows(input) {
    if (!input || input.state !== 'WINDOWS' || !Array.isArray(input.windows) || input.windows.length === 0) {
        throw createError(409, 'A non-empty assembled window result is required.', 'TIR_BUNDLE_WINDOWS_REQUIRED');
    }
    for (const entry of input.windows) {
        if (!entry?.documentId || !entry?.anchorMessageRecordId || !entry.window || !Array.isArray(entry.window.rows)) {
            throw createError(409, 'Every bundle window requires document, anchor, and rows custody.', 'TIR_BUNDLE_WINDOW_INVALID');
        }
        for (const row of entry.window.rows) {
            if (!row?.messageRecordId || !row.sourceLogicalId || !row.sourceRevisionHash || !Number.isInteger(row.sourceLocalOrder) || typeof row.senderName !== 'string' || typeof row.timestampTier !== 'string' || typeof row.visibilityState !== 'string') {
                throw createError(409, 'Every bundle row requires complete source custody metadata.', 'TIR_BUNDLE_ROW_INVALID');
            }
            if (row.contentIncluded && typeof row.completeContent !== 'string') {
                throw createError(409, 'An included bundle row must retain complete source content.', 'TIR_BUNDLE_CONTENT_INVALID');
            }
        }
    }
    return input;
}

function renderRowPrefix(row) {
    const timestamp = row.timestampValue === null || row.timestampValue === undefined ? 'UNAVAILABLE' : String(row.timestampValue);
    return `[message ${row.messageRecordId} | source ${row.sourceLogicalId} | revision ${row.sourceRevisionHash} | order ${row.sourceLocalOrder} | sender ${row.senderName} | timestamp ${timestamp} | timestampTier ${row.timestampTier} | visibility ${row.visibilityState}]\n`;
}

export function buildTranscriptRecallBundle(assembly, materializationCeilingCharacters) {
    const ceiling = materializationCeilingCharacters === undefined
        ? TRANSCRIPT_MATERIALIZATION_CEILING_DEFAULT
        : materializationCeilingCharacters;
    if (!Number.isSafeInteger(ceiling) || ceiling <= 0) {
        throw createError(400, 'A positive materialization character ceiling is required.', 'TIR_MATERIALIZATION_CEILING_INVALID');
    }
    const input = assertWindows(assembly);
    const posture = input.windows[0]?.window?.posture || input.posture || 'UNKNOWN';
    const rowCount = input.windows.reduce((count, entry) => count + entry.window.rows.length, 0);
    const chunks = [];
    let renderedLength = 0;
    const append = (chunk) => {
        if (renderedLength + chunk.length > ceiling) {
            throw createError(409, 'The complete custody-preserving bundle exceeds the configured materialization ceiling.', 'TIR_MATERIALIZATION_CHARACTER_CEILING_EXCEEDED');
        }
        chunks.push(chunk);
        renderedLength += chunk.length;
    };
    append(`[Transcript Recall Evidence | state EVIDENCE_PRESENT | posture ${posture} | windows ${input.windows.length} | rows ${rowCount}]`);
    input.windows.forEach((entry, index) => {
        append(`\n\n[Transcript Recall Window ${index + 1} | document ${entry.documentId} | anchor ${entry.anchorMessageRecordId}]`);
        entry.window.rows.forEach((row) => {
            append('\n');
            append(renderRowPrefix(row));
            append(row.contentIncluded ? row.completeContent : '[CONTENT OMITTED: source visibility does not permit continuity presentation]');
        });
    });
    const bundleText = chunks.join('');
    if (renderedLength > ceiling) {
        throw createError(409, 'The complete custody-preserving bundle exceeds the configured materialization ceiling.', 'TIR_MATERIALIZATION_CHARACTER_CEILING_EXCEEDED');
    }
    return Object.freeze({
        state: 'BUNDLE', evidenceState: 'EVIDENCE_PRESENT', posture,
        windowCount: input.windows.length,
        rowCount,
        bundleText,
    });
}
