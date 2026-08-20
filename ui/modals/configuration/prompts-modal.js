/**
 * Prompts Modal Component for Shardwright
 * Tabbed modal for managing Summary Prompts, Sharder Prompts, and Drafting Prompt
 */

import { saveSettings } from '../../../core/settings.js';
import {
    addPrompt,
    exportPrompts,
    importPrompts,
    DEFAULT_PROMPT,
    DEFAULT_SHARDER_PROMPT,
    DEFAULT_ARCHITECTURAL_SHARDER_PROMPT,
    DEFAULT_CASING_PROMPT,
    getCasingPrompt,
    resetCasingPrompt,
    getSharderPrompts,
    ensureSharderPrompts
} from '../../../core/summarization/prompts.js';
import { getActivePromptLabel, isSharderMode } from '../../common/active-mode-state.js';
import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../../../popup.js';
import { showSsConfirm, showSsInput } from '../../common/modal-base.js';
import {
    ARCHITECTURAL_DISPLAY_NAME,
    ARCHITECTURAL_PROFILE,
    NARRATIVE_DISPLAY_NAME,
    normalizeSharderProfile,
} from '../../../core/summarization/sharder-section-registry.js';

/**
 * Attach Copy/Paste/Clear/Reset action buttons to a prompt textarea.
 * @param {HTMLTextAreaElement} textarea
 * @param {Function} onReset - async function to call when Reset is clicked
 */
