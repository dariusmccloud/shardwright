/**
 * Docked, draggable trigger for Shardwright.
 * Replaces the former radial crystal-shard FAB with a single edge-docked
 * tab, adapted from SillyBunny's Companion handle pattern: dock/drag/snap,
 * persisted {edge, fraction} position, and same-edge collision avoidance
 * against other docked handles (e.g. SillyBunny's own Companion tab).
 */
import { saveSettings } from '../../core/settings.js';
import { getAllMessages } from '../../core/chat/chat-state.js';
import { showSsInput } from '../common/modal-base.js';
import { buildFabPanels, getFabPanelIds } from './fab-content.js';
import { createFabPanels } from './fab-panels.js';
import { createSegmentedToggle } from '../common/segmented-toggle.js';
import {
    ARCHITECTURAL_DISPLAY_NAME,
    ARCHITECTURAL_PROFILE,
    NARRATIVE_DISPLAY_NAME,
    NARRATIVE_PROFILE,
    normalizeSharderProfile,
} from '../../core/summarization/sharder-section-registry.js';

let fabElement = null;
let settingsRef = null;
let callbacksRef = null;
let panelsController = null;
let isGenerating = false;
let isOpen = false;
let previousFocus = null;
let scheduledToggleId = null;
let scheduledToggleMode = null;

let onOutsideClick = null;
let onResize = null;
let onOperationStarted = null;
let onOperationEnded = null;
let onSharderModeChange = null;
let onKeyDown = null;
let resizePersistTimeoutId = null;

// Top and bottom are protected: SillyTavern/SillyBunny's #top-bar lives at
// the top, and docking there or along the bottom risks covering chat input.
// Only left/right are lawful docking edges.
const EDGES = ['right', 'left'];
const DEFAULT_EDGE = 'left';
const DEFAULT_FRACTION = 0.5;
const DRAG_THRESHOLD_PX = 6;
const EDGE_MARGIN_PX = 4;
const COLLISION_GAP_PX = 8;
const TOP_BAR_FALLBACK_PX = 40;
const BOTTOM_BAR_FALLBACK_PX = 100;
const RESIZE_PERSIST_DEBOUNCE_MS = 250;
// Concrete, evidenced collision partner: SillyBunny's own Companion handle
// carries this exact selector (confirmed against its source/CSS). Shardwright
// is the guest here, so only Shardwright's handle avoids the collision.
const OTHER_DOCKED_HANDLE_SELECTOR = '.ica--tpanel-handle[data-edge]';

/**
 * Height of SillyTavern/SillyBunny's real top bar (#top-bar), read live
 * rather than assumed, so left/right docking never rests above it.
 */
function getProtectedTopInset() {
    const bar = document.getElementById('top-bar');
    const height = bar?.getBoundingClientRect().height;
    return Number.isFinite(height) && height > 0 ? height : TOP_BAR_FALLBACK_PX;
}

/**
 * Height of SillyTavern/SillyBunny's bottom message-input area (#form_sheld:
 * the send form plus whatever sits above it, e.g. quick replies), read live
 * for the same reason as the top bar: so docking never rests over it.
 */
function getProtectedBottomInset() {
    const bottomBar = document.getElementById('form_sheld');
    const height = bottomBar?.getBoundingClientRect().height;
    return Number.isFinite(height) && height > 0 ? height : BOTTOM_BAR_FALLBACK_PX;
}

/**
 * The vertical band an edge-docked element (handle or panel) of the given
 * height is allowed to occupy: below the protected top bar, above the
 * protected bottom message-input area, with a small margin on each side.
 */
function computeUsableVerticalBand(elementHeight) {
    const vh = window.innerHeight;
    const min = getProtectedTopInset() + EDGE_MARGIN_PX;
    const max = Math.max(min, vh - getProtectedBottomInset() - elementHeight - EDGE_MARGIN_PX);
    return { min, max };
}

