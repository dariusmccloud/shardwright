import { getRequestHeaders } from '../../../../../../script.js';
import { resolveRagRerankerApiKey } from './rag-secrets.js';
import { ragLog } from '../logger.js';

const PLUGIN_RERANK_URL = '/api/plugins/similharity/rerank';

function summarize(value, max = 120) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function toScore(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function resolveScore(entry) {
    if (!entry || typeof entry !== 'object') return null;
    return toScore(
        entry.score
        ?? entry.relevance_score
        ?? entry.relevanceScore
        ?? entry.similarity
        ?? entry.value,
    );
}

function resolveEntryIndex(entry, fallbackIndex, maxLength) {
    const candidates = [
        entry?.index,
        entry?.idx,
        entry?.documentIndex,
        entry?.document_index,
        entry?.position,
    ];

    for (const candidate of candidates) {
        const idx = Number(candidate);
        if (Number.isInteger(idx) && idx >= 0 && idx < maxLength) {
            return idx;
        }
    }

    if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < maxLength) {
        return fallbackIndex;
    }

    return -1;
}

function extractRankingRows(payload, expectedLength) {
    const rows = Array.from({ length: expectedLength }, (_, index) => ({
        index,
        score: null,
        rank: Number.POSITIVE_INFINITY,
    }));

    const directScores = Array.isArray(payload?.scores) ? payload.scores : null;
    if (directScores) {
        const limit = Math.min(expectedLength, directScores.length);
        for (let i = 0; i < limit; i++) {
            const score = toScore(directScores[i]);
            rows[i] = { index: i, score, rank: i };
        }
        return rows;
    }

    const entries = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload?.results)
            ? payload.results
            : (Array.isArray(payload?.data) ? payload.data : []));

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const idx = resolveEntryIndex(entry, i, expectedLength);
        if (idx < 0) continue;
        const score = resolveScore(entry);

        if (score !== null) {
            const current = rows[idx];
            if (current.score === null || score > current.score) {
                rows[idx] = { index: idx, score, rank: i };
            }
        } else if (!Number.isFinite(rows[idx].rank)) {
            rows[idx] = { index: idx, score: null, rank: i };
        }
    }

    return rows;
}

/** Direct-mode re-ranker providers that call the API from the browser. */
const DIRECT_RERANKER_PROVIDERS = new Set(['custom', 'openrouter', 'linkapi']);

/** Default base URLs for direct re-ranker providers (fallback when user hasn't set a custom URL). */
const DIRECT_RERANKER_DEFAULT_URLS = {
    openrouter: 'https://openrouter.ai/api/v1',
    linkapi: 'https://api.linkapi.ai/v1',
};

function normalizeMode(ragSettings) {
    const provider = String(ragSettings?.reranker?.provider || '').trim().toLowerCase();
    return DIRECT_RERANKER_PROVIDERS.has(provider) ? 'direct' : 'similharity';
}

function buildPassthroughResult(documents, mode, target, error = '') {
    return {
        success: false,
        mode,
        target,
        error: summarize(error),
        diagnostics: {
            passthrough: true,
            payloadKeys: [],
            hasDirectScores: false,
            rankedEntryCount: 0,
            scoredEntryCount: 0,
            rawPreview: '',
        },
        ranked: (documents || []).map((document, index) => ({
            index,
            document,
            score: null,
        })),
    };
}

/**
 * Re-rank document strings using configured re-ranker provider.
 * @param {string} query
 * @param {Array<string>} documents
 * @param {Object} ragSettings
 * @param {Object} [options={}]
 * @returns {Promise<{success: boolean, mode: string, target: string, error: string, ranked: Array<{index:number,document:string,score:number|null}>}>}
 */
