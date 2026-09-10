import {
    characters,
    eventSource,
    event_types,
    extension_prompt_roles,
    extension_prompt_types,
    getRequestHeaders,
    saveSettingsDebounced,
    setExtensionPrompt,
    this_chid,
} from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';
import { getDataBankAttachments } from '../../../chats.js';
import { BridgeStatus, createDiagnostics, isBridgeRefusal, updateDiagnostics } from './diagnostics.js';
import { claimNativeVectorHandoff } from './native-vector-handoff.js';
import { deriveCharMemorySourceId } from './source-identity.js';
import { describeStatus } from './status-view.js';
import { normalizeEvidenceBudget, selectEvidenceWithinCharacterBudget } from './evidence-budget.js';
import { formatEvidenceWithProvenance } from './provenance-view.js';
import { adoptShardwrightReranker, rerankCandidates } from './reranker-client.js';
import { readCurrentAttachment } from './source-custody.js';

const MODULE_NAME = 'charmemoryContinuityBridge';
const PROMPT_TAG = 'charmemory_continuity_bridge';
const API_ROOT = '/api/plugins/charmemory-continuity-bridge';
const STATUS_ELEMENT_ID = 'charmemory-continuity-bridge-status';
const diagnostics = createDiagnostics();

class BridgeRequestError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function settings() {
    extension_settings[MODULE_NAME] ??= {
        enabled: true,
        queryMessages: 2,
    };
    const current = extension_settings[MODULE_NAME];
    const budget = normalizeEvidenceBudget(current);
    const reranker = adoptShardwrightReranker(current, extension_settings.shardwright);
    return { ...current, ...budget, reranker: reranker.reranker, changed: budget.changed || reranker.changed };
}

function resolveSource() {
    const configuredName = String(extension_settings.charMemory?.fileName || '').trim().toLowerCase();
    const candidates = getDataBankAttachments(true).filter((attachment) => {
        const name = String(attachment?.name || '').toLowerCase();
        return configuredName ? name === configuredName : /(?:^|-)memories\.md$/i.test(name);
    });
    return candidates.length === 1 ? candidates[0] : null;
}

function resolveSourceId(source) {
    const avatar = characters[this_chid]?.avatar;
    return deriveCharMemorySourceId(avatar, source?.name);
}

function claimSourceHandoff(source, sourceId) {
    if (claimNativeVectorHandoff(extension_settings, MODULE_NAME, sourceId, source.url)) {
        saveSettingsDebounced();
    }
}

function claimActiveSourceHandoff() {
    const source = resolveSource();
    const sourceId = resolveSourceId(source);
    if (source && sourceId) claimSourceHandoff(source, sourceId);
}

function queryFromChat() {
    const count = Math.max(1, Math.min(Number(settings().queryMessages) || 2, 6));
    const chat = Array.isArray(getContext().chat) ? getContext().chat : [];
    return chat.slice(-count).map((message) => String(message?.mes || '')).join('\n').trim();
}