export function initFab(settings, callbacks) {
    settingsRef = settings;
    callbacksRef = callbacks;
    cancelScheduledTogglePanels();
    cleanupOrphanedPanelsDom();

    if (!settingsRef.fab) {
        settingsRef.fab = { enabled: true, position: { edge: null, fraction: null } };
    }
    if (!settingsRef.fab.position) {
        settingsRef.fab.position = { edge: null, fraction: null };
    }

    createFabElement();
    bindEvents();

    const preferredDefaultEdge = settingsRef.fab.defaultEdge === 'right' ? 'right' : DEFAULT_EDGE;
    const storedEdge = settingsRef.fab.position.edge || preferredDefaultEdge;
    const storedFraction = isFiniteNumber(settingsRef.fab.position.fraction)
        ? settingsRef.fab.position.fraction
        : DEFAULT_FRACTION;
    // Left/right render an identical (vertical-text) layout, so any lawful
    // edge is fine here — this just ensures the edge-specific CSS is already
    // active before resolveDockConflict measures the handle's real height.
    fabElement.dataset.edge = storedEdge;
    const initialDock = resolveDockConflict(storedEdge, storedFraction);

    panelsController = createFabPanels({
        edge: initialDock.edge,
        panelMarkupById: buildFabPanels(settingsRef, {
            isGenerating,
            lastSummarizedIndex: callbacksRef?.getLastSummarizedIndex?.() ?? -1,
        }),
        onAction: (action, button) => {
            void handleAction(action, button);
        },
        onPanelRendered: (panelId, panelElement) => {
            if (panelId === 'jobSetup') {
                mountJobSetupControls(panelElement);
            }
        },
    });

    applyDock(initialDock.edge, initialDock.fraction);
    persistDockIfChanged(initialDock.edge, initialDock.fraction);
    updateFabVisibility();
}

function createFabElement() {
    fabElement = document.createElement('button');
    fabElement.type = 'button';
    fabElement.className = 'shardwright-fab';
    fabElement.id = 'shardwright-fab';
    fabElement.setAttribute('aria-haspopup', 'dialog');
    fabElement.setAttribute('aria-expanded', 'false');
    fabElement.title = 'Shardwright';
    fabElement.innerHTML = '<span class="shardwright-fab-label">🛡️ Shardwright</span>';
    document.body.appendChild(fabElement);
}

function cleanupOrphanedPanelsDom() {
    document.querySelectorAll('.shardwright-fab-panels').forEach((root) => root.remove());
}

function bindEvents() {
    setupDrag();

    onOutsideClick = (e) => {
        if (!isOpen) return;
        const clickedFab = fabElement?.contains(e.target);
        const clickedPanels = panelsController?.containsTarget(e.target);
        if (!clickedFab && !clickedPanels) {
            closePanels();
        }
    };
    // Capture phase, not bubble: opening another panel (SillyTavern's native
    // drawers, SillyBunny's Companion) can involve handlers elsewhere in the
    // page that stop propagation on the way up. A capture-phase listener on
    // document fires before any of that, so Shardwright reliably closes
    // whenever something else opens — matching the reverse direction, which
    // already worked because it's driven by SillyTavern's own native
    // outside-click-closes-drawers behavior, not by Shardwright's code.
    document.addEventListener('pointerdown', onOutsideClick, true);

    onResize = () => handleViewportChange();
    window.addEventListener('resize', onResize);

    onOperationStarted = () => {
        isGenerating = true;
        fabElement.classList.add('shardwright-fab-generating');
        refreshOpenPanels(['jobSetup', 'ragSetup', 'settings', 'info']);
    };
    onOperationEnded = () => {
        isGenerating = false;
        fabElement.classList.remove('shardwright-fab-generating');
        refreshOpenPanels(['jobSetup', 'ragSetup', 'settings', 'info']);
    };
    window.addEventListener('shardwright-operation-started', onOperationStarted);
    window.addEventListener('shardwright-operation-ended', onOperationEnded);

    onSharderModeChange = () => {
        refreshOpenPanels(['jobSetup', 'ragSetup', 'settings', 'info']);
    };
    const sharderToggle = document.getElementById('shardwright-sharder-mode');
    if (sharderToggle) {
        sharderToggle.addEventListener('change', onSharderModeChange);
    }

    onKeyDown = (event) => {
        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            closePanels();
            return;
        }

        if ((event.key === 'Enter' || event.key === ' ') && document.activeElement === fabElement) {
            event.preventDefault();
            scheduleTogglePanels();
            return;
        }

        if (event.key === 'Tab' && isOpen && panelsController?.root) {
            trapFocus(event, panelsController.root);
        }
    };
    document.addEventListener('keydown', onKeyDown);
}