export async function rerankDocuments(query, documents, ragSettings, options = {}) {
    const safeQuery = String(query || '').trim();
    const safeDocs = Array.isArray(documents)
        ? documents.map(document => String(document || ''))
        : [];
    const reranker = ragSettings?.reranker || {};
    const mode = normalizeMode(ragSettings);
    const provider = String(reranker.provider || '').trim().toLowerCase();
    const apiUrl = String(reranker.apiUrl || '').trim()
        || DIRECT_RERANKER_DEFAULT_URLS[provider]
        || '';
    const target = mode === 'similharity' ? PLUGIN_RERANK_URL : apiUrl;

        if (!reranker.enabled || !safeQuery || safeDocs.length === 0) {
            return {
                success: true,
                mode,
                target,
                error: '',
                diagnostics: {
                    passthrough: true,
                    payloadKeys: [],
                    hasDirectScores: false,
                    rankedEntryCount: 0,
                    scoredEntryCount: 0,
                    rawPreview: '',
                },
                ranked: safeDocs.map((document, index) => ({ index, document, score: null })),
            };
        }

    if (!apiUrl) {
        return buildPassthroughResult(safeDocs, mode, target, 'Missing re-ranker API URL');
    }

    const topK = Math.max(1, Math.min(safeDocs.length, Number(options.topK) || safeDocs.length));
    const model = String(reranker.model || '').trim();
    const overrideApiKey = String(options?.apiKeyOverride || '').trim();
    const apiKey = overrideApiKey || await resolveRagRerankerApiKey(ragSettings);

    try {
        const requestBody = {
            query: safeQuery,
            documents: safeDocs,
            top_k: topK,
            model,
        };

        let response;
        if (mode === 'direct') {
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) {
                headers.Authorization = `Bearer ${apiKey}`;
            }
            // Normalize URL: append /rerank if not already present
            const directUrl = apiUrl.endsWith('/rerank') ? apiUrl
                : apiUrl.replace(/\/+$/, '') + '/rerank';
            response = await fetch(directUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
            });
        } else {
            response = await fetch(PLUGIN_RERANK_URL, {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    ...requestBody,
                    apiUrl,
                    ...(apiKey ? { apiKey } : {}),
                }),
            });
        }

        const rawText = await response.text();
        if (!response.ok) {
            return buildPassthroughResult(
                safeDocs,
                mode,
                target,
                `HTTP ${response.status}${rawText ? `: ${rawText}` : ''}`,
            );
        }

        let payload = {};
        try {
            payload = rawText ? JSON.parse(rawText) : {};
        } catch (_error) {
            payload = {};
        }

        const payloadKeys = Array.isArray(payload)
            ? ['(array)']
            : (payload && typeof payload === 'object'
                ? Object.keys(payload).slice(0, 12)
                : []);
        const directScores = Array.isArray(payload?.scores) ? payload.scores : null;
        const rankedEntries = Array.isArray(payload)
            ? payload
            : (Array.isArray(payload?.results)
                ? payload.results
                : (Array.isArray(payload?.data) ? payload.data : []));

        const rankingRows = extractRankingRows(payload, safeDocs.length);
        const ranked = rankingRows.map(row => ({
            index: row.index,
            document: safeDocs[row.index],
            score: toScore(row.score),
            _rank: Number.isFinite(row.rank) ? row.rank : Number.POSITIVE_INFINITY,
        }));

        ranked.sort((a, b) => {
            const aHasScore = a.score !== null;
            const bHasScore = b.score !== null;
            if (aHasScore && bHasScore) {
                const delta = (b.score ?? 0) - (a.score ?? 0);
                if (delta !== 0) return delta;
                const rankDelta = a._rank - b._rank;
                if (rankDelta !== 0) return rankDelta;
                return a.index - b.index;
            }
            if (aHasScore !== bHasScore) {
                return aHasScore ? -1 : 1;
            }
            const rankDelta = a._rank - b._rank;
            if (rankDelta !== 0) return rankDelta;
            return a.index - b.index;
        });

        return {
            success: true,
            mode,
            target,
            error: '',
            diagnostics: {
                passthrough: false,
                payloadKeys,
                hasDirectScores: !!directScores,
                rankedEntryCount: rankedEntries.length,
                scoredEntryCount: rankingRows.filter(row => row.score !== null).length,
                rawPreview: summarize(rawText, 400),
            },
            ranked: ranked.map(({ _rank, ...entry }) => entry),
        };
    } catch (error) {
        ragLog.warn('Re-ranker request failed:', error?.message || error);
        return buildPassthroughResult(safeDocs, mode, target, error?.message || String(error));
    }
}

/**
 * @param {Object} ragSettings
 * @returns {Promise<{enabled: boolean, healthy: boolean, statusText: string}>}
 */
export async function checkRerankerHealth(ragSettings) {
    const reranker = ragSettings?.reranker || {};
    const enabled = !!reranker.enabled;
    const mode = normalizeMode(ragSettings);
    const modeText = mode === 'direct' ? 'direct' : 'similharity';
    const provider = String(reranker.provider || '').trim().toLowerCase();
    const apiUrl = String(reranker.apiUrl || '').trim()
        || DIRECT_RERANKER_DEFAULT_URLS[provider]
        || '';
    const model = String(reranker.model || '').trim() || 'default';

    if (!enabled) {
        return {
            enabled: false,
            healthy: true,
            statusText: `Disabled - mode ${modeText}; model ${model}`,
        };
    }

    if (!apiUrl) {
        return {
            enabled: true,
            healthy: false,
            statusText: `Unhealthy - missing API URL; mode ${modeText}; model ${model}`,
        };
    }

    const result = await rerankDocuments(
        'health check',
        ['ping', 'pong'],
        ragSettings,
        { topK: 2 },
    );

    if (!result.success) {
        return {
            enabled: true,
            healthy: false,
            statusText: `Unhealthy - ${summarize(result.error || 'request failed')}; mode ${modeText}; model ${model}`,
        };
    }

    return {
        enabled: true,
        healthy: true,
        statusText: `Healthy - mode ${modeText}; model ${model}`,
    };
}

/**
 * Execute a quick explicit re-ranker connectivity test.
 * @param {Object} ragSettings
 * @param {{ apiKeyOverride?: string }} [options={}] - Optional runtime API key override
 * @returns {Promise<{success: boolean, mode: string, target: string, message: string}>}
 */
export async function testRerankerConnection(ragSettings, options = {}) {
    const reranker = ragSettings?.reranker || {};
    const mode = normalizeMode(ragSettings);
    const modeText = mode === 'direct' ? 'direct' : 'similharity';
    const provider = String(reranker.provider || '').trim().toLowerCase();
    const resolvedUrl = String(reranker.apiUrl || '').trim()
        || DIRECT_RERANKER_DEFAULT_URLS[provider]
        || '';
    const target = mode === 'direct' ? resolvedUrl : PLUGIN_RERANK_URL;

    if (!reranker.enabled) {
        return {
            success: false,
            mode,
            target,
            message: 'Re-ranker is disabled.',
        };
    }

    if (!resolvedUrl) {
        return {
            success: false,
            mode,
            target,
            message: 'Re-ranker API URL is missing.',
        };
    }

    const result = await rerankDocuments(
        'connection test',
        ['alpha', 'beta'],
        ragSettings,
        {
            topK: 2,
            apiKeyOverride: options?.apiKeyOverride || '',
        },
    );

    if (!result.success) {
        return {
            success: false,
            mode,
            target,
            message: summarize(result.error || `Re-ranker request failed (${modeText})`),
        };
    }

    return {
        success: true,
        mode,
        target,
        message: `passed (${modeText})`,
    };
}
