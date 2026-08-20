export const SUMMARIZE_CSS = `
/* ==========================================================================
   SECTION 12: EXPORT MODAL
   ========================================================================== */

.shardwright-export-modal {
    padding: 15px;
    min-width: 300px;
}

.shardwright-export-modal h3 {
    margin: 0 0 15px 0;
    color: var(--shardwright-text-primary);
}

.shardwright-export-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.shardwright-radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    margin-bottom: 5px;
    cursor: pointer;
    color: var(--shardwright-text-primary);
    transition: all var(--shardwright-transition);
}

.shardwright-radio-option:hover {
    border-color: var(--shardwright-primary);
    background: var(--shardwright-highlight);
}

.shardwright-radio-option input[type="radio"] {
    margin: 0;
}

.shardwright-radio-option input:checked + span {
    color: var(--shardwright-primary);
    font-weight: 500;
}

/* ==========================================================================
   SECTION 13: SUMMARIZE MODAL
   ========================================================================== */

.shardwright-summarize-modal {
    padding: 15px;
    min-width: 400px;
}

.shardwright-summarize-modal h3 {
    margin: 0 0 15px 0;
    color: var(--shardwright-text-primary);
}

.shardwright-summarize-section {
    margin-bottom: 15px;
}

.shardwright-summarize-section > label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: var(--shardwright-text-primary);
}

.shardwright-range-inputs {
    display: flex;
    align-items: center;
    gap: 10px;
}

.shardwright-range-inputs input {
    width: 80px;
}

.shardwright-range-inputs span {
    color: var(--shardwright-text-primary);
}

.shardwright-destination-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-custom-position-wrapper {
    margin-top: 5px;
}

/* ==========================================================================
   SECTION 14: EVENTS MODAL
   ========================================================================== */

.shardwright-events-modal {
    padding: 15px;
}

.shardwright-events-header h3 {
    margin-top: 0;
    margin-bottom: 5px;
    color: var(--shardwright-text-primary);
}

.shardwright-events-header p {
    color: var(--shardwright-text-secondary);
    font-size: 13px;
    margin: 0 0 15px 0;
}

.shardwright-events-controls-top {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.shardwright-events-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-event-row {
    padding: 12px;
    margin-bottom: 10px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    border-left: 3px solid var(--shardwright-success);
    transition: opacity 0.2s ease, border-color 0.2s ease;
}

.shardwright-event-row:last-child {
    margin-bottom: 0;
}

.shardwright-event-row.shardwright-event-excluded {
    opacity: 0.5;
    border-left-color: var(--shardwright-text-muted);
}

.shardwright-event-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 5px;
}

.shardwright-event-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
}

.shardwright-event-summary {
    font-weight: bold;
    color: var(--shardwright-text-primary);
    flex: 1;
}

.shardwright-event-messages {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
    margin-bottom: 8px;
    margin-left: 28px;
}

.shardwright-event-description {
    width: 100%;
    min-height: 60px;
    resize: vertical;
    font-family: inherit;
    font-size: 13px;
    padding: 8px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-input);
    color: var(--shardwright-text-primary);
}

.shardwright-event-description:focus {
    outline: none;
    border-color: var(--shardwright-border-focus);
}

.shardwright-events-loading {
    text-align: center;
    padding: 40px;
    color: var(--shardwright-text-secondary);
}

.shardwright-events-loading .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid var(--shardwright-border);
    border-top-color: var(--shardwright-primary);
    border-radius: 50%;
    animation: shardwright-spin 1s linear infinite;
    margin: 0 auto 10px auto;
}

@keyframes shardwright-spin {
    to { transform: rotate(360deg); }
}

.shardwright-events-empty {
    text-align: center;
    padding: 30px;
    color: var(--shardwright-text-secondary);
}

/* Consolidated Output (rebuilt) */
.shardwright-review-output-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--shardwright-border);
}

.shardwright-output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
}

.shardwright-output-preview {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    padding: 10px;
    max-height: 240px;
    overflow: auto;
}

.shardwright-output-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
}

.shardwright-output-editor {
    width: 100%;
    margin-top: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 12px;
    resize: vertical;
    max-width: 100%;
    box-sizing: border-box;
}

/* Editable consolidated-output sections */
.shardwright-cr-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-cr-item-row {
    background: var(--shardwright-bg-tertiary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    padding: 8px;
}

.shardwright-cr-item-row.is-unselected {
    opacity: 0.6;
}

.shardwright-cr-item-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
}

.shardwright-cr-item-select {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--shardwright-text-primary);
}

.shardwright-cr-item-meta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.shardwright-cr-item-delete {
    font-size: 11px !important;
    padding: 4px 10px !important;
}

.shardwright-cr-item-archived {
    background: rgba(46, 204, 113, 0.15) !important;
    border-color: rgba(46, 204, 113, 0.45) !important;
    color: var(--shardwright-text-primary) !important;
}

.shardwright-cr-item-editor {
    width: 100%;
    min-height: 44px;
    overflow-y: hidden;
    resize: none;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.35;
}

.shardwright-cr-scene-codes {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
}

.shardwright-cr-scene-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 10px;
    border: 1px solid var(--shardwright-border);
    background: rgba(124, 94, 208, 0.15);
    color: var(--shardwright-text-primary);
}

.shardwright-cr-scene-badge-empty {
    background: rgba(255, 255, 255, 0.05);
    color: var(--shardwright-text-muted);
}

.shardwright-review-header h3 {
    margin-top: 0;
    margin-bottom: 5px;
    color: var(--shardwright-text-primary);
}

.shardwright-review-header p {
    color: var(--shardwright-text-secondary);
    font-size: 13px;
    margin: 0 0 10px 0;
}

.shardwright-quick-approve-badge {
    display: inline-block;
    padding: 4px 10px;
    background: #2ecc71;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    margin-left: 10px;
}

/* Review Summary Stats */
.shardwright-review-summary {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    flex-wrap: wrap;
}

.shardwright-summary-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 60px;
}

.shardwright-stat-value {
    font-size: 24px;
    font-weight: bold;
    color: var(--shardwright-primary);
}

.shardwright-stat-label {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    text-align: center;
}

/* Review Sections */
.shardwright-review-sections {
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: 15px;
}

.popup:has(.shardwright-single-pass-review-modal) {
    display: flex !important;
    flex-direction: column;
    max-height: min(92vh, calc(100vh - 24px));
}

.popup:has(.shardwright-single-pass-review-modal) .popup-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
}

.popup:has(.shardwright-single-pass-review-modal) .popup-controls {
    flex: 0 0 auto;
}

.shardwright-single-pass-review-modal {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 100%;
    overflow: visible;
    padding: 15px;
}

/* Review Accordion */
.shardwright-review-accordion {
    margin-bottom: 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    overflow: hidden;
}

.shardwright-review-accordion.shardwright-section-warning {
    border-color: var(--shardwright-warning);
    border-width: 2px;
}

.shardwright-review-accordion.shardwright-section-error {
    border-color: var(--shardwright-error);
    border-width: 2px;
}

.shardwright-review-accordion.shardwright-section-info {
    border-color: var(--shardwright-info);
}

.shardwright-accordion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: var(--shardwright-bg-secondary);
    cursor: pointer;
    user-select: none;
}

.shardwright-accordion-header:hover {
    background: var(--shardwright-bg-tertiary);
}

.shardwright-accordion-toggle {
    width: 20px;
    text-align: center;
}

.shardwright-accordion-toggle i {
    transition: transform var(--shardwright-transition);
    color: var(--shardwright-text-primary);
}

.shardwright-review-accordion.expanded .shardwright-accordion-toggle i {
    transform: rotate(90deg);
}

.shardwright-accordion-emoji {
    font-size: 16px;
}

.shardwright-accordion-title {
    font-weight: bold;
    color: var(--shardwright-text-primary);
    flex: 1;
}

.shardwright-accordion-count {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
}

.shardwright-accordion-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    margin-left: 2px;
}

.shardwright-accordion-status.shardwright-level-error {
    color: var(--shardwright-error);
}

.shardwright-accordion-status.shardwright-level-warning {
    color: var(--shardwright-warning);
}

.shardwright-accordion-status.shardwright-level-info {
    color: var(--shardwright-info);
}

.shardwright-accordion-content {
    padding: 10px;
    border-top: 1px solid var(--shardwright-border);
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
}

.shardwright-sp-header,
.shardwright-sp-summary,
.shardwright-sp-sections-area,
.shardwright-sp-panel,
.shardwright-sp-blocking-note,
.shardwright-archive-section,
.shardwright-sp-diagnostics {
    min-width: 0;
}

.shardwright-sp-global-controls,
.shardwright-output-header,
.shardwright-output-actions,
.shardwright-archive-options {
    flex-wrap: wrap;
}

.shardwright-sp-diag {
    scroll-margin-top: 12px;
    overflow-wrap: anywhere;
}

.shardwright-sp-output-editor {
    min-height: 200px;
    max-width: 100%;
    box-sizing: border-box;
}

.shardwright-pruning-advisor-summary {
    display: grid;
    gap: 10px;
    margin-bottom: 12px;
}

.shardwright-pruning-advisor-summary-row {
    padding: 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-tertiary);
}

.shardwright-pruning-advisor-summary-note {
    margin-top: 6px;
    color: var(--shardwright-warning);
    font-size: 12px;
    line-height: 1.45;
}

.shardwright-pruning-advisor-group {
    margin-bottom: 12px;
    padding: 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-tertiary);
}

.shardwright-pruning-advisor-group-title {
    font-weight: 700;
    margin-bottom: 8px;
}

.shardwright-pruning-advisor-items {
    display: grid;
    gap: 10px;
}

.shardwright-pruning-advisor-item {
    padding: 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-pruning-advisor-item-header {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.shardwright-pruning-advisor-item-title {
    font-weight: 700;
    color: var(--shardwright-text-primary);
}

.shardwright-pruning-advisor-item-meta {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
}

.shardwright-pruning-advisor-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--shardwright-border);
    font-weight: 700;
}

.shardwright-pruning-advisor-badge-low-risk {
    color: var(--shardwright-info);
    border-color: var(--shardwright-info);
}

.shardwright-pruning-advisor-badge-review {
    color: var(--shardwright-warning);
    border-color: var(--shardwright-warning);
}

.shardwright-pruning-advisor-badge-protected {
    color: var(--shardwright-error);
    border-color: var(--shardwright-error);
}

.shardwright-pruning-advisor-reasons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.shardwright-pruning-advisor-reason-code {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--shardwright-bg-primary);
    border: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-secondary);
}

.shardwright-pruning-advisor-basis-title {
    font-weight: 700;
    margin-bottom: 4px;
}

.shardwright-pruning-advisor-basis ul {
    margin: 0 0 8px 18px;
    padding: 0;
}

.shardwright-pruning-advisor-basis li {
    margin-bottom: 2px;
}

.shardwright-pruning-advisor-actions {
    display: flex;
    justify-content: flex-end;
}

/* Warning Badges */
.shardwright-warning-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    font-weight: 500;
}

.shardwright-warning-badge.shardwright-info {
    background: var(--shardwright-info);
    color: white;
}

.shardwright-warning-badge.shardwright-warning {
    background: var(--shardwright-warning);
    color: white;
}

.shardwright-warning-badge.shardwright-error {
    background: var(--shardwright-error);
    color: white;
}

/* Approval/Flag Toggles */
.shardwright-approve-toggle,
.shardwright-flag-toggle,
.shardwright-confirm-toggle,
.shardwright-override-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    color: var(--shardwright-text-primary);
}

.shardwright-approve-toggle:hover,
.shardwright-confirm-toggle:hover,
.shardwright-override-toggle:hover {
    background: rgba(46, 204, 113, 0.2);
}

.shardwright-flag-toggle:hover {
    background: rgba(231, 76, 60, 0.2);
}

.shardwright-approve-toggle input,
.shardwright-flag-toggle input,
.shardwright-confirm-toggle input,
.shardwright-override-toggle input {
    margin: 0;
}

/* Review Row Styles */
.shardwright-relationship-row,
.shardwright-thread-row,
.shardwright-pruning-item,
.shardwright-nsfw-item,
.shardwright-scene-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    margin-bottom: 5px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    flex-wrap: wrap;
}

.shardwright-relationship-row.shardwright-discrepancy-warning {
    border-left: 3px solid var(--shardwright-warning);
}

.shardwright-thread-row.shardwright-status-missing {
    border-left: 3px solid var(--shardwright-error);
}

.shardwright-relationship-pair,
.shardwright-thread-name {
    font-weight: 500;
    color: var(--shardwright-text-primary);
    min-width: 120px;
}

.shardwright-relationship-deltas {
    flex: 1;
    font-size: 12px;
}

.shardwright-dim-breakdown {
    display: block;
    color: var(--shardwright-text-primary);
    margin-bottom: 2px;
}

.shardwright-relationship-actions,
.shardwright-thread-actions,
.shardwright-pruning-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.shardwright-thread-change {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
}

.shardwright-status-old {
    color: var(--shardwright-text-muted);
    font-family: var(--shardwright-font-muted, inherit);
    font-size: var(--shardwright-font-size-muted, inherit);
    text-decoration: line-through;
}

.shardwright-status-arrow {
    color: var(--shardwright-text-primary);
}

.shardwright-status-new {
    font-weight: bold;
    color: var(--shardwright-quote);
}

.shardwright-status-new.shardwright-missing {
    color: var(--shardwright-error);
}

/* Section Overview */
.shardwright-overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
}

.shardwright-overview-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    border-left: 3px solid transparent;
}

.shardwright-overview-row.shardwright-section-has-pruning {
    border-left-color: var(--shardwright-warning);
}

.shardwright-overview-emoji {
    font-size: 14px;
}

.shardwright-overview-name {
    flex: 1;
    font-size: 12px;
    color: var(--shardwright-text-primary);
}

.shardwright-overview-counts {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    display: flex;
    align-items: center;
    gap: 5px;
}

.shardwright-pruned-badge {
    background: var(--shardwright-warning);
    color: white;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: bold;
}

.shardwright-overview-summary {
    margin-top: 10px;
    font-size: 12px;
    color: var(--shardwright-text-muted);
    text-align: center;
    font-style: italic;
}

/* Callback Section */
.shardwright-callback-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    margin-bottom: 5px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    flex-wrap: wrap;
}

.shardwright-callback-row.shardwright-status-missing {
    border-left: 3px solid var(--shardwright-error);
}

.shardwright-callback-name {
    font-weight: 500;
    color: var(--shardwright-text-primary);
    min-width: 120px;
    flex: 1;
}

.shardwright-callback-change {
    display: flex;
    align-items: center;
    gap: 5px;
}

.shardwright-callback-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

/* Pruning Section */
.shardwright-pruning-group {
    margin-bottom: 15px;
}

/* legacy (pre-accordion) header */
.shardwright-pruning-group h5 {
    margin: 0;
    color: var(--shardwright-text-primary);
    font-size: 13px;
}

.shardwright-pruning-group-title {
    font-weight: 600;
    color: var(--shardwright-text-primary);
    flex: 1;
}

.shardwright-pruning-group-count {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
}

.shardwright-pruning-group.shardwright-sub-accordion {
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    overflow: hidden;
}

.shardwright-pruning-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--shardwright-bg-secondary);
    cursor: pointer;
    user-select: none;
}

.shardwright-pruning-group-header:hover {
    background: var(--shardwright-bg-tertiary);
}

.shardwright-sub-accordion-toggle {
    width: 16px;
    text-align: center;
}

.shardwright-sub-accordion-toggle i {
    font-size: 12px;
    transition: transform var(--shardwright-transition);
    color: var(--shardwright-text-primary);
}

.shardwright-pruning-group.expanded .shardwright-sub-accordion-toggle i {
    transform: rotate(90deg);
}

.shardwright-sub-accordion-content {
    padding: 8px;
    border-top: 1px solid var(--shardwright-border);
}

.shardwright-pruning-content {
    flex: 1;
    font-size: 12px;
    color: var(--shardwright-text-primary);
}

.shardwright-pruning-source {
    font-size: 11px;
    color: var(--shardwright-text-muted);
}

/* NSFW Section */
.shardwright-nsfw-scene {
    font-family: monospace;
    font-size: 11px;
    padding: 2px 6px;
    background: var(--shardwright-quote);
    color: white;
    border-radius: 3px;
}

.shardwright-nsfw-content {
    flex: 1;
    font-size: 12px;
    color: var(--shardwright-text-primary);
}

/* Scene Section */
.shardwright-scene-preview {
    flex: 1;
    font-size: 12px;
    color: var(--shardwright-text-primary);
}

/* Output Preview/Editor */
.shardwright-review-output-section {
    margin-top: 15px;
    border-top: 1px solid var(--shardwright-border);
    padding-top: 15px;
}

.shardwright-output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    color: var(--shardwright-text-primary);
    font-weight: 500;
}

.shardwright-output-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.shardwright-output-preview {
    max-height: 150px;
    overflow-y: auto;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    font-size: 12px;
}

.shardwright-output-preview pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--shardwright-text-primary);
    font-family: monospace;
}

.shardwright-output-editor {
    width: 100%;
    min-height: 200px;
    font-family: monospace;
    font-size: 12px;
}

/* Status Text */
.shardwright-success {
    color: var(--shardwright-success);
    font-weight: 500;
}

.shardwright-warning-text {
    color: var(--shardwright-warning);
    font-weight: 500;
}

.shardwright-info-text {
    color: var(--shardwright-info);
}

.shardwright-empty {
    color: var(--shardwright-text-muted);
    font-family: var(--shardwright-font-muted, inherit);
    font-size: var(--shardwright-font-size-muted, inherit);
    font-style: italic;
    text-align: center;
    padding: 30px;
}

/* ==========================================================================
   SECTION 18: SUMMARY REVIEW MODAL
   ========================================================================== */

.shardwright-summary-review-modal {
    padding: 15px;
    max-height: 80vh;
    overflow-y: auto;
}

.shardwright-summary-review-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
    gap: 15px;
}

.shardwright-summary-review-header .shardwright-header-left {
    flex: 1;
}

.shardwright-summary-review-header h3 {
    margin: 0 0 5px 0;
    color: var(--shardwright-text-primary);
}

.shardwright-summary-review-header p {
    color: var(--shardwright-text-secondary);
    font-size: 13px;
    margin: 0;
}
`;