function setupDrag() {
    let isDragging = false;
    let startX = null;
    let startY = null;
    let initialX;
    let initialY;
    let lastDraggedPosition = null;

    fabElement.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;

        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;

        const rect = fabElement.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        lastDraggedPosition = null;

        fabElement.setPointerCapture(e.pointerId);
    });

    fabElement.addEventListener('pointermove', (e) => {
        if (startX === null) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
            isDragging = true;
            closePanelsImmediate();
            fabElement.classList.add('shardwright-fab-dragging');
        }

        if (isDragging) {
            const rect = fabElement.getBoundingClientRect();
            const { min, max } = computeUsableVerticalBand(rect.height);
            const x = clamp(initialX + dx, 0, window.innerWidth - rect.width);
            const y = clamp(initialY + dy, min, max);
            lastDraggedPosition = { x, y };
            setFabPosition(x, y);
        }
    });

    fabElement.addEventListener('pointerup', () => {
        try {
            if (isDragging && lastDraggedPosition) {
                const rect = fabElement.getBoundingClientRect();
                const droppedEdge = nearestEdge(lastDraggedPosition, rect);
                const droppedFraction = fractionFromPoint(lastDraggedPosition, rect);
                const dock = resolveDockConflict(droppedEdge, droppedFraction);
                applyDock(dock.edge, dock.fraction);
                savePosition(dock.edge, dock.fraction);
            } else if (startX !== null) {
                scheduleTogglePanels();
            }
        } finally {
            isDragging = false;
            startX = null;
            startY = null;
            lastDraggedPosition = null;
            fabElement.classList.remove('shardwright-fab-dragging');
        }
    });

    // Touch browsers may fire pointercancel instead of pointerup (e.g. when
    // the OS takes over the gesture). Reset state to avoid a stuck handle.
    fabElement.addEventListener('pointercancel', () => {
        startX = null;
        startY = null;
        isDragging = false;
        lastDraggedPosition = null;
        fabElement.classList.remove('shardwright-fab-dragging');
    });
}

function nearestEdge(position, rect) {
    const distLeft = position.x;
    const distRight = window.innerWidth - (position.x + rect.width);
    return distLeft <= distRight ? 'left' : 'right';
}

// Fraction is relative to the usable vertical band (below the protected top
// bar), not the full viewport, so a stored fraction can never resolve into
// the protected zone regardless of viewport size.
function fractionFromPoint(position, rect) {
    const { min, max } = computeUsableVerticalBand(rect.height);
    if (max <= min) return 0.5;
    return clamp((position.y - min) / (max - min), 0, 1);
}

function getOtherDockedHandles(edge) {
    return Array.from(document.querySelectorAll(OTHER_DOCKED_HANDLE_SELECTOR))
        .filter((el) => el !== fabElement && el.dataset.edge === edge);
}

// Two rects (as [top, bottom] ranges) are "too close" if less than
// COLLISION_GAP_PX separates their nearest edges — a real pixel gap, not a
// fraction of the band, so the visual spacing stays symmetric regardless of
// how tall the other docked handle actually is.
function rangesTooClose(aTop, aBottom, bTop, bBottom) {
    return !(aBottom + COLLISION_GAP_PX <= bTop || aTop >= bBottom + COLLISION_GAP_PX);
}

/**
 * Picks a lawful {edge, fraction} for Shardwright's own handle: prefer the
 * requested edge/fraction, slide along that edge (in real pixels, using the
 * actual rects) if another docked handle (e.g. SillyBunny's Companion)
 * occupies that band too closely, and only move to a different edge if the
 * preferred edge stays crowded after sliding.
 */
