/**
 * Lorebook Options Modal Component for Shardwright
 * Configures how summaries are saved to lorebooks
 */

import { saveSettings } from '../../../core/settings.js';
import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../../../popup.js';
import { createSegmentedToggle, createTagInput, parseCommaTags, tagsToString } from '../../common/index.js';
import { escapeHtml } from '../../common/ui-utils.js';
/**
 * Open the lorebook options modal
 */
export async function openLorebookOptionsModal(settings) {
    // Create working copy with defaults
    const modalState = {
        entryType: settings.lorebookEntryOptions?.entryType || 'constant',
        nameFormat: settings.lorebookEntryOptions?.nameFormat || 'Memory Shard {start}-{end}',
        keywordsEnabled: settings.lorebookEntryOptions?.keywordsEnabled !== false,
        keywordFormat: settings.lorebookEntryOptions?.keywordFormat || 'summary_{start}_{end}',
        additionalKeywords: settings.lorebookEntryOptions?.additionalKeywords || '',
        extractKeywords: settings.lorebookEntryOptions?.extractKeywords !== false,
        orderStrategy: settings.lorebookEntryOptions?.orderStrategy || 'recency',
        fixedOrderValue: settings.lorebookEntryOptions?.fixedOrderValue || 100,
    };

    const modalHtml = `
        <div class="shardwright-lorebook-options-modal">
            <h3>Lorebook Entry Options</h3>
            <p class="shardwright-option-hint shardwright-option-hint-intro">
                These settings apply to all summaries saved to lorebooks.
            </p>

            <div class="shardwright-option-group">
                <label for="shardwright-entry-type">Entry Type:</label>
                <select id="shardwright-entry-type" class="text_pole shardwright-option-control">
                    <option value="constant" ${modalState.entryType === 'constant' ? 'selected' : ''}>
                        Constant (Always active)
                    </option>
                    <option value="normal" ${modalState.entryType === 'normal' ? 'selected' : ''}>
                        Normal (Keyword triggered)
                    </option>
                    <option value="vectorized" ${modalState.entryType === 'vectorized' ? 'selected' : ''}>
                        Vectorized (Semantic search)
                    </option>
                    <option value="disabled" ${modalState.entryType === 'disabled' ? 'selected' : ''}>
                        Disabled (Saved but inactive)
                    </option>
                </select>
                <p class="shardwright-option-hint">
                    Constant entries are always included. Normal entries trigger on keywords.
                </p>
            </div>

            <div class="shardwright-option-group">
                <label for="shardwright-name-format">Entry Name Format:</label>
                <input id="shardwright-name-format" type="text" class="text_pole shardwright-option-control"
                       value="${escapeHtml(modalState.nameFormat)}" />
                <p class="shardwright-option-hint">
                    Variables: {start}, {end}, {date}, {character}
                </p>
            </div>

            <div class="shardwright-option-group">
                <label class="checkbox_label">
                    <input id="shardwright-extract-keywords" type="checkbox"
                           ${modalState.extractKeywords ? 'checked' : ''} />
                    <span>Extract keywords from summary (AI-generated)</span>
                </label>
                <p class="shardwright-option-hint">
                    AI will extract relevant keywords (names, events, topics) from the summary content.
                </p>
            </div>

            <div class="shardwright-option-group">
                <label class="checkbox_label">
                    <input id="shardwright-keywords-enabled" type="checkbox"
                           ${modalState.keywordsEnabled ? 'checked' : ''} />
                    <span>Use format-based keywords (fallback)</span>
                </label>
                <p class="shardwright-option-hint">
                    Used when AI extraction is disabled or returns no keywords.
                </p>
            </div>

            <div id="shardwright-keyword-options" class="${modalState.keywordsEnabled ? '' : 'shardwright-hidden'}">
                <div class="shardwright-option-group">
                    <label for="shardwright-keyword-format">Keyword Format:</label>
                    <input id="shardwright-keyword-format" type="text" class="text_pole shardwright-option-control"
                           value="${escapeHtml(modalState.keywordFormat)}" />
                    <p class="shardwright-option-hint">
                        Variables: {start}, {end}
                    </p>
                </div>
            </div>

            <div class="shardwright-option-group">
                <label>Additional Keywords:</label>
                <div id="shardwright-additional-keywords"></div>
                <p class="shardwright-option-hint">
                    Comma-separated list added to every entry (in addition to extracted/generated keywords)
                </p>
            </div>

            <hr class="shardwright-lorebook-separator" />

            <div class="shardwright-option-group">
                <label>Entry Order Strategy:</label>
                <div id="shardwright-order-strategy"></div>
                <p class="shardwright-option-hint">
                    Controls prompt inclusion priority. Higher order = included earlier in context.
                </p>
            </div>

            <div id="shardwright-fixed-order-options" class="${modalState.orderStrategy === 'fixed' ? '' : 'shardwright-hidden'}">
                <div class="shardwright-option-group">
                    <label for="shardwright-fixed-order-value">Fixed Order Value:</label>
                    <input id="shardwright-fixed-order-value" type="number" class="text_pole shardwright-option-control"
                           value="${modalState.fixedOrderValue}" min="0" max="999" />
                </div>
            </div>
        </div>
    `;

    const popup = new Popup(
        modalHtml,
        POPUP_TYPE.TEXT,
        null,
        {
            okButton: 'Save',
            cancelButton: 'Cancel',
            wide: false,
            large: false
        }
    );

    const showPromise = popup.show();

    // Attach event listeners after popup shows
    requestAnimationFrame(() => {
        const keywordOptions = document.getElementById('shardwright-keyword-options');
        const fixedOrderOptions = document.getElementById('shardwright-fixed-order-options');

        const updateKeywordOptionsVisibility = () => {
            keywordOptions?.classList.toggle('shardwright-hidden', !modalState.keywordsEnabled);
        };

        const updateFixedOrderVisibility = () => {
            fixedOrderOptions?.classList.toggle('shardwright-hidden', modalState.orderStrategy !== 'fixed');
        };

        document.getElementById('shardwright-entry-type')?.addEventListener('change', (e) => {
            modalState.entryType = e.target.value;
        });

        document.getElementById('shardwright-name-format')?.addEventListener('input', (e) => {
            modalState.nameFormat = e.target.value;
        });

        document.getElementById('shardwright-extract-keywords')?.addEventListener('change', (e) => {
            modalState.extractKeywords = e.target.checked;
        });

        document.getElementById('shardwright-keywords-enabled')?.addEventListener('change', (e) => {
            modalState.keywordsEnabled = e.target.checked;
            updateKeywordOptionsVisibility();
        });

        document.getElementById('shardwright-keyword-format')?.addEventListener('input', (e) => {
            modalState.keywordFormat = e.target.value;
        });

        const additionalKeywordsContainer = document.getElementById('shardwright-additional-keywords');
        if (additionalKeywordsContainer) {
            const tagInput = createTagInput({
                tags: parseCommaTags(modalState.additionalKeywords),
                placeholder: 'Add keyword...',
                onChange: (tags) => {
                    modalState.additionalKeywords = tagsToString(tags);
                }
            });
            additionalKeywordsContainer.replaceChildren(tagInput);
        }

        const orderStrategyContainer = document.getElementById('shardwright-order-strategy');
        if (orderStrategyContainer) {
            const segmentedToggle = createSegmentedToggle({
                options: [
                    { value: 'recency', label: 'Recency Priority' },
                    { value: 'fixed', label: 'Fixed Value' }
                ],
                value: modalState.orderStrategy,
                onChange: (value) => {
                    modalState.orderStrategy = value;
                    updateFixedOrderVisibility();
                }
            });
            orderStrategyContainer.replaceChildren(segmentedToggle);
        }

        document.getElementById('shardwright-fixed-order-value')?.addEventListener('input', (e) => {
            modalState.fixedOrderValue = parseInt(e.target.value, 10) || 100;
        });

        updateKeywordOptionsVisibility();
        updateFixedOrderVisibility();
    });

    const result = await showPromise;

    if (result === POPUP_RESULT.AFFIRMATIVE) {
        // Ensure lorebookEntryOptions object exists
        if (!settings.lorebookEntryOptions) {
            settings.lorebookEntryOptions = {};
        }

        // Save to settings
        settings.lorebookEntryOptions.entryType = modalState.entryType;
        settings.lorebookEntryOptions.nameFormat = modalState.nameFormat;
        settings.lorebookEntryOptions.extractKeywords = modalState.extractKeywords;
        settings.lorebookEntryOptions.keywordsEnabled = modalState.keywordsEnabled;
        settings.lorebookEntryOptions.keywordFormat = modalState.keywordFormat;
        settings.lorebookEntryOptions.additionalKeywords = modalState.additionalKeywords;
        settings.lorebookEntryOptions.orderStrategy = modalState.orderStrategy;
        settings.lorebookEntryOptions.fixedOrderValue = modalState.fixedOrderValue;

        saveSettings(settings);
        toastr.success('Lorebook options saved');
    }
}