function createTextareaActions(textarea, onReset) {
    const wrapper = document.createElement('div');
    wrapper.className = 'shardwright-textarea-wrapper';
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    const actions = document.createElement('div');
    actions.className = 'shardwright-textarea-actions';
    actions.innerHTML = `
        <button class="shardwright-textarea-action-btn" data-action="copy" title="Copy to clipboard"><i class="fa-solid fa-copy"></i></button>
        <button class="shardwright-textarea-action-btn" data-action="paste" title="Paste from clipboard"><i class="fa-solid fa-paste"></i></button>
        <button class="shardwright-textarea-action-btn" data-action="clear" title="Clear content"><i class="fa-solid fa-xmark"></i></button>
        <button class="shardwright-textarea-action-btn" data-action="reset" title="Reset to default"><i class="fa-solid fa-rotate-left"></i></button>
    `;
    wrapper.appendChild(actions);

    actions.querySelector('[data-action="copy"]').addEventListener('click', () => {
        navigator.clipboard.writeText(textarea.value)
            .then(() => toastr.success('Copied to clipboard'))
            .catch(() => toastr.error('Failed to copy'));
    });

    actions.querySelector('[data-action="paste"]').addEventListener('click', () => {
        navigator.clipboard.readText()
            .then(text => {
                textarea.value = text;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                toastr.success('Pasted from clipboard');
            })
            .catch(() => toastr.error('Failed to paste — check clipboard permissions'));
    });

    actions.querySelector('[data-action="clear"]').addEventListener('click', async () => {
        const confirm = await showSsConfirm('Clear Prompt', 'Clear all content from this prompt?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    actions.querySelector('[data-action="reset"]').addEventListener('click', onReset);
}

/**
 * Render the prompts dropdown and textarea for Tab 1 (Summary Prompts)
 */
function renderSummaryPromptsTab(settings, container) {
    container.innerHTML = `
        <div class="shardwright-prompts-tab-content">
            <div class="shardwright-block shardwright-prompts-block">
                <label>Select Prompt:</label>
                <div class="shardwright-prompts-inline-row">
                    <select id="shardwright-modal-prompt-select" class="text_pole shardwright-prompts-select"></select>
                </div>
            </div>

            <div class="shardwright-block shardwright-prompts-block">
                <label>Prompt Content:</label>
                <textarea id="shardwright-modal-prompt-textarea" class="text_pole shardwright-prompts-editor"></textarea>
            </div>

            <div class="shardwright-buttons shardwright-prompts-buttons-row">
                <input id="shardwright-modal-add-prompt" class="menu_button" type="button" value="Add New" />
                <input id="shardwright-modal-rename-prompt" class="menu_button" type="button" value="Rename" />
                <input id="shardwright-modal-delete-prompt" class="menu_button" type="button" value="Delete" />
                <input id="shardwright-modal-reset-prompt" class="menu_button" type="button" value="Reset to Default" />
            </div>
        </div>
    `;

    const select = container.querySelector('#shardwright-modal-prompt-select');
    const textarea = container.querySelector('#shardwright-modal-prompt-textarea');

    // Populate dropdown
    function populateDropdown() {
        select.innerHTML = '';
        settings.prompts.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            if (p.name === settings.activePromptName) opt.selected = true;
            select.appendChild(opt);
        });

        // Update textarea
        const activePrompt = settings.prompts.find(p => p.name === settings.activePromptName);
        textarea.value = activePrompt ? activePrompt.content : '';
    }

    populateDropdown();

    // Capture initial state for reset
    const initialContent = textarea.value;

    // Textarea action buttons (Copy / Paste / Clear / Reset)
    createTextareaActions(textarea, async () => {
        const confirm = await showSsConfirm('Reset Prompt', 'Discard changes to this prompt?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            const idx = settings.prompts.findIndex(p => p.name === settings.activePromptName);
            if (idx !== -1) {
                settings.prompts[idx].content = initialContent;
                textarea.value = initialContent;
                saveSettings(settings);
                toastr.success('Prompt reset to last saved version');
            }
        }
    });

    // Event: Dropdown change
    select.addEventListener('change', (e) => {
        settings.activePromptName = e.target.value;
        const activePrompt = settings.prompts.find(p => p.name === settings.activePromptName);
        textarea.value = activePrompt ? activePrompt.content : '';
        saveSettings(settings);
        updateActivePromptDisplay(settings);
    });

    // Event: Textarea change
    textarea.addEventListener('input', (e) => {
        const idx = settings.prompts.findIndex(p => p.name === settings.activePromptName);
        if (idx !== -1) {
            settings.prompts[idx].content = e.target.value;
            saveSettings(settings);
        }
    });

    // Event: Add New
    container.querySelector('#shardwright-modal-add-prompt').addEventListener('click', async () => {
        const name = await showSsInput('Add Prompt', 'Enter name for new prompt:');
        if (name && name.trim()) {
            // Check for duplicate names
            if (settings.prompts.some(p => p.name === name.trim())) {
                toastr.error('A prompt with this name already exists');
                return;
            }
            addPrompt(settings, name.trim(), '');
            populateDropdown();
            toastr.success('Prompt added');
        }
    });

    // Event: Rename
    container.querySelector('#shardwright-modal-rename-prompt').addEventListener('click', async () => {
        if (!settings.activePromptName) {
            toastr.warning('No prompt selected');
            return;
        }
        const newName = await showSsInput('Rename Prompt', 'Enter new name:', settings.activePromptName);
        if (newName && newName.trim() && newName.trim() !== settings.activePromptName) {
            // Check for duplicate names
            if (settings.prompts.some(p => p.name === newName.trim())) {
                toastr.error('A prompt with this name already exists');
                return;
            }
            const idx = settings.prompts.findIndex(p => p.name === settings.activePromptName);
            if (idx !== -1) {
                settings.prompts[idx].name = newName.trim();
                settings.activePromptName = newName.trim();
                saveSettings(settings);
                populateDropdown();
                updateActivePromptDisplay(settings);
                toastr.success('Prompt renamed');
            }
        }
    });

    // Event: Delete
    container.querySelector('#shardwright-modal-delete-prompt').addEventListener('click', async () => {
        if (!settings.activePromptName) {
            toastr.warning('No prompt selected');
            return;
        }
        if (settings.prompts.length <= 1) {
            toastr.warning('Cannot delete the last prompt');
            return;
        }
        const confirm = await showSsConfirm('Delete Prompt', `Are you sure you want to delete "${settings.activePromptName}"?`);
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            const idx = settings.prompts.findIndex(p => p.name === settings.activePromptName);
            if (idx !== -1) {
                settings.prompts.splice(idx, 1);
                settings.activePromptName = settings.prompts[0]?.name || '';
                saveSettings(settings);
                populateDropdown();
                updateActivePromptDisplay(settings);
                toastr.success('Prompt deleted');
            }
        }
    });

    // Event: Reset to Default
    container.querySelector('#shardwright-modal-reset-prompt').addEventListener('click', async () => {
        const confirm = await showSsConfirm('Reset Prompt', 'Reset this prompt to the default Memory Sharding template?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            const idx = settings.prompts.findIndex(p => p.name === settings.activePromptName);
            if (idx !== -1) {
                settings.prompts[idx].content = DEFAULT_PROMPT;
                textarea.value = DEFAULT_PROMPT;
                saveSettings(settings);
                toastr.success('Prompt reset to default');
            }
        }
    });
}

/**
 * Render the Sharder Prompts tab (Tab 2)
 */
