/**
 * Drafting Modal Component for Drafting Mode
 */

import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../../../popup.js';
import { extractDraftEvents } from '../../../core/api/casing-api.js';
import { escapeHtml } from '../../common/ui-utils.js';
import { log } from '../../../core/logger.js';

/**
 * Render a single event row
 */
function renderEventRow(event, index, modalState) {
    const description = event.userDescription ?? event.originalDescription;

    // Build summary line
    const summaryParts = [];
    if (event.time) summaryParts.push(event.time);
    if (event.date) summaryParts.push(event.date);
    if (event.location) summaryParts.push(event.location);
    if (event.characters.length > 0) {
        summaryParts.push(event.characters.join(', '));
    }

    const summaryText = summaryParts.length > 0
        ? summaryParts.join(' - ')
        : 'Event ' + (index + 1);

    const row = document.createElement('div');
    row.className = `shardwright-event-row ${!event.selected ? 'shardwright-event-excluded' : ''}`;
    row.dataset.eventId = event.id;

    row.innerHTML = `
        <div class="shardwright-event-header">
            <input type="checkbox" class="shardwright-event-checkbox" ${event.selected ? 'checked' : ''} />
            <span class="shardwright-event-summary">${escapeHtml(summaryText)}</span>
        </div>
        <div class="shardwright-event-messages">
            From messages #${event.messageRange.startIndex}-${event.messageRange.endIndex}
        </div>
        <textarea class="shardwright-event-description text_pole">${escapeHtml(description)}</textarea>
    `;

    // Checkbox handler
    const checkbox = row.querySelector('.shardwright-event-checkbox');
    checkbox.addEventListener('change', (e) => {
        modalState.events[index].selected = e.target.checked;
        row.className = `shardwright-event-row ${!e.target.checked ? 'shardwright-event-excluded' : ''}`;
    });

    // Description handler
    const textarea = row.querySelector('.shardwright-event-description');
    textarea.addEventListener('input', (e) => {
        modalState.events[index].userDescription = e.target.value;
    });

    return row;
}

/**
 * Render the events list
 */
function renderEventsList(container, modalState) {
    container.innerHTML = '';

    if (modalState.isRegenerating) {
        container.innerHTML = `
            <div class="shardwright-events-loading">
                <div class="spinner"></div>
                <p>Extracting events...</p>
            </div>
        `;
        return;
    }

    if (modalState.events.length === 0) {
        container.innerHTML = `
            <div class="shardwright-events-empty">
                <p>No events extracted. Try clicking "Regenerate" or check your message range.</p>
            </div>
        `;
        return;
    }

    modalState.events.forEach((event, index) => {
        const row = renderEventRow(event, index, modalState);
        container.appendChild(row);
    });
}

/**
 * Update button states based on modal state
 */
function updateButtonStates(modalState) {
    const includeAllBtn = document.getElementById('shardwright-events-include-all');
    const excludeAllBtn = document.getElementById('shardwright-events-exclude-all');
    const regenerateBtn = document.getElementById('shardwright-events-regenerate');
    const confirmBtn = document.getElementById('shardwright-events-confirm');

    const disabled = modalState.isRegenerating;

    if (includeAllBtn) includeAllBtn.disabled = disabled;
    if (excludeAllBtn) excludeAllBtn.disabled = disabled;
    if (regenerateBtn) regenerateBtn.disabled = disabled;
    if (confirmBtn) confirmBtn.disabled = disabled;

    // Update regenerate button text
    if (regenerateBtn) {
        regenerateBtn.value = disabled ? 'Regenerating...' : 'Regenerate';
    }
}

/**
 * Open the drafting modal for reviewing and editing events
 * @param {Array} events - Initial array of SummaryEvent objects
 * @param {Array} messages - All chat messages
 * @param {number} startIndex - Start index of range
 * @param {number} endIndex - End index of range
 * @param {Object} settings - Extension settings
 * @param {number} originalContextWordCount - Word count of original context for length calculations
 * @returns {Promise<{confirmed: boolean, events: Array, originalContextWordCount: number}>}
 */
