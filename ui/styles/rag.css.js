export const RAG_CSS = `
/* =====================================================================
   RAG SETTINGS MODAL
   ===================================================================== */

.shardwright-rag-modal {
    padding: 14px;
    max-height: 76vh;
    overflow-y: auto;
    overflow-x: visible;
}

.shardwright-rag-title {
    margin: 0 0 12px 0;
    color: var(--shardwright-text-primary);
}

.shardwright-rag-master-toggle {
    margin-bottom: 12px;
    padding: 8px 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-rag-mode-badge {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: normal;
    vertical-align: middle;
    border: 1px solid var(--shardwright-border);
    background: var(--shardwright-bg-secondary);
    color: var(--shardwright-text-primary);
}

.shardwright-rag-mode-sharder {
    background: color-mix(in srgb, var(--shardwright-primary) 18%, transparent);
    color: color-mix(in srgb, var(--shardwright-primary) 72%, var(--shardwright-text-primary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 42%, transparent);
}

.shardwright-rag-mode-standard {
    background: color-mix(in srgb, var(--shardwright-quote) 18%, transparent);
    color: color-mix(in srgb, var(--shardwright-quote) 72%, var(--shardwright-text-primary));
    border-color: color-mix(in srgb, var(--shardwright-quote) 42%, transparent);
}

.shardwright-rag-status-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
    margin-bottom: 10px;
}

.shardwright-rag-status-actions {
    margin-bottom: 12px;
}

.shardwright-rag-status-item {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
    padding: 8px;
}

.shardwright-rag-status-label {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    margin-bottom: 3px;
}

.shardwright-rag-status-value {
    font-size: 12px;
    color: var(--shardwright-text-primary);
    word-break: break-word;
}

.shardwright-rag-warning {
    margin-bottom: 12px;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--shardwright-warning) 55%, transparent);
    background: color-mix(in srgb, var(--shardwright-warning) 15%, transparent);
    color: var(--shardwright-text-primary);
    font-size: 12px;
}

.shardwright-rag-accordion {
    border-radius: 8px;
    margin-bottom: 12px;
    overflow: visible;
    z-index: 0;
}

.shardwright-rag-accordion .shardwright-accordion-header {
    border-radius: 8px;
}

.shardwright-rag-accordion.expanded .shardwright-accordion-header {
    border-radius: 8px 8px 0 0;
}

.shardwright-rag-accordion .shardwright-accordion-content {
    max-height: none;
    overflow-y: visible;
    padding: 10px;
    z-index: 1001;
    position: relative;
}

.shardwright-rag-accordion[data-rag-section="backend"] .shardwright-accordion-content {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    align-items: start;
}

.shardwright-rag-accordion[data-rag-section="backend"] .shardwright-accordion-content > .shardwright-rag-subsection-title,
.shardwright-rag-accordion[data-rag-section="backend"] .shardwright-accordion-content > .shardwright-rag-vectorization-grid {
    grid-column: 1 / -1;
}

.shardwright-rag-backend-left,
.shardwright-rag-backend-right {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-rag-subsection {
    margin-top: 0px;
    padding-top: 0px;
}

.shardwright-rag-subsection-title {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: var(--shardwright-text-primary);
}

.shardwright-rag-vectorization-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    align-items: start;
}

.shardwright-rag-vectorization-grid .shardwright-rag-stats {
    grid-column: 1 / -1;
}

#shardwright-rag-reranker-config {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    align-items: start;
}

#shardwright-rag-qdrant-local,
#shardwright-rag-qdrant-cloud {
    margin-top: 1px;
}

.shardwright-rag-grid-two {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
}

.shardwright-rag-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

.shardwright-rag-actions-row-tight {
    margin-top: 6px;
}

.shardwright-rag-actions-row .menu_button {
    flex: 1;
    min-width: 170px;
}

.shardwright-rag-actions-primary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 8px;
}

.shardwright-rag-actions-primary .menu_button {
    width: 100%;
    min-width: 0;
}

.shardwright-rag-actions-secondary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    opacity: 0.85;
}

.shardwright-rag-actions-secondary .menu_button {
    font-size: 12px;
    min-width: 150px;
}

.shardwright-rag-btn-destructive {
    border-color: color-mix(in srgb, var(--shardwright-error) 60%, var(--shardwright-border));
    color: color-mix(in srgb, var(--shardwright-error) 70%, var(--shardwright-text-primary));
}

#shardwright-rag-browser-delete-btn {
    background-color: var(--shardwright-stop-bg) !important;
    border-color: var(--shardwright-stop-bg) !important;
    color: white !important;
}

#shardwright-rag-browser-delete-btn:hover {
    opacity: 0.85;
}

.shardwright-rag-sublabel {
    display: block;
    margin: -2px 0 4px 0;
    font-size: 11px;
    color: var(--shardwright-text-muted);
}

.shardwright-rag-template {
    min-height: 100px;
    resize: vertical;
}

.shardwright-rag-stats {
    margin-top: 8px;
    color: var(--shardwright-text-secondary);
    font-size: 12px;
}

.shardwright-rag-inline-hint {
    margin: 4px 0 0 0;
}

.shardwright-rag-hybrid-weighted-hint {
    margin-top: 6px;
}

.shardwright-rag-weighted-scale {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--shardwright-text-muted);
    margin-bottom: 6px;
}

.shardwright-rag-weighted-label strong {
    color: var(--shardwright-text-primary);
    font-weight: 600;
    margin-left: 4px;
}

#shardwright-rag-weighted-slider-wrap .shardwright-range-pair {
    grid-template-columns: minmax(0, 1fr);
}

#shardwright-rag-weighted-slider-wrap {
    grid-column: 1 / -1;
}

#shardwright-rag-weighted-slider-wrap .shardwright-range-number,
#shardwright-rag-weighted-slider-wrap .shardwright-range-unit {
    display: none;
}

.shardwright-rag-vectorization-lorebook-options {
    margin-top: 8px;
    position: relative;
    z-index: 1001;
}

#shardwright-rag-reranker-mode-host,
#shardwright-rag-chunking-mode-host,
#shardwright-rag-prose-chunking-mode-host,
#shardwright-rag-hybrid-fusion-host,
#shardwright-rag-threshold-host,
#shardwright-rag-scene-max-host {
    width: 100%;
}

#shardwright-rag-reranker-mode-host .shardwright-segmented-toggle,
#shardwright-rag-chunking-mode-host .shardwright-segmented-toggle,
#shardwright-rag-prose-chunking-mode-host .shardwright-segmented-toggle,
#shardwright-rag-hybrid-fusion-host .shardwright-segmented-toggle {
    width: 100%;
}

.shardwright-rag-modal .shardwright-range-pair {
    width: 100%;
}

#shardwright-rag-embedding-test-status {
    margin-top: 6px;
}

#shardwright-rag-reranker-test-status {
    margin-top: 4px;
}

.shardwright-rag-scene-mode-hint {
    margin-top: 8px;
}

@media (max-width: 600px) {
    .shardwright-rag-accordion[data-rag-section="backend"] .shardwright-accordion-content {
        grid-template-columns: 1fr;
    }

    #shardwright-rag-reranker-config {
        grid-template-columns: 1fr;
    }

    #shardwright-rag-clear-embedding-key {
        min-width: 140px;
        max-width: 100%;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

/* =====================================================================
   RAG BROWSER MODAL
   ===================================================================== */

.shardwright-rag-browser-modal {
    max-height: 80vh;
}

.shardwright-rag-section {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
}

.shardwright-rag-section > h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--shardwright-text-primary);
    letter-spacing: 0.04em;
    margin: 0 0 8px 0;
}

.shardwright-rag-browser-modal .shardwright-hint,
.shardwright-collection-manager-modal .shardwright-hint {
    font-size: 12px;
    color: var(--shardwright-text-muted);
    line-height: 1.4;
}

.shardwright-rag-backend-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
}

.shardwright-rag-backend-toggle {
    padding: 3px 10px;
    font-size: 11px;
    border-radius: 12px;
    border: 1px solid var(--shardwright-border);
    background: var(--shardwright-bg-secondary);
    color: var(--shardwright-text-muted);
    cursor: pointer;
}

.shardwright-rag-backend-toggle.active {
    background: color-mix(in srgb, var(--shardwright-primary) 20%, var(--shardwright-bg-secondary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 50%, var(--shardwright-border));
    color: var(--shardwright-text-primary);
}

.shardwright-rag-collection-dropdown {
    position: relative;
    width: 100%;
}

.shardwright-rag-collection-dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
    color: var(--shardwright-text-primary);
    cursor: pointer;
    font-size: 13px;
    min-height: 34px;
    user-select: none;
}

.shardwright-rag-collection-dropdown-trigger:hover {
    border-color: var(--shardwright-primary);
}

.shardwright-rag-collection-dropdown-trigger[aria-expanded="true"] {
    border-color: var(--shardwright-primary);
    border-radius: 6px 6px 0 0;
}

.shardwright-rag-collection-dropdown-arrow {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--shardwright-text-muted);
}

.shardwright-rag-collection-dropdown-menu,
.shardwright-rag-collection-dropdown-search-wrap,
.shardwright-rag-collection-dropdown-options,
.shardwright-rag-collection-dropdown-empty {
    --shardwright-rag-dropdown-bg: var(--shardwright-bg-secondary, rgba(18, 18, 18, 0.96));
    background: var(--shardwright-rag-dropdown-bg) !important;
    background-color: var(--shardwright-rag-dropdown-bg) !important;
}

.shardwright-rag-collection-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1100;
    border: 1px solid var(--shardwright-primary);
    border-top: none;
    border-radius: 0 0 6px 6px;
    background-image: none !important;
    backdrop-filter: none !important;
    opacity: 1 !important;
    isolation: isolate;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.shardwright-rag-collection-dropdown-search-wrap {
    padding: 6px;
    border-bottom: 1px solid var(--shardwright-border);
}

.shardwright-rag-collection-dropdown-search-wrap input {
    width: 100%;
}

.shardwright-rag-collection-dropdown-options {
    max-height: 220px;
    overflow-y: auto;
}

.shardwright-rag-collection-dropdown-item {
    --shardwright-rag-dropdown-bg: var(--shardwright-bg-secondary, rgba(18, 18, 18, 0.96));
    padding: 7px 10px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-bottom: 1px solid var(--shardwright-border);
    background: var(--shardwright-rag-dropdown-bg);
    background-color: var(--shardwright-rag-dropdown-bg);
    opacity: 1 !important;
}

.shardwright-rag-collection-dropdown-item:last-child {
    border-bottom: none;
}

.shardwright-rag-collection-dropdown-item:hover {
    background: color-mix(in srgb, var(--shardwright-primary) 12%, var(--shardwright-bg-secondary));
}

.shardwright-rag-collection-dropdown-item.selected {
    background: color-mix(in srgb, var(--shardwright-primary) 18%, var(--shardwright-bg-secondary));
}

.shardwright-rag-collection-item-id {
    font-size: 12px;
    color: var(--shardwright-text-primary);
    word-break: break-all;
}

.shardwright-rag-collection-item-meta {
    font-size: 11px;
    color: var(--shardwright-text-muted);
}

.shardwright-rag-collection-dropdown-empty {
    padding: 12px 10px;
    text-align: center;
    font-size: 12px;
    color: var(--shardwright-text-muted);
    opacity: 1 !important;
}

.shardwright-rag-browser-chat-selector-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.shardwright-rag-browser-chat-selector-row select {
    flex: 1;
    min-width: 0;
}

.shardwright-rag-browser-chat-selector-row .menu_button {
    flex-shrink: 0;
    white-space: nowrap;
}

.shardwright-rag-browser-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
}

.shardwright-rag-browser-stat-card {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.shardwright-rag-browser-summary-card {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 10px;
    display: grid;
    gap: 10px;
}

.shardwright-rag-browser-summary-section {
    display: grid;
    gap: 6px;
}

.shardwright-rag-browser-summary-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--shardwright-text-primary);
    letter-spacing: 0.04em;
}

.shardwright-rag-browser-summary-list {
    display: grid;
    gap: 6px;
}

.shardwright-rag-browser-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-rag-browser-summary-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.shardwright-rag-browser-summary-id {
    color: var(--shardwright-text-primary);
    word-break: break-all;
}

.shardwright-rag-browser-summary-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.shardwright-rag-browser-summary-badge {
    display: inline-flex;
    align-items: center;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 35%, transparent);
    background: color-mix(in srgb, var(--shardwright-primary) 12%, transparent);
    color: color-mix(in srgb, var(--shardwright-primary) 78%, var(--shardwright-text-primary));
    text-transform: lowercase;
}

.shardwright-rag-browser-summary-meta,
.shardwright-rag-browser-summary-empty {
    font-size: 12px;
    color: var(--shardwright-text-muted);
}

.shardwright-rag-stat-info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    font-size: 12px;
}

.shardwright-rag-stat-row {
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr);
    gap: 12px;
    align-items: start;
}

.shardwright-rag-stat-info-label {
    color: var(--shardwright-text-muted);
}

.shardwright-rag-stat-info-value {
    color: var(--shardwright-text-primary);
    word-break: break-all;
}

.shardwright-rag-browser-action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
}

.shardwright-rag-browser-action-row .menu_button {
    flex: 1;
    min-width: 100px;
    font-size: 11px;
    padding: 4px 8px;
}

.shardwright-rag-browser-items,
.shardwright-rag-browser-scene-groups,
.shardwright-rag-browser-query-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}

.shardwright-rag-browser-item,
.shardwright-rag-browser-scene-group {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 6px 8px;
}

.shardwright-rag-browser-item summary {
    cursor: pointer;
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    gap: 10px;
    align-items: center;
    color: var(--shardwright-text-primary);
}

.shardwright-rag-browser-item-toggle {
    cursor: pointer;
    accent-color: var(--shardwright-primary);
}

.shardwright-rag-browser-item.disabled summary {
    opacity: 0.5;
}

.shardwright-rag-browser-scene-group-row {
    cursor: pointer;
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 10px;
    align-items: center;
    color: var(--shardwright-text-primary);
}

.shardwright-rag-browser-item summary > *,
.shardwright-rag-browser-scene-group-row > * {
    min-width: 0;
}

.shardwright-rag-browser-item-index,
.shardwright-rag-browser-scene-code {
    font-weight: 700;
    color: var(--shardwright-primary);
}

.shardwright-rag-browser-item-score,
.shardwright-rag-browser-scene-range,
.shardwright-rag-browser-scene-count {
    font-size: 12px;
    color: var(--shardwright-text-muted);
}

.shardwright-rag-browser-scene-groups {
    max-height: none;
    overflow-y: visible;
}

.shardwright-rag-browser-scene-group-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shardwright-rag-browser-scene-group {
    display: block;
    width: 100%;
    text-align: left;
}

.shardwright-rag-browser-scene-group.selected {
    border-color: var(--shardwright-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--shardwright-primary) 30%, transparent);
}

.shardwright-rag-browser-scene-group-detail {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 75%, var(--shardwright-bg-secondary));
    padding: 8px;
}

.shardwright-rag-browser-scene-group-detail-header {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;
}

.shardwright-rag-browser-scene-group-detail-body {
    max-height: 280px;
    overflow-y: auto;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 8px;
}

.shardwright-rag-browser-item-preview {
    color: var(--shardwright-text-secondary);
    overflow-wrap: anywhere;
}

.shardwright-rag-browser-item-actions {
    display: flex;
    gap: 6px;
    justify-self: end;
}

.shardwright-rag-browser-item-actions .menu_button {
    padding: 2px 8px;
    font-size: 11px;
    min-width: 0;
}

.shardwright-rag-browser-item-body {
    margin-top: 8px;
    display: grid;
    gap: 8px;
}

.shardwright-rag-browser-text,
.shardwright-rag-browser-meta {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.4;
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    padding: 8px;
    max-height: 180px;
    overflow: auto;
}

.shardwright-rag-browser-scene-items {
    margin: 8px 0 0 0;
    padding-left: 18px;
    color: var(--shardwright-text-secondary);
}

.shardwright-rag-browser-query-panel ul {
    margin: 0;
    padding-left: 18px;
}

.shardwright-rag-browser-query-list li {
    margin-bottom: 8px;
}

.shardwright-weighted-tag-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.shardwright-weighted-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: 1px solid var(--shardwright-border);
    border-radius: 12px;
    background: var(--shardwright-bg-secondary);
    font-size: 12px;
}

.shardwright-weighted-tag-weight {
    width: 42px;
    padding: 1px 4px;
    font-size: 11px;
    text-align: center;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-primary);
}

.shardwright-weighted-tag-remove {
    cursor: pointer;
    background: none;
    border: none;
    color: var(--shardwright-text-muted);
    font-size: 12px;
    padding: 0 2px;
}

/* =====================================================================
   COLLECTION MANAGER MODAL
   ===================================================================== */

.shardwright-collection-manager-modal {
    padding: 14px;
    min-width: 520px;
    max-height: 76vh;
    overflow-y: auto;
}

.shardwright-cm-context-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
}

.shardwright-cm-context-card,
.shardwright-cm-overview-card,
.shardwright-cm-accordion {
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    background: var(--shardwright-bg-primary);
}

.shardwright-cm-context-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.shardwright-cm-context-card {
    padding: 10px;
}

.shardwright-cm-section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--shardwright-text-primary);
    letter-spacing: 0.04em;
    margin-bottom: 6px;
}

.shardwright-cm-context-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--shardwright-text-primary);
    margin-bottom: 6px;
}

.shardwright-cm-context-avatar {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
}

.shardwright-cm-chat-icon {
    color: var(--shardwright-primary);
    font-size: 18px;
}

.shardwright-cm-context-name {
    font-weight: 600;
    color: var(--shardwright-text-primary);
    font-size: 13px;
    word-break: break-all;
}

.shardwright-cm-overview-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    margin-bottom: 12px;
}

.shardwright-cm-overview-block {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    padding: 10px;
}

.shardwright-cm-overview-card .shardwright-cm-overview-row,
.shardwright-cm-overview-card .shardwright-cm-write-target-row {
    background: var(--shardwright-bg-primary);
}

.shardwright-cm-overview-block .shardwright-cm-list {
    margin-bottom: 0;
}

.shardwright-cm-list-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--shardwright-text-muted);
    letter-spacing: 0.04em;
    margin-bottom: 4px;
}

.shardwright-cm-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 10px;
    min-height: 32px;
}

.shardwright-cm-empty {
    padding: 10px;
    font-size: 12px;
    color: var(--shardwright-text-muted);
    border: 1px dashed var(--shardwright-border);
    border-radius: 6px;
    text-align: center;
}

.shardwright-cm-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-cm-overview-row,
.shardwright-cm-write-target-row,
.shardwright-cm-warning-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-cm-row-main,
.shardwright-cm-overview-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.shardwright-cm-row-id {
    font-size: 12px;
    color: var(--shardwright-text-primary);
    word-break: break-all;
    min-width: 0;
}

.shardwright-cm-row-chunks {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    white-space: nowrap;
}

.shardwright-cm-row-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.shardwright-cm-source-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--shardwright-border);
    text-transform: lowercase;
}

.shardwright-cm-source-character {
    background: color-mix(in srgb, var(--shardwright-primary) 12%, transparent);
    border-color: color-mix(in srgb, var(--shardwright-primary) 35%, transparent);
    color: color-mix(in srgb, var(--shardwright-primary) 75%, var(--shardwright-text-primary));
}

.shardwright-cm-source-chat {
    background: color-mix(in srgb, var(--shardwright-quote) 14%, transparent);
    border-color: color-mix(in srgb, var(--shardwright-quote) 35%, transparent);
    color: color-mix(in srgb, var(--shardwright-quote) 80%, var(--shardwright-text-primary));
}

.shardwright-cm-source-own {
    background: color-mix(in srgb, var(--shardwright-text-muted) 12%, transparent);
    border-color: color-mix(in srgb, var(--shardwright-text-muted) 25%, transparent);
    color: var(--shardwright-text-secondary);
}

.shardwright-cm-source-warning {
    background: color-mix(in srgb, var(--shardwright-warning) 18%, transparent);
    border-color: color-mix(in srgb, var(--shardwright-warning) 45%, transparent);
    color: color-mix(in srgb, var(--shardwright-warning) 80%, var(--shardwright-text-primary));
}

.shardwright-cm-row-remove {
    padding: 1px 7px !important;
    font-size: 13px !important;
    min-width: 0 !important;
    flex-shrink: 0;
    color: var(--shardwright-text-muted);
}

.shardwright-cm-add-row {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    padding: 8px 10px;
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
}

.shardwright-cm-add-select {
    flex: 1;
    min-width: 0;
    font-size: 12px;
}

.shardwright-cm-add-row .menu_button {
    flex-shrink: 0;
    white-space: nowrap;
}

.shardwright-cm-write-target {
    min-height: 36px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.shardwright-cm-write-target-select {
    width: 100%;
}

.shardwright-cm-accordion {
    margin-bottom: 10px;
    overflow: hidden;
}

.shardwright-cm-accordion-summary {
    list-style: none;
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    font-weight: 600;
    color: var(--shardwright-text-primary);
}

.shardwright-cm-accordion-summary::-webkit-details-marker {
    display: none;
}

.shardwright-cm-accordion-hint {
    font-size: 11px;
    font-weight: 400;
    color: var(--shardwright-text-muted);
    line-height: 1.35;
}

.shardwright-cm-accordion-body {
    padding: 0 12px 12px 12px;
}

.shardwright-cm-warning-list-active {
    padding: 8px;
    border: 1px solid color-mix(in srgb, var(--shardwright-warning) 58%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--shardwright-warning) 12%, var(--shardwright-bg-primary));
    gap: 6px;
}

.shardwright-cm-warning-row {
    justify-content: flex-start;
    border-color: color-mix(in srgb, var(--shardwright-warning) 46%, transparent);
    background: color-mix(in srgb, var(--shardwright-warning) 14%, var(--shardwright-bg-secondary));
    color: var(--shardwright-text-primary);
}

.shardwright-cm-warning-icon {
    color: color-mix(in srgb, var(--shardwright-warning) 82%, var(--shardwright-text-primary));
    flex-shrink: 0;
}

.shardwright-cm-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid var(--shardwright-border);
    margin-top: 4px;
}

/* =====================================================================
   BRANCH COLLECTION PICKER MODAL
   ===================================================================== */

.shardwright-branch-picker-modal {
    padding: 14px;
    min-width: 400px;
    max-width: 560px;
    max-height: 76vh;
    overflow-y: auto;
}

.shardwright-bp-section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--shardwright-text-muted);
    letter-spacing: 0.04em;
    margin-bottom: 6px;
}

.shardwright-bp-parent-hint {
    margin-bottom: 12px;
}

.shardwright-bp-migration-note {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-bottom: 12px;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 35%, transparent);
    background: color-mix(in srgb, var(--shardwright-primary) 10%, var(--shardwright-bg-primary));
    color: var(--shardwright-text-muted);
}

.shardwright-bp-selection-summary {
    margin-bottom: 10px;
}

.shardwright-bp-summary-card {
    padding: 8px 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-bp-summary-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--shardwright-text-muted);
    letter-spacing: 0.04em;
    margin-bottom: 8px;
}

.shardwright-bp-summary-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.shardwright-bp-summary-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 0;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-border) 80%, transparent);
}

.shardwright-bp-summary-row:first-child {
    border-top: none;
    padding-top: 0;
}

.shardwright-bp-summary-id {
    font-size: 12px;
    color: var(--shardwright-text-primary);
    word-break: break-all;
}

.shardwright-bp-summary-meta {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    white-space: nowrap;
}

.shardwright-bp-summary-warning {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--shardwright-warning) 35%, transparent);
    color: color-mix(in srgb, var(--shardwright-warning) 78%, var(--shardwright-text-primary));
    font-size: 12px;
}

.shardwright-bp-parent-name {
    color: var(--shardwright-text-primary);
    font-weight: 600;
}

.shardwright-bp-collections-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
}

.shardwright-bp-collection-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 10px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
}

.shardwright-bp-link-check {
    margin-top: 2px;
}

.shardwright-bp-row-content {
    flex: 1;
    min-width: 0;
}

.shardwright-bp-row-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    flex-wrap: wrap;
}

.shardwright-bp-row-id {
    font-size: 12px;
    color: var(--shardwright-text-primary);
    word-break: break-all;
    flex: 1;
}

.shardwright-bp-row-meta {
    font-size: 11px;
    color: var(--shardwright-text-muted);
    margin-bottom: 4px;
}

.shardwright-bp-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    white-space: nowrap;
    border: 1px solid var(--shardwright-border);
    flex-shrink: 0;
}

.shardwright-bp-badge-own,
.shardwright-bp-badge-chat {
    background: color-mix(in srgb, var(--shardwright-primary) 14%, transparent);
    color: color-mix(in srgb, var(--shardwright-primary) 70%, var(--shardwright-text-primary));
    border-color: color-mix(in srgb, var(--shardwright-primary) 36%, transparent);
}

.shardwright-bp-badge-chat {
    background: color-mix(in srgb, var(--shardwright-quote) 14%, transparent);
    color: color-mix(in srgb, var(--shardwright-quote) 75%, var(--shardwright-text-primary));
    border-color: color-mix(in srgb, var(--shardwright-quote) 35%, transparent);
}

.shardwright-bp-badge-warning {
    background: color-mix(in srgb, var(--shardwright-warning) 16%, transparent);
    color: color-mix(in srgb, var(--shardwright-warning) 78%, var(--shardwright-text-primary));
    border-color: color-mix(in srgb, var(--shardwright-warning) 40%, transparent);
}

.shardwright-bp-row-actions {
    display: flex;
    gap: 16px;
    align-items: center;
}

.shardwright-bp-action-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--shardwright-text-secondary);
    cursor: pointer;
}

.shardwright-bp-action-label input[type="radio"] {
    accent-color: var(--shardwright-primary);
}

.shardwright-bp-action-hint {
    font-size: 11px;
    color: var(--shardwright-text-muted);
}

.shardwright-bp-primary-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.shardwright-bp-primary-label {
    font-size: 12px;
    color: var(--shardwright-text-muted);
    white-space: nowrap;
}

.shardwright-bp-primary-select {
    flex: 1;
    min-width: 0;
    font-size: 12px;
}

.shardwright-bp-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid var(--shardwright-border);
}

.shardwright-bp-skip-btn {
    opacity: 0.7;
}

@media (max-width: 700px) {
    .shardwright-collection-manager-modal {
        min-width: 0;
    }

    .shardwright-cm-context-grid {
        grid-template-columns: 1fr;
    }

    .shardwright-cm-row {
        grid-template-columns: 1fr;
        align-items: start;
    }

    .shardwright-cm-overview-row,
    .shardwright-cm-write-target-row,
    .shardwright-cm-warning-row,
    .shardwright-bp-summary-row {
        align-items: start;
        justify-content: flex-start;
        flex-direction: column;
    }

    .shardwright-cm-row-remove {
        justify-self: end;
    }
}
`;