function renderSharderPromptsTab(settings, container) {
    ensureSharderPrompts(settings);
    const sharderPrompts = getSharderPrompts(settings);
    const activeProfile = normalizeSharderProfile(sharderPrompts.profile);
    const isArchitectural = activeProfile === ARCHITECTURAL_PROFILE;
    const activeDisplayName = isArchitectural ? ARCHITECTURAL_DISPLAY_NAME : NARRATIVE_DISPLAY_NAME;
    const defaultPrompt = isArchitectural ? DEFAULT_ARCHITECTURAL_SHARDER_PROMPT : DEFAULT_SHARDER_PROMPT;
    const getPromptStore = () => {
        if (isArchitectural) {
            if (!settings.architecturalSharderPrompts) settings.architecturalSharderPrompts = {};
            return settings.architecturalSharderPrompts;
        }
        if (!settings.sharderPrompts) settings.sharderPrompts = {};
        return settings.sharderPrompts;
    };

    container.innerHTML = `
        <div class="shardwright-sharder-prompts-tab">
            <div class="shardwright-block shardwright-prompts-block">
                <label>Sharder Prompt: ${activeDisplayName}</label>
                <textarea id="shardwright-modal-single-pass-prompt" class="text_pole shardwright-prompts-editor"></textarea>
            </div>

            <div class="shardwright-buttons">
                <input id="shardwright-modal-reset-sharder" class="menu_button" type="button" value="Reset to Defaults" />
            </div>
        </div>
    `;

    const singlePassTextarea = container.querySelector('#shardwright-modal-single-pass-prompt');
    singlePassTextarea.value = sharderPrompts.prompt;

    // Capture initial state for reset
    const initialSharderContent = sharderPrompts.prompt;

    // Textarea action buttons (Copy / Paste / Clear / Reset)
    createTextareaActions(singlePassTextarea, async () => {
        const confirm = await showSsConfirm('Reset Sharder Prompt', 'Discard changes to this prompt?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            getPromptStore().prompt = initialSharderContent;
            singlePassTextarea.value = initialSharderContent;
            saveSettings(settings);
            toastr.success('Sharder prompt reset to last saved version');
        }
    });

    // Event: Sharder prompt change
    singlePassTextarea.addEventListener('input', (e) => {
        getPromptStore().prompt = e.target.value;
        saveSettings(settings);
    });

    // Event: Reset
    container.querySelector('#shardwright-modal-reset-sharder').addEventListener('click', async () => {
        const confirm = await showSsConfirm('Reset Sharder Prompt', 'Reset the sharder prompt to its default?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            getPromptStore().prompt = defaultPrompt;
            singlePassTextarea.value = defaultPrompt;
            saveSettings(settings);
            toastr.success('Sharder prompts reset to defaults');
        }
    });
}

/**
 * Render the Drafting Prompt tab (Tab 3)
 */
function renderEventsPromptTab(settings, container) {
    const eventsPrompt = getCasingPrompt(settings);

    container.innerHTML = `
        <div class="shardwright-events-prompt-tab">
            <div class="shardwright-block shardwright-prompts-block">
                <label>Drafting Extraction Prompt:</label>
                <textarea id="shardwright-modal-events-prompt" class="text_pole shardwright-prompts-editor"></textarea>
                <p class="shardwright-prompts-hint">
                    Used by Drafting Mode to extract discrete events from chat messages.
                    Leave empty to use the default prompt.
                </p>
            </div>

            <div class="shardwright-buttons">
                <input id="shardwright-modal-reset-events" class="menu_button" type="button" value="Reset to Default" />
            </div>
        </div>
    `;

    const textarea = container.querySelector('#shardwright-modal-events-prompt');
    textarea.value = eventsPrompt;

    // Capture initial state for reset
    const initialEventsContent = eventsPrompt;

    // Textarea action buttons (Copy / Paste / Clear / Reset)
    createTextareaActions(textarea, async () => {
        const confirm = await showSsConfirm('Reset Drafting Prompt', 'Discard changes to this prompt?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            settings.casingPrompt = initialEventsContent;
            textarea.value = initialEventsContent;
            saveSettings(settings);
            toastr.success('Drafting prompt reset to last saved version');
        }
    });

    // Event: Textarea change
    textarea.addEventListener('input', (e) => {
        settings.casingPrompt = e.target.value;
        saveSettings(settings);
    });

    // Event: Reset
    container.querySelector('#shardwright-modal-reset-events').addEventListener('click', async () => {
        const confirm = await showSsConfirm('Reset Drafting Prompt', 'Reset the drafting extraction prompt to the default?');
        if (confirm === POPUP_RESULT.AFFIRMATIVE) {
            resetCasingPrompt(settings);
            textarea.value = DEFAULT_CASING_PROMPT;
            toastr.success('Drafting prompt reset to default');
        }
    });
}