function resolveDockConflict(preferredEdge, preferredFraction) {
    const handleHeight = fabElement?.getBoundingClientRect().height || 0;
    const startIndex = Math.max(0, EDGES.indexOf(preferredEdge));

    for (let offset = 0; offset < EDGES.length; offset += 1) {
        const edge = EDGES[(startIndex + offset) % EDGES.length];
        const fraction = offset === 0 ? clamp(preferredFraction, 0, 1) : DEFAULT_FRACTION;
        const conflictRects = getOtherDockedHandles(edge).map((el) => el.getBoundingClientRect());

        if (conflictRects.length === 0) {
            return { edge, fraction };
        }

        const { min, max } = computeUsableVerticalBand(handleHeight);
        let top = min + (fraction * (max - min));
        let attempts = 0;

        const findConflict = (candidateTop) => conflictRects.find(
            (r) => rangesTooClose(candidateTop, candidateTop + handleHeight, r.top, r.bottom),
        );

        let conflict = findConflict(top);
        while (conflict && attempts < 20) {
            const below = conflict.bottom + COLLISION_GAP_PX;
            const above = conflict.top - COLLISION_GAP_PX - handleHeight;
            // Prefer sliding toward whichever direction stays in-band.
            if (below <= max) {
                top = below;
            } else if (above >= min) {
                top = above;
            } else {
                break;
            }
            attempts += 1;
            conflict = findConflict(top);
        }

        if (!conflict) {
            const resolvedFraction = max > min ? clamp((top - min) / (max - min), 0, 1) : 0.5;
            return { edge, fraction: resolvedFraction };
        }
    }

    // All lawful edges stayed crowded after sliding (unlikely) — best effort.
    return { edge: preferredEdge, fraction: clamp(preferredFraction, 0, 1) };
}

function applyDock(edge, fraction) {
    if (!fabElement) return;
    fabElement.dataset.edge = edge;

    const rect = fabElement.getBoundingClientRect();
    const vw = window.innerWidth;
    const { min, max } = computeUsableVerticalBand(rect.height);
    const x = edge === 'right' ? vw - rect.width : 0;
    const y = min + (clamp(fraction, 0, 1) * (max - min));

    setFabPosition(x, y);
    panelsController?.setEdge(edge);
    syncPanelPosition();
}

/**
 * Keeps the panel's vertical position "in-line" with wherever the handle is
 * currently docked, instead of a fixed center — the panel's vertical center
 * matches the handle's, clamped to the same protected top-bar band.
 */
function syncPanelPosition() {
    if (!fabElement || !panelsController) return;

    const handleRect = fabElement.getBoundingClientRect();
    const panelHeight = panelsController.root.getBoundingClientRect().height || 0;
    const { min, max } = computeUsableVerticalBand(panelHeight);
    const handleCenterY = handleRect.top + (handleRect.height / 2);
    const top = clamp(handleCenterY - (panelHeight / 2), min, max);

    // Pop out from the handle's inner edge, not the viewport edge underneath
    // it, so the panel never sits behind/under the handle it opened from.
    panelsController.setPosition({ top, edgeInset: handleRect.width });
}

function setFabPosition(x, y) {
    if (!fabElement) return;
    fabElement.style.setProperty('left', `${x}px`, 'important');
    fabElement.style.setProperty('top', `${y}px`, 'important');
    fabElement.style.setProperty('right', 'auto', 'important');
    fabElement.style.setProperty('bottom', 'auto', 'important');
    // Chromium serializes individually-set left/top/right/bottom into a
    // shorthand `inset` in the style attribute, which breaks any CSS rule
    // keyed off [style*="left"]/[style*="top"] substring matching — use an
    // explicit class instead so the pre-JS fallback position/transform
    // reliably stops applying once JS has taken over.
    fabElement.classList.add('shardwright-fab-positioned');
}

function savePosition(edge, fraction) {
    if (!settingsRef) return;
    if (!settingsRef.fab) settingsRef.fab = {};
    settingsRef.fab.position = { edge, fraction };
    saveSettings(settingsRef);
}