async function call(pathname, body) {
    const response = await fetch(`${API_ROOT}${pathname}`, {
        method: 'POST',
        headers: { ...getRequestHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
        throw new BridgeRequestError(payload?.code || 'CONTINUITY_UNEXPECTED', payload?.message || `Bridge request failed (${response.status})`);
    }
    return payload;
}

function record(patch) {
    const snapshot = updateDiagnostics(diagnostics, patch);
    renderStatus(snapshot);
    return snapshot;
}

function statusElement() {
    let element = document.getElementById(STATUS_ELEMENT_ID);
    if (element) return element;
    const stats = document.querySelector('.charMemory_settings .charMemory_statsBar');
    if (!stats) return null;
    element = document.createElement('div');
    element.id = STATUS_ELEMENT_ID;
    element.className = 'charmemory-continuity-bridge-status';
    element.setAttribute('role', 'status');
    stats.insertAdjacentElement('afterend', element);
    return element;
}

function renderStatus(snapshot) {
    const element = statusElement();
    if (!element) return;
    const view = describeStatus(snapshot);
    element.dataset.tone = view.tone;
    element.textContent = view.text;
    element.title = snapshot.sourceName ? `Source: ${snapshot.sourceName}` : 'CharMemory Continuity Bridge';
}

function publicResult(status) {
    const snapshot = record({ status });
    return { status, diagnostics: snapshot };
}

function clearRun(patch = {}) {
    return record({
        sourceIdentity: null,
        sourceName: null,
        sourceHash: null,
        sourceRevisionCount: null,
        queryPresent: false,
        matchedCount: 0,
        injectedCount: 0,
        syncElapsedMs: null,
        retrievalElapsedMs: null,
        rerankerApplied: false,
        rerankerReason: null,
        rerankerElapsedMs: null,
        lastError: null,
        refusalReason: null,
        ...patch,
    });
}

async function injectCurrentContinuity() {
    const current = settings();
    setExtensionPrompt(PROMPT_TAG, '', extension_prompt_types.IN_PROMPT, 0, false, extension_prompt_roles.SYSTEM);
    if (!current.enabled) {
        clearRun();
        return publicResult(BridgeStatus.DISABLED);
    }

    const source = resolveSource();
    if (!source) {
        clearRun();
        return publicResult(BridgeStatus.NO_SOURCE);
    }
    const sourceId = resolveSourceId(source);
    if (!sourceId) {
        clearRun({ sourceName: source.name, lastError: 'Character ownership identity is unavailable.' });
        return publicResult(BridgeStatus.ERROR);
    }
    claimSourceHandoff(source, sourceId);
    const query = queryFromChat();
    if (!query) {
        clearRun({ sourceIdentity: sourceId, sourceName: source.name });
        return publicResult(BridgeStatus.NO_QUERY);
    }
    record({
        status: BridgeStatus.RETRIEVING,
        sourceIdentity: sourceId,
        sourceName: source.name,
        queryPresent: true,
        matchedCount: 0,
        injectedCount: 0,
        syncElapsedMs: null,
        retrievalElapsedMs: null,
        rerankerApplied: false,
        rerankerReason: null,
        rerankerElapsedMs: null,
        lastError: null,
        refusalReason: null,
    });

    // A disabled Data Bank attachment remains available to CharMemory and this bridge,
    // but is excluded from native Vector Storage. The logical handoff is recorded by
    // this bridge and applied to each current attachment URL.
    if (!extension_settings.disabled_attachments?.includes(source.url)) {
        console.warn('[CharMemory Continuity Bridge] Waiting for the selected CharMemory file to be disabled in Data Bank so native Vector Storage cannot inject it too.');
        return publicResult(BridgeStatus.WAITING_FOR_HANDOFF);
    }

    try {
        const content = await readCurrentAttachment(fetch, source.url, getRequestHeaders());
        const syncStartedAt = performance.now();
        const sync = await call('/sync', { sourceId, content });
        const syncElapsedMs = Math.round(performance.now() - syncStartedAt);
        record({
            sourceHash: sync.source?.sourceHash || null,
            sourceRevisionCount: sync.source?.revisionCount ?? null,
            syncElapsedMs,
        });

        const retrievalStartedAt = performance.now();
        const result = await call('/search', { sourceId, query, limit: current.candidateLimit });
        const retrievalElapsedMs = Math.round(performance.now() - retrievalStartedAt);
        const matchedCount = result.results?.length || 0;
        record({ matchedCount, retrievalElapsedMs });
        if (!matchedCount) return publicResult(BridgeStatus.NO_MATCHES);

        const rerankerStartedAt = performance.now();
        const ranking = await rerankCandidates(query, result.results, current.reranker, { headers: getRequestHeaders() });
        const rerankerElapsedMs = Math.round(performance.now() - rerankerStartedAt);
        record({ rerankerApplied: ranking.applied, rerankerReason: ranking.reason || null, rerankerElapsedMs });
        const evidence = selectEvidenceWithinCharacterBudget(ranking.candidates, current.injectionCharacterLimit);
        if (!evidence.selected.length) return publicResult(BridgeStatus.NO_MATCHES);
        const memories = formatEvidenceWithProvenance(evidence.selected);
        setExtensionPrompt(
            PROMPT_TAG,
            `Relevant continuity from the character's editable memory:\n${memories}`,
            extension_prompt_types.IN_PROMPT,
            0,
            false,
            extension_prompt_roles.SYSTEM,
        );
        const snapshot = record({ status: BridgeStatus.INJECTED, injectedCount: evidence.selected.length });
        return { status: BridgeStatus.INJECTED, sourceName: source.name, resultCount: evidence.selected.length, diagnostics: snapshot };
    } catch (error) {
        const refused = isBridgeRefusal(error);
        const snapshot = record({
            status: refused ? BridgeStatus.REFUSED : BridgeStatus.ERROR,
            lastError: error?.message || 'Bridge retrieval failed.',
            refusalReason: refused ? error.code : null,
        });
        return { status: snapshot.status, sourceName: source.name, diagnostics: snapshot };
    }
}

// Owned diagnostic surface for proof and future health UI. It establishes no authority
// over the source; it only reports and invokes this extension's retrieval work.
globalThis.CharMemoryContinuityBridge = Object.freeze({
    version: '0.9.0',
    injectCurrentContinuity,
    getStatus: () => Object.freeze({ ...diagnostics }),
});

jQuery(async () => {
    if (settings().changed) saveSettingsDebounced();
    claimActiveSourceHandoff();
    renderStatus(diagnostics);
    eventSource.on(event_types.CHAT_CHANGED, claimActiveSourceHandoff);
    // GENERATION_AFTER_COMMANDS is the shared pre-prompt boundary for both text and
    // chat-completion APIs. GENERATE_BEFORE_COMBINE_PROMPTS is text-completion-only,
    // so subscribing there silently bypasses this bridge for chat-completion sessions.
    eventSource.on(event_types.GENERATION_AFTER_COMMANDS, async (_type, _options, dryRun) => {
        if (dryRun) return;
        try {
            await injectCurrentContinuity();
        } catch (error) {
            console.error('[CharMemory Continuity Bridge] Retrieval skipped:', error);
            setExtensionPrompt(PROMPT_TAG, '', extension_prompt_types.IN_PROMPT, 0, false, extension_prompt_roles.SYSTEM);
        }
    });
});
