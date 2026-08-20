export const CHAT_MANAGER_CSS = `
/* ==========================================================================
   SECTION 11: CHAT MANAGER MODAL
   ========================================================================== */

.shardwright-chat-manager-modal {
    padding: 15px;
    min-width: 400px;
    max-width: 100%;
    box-sizing: border-box;
}

.shardwright-chat-manager-selectors {
    margin-bottom: 20px;
}

.shardwright-selector-row {
    margin-bottom: 15px;
}

.shardwright-selector-row > label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: var(--shardwright-text-primary);
}

.shardwright-cm-target-chat-label {
    margin-top: 10px;
}

.shardwright-chat-manager-actions {
    border-top: 1px solid var(--shardwright-border);
    padding-top: 15px;
}

.shardwright-chat-manager-actions h4 {
    margin: 0 0 10px 0;
    color: var(--shardwright-text-primary);
}

.shardwright-action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.shardwright-action-buttons .menu_button {
    flex: 1;
    min-width: 100px;
}

.shardwright-action-buttons .menu_button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
`;
