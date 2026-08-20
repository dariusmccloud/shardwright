/**
 * Collection Manager Modal
 * Overview-first UI for additive collection reads and explicit write targets.
 */

import { Popup, POPUP_TYPE } from '../../../../../../popup.js';
import { getThumbnailUrl } from '../../../../../../../script.js';
import { extension_settings } from '../../../../../../extensions.js';
import {
    getCharacterBinding,
    getChatBinding,
    getShardCollectionId,
    getStandardCollectionId,
    listAllCollections,
    setCharacterBinding,
    setChatBinding,
} from '../../../core/rag/index.js';
import { saveSettings } from '../../../core/settings.js';
import { ragLog } from '../../../core/logger.js';

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncate(text, max = 60) {
    const v = String(text || '').trim();
    return v.length > max ? `${v.slice(0, max - 1)}...` : v;
}

function normalizeChatId(chatId) {
    return String(chatId || '').trim().replace(/\.jsonl$/i, '').replace(/\.json$/i, '').trim();
}

function dedupe(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(v => String(v || '').trim()).filter(Boolean))];
}

function getDraftState(charDraft, chatDraft, ownCollectionId) {
    const characterCollections = dedupe(charDraft.collections);
    const chatCollections = dedupe(chatDraft.collections);
    const effectiveReadIds = dedupe([...characterCollections, ...chatCollections, ownCollectionId || '']);

    const sourceMap = {};
    for (const id of characterCollections) {
        if (!sourceMap[id]) sourceMap[id] = [];
        sourceMap[id].push('character');
    }
    for (const id of chatCollections) {
        if (!sourceMap[id]) sourceMap[id] = [];
        if (!sourceMap[id].includes('chat')) sourceMap[id].push('chat');
    }
    if (ownCollectionId) {
        if (!sourceMap[ownCollectionId]) sourceMap[ownCollectionId] = [];
        if (!sourceMap[ownCollectionId].includes('own')) sourceMap[ownCollectionId].push('own');
    }

    const duplicateIds = Object.entries(sourceMap)
        .filter(([, sources]) => sources.includes('character') && sources.includes('chat'))
        .map(([id]) => id);

    const validTargets = new Set(effectiveReadIds);
    let effectiveWriteTarget = ownCollectionId || '';
    let effectiveWriteSource = ownCollectionId ? 'own' : '';

    if (chatDraft.writeTarget && validTargets.has(chatDraft.writeTarget)) {
        effectiveWriteTarget = chatDraft.writeTarget;
        effectiveWriteSource = 'chat';
    } else if (charDraft.writeTarget && validTargets.has(charDraft.writeTarget)) {
        effectiveWriteTarget = charDraft.writeTarget;
        effectiveWriteSource = 'character';
    } else if (!effectiveWriteTarget && effectiveReadIds.length > 0) {
        effectiveWriteTarget = effectiveReadIds[0];
        effectiveWriteSource = sourceMap[effectiveWriteTarget]?.[0] || '';
    }

    const staleIds = dedupe([
        ...characterCollections,
        ...chatCollections,
        charDraft.writeTarget,
        chatDraft.writeTarget,
    ]);

    return {
        characterCollections,
        chatCollections,
        effectiveReadIds,
        sourceMap,
        duplicateIds,
        effectiveWriteTarget,
        effectiveWriteSource,
        staleIds,
    };
}

function getWriteScopeLabel(source) {
    if (source === 'chat') return 'Chat collection';
    if (source === 'character') return 'Character collection';
    return 'Own collection';
}

function renderSourceBadges(sources) {
    const order = ['character', 'chat', 'own'];
    return order
        .filter(source => Array.isArray(sources) && sources.includes(source))
        .map(source => `<span class="shardwright-cm-source-badge shardwright-cm-source-${source}">${escapeHtml(source)}</span>`)
        .join('');
}

