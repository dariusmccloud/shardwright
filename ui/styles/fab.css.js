export const FAB_CSS = `
/* ======================================================================
   FAB TRIGGER - Docked, draggable "Shardwright" tab
   Pattern adapted from SillyBunny's Companion handle (.ica--tpanel-handle).
   ====================================================================== */
.shardwright-fab {
    position: fixed !important;
    z-index: 2147483647 !important;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 7px;
    margin: 0;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 55%, var(--shardwright-border));
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, transparent);
    color: var(--shardwright-text-primary);
    font: inherit;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    box-shadow: var(--shardwright-shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.3));
    transition: background var(--shardwright-transition, 0.16s ease), border-color 0.16s ease, box-shadow 0.16s ease;
}

.shardwright-fab:not(.shardwright-fab-positioned) {
    top: 50% !important;
    right: 0 !important;
    left: auto !important;
    transform: translateY(-50%);
}

.shardwright-fab:hover {
    background: color-mix(in srgb, var(--shardwright-bg-secondary) 88%, transparent);
}

.shardwright-fab:active,
.shardwright-fab-dragging {
    cursor: grabbing;
}

.shardwright-fab.shardwright-fab-open {
    border-color: color-mix(in srgb, var(--shardwright-primary) 84%, white 6%);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.42);
}

.shardwright-fab-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
}

.shardwright-fab[data-edge="right"],
.shardwright-fab[data-edge="left"] {
    flex-direction: column;
}

.shardwright-fab[data-edge="right"] .shardwright-fab-label,
.shardwright-fab[data-edge="left"] .shardwright-fab-label {
    writing-mode: vertical-rl;
    text-orientation: mixed;
}

.shardwright-fab[data-edge="right"] {
    border-right: none;
    border-radius: 10px 0 0 10px;
    padding-right: calc(7px + env(safe-area-inset-right, 0px));
}

.shardwright-fab[data-edge="left"] {
    border-left: none;
    border-radius: 0 10px 10px 0;
    padding-left: calc(7px + env(safe-area-inset-left, 0px));
}

/* ======================================================================
   GENERATING STATE
   ====================================================================== */
.shardwright-fab-generating {
    animation: shardwright-fab-generating-pulse 1.6s ease-in-out infinite;
}

@keyframes shardwright-fab-generating-pulse {
    0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--shardwright-primary) 45%, transparent); }
    50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--shardwright-primary) 0%, transparent); }
}

@media (max-width: 768px) {
    .shardwright-fab {
        padding: 8px 6px;
    }

    .shardwright-fab-label {
        font-size: 10px;
    }
}
`;
