/**
 * UI management for Shardwright
 */

import { saveSettings } from '../core/settings.js';
import { getAllMessages } from '../core/chat/chat-state.js';
import { runSummarization, stopSummarization } from '../core/api/summary-api.js';
import { runSummarizationQueue } from '../core/api/queue-api.js';
import { runSharder } from '../core/api/single-pass-api.js';
import { runSharderQueue } from '../core/api/single-pass-queue-api.js';
import { openVisibilityModal } from './modals/management/visibility-modal.js';
import { openPromptsModal, updateActivePromptDisplay } from './modals/configuration/prompts-modal.js';
import { openCleanContextModal } from './modals/configuration/clean-context-modal.js';
import { openThemesModal } from './modals/themes-modal.js';
import { openRagSettingsModal } from './modals/configuration/rag-settings-modal.js';
import { updateFabVisibility } from './fab/fab.js';
import { parseRanges } from '../core/processing/utils.js';
import { LorebookDropdown } from './dropdowns/lorebook-dropdown.js';
import { openLorebookOptionsModal } from './modals/management/lorebook-modal.js';
import { openChatManagerModal } from './modals/management/chat-manager-modal.js';
import { openInterpretiveReviewModal } from './modals/management/interpretive-review-modal.js';
import { openBatchConfigModal } from './modals/summarization/batch-config-modal.js';
import { showSsInput } from './common/modal-base.js';
import { openApiConfigModal } from './modals/configuration/api-config-modal.js';
import { openDebugExportModal } from './modals/configuration/debug-export-modal.js';
import { updateApiStatusDisplays } from './common/api-status-state.js';
import { log } from '../core/logger.js';
import {
    ARCHITECTURAL_DISPLAY_NAME,
    ARCHITECTURAL_PROFILE,
    NARRATIVE_DISPLAY_NAME,
    NARRATIVE_PROFILE,
    normalizeSharderProfile,
} from '../core/summarization/sharder-section-registry.js';
import {
    createSegmentedToggle,
    createTagInput,
    createRangeSliderPair,
    parseCommaTags,
    tagsToString,
    infoHintHtml,
    mountInfoHints,
} from './common/index.js';
export { updateApiStatusDisplays };

const activeUiOps = new Map();
let uiOpListenerAttached = false;

function applyUiOperationState(event) {
    const detail = event?.detail || {};
    const {
        phase,
        primaryButton,
        disabled,
        label,
        lockButtons,
        showStop,
        opId,
    } = detail;

    if (!phase) return;

    // Stop-button-only updates (for legacy stop visibility toggles).
    if (!primaryButton) {
        if (typeof showStop === 'boolean') {
            const stopBtn = document.getElementById('shardwright-stop-summarize');
            stopBtn?.classList.toggle('shardwright-hidden', !showStop);
        }
        return;
    }

    if (phase === 'start') {
        if (!opId) return;
        activeUiOps.set(primaryButton, opId);
    } else {
        const activeOpId = activeUiOps.get(primaryButton);
        if (!opId || activeOpId !== opId) {
            return;
        }
        if (phase === 'end') {
            activeUiOps.delete(primaryButton);
        }
    }

    const primaryBtn = document.getElementById(primaryButton);
    if (primaryBtn) {
        if (typeof disabled === 'boolean') {
            primaryBtn.disabled = disabled;
        }
        if (typeof label === 'string') {
            primaryBtn.value = label;
        }
    }

    const lockIds = Array.isArray(lockButtons) ? lockButtons : [];
    for (const id of lockIds) {
        const lockBtn = document.getElementById(id);
        if (!lockBtn) continue;
        if (typeof disabled === 'boolean') {
            lockBtn.disabled = phase === 'end' ? false : disabled;
        }
    }

    if (typeof showStop === 'boolean') {
        const stopBtn = document.getElementById('shardwright-stop-summarize');
        stopBtn?.classList.toggle('shardwright-hidden', !showStop);
    }
}

function ensureUiOperationListener() {
    if (uiOpListenerAttached) return;
    window.addEventListener('shardwright-ui-operation-state', applyUiOperationState);
    uiOpListenerAttached = true;
}

/**
 * Toggle visibility of Sharder controls and action buttons based on mode settings.
 */