/**
 * Handle tab switching
 */
function switchTab(tabId, container) {
    // Update tab buttons
    container.querySelectorAll('.shardwright-tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab panels
    container.querySelectorAll('.shardwright-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `shardwright-tab-${tabId}`);
    });
}

/**
 * Open the prompts management modal
 */
export async function openPromptsModal(settings) {
    const modalHtml = `
        <div class="shardwright-prompts-modal">
            <div class="shardwright-tab-header">
                <button class="shardwright-tab-button active" data-tab="summary">Summary Prompts</button>
                <button class="shardwright-tab-button" data-tab="sharder">Sharder Prompts</button>
                <button class="shardwright-tab-button" data-tab="events">Drafting Prompt</button>
            </div>

            <div class="shardwright-tab-content">
                <div id="shardwright-tab-summary" class="shardwright-tab-panel active"></div>
                <div id="shardwright-tab-sharder" class="shardwright-tab-panel"></div>
                <div id="shardwright-tab-events" class="shardwright-tab-panel"></div>
            </div>

            <!-- Hidden file input (stays in modal) -->
            <input type="file" id="shardwright-modal-import-file" accept=".json" class="shardwright-hidden" />
        </div>
    `;

    const popup = new Popup(
        modalHtml,
        POPUP_TYPE.TEXT,
        null,
        {
            okButton: 'Close',
            cancelButton: null,
            wide: true,
            large: true
        }
    );

    const showPromise = popup.show();

        // Set up content after popup shows
        requestAnimationFrame(() => {
            const modalContainer = document.querySelector('.shardwright-prompts-modal');
            if (!modalContainer) return;
    
            // Find the popup controls and inject our buttons on the left
            const popupControls = modalContainer.closest('.popup')?.querySelector('.popup-controls');
            if (popupControls) {
                // Create left-side button group
                const leftButtons = document.createElement('div');
                leftButtons.className = 'shardwright-popup-left-buttons';
                leftButtons.innerHTML = `
                    <input id="shardwright-modal-import" class="menu_button" type="button" value="Import" />
                    <input id="shardwright-modal-export" class="menu_button" type="button" value="Export" />
                `;
                
                // Insert at the beginning of popup controls
                popupControls.insertBefore(leftButtons, popupControls.firstChild);

                // Ensure controls row lays out with left utility group and right close button.
                popupControls.classList.add('shardwright-popup-controls');
            }
    
            const summaryPanel = modalContainer.querySelector('#shardwright-tab-summary');
            const sharderPanel = modalContainer.querySelector('#shardwright-tab-sharder');
            const eventsPanel = modalContainer.querySelector('#shardwright-tab-events');
    
            // Render initial tab content
            renderSummaryPromptsTab(settings, summaryPanel);
            renderSharderPromptsTab(settings, sharderPanel);
            renderEventsPromptTab(settings, eventsPanel);
    
            // Tab switching
            modalContainer.querySelectorAll('.shardwright-tab-button').forEach(btn => {
                btn.addEventListener('click', () => {
                    switchTab(btn.dataset.tab, modalContainer);
                });
            });
    
            // Import button - now query from popup controls
            document.getElementById('shardwright-modal-import')?.addEventListener('click', () => {
                modalContainer.querySelector('#shardwright-modal-import-file').click();
            });
    
            // Import file handler
            modalContainer.querySelector('#shardwright-modal-import-file').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    importPrompts(settings, file, (success) => {
                        if (success) {
                            renderSummaryPromptsTab(settings, summaryPanel);
                        }
                    });
                }
                e.target.value = '';
            });
    
            // Export button - now query from popup controls
            document.getElementById('shardwright-modal-export')?.addEventListener('click', () => {
                exportPrompts(settings);
            });
        });

    await showPromise;
}

/**
 * Update the active prompt display in the main UI
 */
export function updateActivePromptDisplay(settings) {
    const display = document.getElementById('shardwright-active-prompt-display');
    if (!display) return;

    const labels = [];

    if (isSharderMode(settings)) {
        // If Sharder Mode is enabled, show active sharder prompt family
        labels.push(`<strong>Sharder Prompt Active:</strong> ${getActivePromptLabel(settings)}`);
    } else {
        // Show Summary Prompt
        const summaryPromptName = getActivePromptLabel(settings) || '(none)';
        labels.push(`<strong>Summary Prompt:</strong> ${summaryPromptName}`);

        // If Drafting Mode is enabled, also show Drafting Prompt
        if (settings.advancedUserControl) {
            labels.push('<strong>Drafting Prompt Active</strong>');
        }
    }

    display.innerHTML = labels.join('<br>');
}

