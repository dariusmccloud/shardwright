export const VISIBILITY_CSS = `
.shardwright-fold-btn {
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 3px;
    color: var(--shardwright-text-muted);
    font-size: 0.75em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background-color var(--shardwright-transition), color var(--shardwright-transition);
    user-select: none;
    line-height: 1;
}

.shardwright-fold-btn:hover {
    background: var(--shardwright-highlight);
    color: var(--shardwright-text-primary);
}

.shardwright-archive-btn {
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 3px;
    color: var(--shardwright-text-muted);
    font-size: 0.8em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background-color var(--shardwright-transition), color var(--shardwright-transition);
    user-select: none;
    line-height: 1;
}

.shardwright-archive-btn:hover {
    background: var(--shardwright-highlight);
    color: var(--shardwright-text-primary);
}

.shardwright-archive-btn::before { content: '🗄'; }
.shardwright-archive-btn[data-archived='true']::before { content: '↩'; }

.mes.shardwright-archived-message {
    border-left: 2px solid var(--shardwright-border);
}

.mes.shardwright-archived-visible {
    opacity: 0.82;
}

.mes.shardwright-archived-hidden {
    display: none !important;
}

/* Arrow glyphs via CSS content — no Font Awesome dependency */
.mes.shardwright-collapsed .shardwright-fold-btn::before { content: '▶'; }
.mes.shardwright-expanded  .shardwright-fold-btn::before { content: '▼'; }

/* Hide text when collapsed */
.mes.shardwright-collapsed .mes_text { display: none; }
.shardwright-text-hidden { display: none !important; }

/* ==========================================================================
   SECTION 9: VISIBILITY MODAL
   ========================================================================== */

.shardwright-visibility-modal {
    max-height: 80vh;
    overflow-y: auto;
    padding: 15px;
}

.shardwright-visibility-modal h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: var(--shardwright-text-primary);
}

.shardwright-global-toggles {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--shardwright-border);
}

.shardwright-global-heading {
    margin-top: 0;
}

.shardwright-global-toggle-row {
    margin-bottom: 10px;
}

.shardwright-global-hint {
    margin: 5px 0 0 0;
    font-size: 12px;
    color: var(--shardwright-text-hint);
}

.shardwright-global-hint-indented {
    margin-left: 25px;
}

.shardwright-global-ignore-group {
    margin-top: 15px;
    margin-bottom: 10px;
}

.shardwright-global-ignore-label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: var(--shardwright-text-primary);
}

#shardwright-modal-global-ignore {
    width: 100%;
}

.shardwright-global-actions-row {
    margin-top: 15px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.shardwright-ranges-section {
    margin-top: 15px;
}

.shardwright-range-actions-row {
    margin-bottom: 10px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.shardwright-ranges-list {
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: 10px;
    padding: 5px;
}

.shardwright-range-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    margin-bottom: 10px;
    background: var(--shardwright-bg-secondary);
    border-radius: 5px;
    gap: 10px;
    flex-wrap: wrap;
}

.shardwright-range-info {
    flex: 1 1 150px;
    font-weight: bold;
    color: var(--shardwright-text-primary);
}

.shardwright-range-editable {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
}

.shardwright-range-label {
    font-size: 12px;
    color: var(--shardwright-text-primary);
}

.shardwright-range-input {
    width: 60px !important;
    min-width: 60px !important;
    padding: 4px 6px !important;
    font-size: 12px !important;
    text-align: center;
}

.shardwright-range-separator {
    font-weight: bold;
    color: var(--shardwright-text-primary);
}

.shardwright-range-controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
}

.shardwright-ignore-input-wrapper {
    margin-bottom: 8px;
    width: 100%;
}

.shardwright-ignore-label {
    font-size: 12px;
    display: block;
    margin-bottom: 3px;
}

.shardwright-ignore-input {
    width: 100%;
    font-size: 12px;
}

.shardwright-ranges-empty {
    text-align: center;
    color: var(--shardwright-text-muted);
    padding: 20px;
}

.shardwright-range-checkbox-label {
    margin: 0;
    font-size: 14px;
}

.shardwright-delete-btn {
    padding: 5px 10px;
    font-size: 14px;
}

.shardwright-add-range-row {
    margin-top: 15px;
}
`;