function renderEditableRow(collectionId, chunkCount, extraBadges = '') {
    const chunksText = typeof chunkCount === 'number' ? `${chunkCount} chunks` : '';
    return `
        <div class="shardwright-cm-row" data-collection-id="${escapeHtml(collectionId)}">
            <div class="shardwright-cm-row-main">
                <span class="shardwright-cm-row-id" title="${escapeHtml(collectionId)}">${escapeHtml(truncate(collectionId, 70))}</span>
                <div class="shardwright-cm-row-badges">${extraBadges}</div>
            </div>
            <span class="shardwright-cm-row-chunks">${escapeHtml(chunksText)}</span>
            <button class="shardwright-cm-row-remove menu_button" type="button" title="Remove this collection">&times;</button>
        </div>
    `;
}

function renderOverviewReadRow(collectionId, chunkCount, sources) {
    const chunksText = typeof chunkCount === 'number' ? `${chunkCount} chunks` : '';
    const badges = [renderSourceBadges(sources)];
    if (chunkCount === 0) {
        badges.push('<span class="shardwright-cm-source-badge shardwright-cm-source-warning">0 chunks</span>');
    }
    return `
        <div class="shardwright-cm-overview-row">
            <div class="shardwright-cm-overview-main">
                <span class="shardwright-cm-row-id" title="${escapeHtml(collectionId)}">${escapeHtml(truncate(collectionId, 76))}</span>
                <div class="shardwright-cm-row-badges">${badges.join('')}</div>
            </div>
            <span class="shardwright-cm-row-chunks">${escapeHtml(chunksText)}</span>
        </div>
    `;
}

function buildModalHtml(ctx) {
    const {
        charName,
        charAvatar,
        currentChatId,
        isSharder,
        ownCollectionId,
    } = ctx;
    const modeClass = isSharder ? 'shardwright-rag-mode-sharder' : 'shardwright-rag-mode-standard';
    const modeLabel = isSharder ? 'Sharder' : 'Standard';

    return `
        <div class="shardwright-collection-manager-modal">
            <h3 class="shardwright-rag-title">
                Collection Manager
                <span class="shardwright-rag-mode-badge ${modeClass}">${escapeHtml(modeLabel)}</span>
            </h3>

            <div class="shardwright-cm-context-grid">
                <div class="shardwright-cm-context-card">
                    <div class="shardwright-cm-context-label">Character</div>
                    <div class="shardwright-cm-context-row">
                        ${charAvatar ? `<img class="shardwright-cm-context-avatar" src="${escapeHtml(charAvatar)}" alt="" />` : ''}
                        <span class="shardwright-cm-context-name">${escapeHtml(charName || 'No active character')}</span>
                    </div>
                </div>
                <div class="shardwright-cm-context-card">
                    <div class="shardwright-cm-context-label">Chat</div>
                    <div class="shardwright-cm-context-row">
                        <i class="fa-solid fa-comment shardwright-cm-chat-icon"></i>
                        <span class="shardwright-cm-context-name">${escapeHtml(currentChatId || 'No active chat')}</span>
                    </div>
                </div>
            </div>

            <div class="shardwright-cm-overview-card">
                <div class="shardwright-cm-section-title">Effective Behavior</div>
                <p class="shardwright-hint shardwright-rag-inline-hint">Current read and write behavior for this chat.</p>
                <div class="shardwright-cm-overview-block">
                    <div class="shardwright-cm-section-title">Reads</div>
                    <div id="shardwright-cm-overview-reads" class="shardwright-cm-list"></div>
                </div>
                <div class="shardwright-cm-overview-block">
                    <div class="shardwright-cm-section-title">Write Target</div>
                    <div id="shardwright-cm-overview-write" class="shardwright-cm-write-target"></div>
                    <select id="shardwright-cm-overview-write-select" class="text_pole shardwright-cm-add-select shardwright-cm-write-target-select"></select>
                    <p id="shardwright-cm-overview-write-hint" class="shardwright-hint shardwright-rag-inline-hint"></p>
                </div>
                <div class="shardwright-cm-overview-block">
                    <div class="shardwright-cm-section-title">Warnings</div>
                    <div id="shardwright-cm-overview-warnings" class="shardwright-cm-list"></div>
                </div>
            </div>

            <details class="shardwright-cm-accordion">
                <summary class="shardwright-cm-accordion-summary">
                    <span>Character Collections</span>
                    <span class="shardwright-cm-accordion-hint shardwright-hint">Shared reads for this character</span>
                </summary>
                <div class="shardwright-cm-accordion-body">
                    <div id="shardwright-cm-char-list" class="shardwright-cm-list"></div>
                    <div class="shardwright-cm-add-row">
                        <select id="shardwright-cm-char-add-select" class="text_pole shardwright-cm-add-select">
                            <option value="">Select a collection...</option>
                        </select>
                        <button id="shardwright-cm-char-add-btn" class="menu_button" type="button">Add</button>
                    </div>
                </div>
            </details>

            <details class="shardwright-cm-accordion">
                <summary class="shardwright-cm-accordion-summary">
                    <span>Chat Collections</span>
                    <span class="shardwright-cm-accordion-hint shardwright-hint">Extra reads for this chat</span>
                </summary>
                <div class="shardwright-cm-accordion-body">
                    <div id="shardwright-cm-chat-list" class="shardwright-cm-list"></div>
                    <div class="shardwright-cm-add-row">
                        <select id="shardwright-cm-chat-add-select" class="text_pole shardwright-cm-add-select">
                            <option value="">Select a collection...</option>
                        </select>
                        <button id="shardwright-cm-chat-add-btn" class="menu_button" type="button">Add</button>
                    </div>
                </div>
            </details>

            <div class="shardwright-cm-footer">
                <button id="shardwright-cm-save" class="menu_button" type="button">
                    <i class="fa-solid fa-floppy-disk"></i> Save
                </button>
            </div>

            <input type="hidden" id="shardwright-cm-own-collection" value="${escapeHtml(ownCollectionId || '')}" />
        </div>
    `;
}

