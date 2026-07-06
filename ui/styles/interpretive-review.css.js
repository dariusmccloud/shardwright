export const INTERPRETIVE_REVIEW_CSS = `
/* ==========================================================================
   INTERPRETIVE REVIEW MODAL
   ========================================================================== */

.ss-interpretive-review-modal {
    padding: 16px;
    width: min(1560px, 97vw);
    max-width: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 14px;
    min-width: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 18px;
    background:
        radial-gradient(1200px 420px at 50% -120px, color-mix(in srgb, var(--ss-primary) 10%, transparent), transparent 60%),
        linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%), color-mix(in srgb, var(--ss-bg-primary) 98%, black 2%));
}

.ss-interpretive-review-modal.ss-interpretive-review-fullscreen {
    width: 100%;
    max-width: none;
}

.popup:has(.ss-interpretive-review-modal) {
    display: flex !important;
    flex-direction: column;
    width: min(1700px, 98vw) !important;
    max-width: 98vw !important;
    max-height: min(96vh, calc(100vh - 16px)) !important;
    overflow: hidden !important;
}

.popup:has(.ss-interpretive-review-modal) .popup-content {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow: hidden;
}

.popup:has(.ss-interpretive-review-modal) .popup-controls {
    flex: 0 0 auto;
}

.popup.ss-interpretive-review-popup-fullscreen {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    max-height: calc(100vh - 12px) !important;
    height: calc(100vh - 12px) !important;
}

.popup.ss-interpretive-review-popup-fullscreen .popup-content {
    height: 100%;
    max-height: 100%;
    width: 100%;
}

.ss-interpretive-review-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border: 1px solid color-mix(in srgb, var(--ss-border) 78%, transparent);
    border-radius: 16px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 92%, white 8%), color-mix(in srgb, var(--ss-bg-primary) 97%, black 3%));
    box-shadow: 0 18px 36px color-mix(in srgb, black 16%, transparent);
}

.ss-interpretive-review-toolbar-intro {
    display: grid;
    gap: 6px;
    min-width: 0;
    justify-items: center;
    text-align: center;
}

.ss-interpretive-review-toolbar-intro h3 {
    margin: 0;
    font-size: 25px;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-weight: 700;
}

.ss-interpretive-review-toolbar-intro .ss-hint {
    max-width: 72ch;
    color: color-mix(in srgb, var(--ss-text-primary) 74%, transparent);
    font-size: 12px;
}

.ss-interpretive-review-toolbar .ss-hint {
    margin: 0;
}

.ss-interpretive-review-filter {
    display: grid;
    gap: 4px;
    min-width: 220px;
}

.ss-interpretive-review-toolbar-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    min-width: 0;
}

.ss-interpretive-review-toolbar-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.ss-interpretive-review-toolbar-buttons .menu_button {
    min-height: 32px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--ss-border) 82%, transparent);
    background: color-mix(in srgb, var(--ss-bg-primary) 90%, white 10%);
    color: var(--ss-text-primary);
    transition:
        transform 0.15s ease,
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease;
}

.ss-interpretive-review-toolbar-buttons .menu_button:hover,
.ss-interpretive-review-toolbar-buttons .menu_button:focus-visible {
    border-color: color-mix(in srgb, var(--ss-primary) 42%, var(--ss-border));
    background: color-mix(in srgb, var(--ss-primary) 12%, var(--ss-bg-primary));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ss-primary) 18%, transparent);
    transform: translateY(-1px);
    outline: none;
}

.ss-interpretive-review-toolbar-buttons #ss-interpretive-review-close-toggle {
    border-color: rgba(255, 124, 124, 0.72);
    background: linear-gradient(180deg, rgba(82, 22, 22, 0.98), rgba(60, 16, 16, 0.98));
    color: #ffdede;
}

.ss-interpretive-review-toolbar-buttons #ss-interpretive-review-close-toggle:hover,
.ss-interpretive-review-toolbar-buttons #ss-interpretive-review-close-toggle:focus-visible {
    border-color: rgba(255, 155, 155, 0.96);
    background: linear-gradient(180deg, rgba(116, 30, 30, 1), rgba(90, 24, 24, 1));
    color: #fff3f3;
    box-shadow: 0 0 0 3px rgba(255, 124, 124, 0.18);
    outline: none;
}

.ss-interpretive-review-copy-btn {
    appearance: none;
    border: 1px solid color-mix(in srgb, var(--ss-border) 82%, transparent);
    border-radius: 999px;
    padding: 4px 10px;
    margin-left: 8px;
    background: color-mix(in srgb, var(--ss-bg-primary) 90%, white 10%);
    color: color-mix(in srgb, var(--ss-text-primary) 88%, transparent);
    font: inherit;
    font-size: 11px;
    line-height: 1.2;
    cursor: pointer;
    vertical-align: middle;
    transition:
        transform 0.15s ease,
        border-color 0.15s ease,
        background-color 0.15s ease,
        color 0.15s ease,
        box-shadow 0.15s ease;
}

.ss-interpretive-review-copy-btn:hover,
.ss-interpretive-review-copy-btn:focus-visible {
    border-color: color-mix(in srgb, var(--ss-primary) 42%, var(--ss-border));
    background: color-mix(in srgb, var(--ss-primary) 12%, var(--ss-bg-primary));
    color: var(--ss-text-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ss-primary) 16%, transparent);
    transform: translateY(-1px);
    outline: none;
}

.ss-interpretive-review-toolbar-panel {
    border: 1px solid var(--ss-border);
    border-radius: 8px;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%);
}

.ss-interpretive-review-layout {
    display: grid;
    grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
    gap: 14px;
    min-width: 0;
    overflow: hidden;
}

.ss-interpretive-review-column {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
}

.ss-interpretive-review-queue,
.ss-interpretive-review-detail {
    border: 1px solid color-mix(in srgb, var(--ss-border) 82%, transparent);
    border-radius: 16px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%), color-mix(in srgb, var(--ss-bg-primary) 98%, black 2%));
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    box-shadow: 0 16px 32px color-mix(in srgb, black 14%, transparent);
}

.ss-interpretive-review-queue {
    grid-template-rows: auto auto minmax(0, 1fr);
}

.ss-interpretive-review-queue-header,
.ss-interpretive-review-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--ss-border) 80%, transparent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 88%, black 12%), color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%));
}

.ss-interpretive-review-queue-controls {
    display: grid;
    gap: 6px;
    padding: 12px 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--ss-border) 80%, transparent);
    background: color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%);
}

.ss-interpretive-review-detail-header {
    display: block;
}

.ss-interpretive-review-detail-header-main {
    display: grid;
    gap: 10px;
}

.ss-interpretive-review-detail-header-top {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 10px;
}

.ss-interpretive-review-queue-list {
    display: grid;
    gap: 8px;
    padding: 8px;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
}

.ss-interpretive-review-queue-empty,
.ss-interpretive-review-detail-empty {
    padding: 14px 12px;
}

.ss-interpretive-review-item {
    display: grid;
    gap: 6px;
    width: 100%;
    margin: 0;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--ss-border) 82%, transparent);
    border-left-width: 3px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ss-bg-primary) 92%, white 8%);
    color: var(--ss-text-primary);
    text-align: left;
    cursor: pointer;
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease,
        box-shadow 0.15s ease;
}

.ss-interpretive-review-item:hover,
.ss-interpretive-review-item:focus-visible {
    background: color-mix(in srgb, var(--ss-primary) 11%, var(--ss-bg-primary));
    border-color: color-mix(in srgb, var(--ss-primary) 34%, var(--ss-border));
    transform: translateX(2px);
    outline: none;
}

.ss-interpretive-review-item.active {
    background: color-mix(in srgb, var(--ss-primary) 18%, var(--ss-bg-primary));
    border-color: color-mix(in srgb, var(--ss-primary) 48%, var(--ss-border));
    box-shadow:
        inset 3px 0 0 color-mix(in srgb, var(--ss-primary) 65%, white 35%),
        0 8px 18px color-mix(in srgb, black 12%, transparent);
}

.ss-interpretive-review-item-title,
.ss-interpretive-review-detail-title {
    font-weight: 600;
}

.ss-interpretive-review-item-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    font-size: 14px;
    line-height: 1.3;
}

.ss-interpretive-review-item-title > span:first-child {
    min-width: 0;
}

.ss-interpretive-review-item-title .ss-interpretive-review-inline-meta {
    margin-left: auto;
    flex: 0 0 auto;
    justify-content: flex-end;
}

.ss-interpretive-review-group-item {
    align-content: start;
}

.ss-interpretive-review-group-rows {
    display: grid;
    gap: 8px;
    margin-top: 4px;
}

.ss-interpretive-review-group-row {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 70%, transparent);
}

.ss-interpretive-review-group-row-button {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 8px 10px 0;
    border: 1px solid color-mix(in srgb, var(--ss-border) 80%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ss-bg-primary) 90%, white 10%);
    color: var(--ss-text-primary);
    text-align: left;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
}

.ss-interpretive-review-group-row-button:hover,
.ss-interpretive-review-group-row-button:focus-visible {
    background: color-mix(in srgb, var(--ss-primary) 10%, var(--ss-bg-primary));
    border-color: color-mix(in srgb, var(--ss-primary) 34%, var(--ss-border));
    transform: translateX(2px);
    outline: none;
}

.ss-interpretive-review-group-row-button.active {
    background: color-mix(in srgb, var(--ss-primary) 16%, var(--ss-bg-primary));
    border-color: color-mix(in srgb, var(--ss-primary) 48%, var(--ss-border));
}

.ss-interpretive-review-group-row-main {
    display: grid;
    gap: 2px;
}

.ss-interpretive-review-group-name {
    font-weight: 600;
}

.ss-interpretive-review-item-meta,
.ss-interpretive-review-inline-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-content: flex-start;
}

.ss-interpretive-review-detail-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
}

.ss-interpretive-review-detail-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px;
    border: 1px solid color-mix(in srgb, var(--ss-border) 80%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--ss-bg-primary) 90%, white 10%);
    width: fit-content;
}

.ss-interpretive-review-detail-tab {
    appearance: none;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 6px 12px;
    background: transparent;
    color: color-mix(in srgb, var(--ss-text-primary) 78%, transparent);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease,
        transform 0.15s ease;
}

.ss-interpretive-review-detail-tab:hover,
.ss-interpretive-review-detail-tab:focus-visible {
    border-color: color-mix(in srgb, var(--ss-primary) 45%, var(--ss-border));
    color: var(--ss-text-primary);
    background: color-mix(in srgb, var(--ss-primary) 10%, var(--ss-bg-primary));
    transform: translateY(-1px);
    outline: none;
}

.ss-interpretive-review-detail-tab.active {
    border-color: color-mix(in srgb, var(--ss-primary) 58%, var(--ss-border));
    background: color-mix(in srgb, var(--ss-primary) 18%, var(--ss-bg-primary));
    color: var(--ss-text-primary);
    box-shadow: 0 4px 12px color-mix(in srgb, black 10%, transparent);
}

.ss-interpretive-review-detail-view {
    display: none;
    min-width: 0;
}

.ss-interpretive-review-detail-view.active {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
}

.ss-interpretive-review-section {
    margin: 0;
}

.ss-interpretive-review-section h4 {
    margin: 0;
    font-size: 15px;
}

.ss-interpretive-review-field-tools {
    display: grid;
    gap: 6px;
    margin-top: 6px;
}

.ss-interpretive-token-palette {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.ss-interpretive-token-button {
    appearance: none;
    border: 1px solid var(--ss-border);
    border-radius: 999px;
    padding: 4px 10px;
    background: color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%);
    color: var(--ss-text-primary);
    font: inherit;
    font-size: 11px;
    line-height: 1.2;
    cursor: pointer;
}

.ss-interpretive-token-button:hover,
.ss-interpretive-token-button:focus-visible {
    border-color: color-mix(in srgb, var(--ss-primary) 50%, var(--ss-border));
    background: color-mix(in srgb, var(--ss-primary) 14%, var(--ss-bg-primary));
    outline: none;
}

.ss-interpretive-token-button.selected,
.ss-interpretive-token-button[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--ss-primary) 60%, var(--ss-border));
    background: color-mix(in srgb, var(--ss-primary) 22%, var(--ss-bg-primary));
}

.ss-interpretive-review-inline-details {
    margin-top: 8px;
}

.ss-interpretive-review-inline-details summary {
    cursor: pointer;
    color: color-mix(in srgb, var(--ss-text-primary) 82%, transparent);
}

.ss-interpretive-review-inline-details[open] summary {
    margin-bottom: 8px;
}

.ss-interpretive-review-static-note {
    align-content: start;
}

.ss-interpretive-review-inline-help {
    position: relative;
}

.ss-interpretive-review-inline-help summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--ss-border);
    border-radius: 999px;
    cursor: pointer;
    list-style: none;
    font-size: 12px;
    background: color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%);
}

.ss-interpretive-review-inline-help summary::-webkit-details-marker {
    display: none;
}

.ss-interpretive-review-inline-help-body {
    margin-top: 8px;
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--ss-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--ss-bg-primary) 96%, white 4%);
}

.ss-interpretive-review-inline-help-row {
    display: grid;
    gap: 2px;
}

.ss-review-section,
.ss-interpretive-review-disclosure,
.ss-interpretive-review-static-section {
    --ss-review-section-title-size: 14px;
    --ss-review-section-title-weight: 600;
    --ss-review-section-description-size: 11px;
    --ss-review-section-border-style: solid;
    --ss-review-section-surface-mix: 94%;
    --ss-review-section-header-mix: 90%;
    display: block;
    flex: 0 0 auto;
    border: 1px var(--ss-review-section-border-style) var(--ss-border);
    border-radius: 14px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) var(--ss-review-section-surface-mix), white 6%), color-mix(in srgb, var(--ss-bg-primary) 98%, black 2%));
    overflow: hidden;
    margin: 0;
    box-shadow: 0 10px 22px color-mix(in srgb, black 10%, transparent);
}

.ss-review-section__header,
.ss-interpretive-review-disclosure-summary,
.ss-interpretive-review-static-header {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) var(--ss-review-section-header-mix), black 10%), color-mix(in srgb, var(--ss-bg-primary) 96%, white 4%));
}

.ss-review-section__title,
.ss-interpretive-review-disclosure-title {
    font-size: var(--ss-review-section-title-size);
    font-weight: var(--ss-review-section-title-weight);
    padding-right: 20px;
}

.ss-review-section__description,
.ss-interpretive-review-disclosure-description {
    font-size: var(--ss-review-section-description-size);
    line-height: 1.4;
    color: color-mix(in srgb, var(--ss-text-primary) 62%, transparent);
    letter-spacing: 0.01em;
    padding-right: 20px;
    text-align: left;
}

.ss-review-section__body,
.ss-interpretive-review-disclosure-body {
    padding: 14px;
    text-align: left;
}

.ss-review-section--static,
.ss-interpretive-review-static-section {
    --ss-review-section-title-size: 18px;
    --ss-review-section-title-weight: 700;
    --ss-review-section-description-size: 12px;
}

.ss-interpretive-review-subsection {
    --ss-review-section-border-style: dashed;
    --ss-review-section-surface-mix: 96%;
    margin-inline-start: 12px;
}

.ss-interpretive-review-disclosure {
    display: block;
}

.ss-interpretive-review-disclosure-summary {
    position: relative;
    cursor: pointer;
    list-style: none;
}

.ss-interpretive-review-disclosure-summary::-webkit-details-marker {
    display: none;
}

.ss-interpretive-review-disclosure-summary::after {
    content: '+';
    position: absolute;
    right: 14px;
    margin-top: 2px;
    color: var(--ss-text-primary);
    font-size: 16px;
    line-height: 1;
}

.ss-interpretive-review-disclosure[open] .ss-interpretive-review-disclosure-summary::after {
    content: '-';
}

.ss-interpretive-review-disclosure-body {
    display: none;
}

.ss-interpretive-review-disclosure[open] > .ss-interpretive-review-disclosure-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.ss-interpretive-review-static-section {
}

.ss-interpretive-review-static-header {
    border-bottom: 1px solid color-mix(in srgb, var(--ss-border) 80%, transparent);
}

.ss-interpretive-review-static-section .ss-interpretive-review-card {
    margin-top: 8px;
}

.ss-interpretive-review-context {
    padding: 20px 22px;
    font-size: 18px;
    line-height: 1.5;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%), color-mix(in srgb, var(--ss-bg-primary) 98%, black 2%));
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 80%, transparent);
    text-align: left;
}

.ss-interpretive-review-context-support {
    padding: 14px 22px 18px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 60%, transparent);
    background: color-mix(in srgb, var(--ss-bg-primary) 97%, white 3%);
    text-align: left;
}

.ss-interpretive-review-context-why {
    font-size: 13px;
    line-height: 1.5;
    color: color-mix(in srgb, var(--ss-text-primary) 88%, transparent);
}

.ss-interpretive-review-statement {
    white-space: pre-wrap;
    line-height: 1.45;
}

.ss-interpretive-review-summary-note {
    font-size: 13px;
    line-height: 1.5;
}

.ss-interpretive-review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
}

.ss-interpretive-review-summary-grid {
    grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.1fr);
    align-items: stretch;
}

.ss-interpretive-review-review-column {
    display: grid;
    gap: 14px;
    min-width: 0;
}

.ss-interpretive-review-overview {
    display: grid;
    gap: 10px;
    --ss-review-section-title-size: 14px;
    --ss-review-section-title-weight: 600;
    --ss-review-section-description-size: 11px;
}

.ss-interpretive-review-review-main {
    display: grid;
    gap: 14px;
    min-width: 0;
}

.ss-interpretive-review-overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
}

.ss-interpretive-review-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    text-align: left;
}

.ss-interpretive-review-fact {
    display: inline-flex;
    line-height: 1.45;
}

.ss-interpretive-review-fact strong {
    display: inline;
    margin: 0;
    font-size: 12px;
}

.ss-interpretive-review-card {
    border: 1px solid color-mix(in srgb, var(--ss-border) 82%, transparent);
    border-radius: 12px;
    padding: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 92%, white 8%), color-mix(in srgb, var(--ss-bg-primary) 97%, black 3%));
    text-align: left;
    box-shadow: 0 8px 18px color-mix(in srgb, black 8%, transparent);
}

.ss-interpretive-review-overview .ss-interpretive-review-summary-note {
    color: color-mix(in srgb, var(--ss-text-primary) 86%, transparent);
}

.ss-interpretive-review-card-actions {
    display: flex;
    justify-content: flex-start;
    margin-top: 10px;
}

.ss-interpretive-review-status-card {
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%), color-mix(in srgb, var(--ss-bg-primary) 98%, black 2%));
}

.ss-interpretive-review-status-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0;
    border: 1px solid color-mix(in srgb, var(--ss-border) 76%, transparent);
    border-radius: 14px;
    overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 93%, white 7%), color-mix(in srgb, var(--ss-bg-primary) 97%, black 3%));
    box-shadow: 0 8px 18px color-mix(in srgb, black 8%, transparent);
}

.ss-interpretive-review-lifecycle-section .ss-review-section__body {
    display: grid;
    gap: 14px;
}

.ss-interpretive-review-status-strip-cell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 8px 12px;
    border-left: 1px solid color-mix(in srgb, var(--ss-border) 62%, transparent);
}

.ss-interpretive-review-status-strip-cell:first-child {
    border-left: 0;
}

.ss-interpretive-review-status-strip-label,
.ss-interpretive-review-policy-audit-label {
    font-size: 11px;
    font-weight: 600;
    color: color-mix(in srgb, var(--ss-text-primary) 74%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.2;
}

.ss-interpretive-review-status-strip-value {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    min-width: 0;
    flex-wrap: wrap;
    gap: 4px;
    text-align: right;
}

.ss-interpretive-review-policy-audit-card {
    display: grid;
    gap: 0;
    margin-top: 2px;
    border: 1px solid color-mix(in srgb, var(--ss-border) 76%, transparent);
    border-radius: 14px;
    overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 93%, white 7%), color-mix(in srgb, var(--ss-bg-primary) 97%, black 3%));
    box-shadow: 0 8px 18px color-mix(in srgb, black 8%, transparent);
}

.ss-interpretive-review-policy-audit-row {
    display: grid;
    gap: 8px;
    padding: 14px 16px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 62%, transparent);
}

.ss-interpretive-review-policy-audit-row:first-child {
    border-top: 0;
}

.ss-interpretive-review-policy-audit-value {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    min-width: 0;
    flex-wrap: wrap;
    gap: 6px;
    text-align: left;
}

.ss-interpretive-review-detail-view[data-detail-view-panel="review"] .ss-interpretive-review-card,
.ss-interpretive-review-detail-view[data-detail-view-panel="review"] .ss-interpretive-review-section {
    width: 100%;
}

.ss-interpretive-review-evidence-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ss-interpretive-review-evidence-note {
    display: grid;
    gap: 6px;
    padding: 14px;
}

.ss-interpretive-review-evidence-note .ss-interpretive-review-inline-meta {
    min-height: 0;
}

.ss-interpretive-review-lifecycle-section .ss-interpretive-review-inline-meta {
    gap: 4px 6px;
}

.ss-interpretive-review-lifecycle-section .ss-interpretive-review-badge {
    padding: 1px 7px;
    font-size: 10px;
    line-height: 1.2;
}

.ss-interpretive-review-lifecycle-section .ss-interpretive-review-policy-audit-value {
    justify-content: flex-start;
}

.ss-interpretive-review-lifecycle-section .ss-interpretive-review-policy-audit-card .ss-interpretive-review-badge {
    padding: 2px 8px;
    font-size: 11px;
    line-height: 1.3;
}

.ss-interpretive-review-card strong,
.ss-interpretive-review-list strong {
    display: block;
    margin-bottom: 4px;
}

.ss-interpretive-action-card {
    display: grid;
    gap: 10px;
    text-align: left;
    width: 100%;
    max-width: none;
}

.ss-interpretive-action-form {
    display: grid;
    gap: 12px;
    min-width: 0;
}

.ss-interpretive-review-list {
    display: grid;
    gap: 8px;
}

.ss-interpretive-review-history-card {
    gap: 8px;
}

.ss-interpretive-review-history-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
}

.ss-interpretive-review-inline-meta--compact {
    margin-top: -2px;
}

.ss-interpretive-review-history-block {
    display: grid;
    gap: 4px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--ss-border) 75%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--ss-bg-primary) 95%, white 5%);
}

.ss-interpretive-review-history-block-label {
    font-size: 11px;
    font-weight: 600;
    color: color-mix(in srgb, var(--ss-text-primary) 70%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.ss-interpretive-review-history-meta {
    display: grid;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 70%, transparent);
    color: color-mix(in srgb, var(--ss-text-primary) 80%, transparent);
    font-size: 12px;
    line-height: 1.45;
}

.ss-interpretive-review-history-subdetails {
    --ss-review-section-title-size: 12px;
    --ss-review-section-title-weight: 600;
    --ss-review-section-description-size: 0;
    --ss-review-section-surface-mix: 97%;
    --ss-review-section-header-mix: 94%;
    margin-top: 4px;
    margin-inline-start: 0;
    border-style: solid;
    background: color-mix(in srgb, var(--ss-bg-primary) 97%, white 3%);
}

.ss-interpretive-review-history-subdetails .ss-interpretive-review-disclosure-summary,
.ss-interpretive-review-history-subdetails .ss-review-section__header {
    padding: 8px 10px;
}

.ss-interpretive-review-history-subdetails .ss-interpretive-review-disclosure-body,
.ss-interpretive-review-history-subdetails .ss-review-section__body {
    padding: 10px;
}

.ss-interpretive-review-history-subdetails .ss-review-section__title,
.ss-interpretive-review-history-subdetails .ss-interpretive-review-disclosure-title {
    padding-right: 18px;
}

.ss-interpretive-review-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
}

.ss-interpretive-action-form .ss-interpretive-review-form-grid {
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
    align-items: end;
}

.ss-interpretive-action-form [data-field="delegationPolicyId"],
.ss-interpretive-action-form [data-field="delegationPolicyUnavailable"] {
    grid-column: 1 / -1;
}

.ss-interpretive-review-field {
    display: grid;
    gap: 4px;
    text-align: left;
}

.ss-interpretive-review-field[hidden],
.ss-interpretive-review-static-note[hidden],
.ss-interpretive-review-section[hidden],
.ss-interpretive-review-reason-groups[hidden] {
    display: none !important;
}

.ss-interpretive-review-field > span:first-child {
    font-size: 12px;
    font-weight: 600;
}

.ss-interpretive-review-reason-groups {
    display: grid;
    gap: 12px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 70%, transparent);
}

.ss-interpretive-review-reason-group {
    display: grid;
    gap: 8px;
}

.ss-interpretive-review-reason-group + .ss-interpretive-review-reason-group {
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 70%, transparent);
}

.ss-interpretive-review-reason-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.ss-interpretive-review-comment-field {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--ss-border) 70%, transparent);
}

.ss-interpretive-review-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.ss-interpretive-review-action-surface .ss-interpretive-review-form-actions,
.ss-interpretive-action-card .ss-interpretive-review-form-actions {
    justify-content: flex-start;
}

.ss-interpretive-review-action-surface .ss-review-section__body {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    max-height: min(70vh, 980px);
    overflow-y: auto;
    overflow-x: hidden;
}

.ss-interpretive-review-action-surface .ss-interpretive-action-card {
    width: 100%;
    max-width: none;
}

.ss-interpretive-review-primary-action {
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--ss-primary) 36%, var(--ss-border));
    border-radius: 14px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-bg-primary) 88%, var(--ss-primary) 12%), color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%));
}

.ss-interpretive-review-primary-action .ss-interpretive-action-card {
    border-color: color-mix(in srgb, var(--ss-primary) 40%, var(--ss-border));
    background: color-mix(in srgb, var(--ss-bg-primary) 94%, white 6%);
}

.ss-interpretive-review-primary-action .menu_button[type="submit"],
.ss-interpretive-review-form-actions .menu_button[type="submit"] {
    min-height: 38px;
    padding: 8px 16px;
    border: 1px solid color-mix(in srgb, var(--ss-primary) 55%, var(--ss-border));
    border-radius: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-primary) 30%, var(--ss-bg-primary)), color-mix(in srgb, var(--ss-primary) 18%, var(--ss-bg-primary)));
    color: color-mix(in srgb, white 88%, var(--ss-text-primary) 12%);
    font-weight: 700;
    letter-spacing: 0.01em;
    box-shadow: 0 6px 16px color-mix(in srgb, black 14%, transparent);
}

.ss-interpretive-review-primary-action .menu_button[type="submit"]:hover,
.ss-interpretive-review-primary-action .menu_button[type="submit"]:focus-visible,
.ss-interpretive-review-form-actions .menu_button[type="submit"]:hover,
.ss-interpretive-review-form-actions .menu_button[type="submit"]:focus-visible {
    border-color: color-mix(in srgb, var(--ss-primary) 72%, white 28%);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ss-primary) 40%, var(--ss-bg-primary)), color-mix(in srgb, var(--ss-primary) 24%, var(--ss-bg-primary)));
    color: white;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ss-primary) 20%, transparent), 0 8px 18px color-mix(in srgb, black 16%, transparent);
    outline: none;
    transform: translateY(-1px);
}

.ss-interpretive-review-form-actions .menu_button[type="submit"] {
    min-width: 132px;
}

.ss-interpretive-action-status {
    border: 1px solid var(--ss-border);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.4;
    background: color-mix(in srgb, var(--ss-bg-primary) 92%, white 8%);
}

.ss-interpretive-action-status.tone-info {
    border-color: rgba(84, 162, 255, 0.45);
    color: #9bc2ff;
}

.ss-interpretive-action-status.tone-success {
    border-color: rgba(60, 190, 90, 0.55);
    color: #7fe08a;
}

.ss-interpretive-action-status.tone-error {
    border-color: rgba(230, 80, 80, 0.55);
    color: #ff8b8b;
}

.ss-interpretive-review-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--monoFontFamily, monospace);
    font-size: 12px;
    line-height: 1.4;
}

.ss-interpretive-review-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--ss-border);
    font-size: 11px;
    line-height: 1.3;
    background: color-mix(in srgb, var(--ss-bg-primary) 90%, white 10%);
    white-space: nowrap;
}

.ss-interpretive-review-badge.state-pending,
.ss-interpretive-review-badge.state-high,
.ss-interpretive-review-badge.state-blocked,
.ss-interpretive-review-badge.state-contested {
    border-color: rgba(255, 170, 0, 0.55);
    color: #ffbf47;
}

.ss-interpretive-review-badge.state-approved,
.ss-interpretive-review-badge.state-complete,
.ss-interpretive-review-badge.state-granted,
.ss-interpretive-review-badge.state-eligible,
.ss-interpretive-review-badge.state-authorized,
.ss-interpretive-review-badge.state-published,
.ss-interpretive-review-badge.state-active {
    border-color: rgba(60, 190, 90, 0.55);
    color: #7fe08a;
}

.ss-interpretive-review-badge.state-rejected,
.ss-interpretive-review-badge.state-failed,
.ss-interpretive-review-badge.state-revoked {
    border-color: rgba(230, 80, 80, 0.55);
    color: #ff8b8b;
}

@media (max-width: 960px) {
    .ss-interpretive-review-modal {
        display: block;
        height: auto;
        min-height: 0;
        overflow: visible;
    }

    .popup:has(.ss-interpretive-review-modal) {
        height: min(96vh, calc(100vh - 16px)) !important;
        overflow: hidden !important;
    }

    .popup:has(.ss-interpretive-review-modal) .popup-content {
        height: 100%;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
    }

    .ss-interpretive-review-toolbar {
        grid-template-columns: 1fr;
        position: sticky;
        top: 0;
        z-index: 3;
        background: var(--ss-bg-primary);
        padding-bottom: 10px;
    }

    .ss-interpretive-review-toolbar-buttons {
        justify-content: flex-start;
    }

    .ss-interpretive-review-toolbar-actions {
        justify-content: flex-start;
    }

    .ss-interpretive-review-detail-header-top {
        flex-direction: column;
        align-items: stretch;
    }

    .ss-interpretive-review-layout {
        display: block;
        height: auto;
        min-height: 0;
        overflow: visible;
        --ss-interpretive-review-pane-height: auto;
    }

    .ss-interpretive-review-column,
    .ss-interpretive-review-queue,
    .ss-interpretive-review-detail {
        display: block;
        flex: 0 0 auto;
        min-height: 0;
        overflow: visible;
    }

    .ss-interpretive-review-column + .ss-interpretive-review-column,
    .ss-interpretive-review-queue + .ss-interpretive-review-detail {
        margin-top: 12px;
    }

    .ss-interpretive-review-queue-controls {
        padding-top: 8px;
    }

    .ss-interpretive-review-queue-list,
    .ss-interpretive-review-detail-body {
        max-height: none;
        overflow: visible;
    }

    .ss-interpretive-review-detail-tabs {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--ss-bg-primary);
        padding-top: 2px;
        padding-bottom: 8px;
        width: 100%;
    }

    .ss-interpretive-review-review-column {
        gap: 12px;
    }

    .ss-interpretive-review-context {
        font-size: 17px;
        padding: 16px;
    }

    .ss-interpretive-review-context-support {
        padding: 12px 16px 14px;
    }

    .ss-interpretive-action-form .ss-interpretive-review-form-grid {
        grid-template-columns: 1fr;
    }

    .ss-interpretive-review-policy-audit-row {
        grid-template-columns: 1fr;
    }

    .ss-interpretive-review-status-strip {
        grid-template-columns: 1fr;
    }

    .ss-interpretive-review-status-strip-cell {
        border-left: 0;
        border-top: 1px solid color-mix(in srgb, var(--ss-border) 62%, transparent);
    }

    .ss-interpretive-review-status-strip-cell:first-child {
        border-top: 0;
    }

    .ss-interpretive-review-status-strip-value,
    .ss-interpretive-review-policy-audit-value {
        justify-content: flex-start;
        text-align: left;
    }
}
`;
