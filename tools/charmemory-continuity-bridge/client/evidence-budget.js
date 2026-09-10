export const DEFAULT_CANDIDATE_LIMIT = 24;
export const MAX_CANDIDATE_LIMIT = 24;
export const DEFAULT_INJECTION_CHARACTER_LIMIT = 48_000;
export const MIN_INJECTION_CHARACTER_LIMIT = 1_000;
export const MAX_INJECTION_CHARACTER_LIMIT = 120_000;

function boundedInteger(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(minimum, Math.min(Math.floor(numeric), maximum));
}

// `resultLimit` was a bridge implementation default, never an operator-facing
// retrieval policy. Deliberately migrate it to an explicit evidence budget instead
// of preserving the accidental three-record ceiling forever.
export function normalizeEvidenceBudget(current) {
    const candidateLimit = boundedInteger(
        current.candidateLimit,
        DEFAULT_CANDIDATE_LIMIT,
        1,
        MAX_CANDIDATE_LIMIT,
    );
    const injectionCharacterLimit = boundedInteger(
        current.injectionCharacterLimit,
        DEFAULT_INJECTION_CHARACTER_LIMIT,
        MIN_INJECTION_CHARACTER_LIMIT,
        MAX_INJECTION_CHARACTER_LIMIT,
    );
    const changed = current.candidateLimit !== candidateLimit
        || current.injectionCharacterLimit !== injectionCharacterLimit
        || Object.hasOwn(current, 'resultLimit');

    current.candidateLimit = candidateLimit;
    current.injectionCharacterLimit = injectionCharacterLimit;
    delete current.resultLimit;
    return { candidateLimit, injectionCharacterLimit, changed };
}

// Keep each selected block whole. A later, smaller record may still fit after a
// larger candidate is skipped, but relative retrieval order is never changed.
export function selectEvidenceWithinCharacterBudget(results, characterLimit) {
    const selected = [];
    let usedCharacters = 0;
    for (const result of results || []) {
        const content = String(result?.content || '').trim();
        if (!content) continue;
        const separatorLength = selected.length ? 2 : 0;
        if (usedCharacters + separatorLength + content.length > characterLimit) continue;
        selected.push({ ...result, content });
        usedCharacters += separatorLength + content.length;
    }
    return { selected, usedCharacters };
}