function toggleSharderControls(settings) {
    const sharderMode = settings.sharderMode || false;

    const sharderControls = document.getElementById('shardwright-sharder-controls');
    const summarizeBtn = document.getElementById('shardwright-run-summarize');
    const runSharderBtn = document.getElementById('shardwright-run-single-pass');
    const batchSharderBtn = document.getElementById('shardwright-run-single-pass-batch');

    sharderControls?.classList.toggle('shardwright-hidden', !sharderMode);
    summarizeBtn?.classList.toggle('shardwright-hidden', sharderMode);
    runSharderBtn?.classList.toggle('shardwright-hidden', !sharderMode);
    batchSharderBtn?.classList.toggle('shardwright-hidden', !sharderMode);

    const summaryApiStatus = document.getElementById('shardwright-summary-api-status');
    summaryApiStatus?.classList.toggle('shardwright-hidden', sharderMode);

    const advancedBlock = document.getElementById('shardwright-advanced-control-block');
    const summaryReviewBlock = document.getElementById('shardwright-summary-review-block');
    const summaryReviewOptions = document.getElementById('shardwright-summary-review-options');
    const lengthBlock = document.getElementById('shardwright-length-control-block');
    const lengthSliderSection = document.getElementById('shardwright-length-slider-section');

    const reviewToggleEnabled = !!document.getElementById('shardwright-summary-review-toggle')?.checked;
    const lengthControlEnabled = !!document.getElementById('shardwright-length-control')?.checked;

    advancedBlock?.classList.toggle('shardwright-hidden', sharderMode);
    summaryReviewBlock?.classList.toggle('shardwright-hidden', sharderMode);
    summaryReviewOptions?.classList.toggle('shardwright-hidden', sharderMode || !reviewToggleEnabled);
    lengthBlock?.classList.toggle('shardwright-hidden', sharderMode);
    lengthSliderSection?.classList.toggle('shardwright-hidden', sharderMode || !lengthControlEnabled);
}

/**
 * Toggle visibility of Summary Length slider based on summaryLengthControl setting.
 */
function toggleLengthSlider(enabled) {
    const section = document.getElementById('shardwright-length-slider-section');
    const sharderMode = !!document.getElementById('shardwright-sharder-mode')?.checked;
    section?.classList.toggle('shardwright-hidden', !enabled || sharderMode);
}

/**
 * Toggle visibility of Summary Review options based on toggle state.
 */
function toggleSummaryReviewOptions(enabled) {
    const section = document.getElementById('shardwright-summary-review-options');
    const sharderMode = !!document.getElementById('shardwright-sharder-mode')?.checked;
    section?.classList.toggle('shardwright-hidden', !enabled || sharderMode);
}

/**
 * Toggle visibility of lorebook selection section based on output mode.
 */
function toggleLorebookSection(outputMode) {
    const lorebookSection = document.getElementById('shardwright-lorebook-section');
    lorebookSection?.classList.toggle('shardwright-hidden', outputMode !== 'lorebook');
}

/**
 * Toggle visibility of Auto Interval setting based on mode.
 */
function toggleAutoInterval(mode) {
    const autoIntervalRow = document.getElementById('shardwright-auto-interval-row');
    autoIntervalRow?.classList.toggle('shardwright-hidden', mode !== 'auto');
}

/**
 * Toggle visibility of custom books dropdown.
 */
function toggleCustomBooksDropdown(show) {
    const container = document.getElementById('shardwright-custom-books-container');
    container?.classList.toggle('shardwright-hidden', !show);
}

function setupSettingsAccordionHandlers() {
    const settingsRoot = document.getElementById('shardwright-settings');
    if (!settingsRoot) return;

    const accordions = Array.from(settingsRoot.querySelectorAll('.shardwright-settings-accordion'));
    if (accordions.length === 0) return;

    const setExpanded = (accordion, expanded) => {
        const content = accordion.querySelector('.shardwright-accordion-content');
        const header = accordion.querySelector('.shardwright-accordion-header');
        if (!content || !header) return;

        accordion.classList.toggle('expanded', expanded);
        content.classList.toggle('shardwright-hidden', !expanded);
        header.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };

    const toggleAccordion = (header) => {
        const accordion = header.closest('.shardwright-settings-accordion');
        if (!accordion) return;

        const shouldExpand = !accordion.classList.contains('expanded');
        if (shouldExpand) {
            for (const otherAccordion of accordions) {
                setExpanded(otherAccordion, otherAccordion === accordion);
            }
            return;
        }

        setExpanded(accordion, false);
    };

    for (const accordion of accordions) {
        const header = accordion.querySelector('.shardwright-accordion-header');
        if (!header) continue;

        if (!header.hasAttribute('role')) {
            header.setAttribute('role', 'button');
        }
        if (!header.hasAttribute('tabindex')) {
            header.setAttribute('tabindex', '0');
        }

        header.addEventListener('click', (e) => {
            if (e.target?.closest?.('button, input, select, textarea, a, label')) return;
            toggleAccordion(header);
        });

        header.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            e.preventDefault();
            toggleAccordion(header);
        });

        setExpanded(accordion, accordion.classList.contains('expanded'));
    }
}

