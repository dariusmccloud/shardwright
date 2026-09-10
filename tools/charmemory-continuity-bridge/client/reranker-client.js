const SECRET_KEY = 'api_key_custom';
const SIMILHARITY_PROXY_URL = '/api/plugins/similharity/rerank';

function boundedInteger(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(minimum, Math.min(Math.floor(numeric), maximum));
}

function profileFor(source) {
    return source?.sharderMode === false ? source?.ragStandard : source?.rag;
}

function normalizedReranker(value) {
    if (!value || typeof value !== 'object') return null;
    const provider = String(value.provider || '').trim().toLowerCase();
    const apiUrl = String(value.apiUrl || '').trim();
    const secretId = String(value.secretId || '').trim();
    if (!value.enabled || provider !== 'similharity' || !apiUrl || !secretId) return null;
    return {
        enabled: true,
        provider,
        apiUrl,
        model: String(value.model || '').trim(),
        secretId,
    };
}

// The bridge copies only the capability reference (never its secret value) so a
// later Shardwright settings change cannot silently change bridge behavior.
export function adoptShardwrightReranker(current, shardwright) {
    const existing = normalizedReranker(current.reranker);
    if (existing) return { reranker: existing, changed: false, adopted: false };

    const adopted = normalizedReranker(profileFor(shardwright)?.reranker);
    if (!adopted) {
        current.reranker ??= { enabled: false };
        return { reranker: current.reranker, changed: false, adopted: false };
    }

    current.reranker = { ...adopted, adoptedFrom: 'shardwright-once' };
    return { reranker: current.reranker, changed: true, adopted: true };
}

function score(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function rankingRows(payload, candidateCount) {
    const rows = Array.from({ length: candidateCount }, (_, index) => ({ index, score: null, order: Number.POSITIVE_INFINITY }));
    const directScores = Array.isArray(payload?.scores) ? payload.scores : null;
    if (directScores) {
        directScores.slice(0, candidateCount).forEach((value, index) => {
            rows[index] = { index, score: score(value), order: index };
        });
        return rows;
    }

    const entries = Array.isArray(payload) ? payload
        : (Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload?.data) ? payload.data : []));
    entries.forEach((entry, order) => {
        const index = Number(entry?.index ?? entry?.idx ?? entry?.documentIndex ?? entry?.document_index ?? order);
        if (!Number.isInteger(index) || index < 0 || index >= candidateCount) return;
        const value = score(entry?.score ?? entry?.relevance_score ?? entry?.relevanceScore ?? entry?.similarity);
        if (value !== null) rows[index] = { index, score: value, order };
    });
    return rows;
}

async function resolveSecret(secretId, fetchImpl, headers) {
    const response = await fetchImpl('/api/secrets/find', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SECRET_KEY, id: secretId }),
    });
    if (!response.ok) return '';
    const payload = await response.json();
    return String(payload?.value || '');
}

function fallback(candidates, reason) {
    return { applied: false, candidates: [...candidates], reason };
}

export async function rerankCandidates(query, candidates, reranker, options = {}) {
    const safeCandidates = Array.isArray(candidates) ? candidates : [];
    const config = normalizedReranker(reranker);
    if (!config || safeCandidates.length < 2) return fallback(safeCandidates, 'not configured');

    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const headers = options.headers || {};
    try {
        const apiKey = await resolveSecret(config.secretId, fetchImpl, headers);
        if (!apiKey) return fallback(safeCandidates, 'credential unavailable');

        const response = await fetchImpl(SIMILHARITY_PROXY_URL, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiUrl: config.apiUrl,
                apiKey,
                model: config.model,
                query: String(query || '').trim(),
                documents: safeCandidates.map(candidate => String(candidate?.content || '')),
                top_k: boundedInteger(config.topK, safeCandidates.length, 1, safeCandidates.length),
            }),
        });
        if (!response.ok) return fallback(safeCandidates, `reranker HTTP ${response.status}`);
        const payload = await response.json();
        const rows = rankingRows(payload, safeCandidates.length);
        if (!rows.some(row => row.score !== null)) return fallback(safeCandidates, 'reranker returned no usable scores');

        const ordered = rows
            .sort((left, right) => (right.score ?? -Infinity) - (left.score ?? -Infinity) || left.order - right.order || left.index - right.index)
            .map(row => ({ ...safeCandidates[row.index], rerankerScore: row.score }));
        return { applied: true, candidates: ordered, reason: '' };
    } catch (error) {
        return fallback(safeCandidates, String(error?.message || 'reranker request failed'));
    }
}
