export const PROMPTS_CSS = `
/* Token Display */
.shardwright-token-display {
    text-align: right;
    padding: 8px 12px;
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    flex-shrink: 0;
}

.shardwright-token-count {
    font-size: 18px;
    font-weight: bold;
    color: var(--shardwright-primary);
}

.shardwright-token-label {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    display: block;
}

/* Coverage Summary */
.shardwright-coverage-summary {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    flex-wrap: wrap;
}

.shardwright-coverage-stat {
    font-size: 13px;
    color: var(--shardwright-text-primary);
}

/* Split Panel Layout */
.shardwright-summary-review-content {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    min-height: 300px;
}

.shardwright-events-panel,
.shardwright-summary-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    overflow: hidden;
}

.shardwright-summary-review-modal .shardwright-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: var(--shardwright-bg-secondary);
    border-bottom: 1px solid var(--shardwright-border);
}

.shardwright-summary-review-modal .shardwright-panel-header h4 {
    margin: 0;
    font-size: 14px;
    color: var(--shardwright-text-primary);
}

.shardwright-event-count {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
}

/* Events Reference List */
.shardwright-events-list-readonly {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    background: var(--shardwright-bg-tertiary);
}

.shardwright-event-reference-item {
    display: flex;
    gap: 10px;
    padding: 10px;
    margin-bottom: 8px;
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    border-left: 3px solid var(--shardwright-text-muted);
}

.shardwright-event-reference-item:last-child {
    margin-bottom: 0;
}

.shardwright-event-reference-item.shardwright-coverage-covered {
    border-left-color: var(--shardwright-success);
}

.shardwright-event-reference-item.shardwright-coverage-partial {
    border-left-color: var(--shardwright-warning);
}

.shardwright-event-reference-item.shardwright-coverage-missing {
    border-left-color: var(--shardwright-error);
}

.shardwright-event-coverage-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 50px;
}

.shardwright-coverage-emoji {
    font-size: 20px;
}

.shardwright-coverage-percent {
    font-size: 11px;
    color: var(--shardwright-text-secondary);
}

.shardwright-event-content {
    flex: 1;
    min-width: 0;
}

.shardwright-event-content .shardwright-event-summary {
    font-weight: 500;
    color: var(--shardwright-text-primary);
    margin-bottom: 4px;
}

.shardwright-event-content .shardwright-event-description {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
    line-height: 1.4;
    word-break: break-word;
    min-height: auto;
    padding: 0;
    border: none;
    background: transparent;
    resize: none;
}

/* Summary Panel */
.shardwright-summary-preview,
.shardwright-summary-editor {
    flex: 1;
    padding: 10px;
    background: var(--shardwright-bg-tertiary);
    overflow-y: auto;
}

.shardwright-summary-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: inherit;
    font-size: 13px;
    color: var(--shardwright-text-primary);
}

.shardwright-summary-editor {
    width: 100%;
    min-height: 100px;
    font-size: 13px;
    border: none;
    overflow: auto;
    box-sizing: border-box;
    color: var(--shardwright-text-primary);
}

/* Simplified Mode (Summary Only) */
.shardwright-summary-review-content-simple {
    margin-bottom: 15px;
    min-height: 300px;
    display: flex;
}

.shardwright-summary-panel-full {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    overflow: hidden;
}

/* Regenerate Section */
.shardwright-regenerate-section {
    padding: 15px;
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    margin-bottom: 15px;
}

.shardwright-regenerate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.shardwright-regenerate-header h4 {
    margin: 0;
    font-size: 14px;
    color: var(--shardwright-text-primary);
}

.shardwright-regenerate-hint {
    font-size: 12px;
    color: var(--shardwright-text-muted);
}

.shardwright-regenerate-controls {
    display: flex;
    gap: 10px;
}

.shardwright-regenerate-controls input[type="text"] {
    flex: 1;
}

/* Archive Section */
.shardwright-archive-section {
    padding: 15px;
    border-top: 1px solid var(--shardwright-border);
}

.shardwright-archive-section h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: var(--shardwright-text-primary);
}

.shardwright-archive-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-archive-option {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--shardwright-text-primary);
    cursor: pointer;
}

.shardwright-archive-option.shardwright-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.shardwright-coming-soon {
    font-size: 11px;
    color: var(--shardwright-primary);
    margin-left: 5px;
}

/* ==========================================================================
   SECTION 19: PROMPTS MODAL TABS
   ========================================================================== */

.shardwright-prompts-modal {
    padding: 20px;
    min-width: 550px;
    max-width: 100%;
    box-sizing: border-box;
}

.shardwright-tab-header {
    display: flex;
    gap: 5px;
    margin-bottom: 15px;
    border-bottom: 2px solid var(--shardwright-border);
    padding-bottom: 10px;
}

.shardwright-tab-button {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px 6px 0 0;
    padding: 10px 16px;
    cursor: pointer;
    color: var(--shardwright-text-secondary);
    font-weight: 500;
    transition: all var(--shardwright-transition);
    position: relative;
}

.shardwright-tab-button:hover {
    background: var(--shardwright-highlight);
    color: var(--shardwright-text-primary);
    border-color: var(--shardwright-primary);
}

.shardwright-tab-button.active {
    background: var(--shardwright-primary);
    color: white;
    border-color: var(--shardwright-primary);
}

.shardwright-tab-content {
    min-height: 350px;
}

/* Tab Panel Visibility */
.shardwright-prompts-modal .shardwright-tab-panel {
    display: none !important;
}

.shardwright-prompts-modal .shardwright-tab-panel.active {
    display: block !important;
}

.shardwright-api-config-modal .shardwright-tab-panel {
    display: none !important;
}

.shardwright-api-config-modal .shardwright-tab-panel.active {
    display: block !important;
}

/* Tab Content Styling */
.shardwright-prompts-tab-content,
.shardwright-sharder-prompts-tab,
.shardwright-events-prompt-tab {
    padding: 10px 0;
}

.shardwright-prompts-block {
    margin-bottom: 15px;
}

.shardwright-prompts-inline-row {
    display: flex;
    align-items: center;
    gap: 5px;
}

.shardwright-prompts-select {
    flex: 1;
    min-width: 0;
}

.shardwright-prompts-editor {
    width: 100%;
    height: 250px;
    font-family: monospace;
    font-size: 11px;
    resize: vertical;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    overflow-x: hidden;
    overflow-y: auto;
}

/* Textarea action button bar */
.shardwright-textarea-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 4px;
}

.shardwright-textarea-wrapper .shardwright-prompts-editor {
    flex: 0 0 auto;
    width: 100%;
}

.shardwright-textarea-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 3px;
    margin-top: 4px;
    padding: 0;
}

.shardwright-textarea-action-btn {
    appearance: none;
    -webkit-appearance: none;
    width: 36px;
    height: 32px;
    min-width: 36px;
    padding: 0;
    border-radius: 4px;
    border: 1px solid var(--shardwright-border) !important;
    background: var(--shardwright-bg-secondary) !important;
    background-image: none !important;
    color: var(--shardwright-text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 1;
    box-shadow: var(--shardwright-shadow) !important;
    text-shadow: none !important;
    filter: none !important;
    transition: background var(--shardwright-transition), border-color var(--shardwright-transition), color var(--shardwright-transition);
}

.shardwright-textarea-action-btn:hover {
    background: var(--shardwright-highlight) !important;
    border-color: var(--shardwright-primary) !important;
    color: var(--shardwright-primary) !important;
}

.shardwright-textarea-action-btn:active {
    background: var(--shardwright-primary) !important;
    color: white !important;
}

.shardwright-prompts-buttons-row {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}

.shardwright-prompts-hint {
    font-size: 11px;
    color: var(--shardwright-text-hint);
    margin-top: 5px;
}

.shardwright-popup-left-buttons {
    display: flex;
    gap: 5px;
    margin-right: auto;
}

.popup .popup-controls.shardwright-popup-controls {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.shardwright-prompts-tab-content .shardwright-block,
.shardwright-sharder-prompts-tab .shardwright-block,
.shardwright-events-prompt-tab .shardwright-block {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    padding: 12px;
}

.shardwright-prompts-tab-content label,
.shardwright-sharder-prompts-tab label,
.shardwright-events-prompt-tab label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: var(--shardwright-text-primary);
}

.shardwright-prompts-tab-content textarea,
.shardwright-sharder-prompts-tab textarea,
.shardwright-events-prompt-tab textarea {
    background: var(--shardwright-bg-input) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
}

.shardwright-prompts-tab-content textarea:focus,
.shardwright-sharder-prompts-tab textarea:focus,
.shardwright-events-prompt-tab textarea:focus {
    border-color: var(--shardwright-border-focus) !important;
}

/* ==========================================================================
   SECTION 20: CLEAN CONTEXT MODAL
   ========================================================================== */

.shardwright-clean-context-modal {
    padding: 15px;
    min-width: 450px;
    max-width: 100%;
    box-sizing: border-box;
}

.shardwright-clean-context-title {
    margin: 0 0 15px 0;
}

.shardwright-cleanup-toggles {
    margin-bottom: 20px;
}

.shardwright-cleanup-toggles .shardwright-block {
    margin-bottom: 5px;
}

.shardwright-clean-context-hint {
    font-size: 11px;
    color: var(--shardwright-text-hint);
    margin: 3px 0 8px 25px;
}

.shardwright-clean-context-custom-section {
    margin-top: 15px;
}

.shardwright-clean-context-custom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.shardwright-clean-context-custom-title {
    margin: 0;
}

.shardwright-clean-context-regex-list-scroll {
    max-height: 200px;
    overflow-y: auto;
}

.shardwright-clean-context-regex-empty {
    text-align: center;
    color: var(--shardwright-text-hint);
    padding: 20px;
}

.shardwright-clean-context-edit-block {
    margin-bottom: 15px;
}

.shardwright-clean-context-pattern-input {
    font-family: monospace;
}

.shardwright-clean-context-edit-hint {
    font-size: 11px;
    color: var(--shardwright-text-hint);
    margin-top: 5px;
}

/* ==========================================================================
   SECTION 20A: API CONFIG MODAL
   ========================================================================== */

.shardwright-api-feature-description {
    margin-bottom: 15px;
    color: var(--shardwright-text-muted);
}

.shardwright-api-autosave-hint {
    margin: -8px 0 12px 0;
}

.shardwright-api-mode-selector {
    margin-bottom: 20px;
}

.shardwright-api-radio-label {
    display: block;
    margin-bottom: 10px;
}

.shardwright-api-radio-hint {
    margin: 5px 0 0 25px;
    color: var(--shardwright-text-muted);
    font-size: 0.9em;
}

.shardwright-external-api-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-left: 25px;
}

.shardwright-profile-api-selection {
    margin: 10px 0 0 25px;
}

.shardwright-api-profile-warning {
    margin: 8px 0 0 25px;
}

.shardwright-api-select {
    width: 100%;
    max-width: 400px;
}

.shardwright-api-manage-apis-btn {
    margin-top: 0;
    align-self: center;
}

.shardwright-api-config-divider {
    margin: 20px 0;
}

.shardwright-api-generation-settings-hint {
    margin-bottom: 15px;
    color: var(--shardwright-text-muted);
    font-size: 0.9em;
}

.shardwright-api-setting-row {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.shardwright-api-setting-col {
    flex: 1;
    min-width: 140px;
}

.shardwright-api-secondary-setting-row {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    margin-top: 15px;
}

.shardwright-api-option-column {
    flex: 1;
    min-width: 200px;
    max-width: 300px;
}

.shardwright-api-message-format-column {
    margin-top: 10px;
}

.shardwright-api-option-hint {
    margin-top: 5px;
    color: var(--shardwright-text-muted);
    font-size: 0.85em;
}

/* ==========================================================================
   SECTION 20B: SAVED APIS MODAL
   ========================================================================== */

.shardwright-saved-api-intro {
    margin-bottom: 20px;
    color: var(--shardwright-text-muted);
}

.shardwright-saved-api-selector-section {
    margin-bottom: 20px;
}

.shardwright-saved-api-selector-label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.shardwright-saved-api-selector {
    width: 100%;
}

.shardwright-saved-api-actions {
    display: flex;
    gap: 5px;
    margin-top: 10px;
}

.shardwright-saved-api-divider {
    margin: 20px 0;
}

.shardwright-saved-api-field {
    margin-bottom: 15px;
}

.shardwright-saved-api-field-label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
}

.shardwright-saved-api-input {
    width: 100%;
}

.shardwright-saved-api-help {
    color: var(--shardwright-text-muted);
}

.shardwright-saved-api-model-row {
    display: flex;
    gap: 5px;
    align-items: center;
}

.shardwright-saved-api-model-select {
    flex: 1;
}

.shardwright-saved-api-footer-actions {
    display: flex;
    gap: 5px;
    justify-content: flex-end;
    margin-top: 20px;
}

.shardwright-saved-api-save-btn {
    font-weight: bold;
}

/* ==========================================================================
   SECTION 21: REGEX LIST
   ========================================================================== */

.shardwright-regex-list {
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-regex-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    margin: 8px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    border-left: 3px solid var(--shardwright-quote);
}

.shardwright-regex-item:last-child {
    margin-bottom: 8px;
}

.shardwright-regex-left {
    display: flex;
    align-items: center;
}

.shardwright-regex-toggle {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.shardwright-regex-center {
    flex: 1;
    min-width: 0;
}

.shardwright-regex-name {
    font-weight: 500;
    color: var(--shardwright-text-primary);
    margin-bottom: 4px;
}

.shardwright-regex-pattern {
    font-family: monospace;
    font-size: 12px;
    color: var(--shardwright-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.shardwright-regex-right {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
}

.shardwright-regex-edit,
.shardwright-regex-delete {
    padding: 5px 10px;
    font-size: 12px;
}

.shardwright-regex-empty {
    color: var(--shardwright-text-primary);
}

/* ==========================================================================
   SECTION 22: PLACEHOLDER MODAL
   ========================================================================== */

.shardwright-placeholder-modal {
    padding: 30px;
    text-align: center;
    min-width: 300px;
}

.shardwright-placeholder-modal h3 {
    margin: 0 0 10px 0;
    color: var(--shardwright-text-primary);
}

.shardwright-placeholder-modal p {
    color: var(--shardwright-text-secondary);
    margin: 0;
}
`;