/**
 * Manual summarization UI.
 */
export async function runManualSummarizeUI(settings) {
    const messages = getAllMessages();

    if (!messages || messages.length === 0) {
        toastr.warning('No messages available to summarize');
        return;
    }

    const maxIndex = messages.length - 1;

    const rangeStr = await showSsInput(
        'Summarize: Select Range',
        `Enter range(s) to summarize (0 to ${maxIndex}):\nExamples: '5-10' or '1-3, 5-7'`,
        `0-${maxIndex}`,
    );
    if (rangeStr === null) return;

    let ranges;
    try {
        ranges = parseRanges(rangeStr, maxIndex);
    } catch (error) {
        toastr.error(error.message);
        return;
    }

    if (ranges.length === 1) {
        runSummarization(ranges[0].start, ranges[0].end, settings);
    } else {
        runSummarizationQueue(ranges, settings);
    }
}

/**
 * Render the settings UI.
 */
export function renderSettingsUI(settings, callbacks) {
    ensureUiOperationListener();

    const settingsHtml = `
    <div id="shardwright-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Shardwright</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" style="display: none;">
                <div class="shardwright-settings-scroll">
                    <div class="shardwright-bg">
                    <div class="shardwright-review-accordion shardwright-settings-accordion expanded" data-settings-section="mode-output">
                        <div class="shardwright-accordion-header" role="button" tabindex="0" aria-expanded="true">
                            <span class="shardwright-accordion-toggle"><i class="fa-solid fa-chevron-right"></i></span>
                            <span class="shardwright-accordion-title">Mode & Output</span>
                        </div>
                        <div class="shardwright-accordion-content">
                            <div class="shardwright-block">
                                <div class="shardwright-api-status-group">
                                    <div class="shardwright-api-feature-status" id="shardwright-summary-api-status">
                                        <strong>Summary API:</strong>
                                        <span id="shardwright-summary-api-display" style="margin-left: 10px;">SillyTavern Current</span>
                                    </div>
                                    <div class="shardwright-api-feature-status shardwright-hidden" id="shardwright-single-pass-api-status">
                                        <strong>Sharder API:</strong>
                                        <span id="shardwright-single-pass-api-display" style="margin-left: 10px;"></span>
                                    </div>
                                    <div class="shardwright-api-feature-status shardwright-hidden" id="shardwright-events-api-status">
                                        <strong>Casing API:</strong>
                                        <span id="shardwright-events-api-display" style="margin-left: 10px;"></span>
                                    </div>
                                </div>
                                <input id="shardwright-open-api-config-modal" class="menu_button" type="button" value="Configure APIs..." />
                            </div>

                            <div class="shardwright-block">
                                <label class="checkbox_label">
                                    <input id="shardwright-sharder-mode" type="checkbox" />
                                    <span>Sharder Mode ${infoHintHtml('shardwright-sharder-mode-hint', 'Uses the structured 16-section Memory Shard workflow instead of basic summaries.')}</span>
                                </label>
                            </div>

                            <div class="shardwright-control-group">
                                <div class="shardwright-inline-row">
                                    <label for="shardwright-mode">Mode:</label>
                                    <div id="shardwright-mode-mount"></div>
                                </div>

                                <div id="shardwright-auto-interval-row" class="shardwright-inline-row shardwright-hidden">
                                    <label for="shardwright-auto-interval">Automatic:</label>
                                    <div class="shardwright-inline-with-unit">
                                        <span>every</span>
                                        <input id="shardwright-auto-interval" type="number" class="text_pole" min="1" />
                                        <span>messages</span>
                                    </div>
                                </div>

                                <div class="shardwright-inline-row">
                                    <label for="shardwright-output-mode">Output:</label>
                                    <div id="shardwright-output-mode-mount"></div>
                                </div>

                                <div id="shardwright-lorebook-section" class="shardwright-lorebook-section shardwright-hidden">
                                    <span class="shardwright-lorebook-section-label">Target Lorebooks:</span>

                                    <div class="shardwright-lorebook-toggles">
                                        <label class="checkbox_label shardwright-lorebook-toggle-item">
                                            <input id="shardwright-use-char-book" type="checkbox" />
                                            <span>Use Character World Info</span>
                                        </label>
                                        <label class="checkbox_label shardwright-lorebook-toggle-item">
                                            <input id="shardwright-use-chat-book" type="checkbox" />
                                            <span>Use Chat History Book</span>
                                        </label>
                                        <label class="checkbox_label shardwright-lorebook-toggle-item">
                                            <input id="shardwright-use-custom-books" type="checkbox" />
                                            <span>Custom Select</span>
                                        </label>
                                    </div>

                                    <div id="shardwright-custom-books-container" class="shardwright-hidden">
                                        <div id="shardwright-lorebook-dropdown"></div>
                                    </div>

                                    <div class="shardwright-lorebook-options-btn">
                                        <input id="shardwright-lorebook-options-btn" class="menu_button" type="button" value="Lorebook Entry Options..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="shardwright-review-accordion shardwright-settings-accordion" data-settings-section="summarization">
                        <div class="shardwright-accordion-header" role="button" tabindex="0" aria-expanded="false">
                            <span class="shardwright-accordion-toggle"><i class="fa-solid fa-chevron-right"></i></span>
                            <span class="shardwright-accordion-title">Summarization</span>
                        </div>
                        <div class="shardwright-accordion-content shardwright-hidden">
                            <div class="shardwright-control-group">
                                <div id="shardwright-sharder-controls" class="shardwright-block shardwright-sharder-controls shardwright-hidden">
                                    <div class="shardwright-inline-row">
                                        <label for="shardwright-sharder-profile">Sharder Profile:</label>
                                        <div id="shardwright-sharder-profile-mount"></div>
                                    </div>
                                    <label class="checkbox_label">
                                        <input id="shardwright-single-pass-auto-include-shards" type="checkbox" />
                                        <span>Auto-include all existing shards ${infoHintHtml('shardwright-auto-include-shards-hint', 'Skips the shard selection modal and includes all shard sections by default.')}</span>
                                    </label>
                                    <p class="shardwright-hint">Skips selection modal</p>
                                </div>

                                <div id="shardwright-advanced-control-block" class="shardwright-block">
                                    <label class="checkbox_label">
                                        <input id="shardwright-advanced-control" type="checkbox" />
                                        <span>Drafting Mode ${infoHintHtml('shardwright-pre-edit-events-hint', 'Extracts key events first so you can edit them before the summary is generated.')}</span>
                                    </label>
                                    <p class="shardwright-hint">Extract and review events before generating summary</p>
                                </div>

                                <div id="shardwright-summary-review-block" class="shardwright-block">
                                    <label class="checkbox_label">
                                        <input id="shardwright-summary-review-toggle" type="checkbox" />
                                        <span>Summary Review ${infoHintHtml('shardwright-summary-review-hint', 'Shows a review modal so you can edit the summary before it is saved or injected.')}</span>
                                    </label>
                                    <p class="shardwright-hint">Review generated summaries before injecting</p>
                                </div>

                                <div id="shardwright-summary-review-options" class="shardwright-block shardwright-hidden">
                                    <div class="shardwright-inline-row">
                                        <label for="shardwright-summary-review-mode">Review Mode:</label>
                                        <div id="shardwright-summary-review-mode-mount"></div>
                                    </div>
                                    <p class="shardwright-hint">When to show the summary review modal</p>
                                </div>

                                <div id="shardwright-length-control-block" class="shardwright-block">
                                    <label class="checkbox_label">
                                        <input id="shardwright-length-control" type="checkbox" />
                                        <span>Summary Length Control</span>
                                    </label>
                                    <p class="shardwright-hint">Limit summary length as a percentage of input</p>

                                    <div id="shardwright-length-slider-section" class="shardwright-hidden">
                                        <label for="shardwright-length-percent">Target Length:</label>
                                        <div id="shardwright-length-percent-host"></div>
                                        <p class="shardwright-hint">Summary will be approximately this percentage of input length (in words)</p>
                                    </div>
                                </div>

                                <div class="shardwright-block">
                                    <label class="checkbox_label">
                                        <input id="shardwright-context-cleanup" type="checkbox" />
                                        <span>Clean Context Before Summarization</span>
                                    </label>
                                    <div>
                                        <input id="shardwright-open-cleanup-btn" class="menu_button" type="button" value="Options..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="shardwright-review-accordion shardwright-settings-accordion" data-settings-section="filtering">
                        <div class="shardwright-accordion-header" role="button" tabindex="0" aria-expanded="false">
                            <span class="shardwright-accordion-toggle"><i class="fa-solid fa-chevron-right"></i></span>
                            <span class="shardwright-accordion-title">Filtering</span>
                        </div>
                        <div class="shardwright-accordion-content shardwright-hidden">
                            <div class="shardwright-block">
                                <label for="shardwright-banned-keywords">Banned Keywords:</label>
                                <div id="shardwright-banned-keywords-host"></div>
                                <p class="shardwright-hint">Comma-separated words excluded from generated keywords (lorebook + RAG)</p>
                            </div>
                        </div>
                    </div>

                    <div class="shardwright-review-accordion shardwright-settings-accordion" data-settings-section="configuration">
                        <div class="shardwright-accordion-header" role="button" tabindex="0" aria-expanded="false">
                            <span class="shardwright-accordion-toggle"><i class="fa-solid fa-chevron-right"></i></span>
                            <span class="shardwright-accordion-title">Configuration</span>
                        </div>
                        <div class="shardwright-accordion-content shardwright-hidden">
                            <div class="shardwright-block">
                                <div id="shardwright-active-prompt-display"></div>
                                <input id="shardwright-open-prompts-btn" class="menu_button" type="button" value="Configure Prompts..." />
                            </div>

                            <div class="shardwright-block">
                                <label>Advanced:</label>
                                <div class="shardwright-buttons">
                                    <input id="shardwright-open-themes-btn" class="menu_button" type="button" value="Themes" />
                                    <input id="shardwright-open-rag-btn" class="menu_button" type="button" value="RAG Settings" />
                                </div>
                            </div>

                            <div class="shardwright-block">
                                <label class="checkbox_label">
                                    <input id="shardwright-fab-enabled" type="checkbox" />
                                    <span>Show Floating Quick Actions</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="shardwright-review-accordion shardwright-settings-accordion" data-settings-section="debug">
                        <div class="shardwright-accordion-header" role="button" tabindex="0" aria-expanded="false">
                            <span class="shardwright-accordion-toggle"><i class="fa-solid fa-chevron-right"></i></span>
                            <span class="shardwright-accordion-title">Debug</span>
                        </div>
                        <div class="shardwright-accordion-content shardwright-hidden">
                            <div class="shardwright-block">
                                <label class="checkbox_label">
                                    <input id="shardwright-debug-logging" type="checkbox" />
                                    <span>Enable Debug Logging</span>
                                </label>
                                <p class="shardwright-hint">Turns on developer-only <code>debug</code> console logs for Shardwright subsystems.</p>
                            </div>

                            <div class="shardwright-block">
                                <input id="shardwright-export-debug-settings-btn" class="menu_button" type="button" value="Export Debug Settings..." />
                                <p class="shardwright-hint">Exports a shareable Markdown table of current extension settings and active chat metadata. Secrets stay redacted.</p>
                            </div>

                            <div class="shardwright-block shardwright-debug-suggestions">
                                <label>Useful Next Additions:</label>
                                <p class="shardwright-hint"> Soon.</p>
                            </div>
                        </div>
                    </div>

                    <div class="shardwright-action-bar">
                        <div class="shardwright-action-bar-primary">
                            <input id="shardwright-run-summarize" class="menu_button" type="button" value="Summarize Now" />
                            <input id="shardwright-run-single-pass" class="menu_button shardwright-hidden" type="button" value="Run Sharder" />
                            <input id="shardwright-run-single-pass-batch" class="menu_button shardwright-hidden" type="button" value="Batch Sharder" />
                            <input id="shardwright-stop-summarize" class="menu_button shardwright-hidden" type="button" value="Stop" />
                        </div>
                        <div class="shardwright-action-bar-secondary">
                            <input id="shardwright-visibility-button" class="menu_button" type="button" value="Manage Visibility" />
                            <input id="shardwright-manage-chats-btn" class="menu_button" type="button" value="Manage Chats" />
                            <input id="shardwright-interpretive-reviews-btn" class="menu_button" type="button" value="Interpretive Reviews" />
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const mountSegmentedToggle = (hostId, controlId, options, value) => {
        const host = document.getElementById(hostId);
        if (!host) {
            return null;
        }

        const segmented = createSegmentedToggle({ options, value });
        segmented.id = controlId;
        host.replaceChildren(segmented);
        return segmented;
    };

    const ensureSummaryReviewSettings = () => {
        if (!settings.summaryReview) {
            settings.summaryReview = {
                mode: 'always',
                tokenThreshold: 500,
                promptChangeDetection: true,
            };
        }
        return settings.summaryReview;
    };

    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container) {
        log.error('Could not find extensions settings container');
        return;
    }

    container.insertAdjacentHTML('beforeend', settingsHtml);
    setupSettingsAccordionHandlers();
    // Localize hint mounting to the container so we don't pollute the global document
    // with multiple listeners if settings are re-rendered.
    mountInfoHints(container);

    const modeToggle = mountSegmentedToggle(
        'shardwright-mode-mount',
        'shardwright-mode',
        [
            { value: 'auto', label: 'Automatic' },
            { value: 'manual', label: 'Manual' },
        ],
        settings.mode || 'auto',
    );

    const outputModeToggle = mountSegmentedToggle(
        'shardwright-output-mode-mount',
        'shardwright-output-mode',
        [
            { value: 'system', label: 'System' },
            { value: 'lorebook', label: 'Lorebook' },
        ],
        settings.outputMode || 'system',
    );

    const summaryReview = ensureSummaryReviewSettings();
    const reviewModeToggle = mountSegmentedToggle(
        'shardwright-summary-review-mode-mount',
        'shardwright-summary-review-mode',
        [
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
        ],
        summaryReview.mode || 'always',
    );

    const sharderProfileToggle = mountSegmentedToggle(
        'shardwright-sharder-profile-mount',
        'shardwright-sharder-profile',
        [
            { value: NARRATIVE_PROFILE, label: NARRATIVE_DISPLAY_NAME },
            { value: ARCHITECTURAL_PROFILE, label: ARCHITECTURAL_DISPLAY_NAME },
        ],
        normalizeSharderProfile(settings.sharderProfile),
    );

    const lengthPairHost = document.getElementById('shardwright-length-percent-host');
    const lengthPair = createRangeSliderPair({
        id: 'shardwright-length-percent',
        min: 1,
        max: 30,
        step: 1,
        value: settings.summaryLengthPercent || 10,
        unit: '%',
        onChange: (value) => {
            settings.summaryLengthPercent = value;
            saveSettings(settings);
        },
    });
    lengthPairHost?.replaceChildren(lengthPair);

    const bannedKeywordsHost = document.getElementById('shardwright-banned-keywords-host');
    const bannedTagInput = createTagInput({
        tags: parseCommaTags(settings.lorebookEntryOptions?.bannedKeywords || ''),
        placeholder: 'Add keyword...',
        onChange: (tags) => {
            if (!settings.lorebookEntryOptions) settings.lorebookEntryOptions = {};
            settings.lorebookEntryOptions.bannedKeywords = tagsToString(tags);
            saveSettings(settings);
        },
    });
    bannedTagInput.id = 'shardwright-banned-keywords';
    bannedKeywordsHost?.replaceChildren(bannedTagInput);

    document.getElementById('shardwright-auto-interval').value = settings.autoInterval || 20;

    const sharderModeEl = document.getElementById('shardwright-sharder-mode');
    if (sharderModeEl) {
        sharderModeEl.checked = settings.sharderMode || false;
    }

    const advancedControlEl = document.getElementById('shardwright-advanced-control');
    if (advancedControlEl) {
        advancedControlEl.checked = settings.advancedUserControl || false;
    }

    const lengthControlEl = document.getElementById('shardwright-length-control');
    if (lengthControlEl) {
        lengthControlEl.checked = settings.summaryLengthControl || false;
    }

    const summaryReviewToggle = document.getElementById('shardwright-summary-review-toggle');
    if (summaryReviewToggle) {
        summaryReviewToggle.checked = summaryReview.mode !== 'never';
    }

    const cleanupEl = document.getElementById('shardwright-context-cleanup');
    if (cleanupEl) {
        cleanupEl.checked = settings.contextCleanup?.enabled || false;
    }

    const fabEnabledEl = document.getElementById('shardwright-fab-enabled');
    if (fabEnabledEl) {
        fabEnabledEl.checked = settings.fab?.enabled !== false;
    }

    const debugLoggingEl = document.getElementById('shardwright-debug-logging');
    if (debugLoggingEl) {
        debugLoggingEl.checked = settings.debugLogging === true;
    }

    const useCharBookEl = document.getElementById('shardwright-use-char-book');
    const useChatBookEl = document.getElementById('shardwright-use-chat-book');
    const useCustomBooksEl = document.getElementById('shardwright-use-custom-books');

    if (useCharBookEl) {
        useCharBookEl.checked = settings.lorebookSelection?.useCharacterBook || false;
    }
    if (useChatBookEl) {
        useChatBookEl.checked = settings.lorebookSelection?.useChatBook || false;
    }
    if (useCustomBooksEl) {
        useCustomBooksEl.checked = settings.lorebookSelection?.useCustomBooks || false;
    }

    const singlePassAutoIncludeEl = document.getElementById('shardwright-single-pass-auto-include-shards');
    if (singlePassAutoIncludeEl) {
        singlePassAutoIncludeEl.checked = settings.autoIncludeShards === true;
    }

    toggleAutoInterval(settings.mode || 'auto');
    toggleLorebookSection(settings.outputMode || 'system');
    toggleSummaryReviewOptions(summaryReview.mode !== 'never');
    toggleLengthSlider(settings.summaryLengthControl || false);
    toggleCustomBooksDropdown(settings.lorebookSelection?.useCustomBooks || false);
    toggleSharderControls(settings);

    updateApiStatusDisplays(settings);

    const lorebookDropdown = new LorebookDropdown('shardwright-lorebook-dropdown', {
        initialSelection: settings.lorebookSelection?.customBookNames || [],
        onSelectionChange: (selection) => {
            if (!settings.lorebookSelection) {
                settings.lorebookSelection = {};
            }
            settings.lorebookSelection.customBookNames = selection;
            saveSettings(settings);
        },
    });

    if (settings.lorebookSelection?.useCustomBooks) {
        lorebookDropdown.render();
    }

    document.getElementById('shardwright-open-api-config-modal')?.addEventListener('click', async () => {
        await openApiConfigModal(settings);
        updateApiStatusDisplays(settings);
    });

    modeToggle?.addEventListener('change', (e) => {
        settings.mode = e.target.value;
        saveSettings(settings);
        toggleAutoInterval(e.target.value);
    });

    document.getElementById('shardwright-auto-interval')?.addEventListener('input', (e) => {
        settings.autoInterval = Math.max(1, parseInt(e.target.value, 10) || 20);
        saveSettings(settings);
    });

    outputModeToggle?.addEventListener('change', (e) => {
        settings.outputMode = e.target.value;
        saveSettings(settings);
        toggleLorebookSection(e.target.value);
    });

    advancedControlEl?.addEventListener('change', (e) => {
        settings.advancedUserControl = e.target.checked;
        saveSettings(settings);
        updateApiStatusDisplays(settings);
        updateActivePromptDisplay(settings);
    });

    sharderModeEl?.addEventListener('change', (e) => {
        settings.sharderMode = e.target.checked;
        saveSettings(settings);
        toggleSharderControls(settings);
        updateApiStatusDisplays(settings);
        updateActivePromptDisplay(settings);

        if (e.target.checked && settings.advancedUserControl) {
            settings.advancedUserControl = false;
            if (advancedControlEl) {
                advancedControlEl.checked = false;
            }
            toastr.info('Disabled Drafting Mode (use Sharder Mode instead)');
            saveSettings(settings);
            updateApiStatusDisplays(settings);
            updateActivePromptDisplay(settings);
        }
    });

    singlePassAutoIncludeEl?.addEventListener('change', (e) => {
        settings.autoIncludeShards = e.target.checked;
        saveSettings(settings);
    });

    sharderProfileToggle?.addEventListener('change', (e) => {
        settings.sharderProfile = normalizeSharderProfile(e.target.value);
        saveSettings(settings);
        updateActivePromptDisplay(settings);
    });

    summaryReviewToggle?.addEventListener('change', (e) => {
        const currentSummaryReview = ensureSummaryReviewSettings();
        currentSummaryReview.mode = e.target.checked ? 'always' : 'never';
        reviewModeToggle?.setValue(currentSummaryReview.mode);
        saveSettings(settings);
        toggleSummaryReviewOptions(e.target.checked);
    });

    reviewModeToggle?.addEventListener('change', (e) => {
        const currentSummaryReview = ensureSummaryReviewSettings();
        currentSummaryReview.mode = e.target.value;
        saveSettings(settings);
    });

    document.getElementById('shardwright-run-single-pass')?.addEventListener('click', async () => {
        const messages = getAllMessages();
        if (!messages || messages.length === 0) {
            toastr.warning('No messages available');
            return;
        }

        const maxIndex = messages.length - 1;
        const rangeStr = await showSsInput(
            'Sharder: Select Range',
            `Enter message range for sharder (0 to ${maxIndex}):\nExample: '5-25'`,
            `0-${maxIndex}`
        );

        if (!rangeStr) return;

        const match = rangeStr.trim().match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) {
            toastr.warning('Invalid range format. Use: start-end (e.g., 0-25)');
            return;
        }

        const startIdx = parseInt(match[1], 10);
        const endIdx = parseInt(match[2], 10);

        if (startIdx > endIdx) {
            toastr.warning('Start index must be less than or equal to end index');
            return;
        }

        if (endIdx > maxIndex) {
            toastr.warning(`End index cannot exceed ${maxIndex}`);
            return;
        }

        runSharder(startIdx, endIdx, settings);
    });

    document.getElementById('shardwright-run-single-pass-batch')?.addEventListener('click', async () => {
        const messages = getAllMessages();
        if (!messages || messages.length === 0) {
            toastr.warning('No messages available');
            return;
        }

        const maxIndex = messages.length - 1;
        const config = await openBatchConfigModal(messages, maxIndex);
        if (!config?.confirmed) return;

        runSharderQueue(config.ranges || [], settings, config.batchConfig || {});
    });

    lengthControlEl?.addEventListener('change', (e) => {
        settings.summaryLengthControl = e.target.checked;
        saveSettings(settings);
        toggleLengthSlider(e.target.checked);
    });

    document.getElementById('shardwright-context-cleanup')?.addEventListener('change', (e) => {
        if (!settings.contextCleanup) settings.contextCleanup = {};
        settings.contextCleanup.enabled = e.target.checked;
        saveSettings(settings);
    });

    useCharBookEl?.addEventListener('change', (e) => {
        if (!settings.lorebookSelection) {
            settings.lorebookSelection = {};
        }
        settings.lorebookSelection.useCharacterBook = e.target.checked;
        saveSettings(settings);
    });

    useChatBookEl?.addEventListener('change', (e) => {
        if (!settings.lorebookSelection) {
            settings.lorebookSelection = {};
        }
        settings.lorebookSelection.useChatBook = e.target.checked;
        saveSettings(settings);
    });

    useCustomBooksEl?.addEventListener('change', (e) => {
        if (!settings.lorebookSelection) {
            settings.lorebookSelection = {};
        }
        settings.lorebookSelection.useCustomBooks = e.target.checked;
        saveSettings(settings);
        toggleCustomBooksDropdown(e.target.checked);

        if (e.target.checked) {
            lorebookDropdown.render();
        }
    });

    document.getElementById('shardwright-lorebook-options-btn')?.addEventListener('click', () => {
        openLorebookOptionsModal(settings);
    });

    document.getElementById('shardwright-open-prompts-btn')?.addEventListener('click', () => {
        openPromptsModal(settings);
    });

    document.getElementById('shardwright-open-cleanup-btn')?.addEventListener('click', () => {
        openCleanContextModal(settings);
    });

    document.getElementById('shardwright-open-themes-btn')?.addEventListener('click', () => {
        openThemesModal(settings, () => saveSettings(settings));
    });

    document.getElementById('shardwright-open-rag-btn')?.addEventListener('click', () => {
        openRagSettingsModal(settings);
    });

    document.getElementById('shardwright-fab-enabled')?.addEventListener('change', (e) => {
        if (!settings.fab) settings.fab = {};
        settings.fab.enabled = e.target.checked;
        saveSettings(settings);
        updateFabVisibility();
    });

    debugLoggingEl?.addEventListener('change', (e) => {
        settings.debugLogging = e.target.checked;
        saveSettings(settings);
        try {
            localStorage.setItem('shardwright:debug', e.target.checked ? 'true' : 'false');
        } catch {
            // Ignore storage failures; settings persistence still controls the logger.
        }
    });

    document.getElementById('shardwright-export-debug-settings-btn')?.addEventListener('click', async () => {
        await openDebugExportModal(settings);
    });

    document.getElementById('shardwright-run-summarize')?.addEventListener('click', () => {
        if (callbacks.onManualSummarize) {
            callbacks.onManualSummarize();
        }
    });

    document.getElementById('shardwright-stop-summarize')?.addEventListener('click', () => {
        stopSummarization();
    });

    document.getElementById('shardwright-visibility-button')?.addEventListener('click', () => {
        openVisibilityModal(settings);
    });

    document.getElementById('shardwright-manage-chats-btn')?.addEventListener('click', () => {
        openChatManagerModal(settings);
    });

    document.getElementById('shardwright-interpretive-reviews-btn')?.addEventListener('click', () => {
        openInterpretiveReviewModal();
    });

    updateActivePromptDisplay(settings);
}