// Keeps settings.fab.position holding the actual, conflict-free {edge,
// fraction} that was applied — not just whatever was requested — so a later
// read (e.g. handleViewportChange) never falls back to a stale, possibly
// still-conflicting value.
function persistDockIfChanged(edge, fraction) {
    const current = settingsRef?.fab?.position;
    if (current && current.edge === edge && current.fraction === fraction) return;
    savePosition(edge, fraction);
}

function schedulePersistDock(edge, fraction) {
    if (resizePersistTimeoutId !== null) {
        window.clearTimeout(resizePersistTimeoutId);
    }
    resizePersistTimeoutId = window.setTimeout(() => {
        resizePersistTimeoutId = null;
        persistDockIfChanged(edge, fraction);
    }, RESIZE_PERSIST_DEBOUNCE_MS);
}

function handleViewportChange() {
    if (!fabElement) return;
    const edge = fabElement.dataset.edge || DEFAULT_EDGE;
    const fraction = isFiniteNumber(settingsRef?.fab?.position?.fraction)
        ? settingsRef.fab.position.fraction
        : DEFAULT_FRACTION;
    // Re-resolve on every viewport change, not just at init — the viewport
    // size and the set of other docked handles can both differ from when
    // the stored fraction was first computed.
    const resolved = resolveDockConflict(edge, fraction);
    applyDock(resolved.edge, resolved.fraction);
    schedulePersistDock(resolved.edge, resolved.fraction);
}

function scheduleTogglePanels() {
    if (scheduledToggleId !== null) return;

    const run = () => {
        scheduledToggleId = null;
        scheduledToggleMode = null;
        togglePanels();
    };

    if (typeof window.requestAnimationFrame === 'function') {
        scheduledToggleMode = 'raf';
        scheduledToggleId = window.requestAnimationFrame(run);
        return;
    }

    scheduledToggleMode = 'timeout';
    scheduledToggleId = window.setTimeout(run, 0);
}

function cancelScheduledTogglePanels() {
    if (scheduledToggleId === null) return;
    if (scheduledToggleMode === 'raf' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(scheduledToggleId);
    } else {
        window.clearTimeout(scheduledToggleId);
    }
    scheduledToggleId = null;
    scheduledToggleMode = null;
}

function togglePanels() {
    if (isOpen) {
        closePanels();
    } else {
        openPanels();
    }
}

function openPanels() {
    if (!fabElement || isOpen || !panelsController) return;

    previousFocus = document.activeElement;
    refreshOpenPanels();
    panelsController.setEdge(fabElement.dataset.edge || DEFAULT_EDGE);
    syncPanelPosition();
    panelsController.open();

    fabElement.classList.add('shardwright-fab-open');
    fabElement.setAttribute('aria-expanded', 'true');
    isOpen = true;

    panelsController.focusInitial();
}

function closePanels() {
    if (!isOpen) return;

    panelsController?.close();
    fabElement.classList.remove('shardwright-fab-open');
    fabElement.setAttribute('aria-expanded', 'false');
    isOpen = false;

    restoreFocus();
}

function closePanelsImmediate() {
    closePanels();
}

function refreshOpenPanels(panelIds = getFabPanelIds()) {
    if (!panelsController) return;

    const panelMarkup = buildFabPanels(settingsRef, {
        isGenerating,
        lastSummarizedIndex: callbacksRef?.getLastSummarizedIndex?.() ?? -1,
    });
    for (const panelId of panelIds) {
        if (panelMarkup[panelId]) {
            panelsController.updatePanel(panelId, panelMarkup[panelId]);
        }
    }
}

