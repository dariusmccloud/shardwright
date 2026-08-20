export const SHARDER_CSS = `

/* ==========================================================================
   SECTION 16: CONSOLIDATION MODAL
   ========================================================================== */

.shardwright-consolidation-modal {
    padding: 15px;
}

.shardwright-consolidation-header h3 {
    margin-top: 0;
    margin-bottom: 5px;
    color: var(--shardwright-text-primary);
}

.shardwright-consolidation-header p {
    color: var(--shardwright-text-secondary);
    font-size: 13px;
    margin: 0 0 10px 0;
}

#shardwright-consolidation-count {
    font-weight: bold;
    color: var(--shardwright-quote);
    margin-bottom: 15px;
}

.shardwright-consolidation-controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
}

.shardwright-consolidation-lorebook-section {
    margin-bottom: 15px;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
    border-radius: 5px;
    border: 1px solid var(--shardwright-border);
}

.shardwright-consolidation-lorebook-section .checkbox_label {
    margin-bottom: 5px;
}

/* Extraction List */
.shardwright-extraction-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    padding: 10px;
    background: var(--shardwright-bg-secondary);
}

.shardwright-extraction-item {
    padding: 12px;
    margin-bottom: 10px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    border-left: 3px solid var(--shardwright-text-muted);
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
}

.shardwright-extraction-item:last-child {
    margin-bottom: 0;
}

.shardwright-extraction-item:hover {
    background: var(--shardwright-bg-secondary);
}

.shardwright-extraction-item.selected {
    border-left-color: var(--shardwright-success);
}

.shardwright-extraction-item-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.shardwright-extraction-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
}

.shardwright-extraction-source {
    font-size: 11px;
    padding: 2px 6px;
    background: var(--shardwright-quote);
    border-radius: 3px;
    color: var(--shardwright-text-primary);
}

.shardwright-extraction-type-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.shardwright-extraction-type-badge.extraction {
    background: var(--shardwright-info);
    color: white;
}

.shardwright-extraction-type-badge.consolidated {
    background: var(--shardwright-consolidation);
    color: white;
}

.shardwright-extraction-item.is-consolidation {
    border-left-color: var(--shardwright-consolidation);
}

.shardwright-extraction-item.is-consolidation.selected {
    border-left-color: var(--shardwright-rescue-bg-hover);
}

.shardwright-extraction-identifier {
    font-weight: bold;
    color: var(--shardwright-text-primary);
    flex: 1;
}

.shardwright-extraction-preview {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
    line-height: 1.4;
    padding-left: 28px;
}

.shardwright-group-toggle-icon {
    font-size: 12px;
    transition: transform 0.2s;
    min-width: 16px;
}

.shardwright-group-toggle-icon.collapsed {
    transform: rotate(-90deg);
}

.shardwright-group-checkbox {
    margin: 0;
    cursor: pointer;
}

.shardwright-group-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.shardwright-group-consolidation-name {
    font-weight: bold;
    color: var(--shardwright-consolidation);
    font-size: 13px;
}

.shardwright-group-item-count {
    font-size: 11px;
    opacity: 0.7;
}

.shardwright-group-status-badge {
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
}

.shardwright-group-status-badge.exists {
    background: #27ae60;
    color: white;
}

.shardwright-group-status-badge.missing {
    background: var(--shardwright-error);
    color: white;
}

.shardwright-extraction-item.grouped {
    margin-left: 15px;
    border-left: 3px solid var(--shardwright-consolidation);
    background: rgba(156, 39, 176, 0.03);
}

.shardwright-group-member-badge {
    display: inline-block;
    background: rgba(156, 39, 176, 0.2);
    color: var(--shardwright-consolidation);
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 2px;
    margin-left: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.shardwright-group-ungroup-btn {
    margin-left: auto;
    padding: 2px 8px;
    font-size: 10px;
    background: rgba(156, 39, 176, 0.1);
    color: var(--shardwright-consolidation);
    border: 1px solid rgba(156, 39, 176, 0.3);
    border-radius: 3px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: background 0.2s, border-color 0.2s;
}

.shardwright-group-ungroup-btn:hover {
    background: rgba(156, 39, 176, 0.2);
    border-color: rgba(156, 39, 176, 0.5);
}

`;

