export const DROPDOWNS_CSS = `
/* ==========================================================================
   SECTION 7: DROPDOWN COMPONENTS
   ========================================================================== */

.shardwright-character-dropdown-container,
.shardwright-chat-dropdown-container,
.shardwright-lorebook-dropdown-container,
[class*="shardwright-"][class*="-dropdown-container"] {
    position: relative;
    width: 100%;
    z-index: 1001;
    isolation: isolate;
}

.shardwright-block [class*="-dropdown-container"],
.shardwright-block [class*="-dropdown-options"] {
    z-index: 1001 !important;
    position: relative !important;
}

.shardwright-dropdown-trigger {
    background: var(--shardwright-bg-input) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    cursor: pointer;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    min-height: 38px;
    width: 100%;
    box-sizing: border-box;
}

.shardwright-dropdown-trigger:hover:not(.disabled) {
    border-color: var(--shardwright-border-focus) !important;
}

.shardwright-dropdown-trigger.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--shardwright-bg-tertiary) !important;
}

.shardwright-dropdown-selected-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}

.shardwright-dropdown-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1001;
`;
