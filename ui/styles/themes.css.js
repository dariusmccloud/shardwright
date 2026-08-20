export const THEMES_CSS = `
/* Theme Modal Styles */
.shardwright-themes-modal {
    padding: 20px;
    min-width: 600px;
    max-width: 900px;
}

.shardwright-themes-header {
    text-align: center;
    margin-bottom: 20px;
}

.shardwright-themes-header h3 {
    margin: 0 0 8px 0;
    font-size: 1.4em;
}

.shardwright-themes-header p {
    margin: 0;
    color: var(--shardwright-text-muted);
}

/* Controls bar */
.shardwright-themes-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
    padding: 15px;
    background: var(--shardwright-bg-secondary);
    border-radius: 8px;
    flex-wrap: wrap;
}

.shardwright-themes-controls .menu_button {
    display: flex;
    align-items: center;
    gap: 6px;
}

.shardwright-themes-controls .menu_button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Sections */
.shardwright-themes-section {
    margin-bottom: 25px;
}

.shardwright-themes-section h4 {
    margin: 0 0 15px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-primary);
}

/* Grid */
.shardwright-themes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 15px;
}

/* Theme cards */
.shardwright-theme-card {
    background: var(--shardwright-bg-secondary);
    border: 2px solid var(--shardwright-border);
    border-radius: 10px;
    padding: 0;
    overflow: hidden;
    display: flex;
    transition: all var(--shardwright-transition);
}

.shardwright-theme-card:hover {
    border-color: var(--shardwright-primary);
    transform: translateY(-2px);
    box-shadow: var(--shardwright-shadow);
}

.shardwright-theme-card-active {
    border-color: var(--shardwright-primary);
    background: var(--shardwright-highlight);
}

/* Preview section */
.shardwright-theme-preview {
    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    font-family: var(--shardwright-card-font-primary, inherit);
    font-size: var(--shardwright-card-size-primary, 1em);
    color: var(--shardwright-card-text-primary, inherit);
}

/* Keep preview cards isolated from active body theme / extraStyles */
.shardwright-themes-modal.shardwright-modal .shardwright-theme-preview,
.shardwright-themes-modal.shardwright-modal .shardwright-theme-preview * {
    text-shadow: none;
}

.shardwright-theme-preview-header {
    padding: 6px 10px;
    font-family: var(--shardwright-card-font-secondary, var(--shardwright-card-font-primary, inherit));
    font-size: var(--shardwright-card-size-secondary, 0.85em);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    overflow: hidden;
}

.shardwright-theme-preview-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    flex: 1;
}

.shardwright-preview-button {
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 0.75em;
    font-weight: 600;
}

/* Badges */
.shardwright-builtin-badge,
.shardwright-custom-badge {
    font-size: 0.7em;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: auto;
    flex-shrink: 0;
    white-space: nowrap;
}

.shardwright-builtin-badge {
    background: var(--shardwright-info);
    color: white;
}

.shardwright-custom-badge {
    background: var(--shardwright-success);
    color: white;
}

/* Theme info */
.shardwright-theme-info {
    margin-top: 8px;
    margin-bottom: 10px;
}

.shardwright-theme-info h4 {
    margin: 0 0 4px 0;
    font-family: var(--shardwright-card-font-primary, inherit);
    font-size: var(--shardwright-card-size-primary, 1em);
    border: none;
    padding: 0;
    color: var(--shardwright-card-text-primary, inherit);
}

.shardwright-theme-info p {
    margin: 0;
    font-family: var(--shardwright-card-font-muted, var(--shardwright-card-font-secondary, inherit));
    font-size: var(--shardwright-card-size-muted, 0.8em);
    color: var(--shardwright-card-text-muted, var(--shardwright-text-muted));
}

/* Actions row */
.shardwright-theme-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: auto;
}

.shardwright-theme-actions .menu_button {
    padding: 5px 10px;
    font-family: var(--shardwright-card-font-secondary, var(--shardwright-card-font-primary, inherit));
    font-size: var(--shardwright-card-size-secondary, 0.85em);
    min-height: auto;
    line-height: 1.2;
    width: auto;
}

.shardwright-themes-modal.shardwright-modal .shardwright-theme-preview .menu_button {
    background: var(--shardwright-bg-secondary) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-radius: 4px !important;
    box-shadow: none !important;
    text-transform: none !important;
    transition: all var(--shardwright-transition, 0.2s ease) !important;
}

.shardwright-themes-modal.shardwright-modal .shardwright-theme-preview .menu_button:hover:not(:disabled) {
    background: var(--shardwright-highlight) !important;
    border-color: var(--shardwright-primary) !important;
    color: var(--shardwright-primary) !important;
}

.shardwright-themes-modal.shardwright-modal .shardwright-theme-preview .menu_button:active {
    background: var(--shardwright-primary-active, var(--shardwright-primary)) !important;
    color: var(--shardwright-bg-primary) !important;
}

.shardwright-theme-actions .shardwright-apply-theme-btn {
    flex: 1 1 auto;
}

.shardwright-theme-actions .shardwright-export-theme-btn,
.shardwright-theme-actions .shardwright-duplicate-theme-btn,
.shardwright-theme-actions .shardwright-delete-theme-btn,
.shardwright-theme-actions .shardwright-edit-theme-btn {
    flex: 0 0 auto;
    min-width: 2.1em;
    padding-left: 8px;
    padding-right: 8px;
}

.shardwright-theme-active-badge {
    background: var(--shardwright-success);
    color: white;
    padding: 5px 12px;
    border-radius: 4px;
    font-family: var(--shardwright-card-font-secondary, var(--shardwright-card-font-primary, inherit));
    font-size: var(--shardwright-card-size-secondary, 0.85em);
    font-weight: 600;
}

/* No custom themes message */
.shardwright-no-custom-themes {
    text-align: center;
    padding: 30px;
    color: var(--shardwright-text-muted);
    font-style: italic;
    grid-column: 1 / -1;
}

/* Footer */
.shardwright-themes-footer {
    border-top: 1px solid var(--shardwright-border);
    padding-top: 15px;
    margin-top: 10px;
}

.shardwright-themes-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 0.85em;
    color: var(--shardwright-text-muted);
}

/* Import Modal */
.shardwright-import-modal {
    padding: 20px;
    min-width: 500px;
}

.shardwright-import-modal h3 {
    margin: 0 0 10px 0;
}

.shardwright-import-file-section {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
    border-radius: 6px;
}

.shardwright-file-name {
    font-size: 0.9em;
    color: var(--shardwright-text-muted);
}

.shardwright-import-text-section {
    margin-bottom: 15px;
}

.shardwright-import-text-section label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
}

.shardwright-import-text-section textarea {
    width: 100%;
    font-family: monospace;
    font-size: 12px;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    padding: 10px;
    color: var(--shardwright-text-primary);
    resize: vertical;
}

.shardwright-import-actions {
    display: flex;
    justify-content: flex-end;
}

/* Create Theme Modal */
.shardwright-create-theme-modal {
    padding: 20px;
    min-width: 400px;
}

.shardwright-create-theme-modal h3 {
    margin: 0 0 10px 0;
}

.shardwright-create-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 15px;
}

.shardwright-form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.shardwright-form-group label {
    font-size: 0.9em;
    font-weight: 500;
}

.shardwright-form-group input,
.shardwright-form-group select {
    padding: 8px 10px;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
}

.shardwright-form-group input:focus,
.shardwright-form-group select:focus {
    border-color: var(--shardwright-border-focus);
    outline: none;
}

.shardwright-create-actions {
    display: flex;
    justify-content: flex-end;
}

/* Confirm delete modal */
.shardwright-confirm-delete {
    padding: 20px;
    text-align: center;
}

.shardwright-confirm-delete h3 {
    margin: 0 0 15px 0;
}

.shardwright-confirm-delete .shardwright-warning-text {
    color: var(--shardwright-error);
    font-size: 0.9em;
}

/* Mobile adjustments */
@media (max-width: 768px) {
    .shardwright-themes-modal {
        min-width: auto;
        padding: 15px;
    }

    .shardwright-themes-grid {
        grid-template-columns: 1fr;
    }

    .shardwright-themes-controls {
        flex-direction: column;
    }

    .shardwright-theme-actions {
        justify-content: center;
    }

    .shardwright-import-modal,
    .shardwright-create-theme-modal {
        min-width: auto;
    }
}
/* bg-primary dropdown controls */
.shardwright-color-editor-modal .shardwright-bg-primary-controls {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.shardwright-color-editor-modal .shardwright-bg-primary-controls select {
    padding: 5px 8px;
    font-size: 0.85em;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
    width: 100%;
    min-width: 0;
}

.shardwright-color-editor-modal .shardwright-bg-primary-custom {
    display: flex;
    align-items: center;
    gap: 6px;
}

    /* Color Editor Modal */
.shardwright-color-editor-modal {
    box-sizing: border-box;
    width: min(900px, calc(100vw - 32px));
    padding: 20px;
    min-width: 550px;
    max-height: 80vh;
    overflow-y: auto;
}

.shardwright-color-editor-modal .shardwright-editor-header {
    margin-bottom: 15px;
}

.shardwright-color-editor-modal .shardwright-editor-header h3 {
    margin: 0 0 5px 0;
}

.shardwright-color-editor-modal .shardwright-editor-header p {
    margin: 0;
    font-size: 0.9em;
    color: var(--shardwright-text-muted);
}

.shardwright-color-editor-modal .shardwright-editor-meta {
    background: var(--shardwright-bg-secondary);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 15px;
}

.shardwright-color-editor-modal .shardwright-meta-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.shardwright-color-editor-modal .shardwright-meta-row:last-child {
    margin-bottom: 0;
}

.shardwright-color-editor-modal .shardwright-meta-row label {
    width: 120px;
    font-weight: 500;
    flex-shrink: 0;
}

.shardwright-color-editor-modal .shardwright-meta-row input {
    flex: 1;
    padding: 6px 10px;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
}

.shardwright-color-editor-modal .shardwright-color-groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
}

.shardwright-color-editor-modal .shardwright-color-group {
    background: var(--shardwright-bg-secondary);
    border-radius: 6px;
    padding: 12px;
}

.shardwright-color-editor-modal .shardwright-color-group h4 {
    margin: 0 0 10px 0;
    font-size: 0.95em;
    color: var(--shardwright-text-primary);
    border-bottom: 1px solid var(--shardwright-border);
    padding-bottom: 6px;
}

.shardwright-color-editor-modal .shardwright-color-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
}

.shardwright-color-editor-modal .shardwright-color-row:last-child {
    margin-bottom: 0;
}

.shardwright-color-editor-modal .shardwright-color-row > label {
    font-size: 0.85em;
    color: var(--shardwright-text-secondary);
    flex: 1;
    min-width: 80px;
}

.shardwright-color-editor-modal .shardwright-color-desc {
    grid-column: 1 / -1;
    font-size: 11px;
    color: var(--shardwright-text-muted);
    margin: -2px 0 4px;
    line-height: 1.3;
}

.shardwright-color-editor-modal .shardwright-color-inputs {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.shardwright-color-editor-modal .shardwright-color-row.shardwright-shadow-row {
    grid-template-columns: 1fr;
    align-items: stretch;
}

.shardwright-color-editor-modal .shardwright-shadow-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-color-editor-modal .shardwright-shadow-layer {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    padding: 8px;
    background: var(--shardwright-bg-tertiary);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-color-editor-modal .shardwright-shadow-layer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.shardwright-color-editor-modal .shardwright-shadow-layer-title {
    font-size: 0.82em;
    font-weight: 600;
    color: var(--shardwright-text-primary);
}

.shardwright-color-editor-modal .shardwright-shadow-inset-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8em;
    color: var(--shardwright-text-secondary);
    user-select: none;
}

.shardwright-color-editor-modal .shardwright-shadow-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
}

.shardwright-color-editor-modal .shardwright-shadow-metric-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.shardwright-color-editor-modal .shardwright-shadow-metric-field > span {
    font-size: 0.75em;
    color: var(--shardwright-text-muted);
    min-width: 0;
}

.shardwright-color-editor-modal .shardwright-shadow-metric {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 4px 6px;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
    font-size: 0.82em;
}

.shardwright-color-editor-modal .shardwright-shadow-metric:focus {
    border-color: var(--shardwright-border-focus);
    outline: none;
}

.shardwright-color-editor-modal .shardwright-shadow-color-inputs {
    flex-wrap: wrap;
}

.shardwright-color-editor-modal .shardwright-shadow-color-text {
    width: 170px;
    min-width: 0;
    padding: 5px 8px;
    font-family: monospace;
    font-size: 0.82em;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
}

.shardwright-color-editor-modal .shardwright-shadow-color-text:focus {
    border-color: var(--shardwright-border-focus);
    outline: none;
}

.shardwright-color-editor-modal .shardwright-shadow-raw-row {
    margin-top: 2px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
}

.shardwright-color-editor-modal .shardwright-shadow-raw-row .shardwright-color-inputs {
    width: 100%;
}

.shardwright-color-editor-modal .shardwright-shadow-raw-row .shardwright-color-text {
    width: 100%;
}

.shardwright-font-suggest {
    position: fixed;
    z-index: 10050;
    max-height: 250px;
    overflow-y: auto;
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    box-shadow: var(--shardwright-shadow-lg);
    padding: 4px;
}

.shardwright-font-suggest[hidden] {
    display: none;
}

.shardwright-font-suggest-item {
    display: block;
    width: 100%;
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    color: var(--shardwright-text-primary);
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    line-height: 1.2;
    text-transform: none;
}

.shardwright-font-suggest-item:hover,
.shardwright-font-suggest-item.active {
    background: var(--shardwright-highlight);
    border-color: var(--shardwright-primary);
    color: var(--shardwright-primary);
}

.shardwright-font-suggest-empty {
    padding: 6px 8px;
    color: var(--shardwright-text-muted);
    font-size: 0.82em;
}

.shardwright-color-editor-modal .shardwright-text-row-group {
    padding: 4px 0 10px;
    border-bottom: 1px solid var(--shardwright-border);
    margin-bottom: 10px;
}

.shardwright-color-editor-modal .shardwright-text-row-group:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.shardwright-color-editor-modal .shardwright-text-group-title {
    font-size: 0.85em;
    font-weight: 600;
    color: var(--shardwright-text-primary);
    margin: 0 0 6px 0;
}

.shardwright-color-editor-modal .shardwright-typo-font,
.shardwright-color-editor-modal .shardwright-typo-size {
    width: 100%;
    padding: 5px 8px;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
}

.shardwright-color-editor-modal .shardwright-typo-font:focus,
.shardwright-color-editor-modal .shardwright-typo-size:focus {
    border-color: var(--shardwright-border-focus);
    outline: none;
}

.shardwright-color-editor-modal .shardwright-color-picker {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
}

.shardwright-color-editor-modal .shardwright-color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
}

.shardwright-color-editor-modal .shardwright-color-picker::-webkit-color-swatch {
    border-radius: 2px;
    border: none;
}

.shardwright-color-editor-modal .shardwright-alpha-slider {
    width: 60px;
    height: 6px;
    cursor: pointer;
    accent-color: var(--shardwright-primary);
}

.shardwright-color-editor-modal .shardwright-alpha-label {
    font-size: 0.75em;
    font-family: monospace;
    color: var(--shardwright-text-muted);
    min-width: 30px;
    text-align: right;
}

.shardwright-color-editor-modal .shardwright-color-text {
    width: 140px;
    min-width: 0;
    padding: 5px 8px;
    font-family: monospace;
    font-size: 0.85em;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    color: var(--shardwright-text-primary);
}

.shardwright-color-editor-modal .shardwright-color-text:focus {
    border-color: var(--shardwright-border-focus);
    outline: none;
}

.shardwright-color-editor-modal .shardwright-editor-extra {
    background: var(--shardwright-bg-secondary);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 15px;
}

.shardwright-color-editor-modal .shardwright-editor-extra h4 {
    margin: 0 0 8px 0;
    font-size: 0.95em;
}

.shardwright-color-editor-modal .shardwright-editor-extra textarea {
    width: 100%;
    font-family: monospace;
    font-size: 0.85em;
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    padding: 8px;
    color: var(--shardwright-text-primary);
    resize: vertical;
}

.shardwright-editor-footer-actions {
    display: flex;
    gap: 10px;
    margin-right: auto;
}

.shardwright-editor-footer-actions .shardwright-save-theme-btn {
    background: var(--shardwright-primary);
    color: white;
    border-color: var(--shardwright-primary);
}

.shardwright-editor-footer-actions .shardwright-save-theme-btn:hover {
    background: var(--shardwright-primary-hover);
}

/* Mobile adjustments */
@media (max-width: 768px) {
    .popup:has(.shardwright-color-editor-modal).wide_dialogue_popup {
        box-sizing: border-box;
        min-width: 0 !important;
        width: calc(100dvw - 12px) !important;
        max-width: calc(100dvw - 12px) !important;
    }

    .popup:has(.shardwright-color-editor-modal) .popup-content {
        padding: 0 4px;
    }

    .popup:has(.shardwright-color-editor-modal) .popup-controls {
        width: 100%;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }

    .shardwright-color-editor-modal {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        max-height: calc(100vh - 24px);
        padding: 15px;
    }

    .shardwright-color-editor-modal .shardwright-color-groups {
        grid-template-columns: 1fr;
    }

    .shardwright-color-editor-modal .shardwright-color-row {
        grid-template-columns: 1fr;
        align-items: flex-start;
    }

    .shardwright-color-editor-modal .shardwright-color-inputs {
        width: 100%;
        flex-wrap: wrap;
    }

    .shardwright-color-editor-modal .shardwright-color-text {
        flex: 1 1 120px;
        width: 100%;
    }

    .shardwright-color-editor-modal .shardwright-shadow-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .shardwright-color-editor-modal .shardwright-shadow-color-text {
        flex: 1 1 140px;
        width: 100%;
    }

    .shardwright-font-suggest {
        max-width: calc(100vw - 16px);
        max-height: 40vh;
    }

    .shardwright-font-suggest-item {
        padding: 8px 10px;
    }

    .shardwright-color-editor-modal .shardwright-bg-primary-custom {
        width: 100%;
        flex-wrap: wrap;
    }

    .shardwright-color-editor-modal .shardwright-typo-font,
    .shardwright-color-editor-modal .shardwright-typo-size {
        width: 100%;
    }

    .shardwright-editor-footer-actions {
        flex-direction: column;
    }

    .shardwright-editor-footer-actions .menu_button {
        width: 100%;
    }

    .shardwright-color-editor-modal .shardwright-meta-row {
        flex-direction: column;
        align-items: flex-start;
    }

    .shardwright-color-editor-modal .shardwright-meta-row label {
        width: auto;
    }

    .shardwright-color-editor-modal .shardwright-meta-row input {
        width: 100%;
    }
}
`;
