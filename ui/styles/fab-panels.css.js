export const FAB_PANELS_CSS = `
/* ======================================================================
   FAB PANEL - single edge-docked sliding panel with an internal tab row
   ====================================================================== */

:root {
    --shardwright-fab-panel-padding: 14px;
    --shardwright-fab-section-gap: 10px;
    --shardwright-fab-item-gap: 5px;
    --shardwright-fab-button-gap: 6px;
    --shardwright-fab-button-height: 32px;
}

@media (max-width: 768px) {
    :root {
        --shardwright-fab-panel-padding: 18px;
        --shardwright-fab-button-height: 42px;
    }
}

.shardwright-fab-panels {
    position: fixed !important;
    z-index: 2147483646 !important;
    display: flex;
    flex-direction: column;
    background: color-mix(in srgb, var(--shardwright-bg-primary) 95%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--shardwright-border);
    box-shadow: var(--shardwright-shadow-lg, 0 10px 28px rgba(0, 0, 0, 0.35));
    color: var(--shardwright-text-primary);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease, clip-path 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: min(560px, calc(100vh - 16px));
}

.shardwright-fab-panels.is-open {
    opacity: 1;
    pointer-events: auto;
}

/* Horizontal anchor is fixed per edge; vertical "top" is set inline by JS
   so the panel stays in-line with wherever the handle is actually docked. */
.shardwright-fab-panels[data-edge="right"] {
    right: 0;
    border-radius: 12px 0 0 12px;
    width: min(300px, calc(100vw - 16px));
    clip-path: inset(0 0 0 100%);
}
.shardwright-fab-panels[data-edge="right"].is-open {
    clip-path: inset(0 0 0 0%);
}

.shardwright-fab-panels[data-edge="left"] {
    left: 0;
    border-radius: 0 12px 12px 0;
    width: min(300px, calc(100vw - 16px));
    clip-path: inset(0 100% 0 0);
}
.shardwright-fab-panels[data-edge="left"].is-open {
    clip-path: inset(0 0% 0 0);
}

.shardwright-fab-tab-row {
    display: flex;
    border-bottom: 1px solid var(--shardwright-border);
    flex-shrink: 0;
}

.shardwright-fab-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 4px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--shardwright-text-secondary);
    cursor: pointer;
    font-size: 10px;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.shardwright-fab-tab i {
    font-size: 13px;
}

.shardwright-fab-tab:hover,
.shardwright-fab-tab:focus-visible {
    background: color-mix(in srgb, var(--shardwright-bg-secondary) 60%, transparent);
    color: var(--shardwright-text-primary);
}

.shardwright-fab-tab:focus-visible {
    outline: none;
}

.shardwright-fab-tab.is-active {
    color: var(--shardwright-primary);
    border-bottom-color: var(--shardwright-primary);
}

.shardwright-fab-panel-scroll {
    position: relative;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.shardwright-fab-panel-body-wrap {
    display: none;
}

.shardwright-fab-panel-body-wrap.is-active {
    display: block;
}

.shardwright-fab-panel-body {
    border-radius: 12px;
    overflow: hidden;
}

.shardwright-fab-panel-content {
    padding: var(--shardwright-fab-panel-padding);
    display: flex;
    flex-direction: column;
    gap: var(--shardwright-fab-section-gap);
}

.shardwright-fab-section {
    display: flex;
    flex-direction: column;
    gap: var(--shardwright-fab-item-gap);
}

.shardwright-fab-section-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--shardwright-text-secondary);
    margin-bottom: 2px;
}

.shardwright-fab-section-items {
    display: flex;
    flex-direction: column;
    gap: var(--shardwright-fab-item-gap);
}

.shardwright-fab-section-items-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--shardwright-fab-item-gap);
}

.shardwright-fab-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 7px;
    background: color-mix(in srgb, var(--shardwright-bg-secondary) 50%, transparent);
    border-radius: 4px;
    font-size: 12px;
}

.shardwright-fab-info-label {
    color: var(--shardwright-text-secondary);
    font-weight: 500;
}

.shardwright-fab-info-value {
    color: var(--shardwright-text-primary);
    font-weight: 600;
}

.shardwright-fab-info-value-small {
    font-size: 12px;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.shardwright-fab-action {
    height: var(--shardwright-fab-button-height);
    display: flex;
    align-items: center;
    gap: var(--shardwright-fab-button-gap);
    padding: 0 9px;
    width: 100%;
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-primary);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease !important;
    overflow: visible !important;
    text-align: left;
    font-size: 11px;
}

.shardwright-fab-action:hover {
    background: color-mix(in srgb, var(--shardwright-primary) 12%, var(--shardwright-bg-secondary));
    border-color: var(--shardwright-primary);
}

.shardwright-fab-action i {
    font-size: 13px;
    color: var(--shardwright-primary);
    flex-shrink: 0;
}

.shardwright-fab-action span {
    font-weight: 500;
}

.shardwright-fab-section-items-grid .shardwright-fab-action {
    min-width: 0;
    padding: 0 8px;
}

.shardwright-fab-section-items-grid .shardwright-fab-action span {
    white-space: nowrap;
}

.shardwright-fab-action-busy {
    opacity: 0.65;
    pointer-events: none;
}

.shardwright-fab-action-stop {
    color: var(--shardwright-error);
    border-color: color-mix(in srgb, var(--shardwright-error) 45%, transparent);
    animation: shardwright-stop-pulse 1.1s ease-in-out infinite;
}

.shardwright-fab-action-stop i {
    color: var(--shardwright-error);
}

@keyframes shardwright-stop-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.35); }
    50% { box-shadow: 0 0 0 6px rgba(244, 67, 54, 0); }
}

.shardwright-fab-muted {
    color: var(--shardwright-text-secondary);
    font-size: 12px;
}

@media (max-width: 768px) {
    .shardwright-fab-panels[data-edge="right"],
    .shardwright-fab-panels[data-edge="left"] {
        width: min(300px, calc(100vw - 16px));
    }

    .shardwright-fab-action {
        touch-action: manipulation;
    }
}
`;
