export const API_STATUS_CSS = `
/* ==========================================================================
   SECTION 27: API STATUS DISPLAY
   ========================================================================== */

.shardwright-api-feature-status {
    padding: 8px 12px;
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
}

.shardwright-api-feature-status strong {
    color: var(--shardwright-text-primary);
}

.shardwright-api-feature-status span {
    color: var(--shardwright-primary);
}

/* ==========================================================================
   SECTION 28: INLINE DRAWER
   ========================================================================== */

.shardwright-inline-drawer {
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    margin: 10px 0;
    overflow: hidden;
}

.shardwright-inline-drawer-toggle {
    background: var(--shardwright-bg-secondary);
    padding: 10px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background var(--shardwright-transition);
}

.shardwright-inline-drawer-toggle:hover {
    background: var(--shardwright-highlight);
}

.shardwright-inline-drawer-toggle b {
    color: var(--shardwright-text-primary);
}

.shardwright-inline-drawer-content {
    background: var(--shardwright-bg-tertiary);
    padding: 15px;
    border-top: 1px solid var(--shardwright-border);
}
`;
