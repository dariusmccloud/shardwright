export const SCROLLBARS_CSS = `
/* ==========================================================================
   SECTION 29: SCROLLBARS
   ========================================================================== */

.shardwright-modal ::-webkit-scrollbar,
#shardwright-panel ::-webkit-scrollbar,
[class*="shardwright-"][class*="-modal"] ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.shardwright-modal ::-webkit-scrollbar-track,
#shardwright-panel ::-webkit-scrollbar-track,
[class*="shardwright-"][class*="-modal"] ::-webkit-scrollbar-track {
    background: var(--shardwright-bg-tertiary);
    border-radius: 4px;
}

.shardwright-modal ::-webkit-scrollbar-thumb,
#shardwright-panel ::-webkit-scrollbar-thumb,
[class*="shardwright-"][class*="-modal"] ::-webkit-scrollbar-thumb {
    background: var(--shardwright-border);
    border-radius: 4px;
}

.shardwright-modal ::-webkit-scrollbar-thumb:hover,
#shardwright-panel ::-webkit-scrollbar-thumb:hover,
[class*="shardwright-"][class*="-modal"] ::-webkit-scrollbar-thumb:hover {
    background: var(--shardwright-primary);
}
`;