export async function openCollectionManagerModal(settings) {
    const ctx = SillyTavern.getContext();
    const charIdx = ctx?.characterId;
    const char = (charIdx !== undefined && charIdx !== null) ? ctx?.characters?.[charIdx] : null;
    const charName = char?.name ?? null;
    const charAvatar = char?.avatar ? getThumbnailUrl('avatar', char.avatar) : null;
    const charAvatarKey = char?.avatar ?? null;
    const currentChatId = normalizeChatId(ctx?.chatId ?? '');
    const isSharder = settings?.sharderMode === true;
    const ownCollectionId = currentChatId
        ? (isSharder ? getShardCollectionId(currentChatId) : getStandardCollectionId(currentChatId))
        : '';

    const ss = extension_settings?.shardwright;
    const existingCharBinding = charAvatarKey ? getCharacterBinding(charAvatarKey, ss) : null;
    const existingChatBinding = currentChatId ? getChatBinding(currentChatId, ss) : null;

    const charDraft = {
        collections: existingCharBinding ? [...existingCharBinding.collections] : [],
        writeTarget: existingCharBinding?.writeTarget ?? '',
    };
    const chatDraft = {
        collections: existingChatBinding ? [...existingChatBinding.collections] : [],
        writeTarget: existingChatBinding?.writeTarget ?? '',
    };

    let allCollections = [];
    const rag = isSharder ? settings?.rag : settings?.ragStandard;
    const currentBackend = String(rag?.backend || 'vectra').toLowerCase();

    try {
        const fetched = await listAllCollections(currentBackend);
        allCollections = Array.isArray(fetched)
            ? fetched.filter(c => String(c.backend || 'vectra').toLowerCase() === currentBackend)
            : [];
    } catch (error) {
        ragLog.warn('Collection manager: failed to list collections:', error?.message);
    }

    const chunkCountMap = new Map(allCollections.map(c => [String(c.id), c.chunkCount ?? 0]));
    const knownCollections = new Set(allCollections.map(c => String(c.id)));

    const popup = new Popup(
        buildModalHtml({
            charName,
            charAvatar,
            currentChatId,
            isSharder,
            ownCollectionId,
        }),
        POPUP_TYPE.TEXT,
        null,
        { okButton: 'Close', cancelButton: false, wide: true },
    );
    const showPromise = popup.show();

    requestAnimationFrame(() => {
        const root = document.querySelector('.shardwright-collection-manager-modal');
        if (!root) return;

        const charList = root.querySelector('#shardwright-cm-char-list');
        const chatList = root.querySelector('#shardwright-cm-chat-list');
        const charAddSelect = root.querySelector('#shardwright-cm-char-add-select');
        const chatAddSelect = root.querySelector('#shardwright-cm-chat-add-select');
        const overviewReads = root.querySelector('#shardwright-cm-overview-reads');
        const overviewWrite = root.querySelector('#shardwright-cm-overview-write');
        const overviewWriteSelect = root.querySelector('#shardwright-cm-overview-write-select');
        const overviewWriteHint = root.querySelector('#shardwright-cm-overview-write-hint');
        const overviewWarnings = root.querySelector('#shardwright-cm-overview-warnings');
        const saveBtn = root.querySelector('#shardwright-cm-save');

        const getCollectionBadges = (id, scope) => {
            const badges = [];
            if ((scope === 'character' && chatDraft.collections.includes(id)) || (scope === 'chat' && charDraft.collections.includes(id))) {
                badges.push('<span class="shardwright-cm-source-badge shardwright-cm-source-warning">duplicate</span>');
            }
            if (!knownCollections.has(String(id))) {
                badges.push('<span class="shardwright-cm-source-badge shardwright-cm-source-warning">missing</span>');
            }
            if (chunkCountMap.has(String(id)) && Number(chunkCountMap.get(String(id))) === 0) {
                badges.push('<span class="shardwright-cm-source-badge shardwright-cm-source-warning">0 chunks</span>');
            }
            return badges.join('');
        };

        const getInheritedWriteTarget = () => getDraftState(charDraft, { ...chatDraft, writeTarget: '' }, ownCollectionId);
        const applyWriteTargetSelection = (selectedId) => {
            const selected = String(selectedId || '').trim();
            const state = getDraftState(charDraft, chatDraft, ownCollectionId);
            if (!selected || !state.effectiveReadIds.includes(selected)) {
                return;
            }

            const sources = state.sourceMap[selected] || [];
            if (sources.includes('character') && selected !== ownCollectionId) {
                charDraft.writeTarget = selected;
                chatDraft.writeTarget = '';
                return;
            }

            if (selected === ownCollectionId && !String(charDraft.writeTarget || '').trim()) {
                chatDraft.writeTarget = '';
                return;
            }

            chatDraft.writeTarget = selected;
        };

        const coerceValidWriteTargets = () => {
            const state = getDraftState(charDraft, chatDraft, ownCollectionId);
            const charOptions = new Set(charDraft.collections);
            if (charDraft.writeTarget && charDraft.writeTarget !== ownCollectionId && !charOptions.has(charDraft.writeTarget)) {
                charDraft.writeTarget = '';
            }

            const chatOptions = new Set(state.effectiveReadIds);
            if (chatDraft.writeTarget && !chatOptions.has(chatDraft.writeTarget)) {
                chatDraft.writeTarget = '';
            }
        };

        const renderCharAddSelect = () => {
            if (!charAddSelect) return;
            const bound = new Set(charDraft.collections);
            const options = allCollections.filter(c => !bound.has(String(c.id)));
            charAddSelect.innerHTML = '<option value="">Select a collection...</option>'
                + options.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(truncate(c.id, 56))} (${c.chunkCount ?? 0})</option>`).join('');
        };

        const renderChatAddSelect = () => {
            if (!chatAddSelect) return;
            const bound = new Set(chatDraft.collections);
            const options = allCollections.filter(c => !bound.has(String(c.id)));
            chatAddSelect.innerHTML = '<option value="">Select a collection...</option>'
                + options.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(truncate(c.id, 56))} (${c.chunkCount ?? 0})</option>`).join('');
        };

        const renderOverviewWriteSelect = (state) => {
            if (!overviewWriteSelect) return;
            overviewWriteSelect.innerHTML = state.effectiveReadIds
                .map(id => {
                    const sources = state.sourceMap[id] || [];
                    const sourceLabel = sources.length > 0 ? ` [${sources.join(' + ')}]` : '';
                    const count = chunkCountMap.has(String(id)) ? ` (${Number(chunkCountMap.get(String(id))) || 0})` : '';
                    const label = `${truncate(id, 58)}${sourceLabel}${count}`;
                    return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
                })
                .join('');
            overviewWriteSelect.value = state.effectiveWriteTarget || '';
        };

        const renderCharList = () => {
            if (!charList) return;
            if (charDraft.collections.length === 0) {
                charList.innerHTML = '<div class="shardwright-cm-empty">No shared character collections yet.</div>';
                return;
            }

            charList.innerHTML = charDraft.collections
                .map(id => renderEditableRow(id, chunkCountMap.get(id), getCollectionBadges(id, 'character')))
                .join('');

            for (const btn of charList.querySelectorAll('.shardwright-cm-row-remove')) {
                btn.addEventListener('click', () => {
                    const id = btn.closest('.shardwright-cm-row')?.getAttribute('data-collection-id');
                    if (!id) return;
                    charDraft.collections = charDraft.collections.filter(c => c !== id);
                    if (charDraft.writeTarget === id) charDraft.writeTarget = '';
                    coerceValidWriteTargets();
                    renderAll();
                });
            }
        };

        const renderChatList = () => {
            if (!chatList) return;
            if (chatDraft.collections.length === 0) {
                chatList.innerHTML = '<div class="shardwright-cm-empty">No chat-only collections yet. Character collections remain active even when this list is empty.</div>';
                return;
            }

            chatList.innerHTML = chatDraft.collections
                .map(id => renderEditableRow(id, chunkCountMap.get(id), getCollectionBadges(id, 'chat')))
                .join('');

            for (const btn of chatList.querySelectorAll('.shardwright-cm-row-remove')) {
                btn.addEventListener('click', () => {
                    const id = btn.closest('.shardwright-cm-row')?.getAttribute('data-collection-id');
                    if (!id) return;
                    chatDraft.collections = chatDraft.collections.filter(c => c !== id);
                    if (chatDraft.writeTarget === id) chatDraft.writeTarget = '';
                    coerceValidWriteTargets();
                    renderAll();
                });
            }
        };

        const renderOverview = () => {
            const state = getDraftState(charDraft, chatDraft, ownCollectionId);
            const missingIds = state.staleIds.filter(id => id && id !== ownCollectionId && !knownCollections.has(id));
            const zeroChunkIds = state.effectiveReadIds.filter(id => chunkCountMap.has(String(id)) && Number(chunkCountMap.get(String(id))) === 0);

            if (overviewReads) {
                overviewReads.innerHTML = state.effectiveReadIds
                    .map(id => renderOverviewReadRow(id, chunkCountMap.get(id), state.sourceMap[id]))
                    .join('');
            }

            if (overviewWrite) {
                overviewWrite.innerHTML = state.effectiveWriteTarget
                    ? `
                        <div class="shardwright-cm-write-target-row">
                            <span class="shardwright-cm-row-id" title="${escapeHtml(state.effectiveWriteTarget)}">${escapeHtml(truncate(state.effectiveWriteTarget, 82))}</span>
                            <span class="shardwright-cm-source-badge shardwright-cm-source-${escapeHtml(state.effectiveWriteSource || 'own')}">${escapeHtml(getWriteScopeLabel(state.effectiveWriteSource))}</span>
                        </div>
                    `
                    : '<div class="shardwright-cm-empty">No write target resolved.</div>';
            }

            renderOverviewWriteSelect(state);

            if (overviewWriteHint) {
                const inherited = getInheritedWriteTarget();
                const isChatOverride = !!String(chatDraft.writeTarget || '').trim();
                const zeroText = chunkCountMap.has(String(state.effectiveWriteTarget)) && Number(chunkCountMap.get(String(state.effectiveWriteTarget))) === 0
                    ? ' This target currently has zero chunks.'
                    : '';
                const scopeText = isChatOverride
                    ? 'Chat override active.'
                    : 'Using the inherited write target.';
                overviewWriteHint.textContent = isChatOverride
                    ? `This chat is overriding the inherited write target. ${scopeText}${zeroText}`
                    : `This chat is using the inherited write target (${getWriteScopeLabel(inherited.effectiveWriteSource)}). ${scopeText}${zeroText}`;
            }

            const warnings = [];
            for (const duplicateId of state.duplicateIds) {
                warnings.push(`Collection appears in both Character and Chat: ${duplicateId}`);
            }
            for (const missingId of missingIds) {
                warnings.push(`Collection is not available on the current backend: ${missingId}`);
            }
            for (const emptyId of zeroChunkIds) {
                warnings.push(`Collection has zero chunks: ${emptyId}`);
            }

            if (overviewWarnings) {
                overviewWarnings.classList.toggle('shardwright-cm-warning-list-active', warnings.length > 0);
                overviewWarnings.innerHTML = warnings.length > 0
                    ? warnings.map(text => `
                        <div class="shardwright-cm-warning-row">
                            <i class="fa-solid fa-triangle-exclamation shardwright-cm-warning-icon" aria-hidden="true"></i>
                            <span>${escapeHtml(text)}</span>
                        </div>
                    `).join('')
                    : '<div class="shardwright-cm-empty">No configuration warnings.</div>';
            }
        };

        const renderAll = () => {
            coerceValidWriteTargets();
            renderCharList();
            renderChatList();
            renderCharAddSelect();
            renderChatAddSelect();
            renderOverview();
        };

        root.querySelector('#shardwright-cm-char-add-btn')?.addEventListener('click', () => {
            const id = String(charAddSelect?.value || '').trim();
            if (!id || charDraft.collections.includes(id)) return;
            charDraft.collections.push(id);
            renderAll();
        });

        root.querySelector('#shardwright-cm-chat-add-btn')?.addEventListener('click', () => {
            const id = String(chatAddSelect?.value || '').trim();
            if (!id || chatDraft.collections.includes(id)) return;
            chatDraft.collections.push(id);
            renderAll();
        });

        overviewWriteSelect?.addEventListener('change', () => {
            applyWriteTargetSelection(overviewWriteSelect.value || '');
            renderAll();
        });

        saveBtn?.addEventListener('click', () => {
            const liveSettings = extension_settings?.shardwright;

            if (charAvatarKey) {
                setCharacterBinding(charAvatarKey, {
                    collections: charDraft.collections,
                    writeTarget: charDraft.writeTarget,
                }, liveSettings);
            }

            if (currentChatId) {
                setChatBinding(currentChatId, {
                    collections: chatDraft.collections,
                    writeTarget: chatDraft.writeTarget,
                }, liveSettings);
            }

            // Re-run the resolver once using stored settings so invalid empties clear consistently.
            if (charAvatarKey && !getCharacterBinding(charAvatarKey, liveSettings)) {
                setCharacterBinding(charAvatarKey, null, liveSettings);
            }
            if (currentChatId && !getChatBinding(currentChatId, liveSettings)) {
                setChatBinding(currentChatId, null, liveSettings);
            }

            saveSettings(settings);
            toastr.success('Collection bindings saved');
            renderAll();
        });

        renderAll();
    });

    await showPromise;
}