// The Sharder Profile toggle is a stateful component (createSegmentedToggle
// returns a live DOM node with its own change handling), not plain markup,
// so it has to be mounted after the panel's HTML lands — mirrors the same
// control in ui-manager.js (Extensions > Shardwright > Summarization) so
// picking a profile here changes the same settings.sharderProfile the
// sharding pipeline already reads.
function mountJobSetupControls(panelElement) {
    if (!settingsRef) return;

    const mount = panelElement.querySelector('#shardwright-fab-sharder-profile-mount');
    if (mount) {
        const toggle = createSegmentedToggle({
            options: [
                { value: NARRATIVE_PROFILE, label: NARRATIVE_DISPLAY_NAME },
                { value: ARCHITECTURAL_PROFILE, label: ARCHITECTURAL_DISPLAY_NAME },
            ],
            value: normalizeSharderProfile(settingsRef.sharderProfile),
            onChange: (value) => {
                if (!settingsRef) return;
                settingsRef.sharderProfile = normalizeSharderProfile(value);
                saveSettings(settingsRef);
                // Info's "Profile" row reads this same setting — without this
                // it stayed stale until the next full page reload.
                refreshOpenPanels(['info']);
            },
        });
        mount.replaceChildren(toggle);
    }

    const autoIncludeCheckbox = panelElement.querySelector('#shardwright-fab-auto-include-shards');
    if (autoIncludeCheckbox) {
        autoIncludeCheckbox.addEventListener('change', (e) => {
            if (!settingsRef) return;
            settingsRef.autoIncludeShards = e.target.checked;
            saveSettings(settingsRef);
        });
    }
}

async function handleAction(action, button) {
    if (!callbacksRef) return;

    try {
        withActionLock(button, true);

        switch (action) {
            case 'single-pass':
                await handleSinglePass();
                break;
            case 'batch-sharder':
                await handleBatchSharder();
                break;
            case 'summarize':
                closePanels();
                await callbacksRef.onSummarize?.();
                break;
            case 'stop':
                closePanels();
                await callbacksRef.onStop?.();
                break;
            case 'vectorize':
                closePanels();
                await callbacksRef.onVectorize?.();
                break;
            case 'purge-vectors':
                closePanels();
                await callbacksRef.onPurgeVectors?.();
                break;
            case 'browse-vectors':
                closePanels();
                await callbacksRef.onBrowseVectors?.();
                break;
            case 'rag-debug':
                closePanels();
                await callbacksRef.onOpenRagDebug?.();
                break;
            case 'manage-collections':
                closePanels();
                await callbacksRef.onManageCollections?.();
                break;
            case 'rag-history':
                closePanels();
                await callbacksRef.onOpenRagHistory?.();
                break;
            case 'open-themes':
                closePanels();
                await callbacksRef.onOpenThemes?.();
                break;
            case 'open-prompts':
                closePanels();
                await callbacksRef.onOpenPrompts?.();
                break;
            case 'open-api-config':
                closePanels();
                await callbacksRef.onOpenApiConfig?.();
                break;
            case 'open-rag-settings':
                closePanels();
                await callbacksRef.onOpenRagSettings?.();
                break;
            case 'open-chat-manager':
                closePanels();
                await callbacksRef.onOpenChatManager?.();
                break;
            case 'open-interpretive-review':
                await openInterpretiveReviewFromFab();
                break;
            case 'open-visibility':
                closePanels();
                await callbacksRef.onOpenVisibility?.();
                break;
            case 'open-clean-context':
                closePanels();
                await callbacksRef.onOpenCleanContext?.();
                break;
            default:
                break;
        }
    } catch (error) {
        toastr.error(`Action failed: ${error?.message || error}`);
    } finally {
        withActionLock(button, false);
    }
}

async function openInterpretiveReviewFromFab() {
    closePanels();
    await waitForFabActionHandoff();

    const launcher = document.getElementById('shardwright-interpretive-reviews-btn');
    if (launcher instanceof HTMLElement) {
        launcher.click();
        if (await waitForInterpretiveReviewModal(1200)) {
            return;
        }
    }

    if (hasInterpretiveReviewModal()) {
        return;
    }

    try {
        await callbacksRef.onOpenInterpretiveReview?.();
    } catch {
        // Launcher fallback exhausted; nothing further to attempt here.
    }

    await waitForInterpretiveReviewModal(1200);
}

async function waitForFabActionHandoff() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await waitForNextFrame();
    await waitForNextFrame();
}

async function waitForNextFrame() {
    if (typeof window.requestAnimationFrame === 'function') {
        await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, 16));
}

