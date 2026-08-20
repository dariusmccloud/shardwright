export const INTERPRETIVE_REVIEW_CSS = `
/* ==========================================================================
   INTERPRETIVE REVIEW MODAL
   ========================================================================== */

.shardwright-interpretive-review-modal {
    padding: 14px;
    width: min(1560px, 97vw);
    max-width: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
    min-width: 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 18px;
    background:
        radial-gradient(1200px 420px at 50% -120px, color-mix(in srgb, var(--shardwright-primary) 10%, transparent), transparent 60%),
        linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%), color-mix(in srgb, var(--shardwright-bg-primary) 98%, black 2%));
}

.shardwright-interpretive-review-modal.shardwright-interpretive-review-fullscreen {
    width: 100%;
    max-width: none;
}

.popup:has(.shardwright-interpretive-review-modal) {
    display: flex !important;
    flex-direction: column;
    width: min(1700px, 98vw) !important;
    max-width: 98vw !important;
    max-height: min(96vh, calc(100vh - 16px)) !important;
    overflow: hidden !important;
}

.popup:has(.shardwright-interpretive-review-modal) .popup-content {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow: hidden;
}

.popup:has(.shardwright-interpretive-review-modal) .popup-controls {
    flex: 0 0 auto;
}

.popup.shardwright-interpretive-review-popup-fullscreen {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    max-height: calc(100vh - 12px) !important;
    height: calc(100vh - 12px) !important;
}

.popup.shardwright-interpretive-review-popup-fullscreen .popup-content {
    height: 100%;
    max-height: 100%;
    width: 100%;
}

.shardwright-interpretive-review-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 78%, transparent);
    border-radius: 16px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 92%, white 8%), color-mix(in srgb, var(--shardwright-bg-primary) 97%, black 3%));
    box-shadow: 0 18px 36px color-mix(in srgb, black 16%, transparent);
}

.shardwright-interpretive-review-toolbar-intro {
    display: grid;
    gap: 6px;
    min-width: 0;
    justify-items: center;
    text-align: center;
}

.shardwright-interpretive-review-toolbar-intro h3 {
    margin: 0;
    font-size: 25px;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-weight: 700;
}

.shardwright-interpretive-review-toolbar-intro .shardwright-hint {
    max-width: 72ch;
    color: color-mix(in srgb, var(--shardwright-text-primary) 74%, transparent);
    font-size: 12px;
}

.shardwright-interpretive-review-toolbar .shardwright-hint {
    margin: 0;
}

.shardwright-interpretive-review-filter {
    display: grid;
    gap: 4px;
    min-width: 220px;
}

.shardwright-interpretive-review-toolbar-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    min-width: 0;
}

.shardwright-interpretive-review-toolbar-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.shardwright-interpretive-review-toolbar-buttons .menu_button {
    min-height: 32px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 82%, transparent);
    background: color-mix(in srgb, var(--shardwright-bg-primary) 90%, white 10%);
    color: var(--shardwright-text-primary);
    transition:
        transform 0.15s ease,
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease;
}

.shardwright-interpretive-review-toolbar-buttons .menu_button:hover,
.shardwright-interpretive-review-toolbar-buttons .menu_button:focus-visible {
    border-color: color-mix(in srgb, var(--shardwright-primary) 42%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-primary) 12%, var(--shardwright-bg-primary));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--shardwright-primary) 18%, transparent);
    transform: translateY(-1px);
    outline: none;
}

.shardwright-interpretive-review-toolbar-buttons #shardwright-interpretive-review-close-toggle {
    border-color: rgba(255, 124, 124, 0.72);
    background: linear-gradient(180deg, rgba(82, 22, 22, 0.98), rgba(60, 16, 16, 0.98));
    color: #ffdede;
}

.shardwright-interpretive-review-toolbar-buttons #shardwright-interpretive-review-close-toggle:hover,
.shardwright-interpretive-review-toolbar-buttons #shardwright-interpretive-review-close-toggle:focus-visible {
    border-color: rgba(255, 155, 155, 0.96);
    background: linear-gradient(180deg, rgba(116, 30, 30, 1), rgba(90, 24, 24, 1));
    color: #fff3f3;
    box-shadow: 0 0 0 3px rgba(255, 124, 124, 0.18);
    outline: none;
}

.shardwright-interpretive-review-copyable {
    appearance: none;
    border: 0;
    border-radius: 3px;
    padding: 1px 3px;
    margin: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    vertical-align: middle;
    transition:
        background-color 0.15s ease,
        color 0.15s ease,
        box-shadow 0.15s ease;
}

.shardwright-interpretive-review-copyable:hover,
.shardwright-interpretive-review-copyable:focus-visible {
    background: color-mix(in srgb, var(--shardwright-primary) 12%, var(--shardwright-bg-primary));
    color: var(--shardwright-text-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--shardwright-primary) 20%, transparent);
    outline: none;
}

.shardwright-interpretive-source-navigation {
    margin: 0 6px 4px 0;
    padding: 3px 8px;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 55%, var(--shardwright-border));
    border-radius: 4px;
    background: color-mix(in srgb, var(--shardwright-primary) 12%, var(--shardwright-bg-primary));
    color: var(--shardwright-text-primary);
    cursor: pointer;
}

.shardwright-interpretive-source-navigation-status {
    display: block;
    margin-top: 3px;
    color: var(--shardwright-text-muted);
    font-size: 0.82em;
}

.shardwright-interpretive-review-evidence-table th,
.shardwright-interpretive-review-evidence-table td,
.shardwright-interpretive-review-evidence-source {
    text-align: left;
}

.shardwright-interpretive-review-speaker-key {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid color-mix(in srgb, var(--shardwright-border) 78%, transparent);
    color: var(--shardwright-text-muted);
    font-size: 0.85em;
}

#chat .mes.shardwright-interpretive-source-target {
    outline: 3px solid var(--shardwright-primary);
    outline-offset: -3px;
    animation: shardwright-interpretive-source-pulse 1s ease-in-out 2;
}

@keyframes shardwright-interpretive-source-pulse {
    50% { box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--shardwright-primary) 10%, transparent); }
}

.shardwright-interpretive-review-toolbar-panel {
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%);
}

.shardwright-interpretive-review-layout {
    display: grid;
    grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
    gap: 12px;
    min-width: 0;
    overflow: hidden;
}

.shardwright-interpretive-review-column {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    overflow: hidden;
}

.shardwright-interpretive-review-queue,
.shardwright-interpretive-review-detail {
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 82%, transparent);
    border-radius: 14px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%), color-mix(in srgb, var(--shardwright-bg-primary) 98%, black 2%));
    overflow: hidden;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    min-height: 0;
    box-shadow: 0 16px 32px color-mix(in srgb, black 14%, transparent);
}

.shardwright-interpretive-review-queue {
    grid-template-rows: auto auto minmax(0, 1fr);
}

.shardwright-interpretive-review-queue-header,
.shardwright-interpretive-review-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 88%, black 12%), color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%));
}

.shardwright-interpretive-review-queue-controls {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%);
}

.shardwright-interpretive-review-detail-header {
    display: block;
}

.shardwright-interpretive-review-detail-header-main {
    display: grid;
    gap: 10px;
}

.shardwright-interpretive-review-detail-header-top {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 10px;
}

.shardwright-interpretive-review-queue-list {
    display: grid;
    gap: 6px;
    padding: 6px;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
}

.shardwright-interpretive-review-queue-empty,
.shardwright-interpretive-review-detail-empty {
    padding: 14px 12px;
}

.shardwright-interpretive-review-item {
    display: grid;
    gap: 4px;
    width: 100%;
    margin: 0;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 82%, transparent);
    border-left-width: 3px;
    border-radius: 11px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 92%, white 8%);
    color: var(--shardwright-text-primary);
    text-align: left;
    cursor: pointer;
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease,
        box-shadow 0.15s ease;
}

.shardwright-interpretive-review-item:hover,
.shardwright-interpretive-review-item:focus-visible {
    background: color-mix(in srgb, var(--shardwright-primary) 11%, var(--shardwright-bg-primary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 34%, var(--shardwright-border));
    transform: translateX(2px);
    outline: none;
}

.shardwright-interpretive-review-item.active {
    background: color-mix(in srgb, var(--shardwright-primary) 18%, var(--shardwright-bg-primary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 48%, var(--shardwright-border));
    box-shadow:
        inset 3px 0 0 color-mix(in srgb, var(--shardwright-primary) 65%, white 35%),
        0 8px 18px color-mix(in srgb, black 12%, transparent);
}

.shardwright-interpretive-review-item-title,
.shardwright-interpretive-review-detail-title {
    font-weight: 600;
}

.shardwright-interpretive-review-item-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    font-size: 13px;
    line-height: 1.3;
}

.shardwright-interpretive-review-item-title > span:first-child {
    min-width: 0;
}

.shardwright-interpretive-review-item-title .shardwright-interpretive-review-inline-meta {
    margin-left: auto;
    flex: 0 0 auto;
    justify-content: flex-end;
}

.shardwright-interpretive-review-group-item {
    align-content: start;
}

.shardwright-interpretive-review-group-rows {
    display: grid;
    gap: 6px;
    margin-top: 2px;
}

.shardwright-interpretive-review-group-row {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 70%, transparent);
}

.shardwright-interpretive-review-group-row-button {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
    padding: 6px 9px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 90%, white 10%);
    color: var(--shardwright-text-primary);
    text-align: left;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
}

.shardwright-interpretive-review-group-row-button:hover,
.shardwright-interpretive-review-group-row-button:focus-visible {
    background: color-mix(in srgb, var(--shardwright-primary) 10%, var(--shardwright-bg-primary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 34%, var(--shardwright-border));
    transform: translateX(2px);
    outline: none;
}

.shardwright-interpretive-review-group-row-button.active {
    background: color-mix(in srgb, var(--shardwright-primary) 16%, var(--shardwright-bg-primary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 48%, var(--shardwright-border));
}

.shardwright-interpretive-review-group-row-main {
    display: grid;
    gap: 1px;
}

.shardwright-interpretive-review-group-name {
    font-weight: 600;
}

.shardwright-interpretive-review-item-meta,
.shardwright-interpretive-review-inline-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-content: flex-start;
}

.shardwright-interpretive-review-detail-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-gutter: stable;
}

.shardwright-interpretive-review-detail-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 4px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 90%, white 10%);
    width: fit-content;
}

.shardwright-interpretive-review-detail-tab {
    appearance: none;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 6px 12px;
    background: transparent;
    color: color-mix(in srgb, var(--shardwright-text-primary) 78%, transparent);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease,
        transform 0.15s ease;
}

.shardwright-interpretive-review-detail-tab:hover,
.shardwright-interpretive-review-detail-tab:focus-visible {
    border-color: color-mix(in srgb, var(--shardwright-primary) 45%, var(--shardwright-border));
    color: var(--shardwright-text-primary);
    background: color-mix(in srgb, var(--shardwright-primary) 10%, var(--shardwright-bg-primary));
    transform: translateY(-1px);
    outline: none;
}

.shardwright-interpretive-review-detail-tab.active {
    border-color: color-mix(in srgb, var(--shardwright-primary) 58%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-primary) 18%, var(--shardwright-bg-primary));
    color: var(--shardwright-text-primary);
    box-shadow: 0 4px 12px color-mix(in srgb, black 10%, transparent);
}

.shardwright-interpretive-review-detail-view {
    display: none;
    min-width: 0;
}

.shardwright-interpretive-review-detail-view.active {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
}

.shardwright-interpretive-review-section {
    margin: 0;
}

.shardwright-interpretive-review-section h4 {
    margin: 0;
    font-size: 15px;
}

.shardwright-interpretive-review-field-tools {
    display: grid;
    gap: 6px;
    margin-top: 6px;
}

.shardwright-interpretive-token-palette {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.shardwright-interpretive-token-button {
    appearance: none;
    border: 1px solid var(--shardwright-border);
    border-radius: 999px;
    padding: 4px 10px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%);
    color: var(--shardwright-text-primary);
    font: inherit;
    font-size: 11px;
    line-height: 1.2;
    cursor: pointer;
}

.shardwright-interpretive-token-button:hover,
.shardwright-interpretive-token-button:focus-visible {
    border-color: color-mix(in srgb, var(--shardwright-primary) 50%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-primary) 14%, var(--shardwright-bg-primary));
    outline: none;
}

.shardwright-interpretive-token-button.selected,
.shardwright-interpretive-token-button[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--shardwright-primary) 60%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-primary) 22%, var(--shardwright-bg-primary));
}

.shardwright-interpretive-review-inline-details {
    margin-top: 8px;
}

.shardwright-interpretive-review-inline-details summary {
    cursor: pointer;
    color: color-mix(in srgb, var(--shardwright-text-primary) 82%, transparent);
}

.shardwright-interpretive-review-inline-details[open] summary {
    margin-bottom: 8px;
}

.shardwright-interpretive-review-static-note {
    align-content: start;
}

.shardwright-interpretive-review-inline-help {
    position: relative;
}

.shardwright-interpretive-review-inline-help summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--shardwright-border);
    border-radius: 999px;
    cursor: pointer;
    list-style: none;
    font-size: 12px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%);
}

.shardwright-interpretive-review-inline-help summary::-webkit-details-marker {
    display: none;
}

.shardwright-interpretive-review-inline-help-body {
    margin-top: 8px;
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 96%, white 4%);
}

.shardwright-interpretive-review-inline-help-row {
    display: grid;
    gap: 2px;
}

.shardwright-review-section,
.shardwright-interpretive-review-disclosure,
.shardwright-interpretive-review-static-section {
    --shardwright-review-section-title-size: 14px;
    --shardwright-review-section-title-weight: 600;
    --shardwright-review-section-description-size: 11px;
    --shardwright-review-section-border-style: solid;
    --shardwright-review-section-surface-mix: 94%;
    --shardwright-review-section-header-mix: 90%;
    display: block;
    flex: 0 0 auto;
    border: 1px var(--shardwright-review-section-border-style) var(--shardwright-border);
    border-radius: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) var(--shardwright-review-section-surface-mix), white 6%), color-mix(in srgb, var(--shardwright-bg-primary) 98%, black 2%));
    overflow: hidden;
    margin: 0;
    box-shadow: 0 8px 18px color-mix(in srgb, black 9%, transparent);
}

.shardwright-review-section__header,
.shardwright-interpretive-review-disclosure-summary,
.shardwright-interpretive-review-static-header {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) var(--shardwright-review-section-header-mix), black 10%), color-mix(in srgb, var(--shardwright-bg-primary) 96%, white 4%));
}

.shardwright-review-section__title,
.shardwright-interpretive-review-disclosure-title {
    font-size: var(--shardwright-review-section-title-size);
    font-weight: var(--shardwright-review-section-title-weight);
    padding-right: 20px;
}

.shardwright-review-section__description,
.shardwright-interpretive-review-disclosure-description {
    font-size: var(--shardwright-review-section-description-size);
    line-height: 1.4;
    color: color-mix(in srgb, var(--shardwright-text-primary) 62%, transparent);
    letter-spacing: 0.01em;
    padding-right: 20px;
    text-align: left;
}

.shardwright-review-section__body,
.shardwright-interpretive-review-disclosure-body {
    padding: 12px;
    text-align: left;
}

.shardwright-review-section--static,
.shardwright-interpretive-review-static-section {
    --shardwright-review-section-title-size: 18px;
    --shardwright-review-section-title-weight: 700;
    --shardwright-review-section-description-size: 12px;
}

.shardwright-interpretive-review-subsection {
    --shardwright-review-section-border-style: dashed;
    --shardwright-review-section-surface-mix: 96%;
    margin-inline-start: 12px;
}

.shardwright-interpretive-review-disclosure {
    display: block;
}

.shardwright-interpretive-review-disclosure-summary {
    position: relative;
    cursor: pointer;
    list-style: none;
}

.shardwright-interpretive-review-disclosure-summary::-webkit-details-marker {
    display: none;
}

.shardwright-interpretive-review-disclosure-summary::after {
    content: '+';
    position: absolute;
    right: 14px;
    margin-top: 2px;
    color: var(--shardwright-text-primary);
    font-size: 16px;
    line-height: 1;
}

.shardwright-interpretive-review-disclosure[open] .shardwright-interpretive-review-disclosure-summary::after {
    content: '-';
}

.shardwright-interpretive-review-disclosure-body {
    display: none;
}

.shardwright-interpretive-review-disclosure[open] > .shardwright-interpretive-review-disclosure-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.shardwright-interpretive-review-static-section {
}

.shardwright-interpretive-review-static-header {
    border-bottom: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
}

.shardwright-interpretive-review-static-section .shardwright-interpretive-review-card {
    margin-top: 8px;
}

.shardwright-interpretive-review-context {
    padding: 16px 18px;
    font-size: 17px;
    line-height: 1.45;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%), color-mix(in srgb, var(--shardwright-bg-primary) 98%, black 2%));
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
    text-align: left;
}

.shardwright-interpretive-review-context-support {
    padding: 12px 18px 14px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 60%, transparent);
    background: color-mix(in srgb, var(--shardwright-bg-primary) 97%, white 3%);
    text-align: left;
}

.shardwright-interpretive-review-context-why {
    font-size: 13px;
    line-height: 1.5;
    color: color-mix(in srgb, var(--shardwright-text-primary) 88%, transparent);
}

.shardwright-interpretive-review-statement {
    white-space: pre-wrap;
    line-height: 1.45;
}

.shardwright-interpretive-review-summary-note {
    font-size: 12px;
    line-height: 1.55;
}

.shardwright-interpretive-review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
}

.shardwright-interpretive-review-summary-grid {
    grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.1fr);
    align-items: stretch;
}

.shardwright-interpretive-review-review-column {
    display: grid;
    gap: 12px;
    min-width: 0;
}

.shardwright-interpretive-review-overview {
    display: grid;
    gap: 10px;
    --shardwright-review-section-title-size: 14px;
    --shardwright-review-section-title-weight: 600;
    --shardwright-review-section-description-size: 11px;
}

.shardwright-interpretive-review-review-main {
    display: grid;
    gap: 12px;
    min-width: 0;
}

.shardwright-interpretive-review-overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
}

.shardwright-interpretive-review-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    text-align: left;
}

.shardwright-interpretive-review-fact {
    display: inline-flex;
    line-height: 1.45;
}

.shardwright-interpretive-review-fact strong {
    display: inline;
    margin: 0;
    font-size: 12px;
}

.shardwright-interpretive-review-card {
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 82%, transparent);
    border-radius: 11px;
    padding: 10px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 92%, white 8%), color-mix(in srgb, var(--shardwright-bg-primary) 97%, black 3%));
    text-align: left;
    box-shadow: 0 8px 18px color-mix(in srgb, black 8%, transparent);
}

.shardwright-interpretive-review-overview .shardwright-interpretive-review-summary-note {
    color: color-mix(in srgb, var(--shardwright-text-primary) 86%, transparent);
}

.shardwright-interpretive-review-card-actions {
    display: flex;
    justify-content: flex-start;
    margin-top: 10px;
}

.shardwright-interpretive-review-status-card {
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%), color-mix(in srgb, var(--shardwright-bg-primary) 98%, black 2%));
}

.shardwright-interpretive-review-status-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 76%, transparent);
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 93%, white 7%), color-mix(in srgb, var(--shardwright-bg-primary) 97%, black 3%));
    box-shadow: 0 8px 18px color-mix(in srgb, black 8%, transparent);
}

.shardwright-interpretive-review-lifecycle-section .shardwright-review-section__body {
    display: grid;
    gap: 12px;
}

.shardwright-interpretive-review-lifecycle-section .shardwright-interpretive-review-card {
    padding: 14px 16px;
}

.shardwright-interpretive-review-lifecycle-section .shardwright-interpretive-review-list {
    gap: 12px;
}

.shardwright-interpretive-review-status-strip-cell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    padding: 7px 10px;
    border-left: 1px solid color-mix(in srgb, var(--shardwright-border) 62%, transparent);
}

.shardwright-interpretive-review-status-strip-cell:first-child {
    border-left: 0;
}

.shardwright-interpretive-review-status-strip-label,
.shardwright-interpretive-review-policy-audit-label {
    font-size: 11px;
    font-weight: 600;
    color: color-mix(in srgb, var(--shardwright-text-primary) 74%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.2;
}

.shardwright-interpretive-review-status-strip-value {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    min-width: 0;
    flex-wrap: wrap;
    gap: 4px;
    text-align: right;
}

.shardwright-interpretive-review-policy-audit-card {
    display: grid;
    gap: 0;
    margin-top: 6px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 76%, transparent);
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 93%, white 7%), color-mix(in srgb, var(--shardwright-bg-primary) 97%, black 3%));
    box-shadow: 0 8px 18px color-mix(in srgb, black 8%, transparent);
}

.shardwright-interpretive-review-policy-audit-row {
    display: grid;
    gap: 12px;
    padding: 14px 16px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 62%, transparent);
}

.shardwright-interpretive-review-policy-audit-row:first-child {
    border-top: 0;
}

.shardwright-interpretive-review-policy-audit-value {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    min-width: 0;
    flex-wrap: wrap;
    gap: 8px 10px;
    text-align: left;
    line-height: 1.5;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="review"] .shardwright-interpretive-review-card,
.shardwright-interpretive-review-detail-view[data-detail-view-panel="review"] .shardwright-interpretive-review-section {
    width: 100%;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"].active {
    gap: 14px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-review-section__header,
.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-static-header,
.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-disclosure-summary {
    padding: 12px 16px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-review-section__body,
.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-disclosure-body {
    padding: 16px 18px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-card {
    padding: 14px 16px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-list {
    gap: 10px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-policy-audit-card {
    margin-top: 8px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-policy-audit-row {
    gap: 12px;
    padding: 14px 16px;
}

.shardwright-interpretive-review-detail-view[data-detail-view-panel="technical"] .shardwright-interpretive-review-policy-audit-value {
    gap: 8px 10px;
}

.shardwright-interpretive-review-evidence-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-interpretive-review-evidence-note {
    display: grid;
    gap: 6px;
    padding: 12px;
}

.shardwright-interpretive-review-evidence-note .shardwright-interpretive-review-inline-meta {
    min-height: 0;
}

.shardwright-interpretive-review-evidence-findings {
    display: grid;
    gap: 10px;
}

.shardwright-interpretive-review-evidence-finding {
    display: grid;
    gap: 10px;
    padding: 12px;
}

.shardwright-interpretive-review-evidence-source,
.shardwright-interpretive-review-evidence-context {
    color: color-mix(in srgb, var(--shardwright-text-primary) 70%, transparent);
    font-size: 11px;
    line-height: 1.4;
}

.shardwright-interpretive-review-evidence-previews {
    display: grid;
    gap: 8px;
}

.shardwright-interpretive-review-evidence-preview {
    display: grid;
    gap: 5px;
    padding: 10px;
    border-left: 3px solid color-mix(in srgb, var(--shardwright-accent) 58%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-bg-primary) 88%, white 12%);
}

.shardwright-interpretive-review-evidence-preview-heading {
    font-weight: 650;
    line-height: 1.35;
}

.shardwright-interpretive-review-evidence-excerpt {
    margin: 2px 0 0;
    white-space: pre-wrap;
    line-height: 1.5;
}

.shardwright-interpretive-review-evidence-fields {
    display: grid;
    gap: 6px;
    margin: 2px 0 0;
}

.shardwright-interpretive-review-evidence-field {
    display: grid;
    grid-template-columns: minmax(90px, 0.28fr) minmax(0, 1fr);
    gap: 10px;
}

.shardwright-interpretive-review-evidence-field dt {
    font-weight: 650;
}

.shardwright-interpretive-review-evidence-field dd {
    margin: 0;
}

.shardwright-interpretive-review-evidence-blocker {
    display: grid;
    gap: 6px;
}

.shardwright-interpretive-review-evidence-meta {
    display: grid;
    gap: 6px;
}

.shardwright-interpretive-review-evidence-meta-row {
    display: grid;
    gap: 3px;
    justify-items: start;
    text-align: left;
}

.shardwright-interpretive-review-evidence-meta-row strong {
    margin-bottom: 0;
}

.shardwright-interpretive-review-lifecycle-section .shardwright-interpretive-review-inline-meta {
    gap: 4px 6px;
}

.shardwright-interpretive-review-lifecycle-section .shardwright-interpretive-review-badge {
    padding: 1px 7px;
    font-size: 10px;
    line-height: 1.2;
}

.shardwright-interpretive-review-lifecycle-section .shardwright-interpretive-review-policy-audit-value {
    justify-content: flex-start;
}

.shardwright-interpretive-review-lifecycle-section .shardwright-interpretive-review-policy-audit-card .shardwright-interpretive-review-badge {
    padding: 2px 8px;
    font-size: 11px;
    line-height: 1.3;
}

.shardwright-interpretive-review-card strong,
.shardwright-interpretive-review-list strong {
    display: block;
    margin-bottom: 4px;
}

.shardwright-interpretive-action-card {
    display: grid;
    gap: 8px;
    text-align: left;
    width: 100%;
    max-width: none;
}

.shardwright-interpretive-action-form {
    display: grid;
    gap: 10px;
    min-width: 0;
}

.shardwright-interpretive-review-list {
    display: grid;
    gap: 6px;
}

.shardwright-interpretive-review-history-card {
    gap: 6px;
}

.shardwright-interpretive-review-history-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
}

.shardwright-interpretive-review-inline-meta--compact {
    margin-top: -2px;
}

.shardwright-interpretive-review-history-block {
    display: grid;
    gap: 4px;
    padding: 7px 9px;
    border: 1px solid color-mix(in srgb, var(--shardwright-border) 75%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 95%, white 5%);
}

.shardwright-interpretive-review-history-block-label {
    font-size: 11px;
    font-weight: 600;
    color: color-mix(in srgb, var(--shardwright-text-primary) 70%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.shardwright-interpretive-review-history-meta {
    display: grid;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 70%, transparent);
    color: color-mix(in srgb, var(--shardwright-text-primary) 80%, transparent);
    font-size: 12px;
    line-height: 1.45;
}

.shardwright-interpretive-review-history-subdetails {
    --shardwright-review-section-title-size: 12px;
    --shardwright-review-section-title-weight: 600;
    --shardwright-review-section-description-size: 0;
    --shardwright-review-section-surface-mix: 97%;
    --shardwright-review-section-header-mix: 94%;
    margin-top: 4px;
    margin-inline-start: 0;
    border-style: solid;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 97%, white 3%);
}

.shardwright-interpretive-review-history-subdetails .shardwright-interpretive-review-disclosure-summary,
.shardwright-interpretive-review-history-subdetails .shardwright-review-section__header {
    padding: 8px 10px;
}

.shardwright-interpretive-review-history-subdetails .shardwright-interpretive-review-disclosure-body,
.shardwright-interpretive-review-history-subdetails .shardwright-review-section__body {
    padding: 10px;
}

.shardwright-interpretive-review-history-subdetails .shardwright-review-section__title,
.shardwright-interpretive-review-history-subdetails .shardwright-interpretive-review-disclosure-title {
    padding-right: 18px;
}

.shardwright-interpretive-review-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
}

.shardwright-interpretive-action-form .shardwright-interpretive-review-form-grid {
    grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
    align-items: end;
}

.shardwright-interpretive-action-form [data-field="delegationPolicyId"],
.shardwright-interpretive-action-form [data-field="delegationPolicyUnavailable"] {
    grid-column: 1 / -1;
}

.shardwright-interpretive-review-field {
    display: grid;
    gap: 4px;
    text-align: left;
}

.shardwright-interpretive-review-field[hidden],
.shardwright-interpretive-review-static-note[hidden],
.shardwright-interpretive-review-section[hidden],
.shardwright-interpretive-review-reason-groups[hidden] {
    display: none !important;
}

.shardwright-interpretive-review-field > span:first-child {
    font-size: 12px;
    font-weight: 600;
}

.shardwright-interpretive-review-reason-groups {
    display: grid;
    gap: 10px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 70%, transparent);
}

.shardwright-interpretive-review-reason-group {
    display: grid;
    gap: 8px;
}

.shardwright-interpretive-review-reason-group + .shardwright-interpretive-review-reason-group {
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 70%, transparent);
}

.shardwright-interpretive-review-reason-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.shardwright-interpretive-review-comment-field {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 70%, transparent);
}

.shardwright-interpretive-review-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.shardwright-interpretive-review-action-surface .shardwright-interpretive-review-form-actions,
.shardwright-interpretive-action-card .shardwright-interpretive-review-form-actions {
    justify-content: flex-start;
}

.shardwright-interpretive-review-action-surface .shardwright-review-section__body {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    max-height: min(70vh, 980px);
    overflow-y: auto;
    overflow-x: hidden;
}

.shardwright-interpretive-review-action-surface .shardwright-interpretive-action-card {
    width: 100%;
    max-width: none;
}

.shardwright-interpretive-review-primary-action {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 36%, var(--shardwright-border));
    border-radius: 14px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-bg-primary) 88%, var(--shardwright-primary) 12%), color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%));
}

.shardwright-interpretive-review-primary-action .shardwright-interpretive-action-card {
    border-color: color-mix(in srgb, var(--shardwright-primary) 40%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, white 6%);
}

.shardwright-interpretive-review-primary-action .menu_button[type="submit"],
.shardwright-interpretive-review-form-actions .menu_button[type="submit"] {
    min-height: 38px;
    padding: 8px 16px;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 55%, var(--shardwright-border));
    border-radius: 12px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-primary) 30%, var(--shardwright-bg-primary)), color-mix(in srgb, var(--shardwright-primary) 18%, var(--shardwright-bg-primary)));
    color: color-mix(in srgb, white 88%, var(--shardwright-text-primary) 12%);
    font-weight: 700;
    letter-spacing: 0.01em;
    box-shadow: 0 6px 16px color-mix(in srgb, black 14%, transparent);
}

.shardwright-interpretive-review-primary-action .menu_button[type="submit"]:hover,
.shardwright-interpretive-review-primary-action .menu_button[type="submit"]:focus-visible,
.shardwright-interpretive-review-form-actions .menu_button[type="submit"]:hover,
.shardwright-interpretive-review-form-actions .menu_button[type="submit"]:focus-visible {
    border-color: color-mix(in srgb, var(--shardwright-primary) 72%, white 28%);
    background: linear-gradient(180deg, color-mix(in srgb, var(--shardwright-primary) 40%, var(--shardwright-bg-primary)), color-mix(in srgb, var(--shardwright-primary) 24%, var(--shardwright-bg-primary)));
    color: white;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--shardwright-primary) 20%, transparent), 0 8px 18px color-mix(in srgb, black 16%, transparent);
    outline: none;
    transform: translateY(-1px);
}

.shardwright-interpretive-review-form-actions .menu_button[type="submit"] {
    min-width: 132px;
}

.shardwright-interpretive-action-status {
    border: 1px solid var(--shardwright-border);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.4;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 92%, white 8%);
}

.shardwright-interpretive-action-status.tone-info {
    border-color: rgba(84, 162, 255, 0.45);
    color: #9bc2ff;
}

.shardwright-interpretive-action-status.tone-success {
    border-color: rgba(60, 190, 90, 0.55);
    color: #7fe08a;
}

.shardwright-interpretive-action-status.tone-error {
    border-color: rgba(230, 80, 80, 0.55);
    color: #ff8b8b;
}

.shardwright-interpretive-review-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--monoFontFamily, monospace);
    font-size: 12px;
    line-height: 1.4;
}

.shardwright-interpretive-review-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--shardwright-border);
    font-size: 11px;
    line-height: 1.3;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 90%, white 10%);
    white-space: nowrap;
}

.shardwright-interpretive-review-badge.state-pending,
.shardwright-interpretive-review-badge.state-high,
.shardwright-interpretive-review-badge.state-blocked,
.shardwright-interpretive-review-badge.state-contested {
    border-color: rgba(255, 170, 0, 0.55);
    color: #ffbf47;
}

.shardwright-interpretive-review-badge.state-approved,
.shardwright-interpretive-review-badge.state-complete,
.shardwright-interpretive-review-badge.state-granted,
.shardwright-interpretive-review-badge.state-eligible,
.shardwright-interpretive-review-badge.state-authorized,
.shardwright-interpretive-review-badge.state-published,
.shardwright-interpretive-review-badge.state-active {
    border-color: rgba(60, 190, 90, 0.55);
    color: #7fe08a;
}

.shardwright-interpretive-review-badge.state-rejected,
.shardwright-interpretive-review-badge.state-failed,
.shardwright-interpretive-review-badge.state-revoked {
    border-color: rgba(230, 80, 80, 0.55);
    color: #ff8b8b;
}

@media (max-width: 960px) {
    .shardwright-interpretive-review-modal {
        display: block;
        height: auto;
        min-height: 0;
        overflow: visible;
    }

    .popup:has(.shardwright-interpretive-review-modal) {
        height: min(96vh, calc(100vh - 16px)) !important;
        overflow: hidden !important;
    }

    .popup:has(.shardwright-interpretive-review-modal) .popup-content {
        height: 100%;
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
    }

    .shardwright-interpretive-review-toolbar {
        grid-template-columns: 1fr;
        position: sticky;
        top: 0;
        z-index: 3;
        background: var(--shardwright-bg-primary);
        padding-bottom: 10px;
    }

    .shardwright-interpretive-review-toolbar-buttons {
        justify-content: flex-start;
    }

    .shardwright-interpretive-review-toolbar-actions {
        justify-content: flex-start;
    }

    .shardwright-interpretive-review-detail-header-top {
        flex-direction: column;
        align-items: stretch;
    }

    .shardwright-interpretive-review-layout {
        display: block;
        height: auto;
        min-height: 0;
        overflow: visible;
        --shardwright-interpretive-review-pane-height: auto;
    }

    .shardwright-interpretive-review-column,
    .shardwright-interpretive-review-queue,
    .shardwright-interpretive-review-detail {
        display: block;
        flex: 0 0 auto;
        min-height: 0;
        overflow: visible;
    }

    .shardwright-interpretive-review-column + .shardwright-interpretive-review-column,
    .shardwright-interpretive-review-queue + .shardwright-interpretive-review-detail {
        margin-top: 10px;
    }

    .shardwright-interpretive-review-queue-controls {
        padding-top: 8px;
    }

    .shardwright-interpretive-review-queue-list,
    .shardwright-interpretive-review-detail-body {
        max-height: none;
        overflow: visible;
    }

    .shardwright-interpretive-review-detail-tabs {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--shardwright-bg-primary);
        padding-top: 2px;
        padding-bottom: 8px;
        width: 100%;
    }

    .shardwright-interpretive-review-review-column {
        gap: 10px;
    }

    .shardwright-interpretive-review-context {
        font-size: 16px;
        padding: 14px;
    }

    .shardwright-interpretive-review-context-support {
        padding: 10px 14px 12px;
    }

    .shardwright-interpretive-action-form .shardwright-interpretive-review-form-grid {
        grid-template-columns: 1fr;
    }

    .shardwright-interpretive-review-policy-audit-row {
        grid-template-columns: 1fr;
    }

    .shardwright-interpretive-review-status-strip {
        grid-template-columns: 1fr;
    }

    .shardwright-interpretive-review-status-strip-cell {
        border-left: 0;
        border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 62%, transparent);
    }

    .shardwright-interpretive-review-status-strip-cell:first-child {
        border-top: 0;
    }

    .shardwright-interpretive-review-status-strip-value,
    .shardwright-interpretive-review-policy-audit-value {
        justify-content: flex-start;
        text-align: left;
    }
}
`;