export async function openDraftingModal(events, messages, startIndex, endIndex, settings, originalContextWordCount = null) {
    // Create modal state
    const modalState = {
        events: JSON.parse(JSON.stringify(events)),
        isRegenerating: false,
        confirmed: false,
        originalContextWordCount: originalContextWordCount
    };

    // Store references for regeneration
    const extractionContext = { messages, startIndex, endIndex, settings };

    const modalHtml = `
        <div class="shardwright-events-modal">
            <div class="shardwright-events-header">
                <h3>Drafting Mode</h3>
                <p>Review and edit events before generating the summary. Uncheck events to exclude them.</p>
            </div>

            <div class="shardwright-events-controls-top">
                <input id="shardwright-events-include-all" type="button" class="menu_button" value="Include All" />
                <input id="shardwright-events-exclude-all" type="button" class="menu_button" value="Exclude All" />
                <input id="shardwright-events-regenerate" type="button" class="menu_button" value="Regenerate" />
            </div>

            <div class="shardwright-events-list" id="shardwright-events-list-container">
                <!-- Events rendered here -->
            </div>
        </div>
    `;

    // Create popup with custom buttons
    const popup = new Popup(
        modalHtml,
        POPUP_TYPE.TEXT,
        null,
        {
            okButton: 'Confirm',
            cancelButton: 'Cancel',
            wide: true,
            large: true
        }
    );

    // Show popup
    const showPromise = popup.show();

    // Set up event listeners after popup is shown
    setTimeout(() => {
        const listContainer = document.getElementById('shardwright-events-list-container');
        if (listContainer) {
            renderEventsList(listContainer, modalState);
        }

        // Include All button
        const includeAllBtn = document.getElementById('shardwright-events-include-all');
        if (includeAllBtn) {
            includeAllBtn.addEventListener('click', () => {
                modalState.events.forEach(event => {
                    event.selected = true;
                });
                renderEventsList(listContainer, modalState);
                toastr.success('All events included');
            });
        }

        // Exclude All button
        const excludeAllBtn = document.getElementById('shardwright-events-exclude-all');
        if (excludeAllBtn) {
            excludeAllBtn.addEventListener('click', () => {
                modalState.events.forEach(event => {
                    event.selected = false;
                });
                renderEventsList(listContainer, modalState);
                toastr.success('All events excluded');
            });
        }

        // Regenerate button
        const regenerateBtn = document.getElementById('shardwright-events-regenerate');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', async () => {
                if (modalState.isRegenerating) return;

                modalState.isRegenerating = true;
                updateButtonStates(modalState);
                renderEventsList(listContainer, modalState);

                try {
                    const extractionResult = await extractDraftEvents(
                        extractionContext.messages,
                        extractionContext.startIndex,
                        extractionContext.endIndex,
                        extractionContext.settings
                    );

                    modalState.events = extractionResult.events;
                    // Update word count if regeneration re-computed it
                    modalState.originalContextWordCount = extractionResult.originalContextWordCount;
                    toastr.success(`Extracted ${extractionResult.events.length} events`);
                } catch (error) {
                    log.error('Regeneration failed:', error);
                    toastr.error(`Regeneration failed: ${error.message}`);
                    // Keep existing events on failure
                } finally {
                    modalState.isRegenerating = false;
                    updateButtonStates(modalState);
                    renderEventsList(listContainer, modalState);
                }
            });
        }
    }, 100);

    // Wait for user to close modal
    const result = await showPromise;

    if (result === POPUP_RESULT.AFFIRMATIVE) {
        // Check if any events are selected
        const selectedCount = modalState.events.filter(e => e.selected).length;
        if (selectedCount === 0) {
            toastr.warning('No events selected');
        }

        return {
            confirmed: true,
            events: modalState.events,
            originalContextWordCount: modalState.originalContextWordCount
        };
    }

    return {
        confirmed: false,
        events: [],
        originalContextWordCount: null
    };
}