function hasInterpretiveReviewModal() {
    return !!document.querySelector('.shardwright-interpretive-review-modal');
}

async function waitForInterpretiveReviewModal(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (hasInterpretiveReviewModal()) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return hasInterpretiveReviewModal();
}

function withActionLock(button, isLocked) {
    if (!button) return;
    button.disabled = isLocked;
    button.classList.toggle('shardwright-fab-action-busy', isLocked);
}

async function handleSinglePass() {
    closePanels();

    const messages = getAllMessages();
    if (!messages || messages.length === 0) {
        toastr.warning('No messages available');
        return;
    }

    const maxIndex = messages.length - 1;
    const { runSinglePassRangeWorkflow } = await import('./single-pass-range-workflow.js');
    await runSinglePassRangeWorkflow({
        maxIndex,
        requestRange: (defaultRange) => showSsInput(
            'Sharder: Select Range',
            `Enter message range for sharder (0 to ${maxIndex}):\nExample: '5-25'`,
            defaultRange,
        ),
        parseRange: parseRangeInput,
        runSinglePass: (startIndex, endIndex) => callbacksRef.onSinglePass?.(startIndex, endIndex),
    });
}

async function handleBatchSharder() {
    closePanels();

    const messages = getAllMessages();
    if (!messages || messages.length === 0) {
        toastr.warning('No messages available');
        return;
    }

    const maxIndex = messages.length - 1;
    const { openBatchConfigModal } = await import('../modals/summarization/batch-config-modal.js');
    const config = await openBatchConfigModal(messages, maxIndex);
    if (!config?.confirmed) return;

    await callbacksRef.onBatchSharder?.(config.ranges || [], config.batchConfig || {});
}

function parseRangeInput(rangeStr, maxIndex) {
    if (!rangeStr) return null;

    const match = rangeStr.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) {
        toastr.warning('Invalid range format. Use: start-end (e.g., 0-25)');
        return null;
    }

    const startIdx = parseInt(match[1], 10);
    const endIdx = parseInt(match[2], 10);

    if (startIdx > endIdx) {
        toastr.warning('Start index must be less than or equal to end index');
        return null;
    }

    if (endIdx > maxIndex) {
        toastr.warning(`End index cannot exceed ${maxIndex}`);
        return null;
    }

    return { startIdx, endIdx };
}

function isFiniteNumber(value) {
    return Number.isFinite(value);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function restoreFocus() {
    if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
    } else {
        fabElement?.focus();
    }
    previousFocus = null;
}

function trapFocus(event, container) {
    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
    }
}

function getFocusableElements(container) {
    return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.disabled && node.getClientRects().length > 0);
}

export function updateFabVisibility() {
    if (!fabElement) return;
    fabElement.style.display = settingsRef.fab?.enabled !== false ? '' : 'none';

    if (fabElement.style.display === 'none') {
        closePanelsImmediate();
    }
}

export function destroyFab() {
    if (onOutsideClick) document.removeEventListener('pointerdown', onOutsideClick, true);
    if (onResize) window.removeEventListener('resize', onResize);
    if (onOperationStarted) window.removeEventListener('shardwright-operation-started', onOperationStarted);
    if (onOperationEnded) window.removeEventListener('shardwright-operation-ended', onOperationEnded);
    if (onKeyDown) document.removeEventListener('keydown', onKeyDown);

    const sharderToggle = document.getElementById('shardwright-sharder-mode');
    if (sharderToggle && onSharderModeChange) {
        sharderToggle.removeEventListener('change', onSharderModeChange);
    }

    closePanelsImmediate();
    cancelScheduledTogglePanels();
    if (resizePersistTimeoutId !== null) {
        window.clearTimeout(resizePersistTimeoutId);
        resizePersistTimeoutId = null;
    }

    panelsController?.destroy();
    panelsController = null;

    if (fabElement) {
        fabElement.remove();
        fabElement = null;
    }

    isOpen = false;
    previousFocus = null;
    settingsRef = null;
    callbacksRef = null;
    isGenerating = false;
}
