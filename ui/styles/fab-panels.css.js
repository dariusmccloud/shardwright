export const FAB_PANELS_CSS = `
/* ======================================================================
   FAB PANELS - Crystal wheel + popovers
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
    inset: 0 !important;
    z-index: 2147483646 !important;
    pointer-events: none;
    --shardwright-fab-wheel-width: 54px;
    --shardwright-fab-wheel-height: 65px;
    --shardwright-fab-radius: 28px;
    --shardwright-fab-arc-offset: 5px;
    /* Concave path radius is calculated from an offset FAB circle (FAB radius + 5px). */
    --shardwright-fab-cut-radius-base: calc(var(--shardwright-fab-radius) + var(--shardwright-fab-arc-offset));
    /* Keep the same concave depth while changing radius by shifting circle center left. */
    --shardwright-fab-cut-center-x-base: calc(15px - var(--shardwright-fab-cut-radius-base));
    --shardwright-fab-cut-radius: var(--shardwright-fab-cut-radius-base);
    --shardwright-fab-cut-center-x: var(--shardwright-fab-cut-center-x-base);
    --shardwright-fab-wheel-corner-radius: 12px;
    --shardwright-fab-wheel-border-width: 1px;
    --shardwright-fab-wheel-icon-offset-x: 6px;
}

.shardwright-fab-wheel-btn {
    position: fixed !important;
    width: var(--shardwright-fab-wheel-width);
    height: var(--shardwright-fab-wheel-height);
    border: none;
    background: transparent;
    display: grid;
    place-items: center;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    box-sizing: border-box !important;
    transform: translate(-50%, -50%) rotate(var(--shardwright-wheel-rotation, 0deg)) scale(0) !important;
    opacity: 0;
    pointer-events: none;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.2, 0.88, 0.25, 1), opacity 0.2s ease !important;
    transition-delay: calc(var(--shardwright-wheel-index, 0) * 60ms);
    isolation: isolate;
}

.shardwright-fab-wheel-btn::before,
.shardwright-fab-wheel-btn::after {
    content: '';
    position: absolute;
    border-radius: var(--shardwright-fab-wheel-corner-radius);
    pointer-events: none;
    -webkit-mask:
        linear-gradient(#000 0 0),
        radial-gradient(circle var(--shardwright-fab-cut-radius) at var(--shardwright-fab-cut-center-x) 50%, transparent 98%, #000 102%);
    -webkit-mask-composite: source-in;
    mask:
        linear-gradient(#000 0 0),
        radial-gradient(circle var(--shardwright-fab-cut-radius) at var(--shardwright-fab-cut-center-x) 50%, transparent 98%, #000 102%);
    mask-composite: intersect;
}

.shardwright-fab-wheel-btn::before {
    inset: 0;
    background: color-mix(in srgb, var(--shardwright-primary) 70%, black) !important;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.34);
    transition: box-shadow 0.15s ease, background 0.15s ease;
}

.shardwright-fab-wheel-btn::after {
    inset: var(--shardwright-fab-wheel-border-width);
    background: color-mix(in srgb, var(--shardwright-bg-primary) 92%, transparent) !important;
    --shardwright-fab-cut-radius: calc(var(--shardwright-fab-cut-radius-base) - var(--shardwright-fab-wheel-border-width));
    --shardwright-fab-cut-center-x: calc(var(--shardwright-fab-cut-center-x-base) + var(--shardwright-fab-wheel-border-width));
    transition: background 0.15s ease;
}

.shardwright-fab-wheel-icon {
    font-size: 16px;
    color: var(--shardwright-text-primary) !important;
    z-index: 1;
    line-height: 1;
    pointer-events: none;
    transform: translateX(var(--shardwright-fab-wheel-icon-offset-x)) rotate(var(--shardwright-wheel-icon-rotation, 0deg));
    transform-origin: center;
}

.shardwright-fab-panels.shardwright-fab-wheel-visible .shardwright-fab-wheel-btn {
    transform: translate(-50%, -50%) rotate(var(--shardwright-wheel-rotation, 0deg)) scale(1) !important;
    opacity: 1;
    pointer-events: auto;
}

.shardwright-fab-panels.shardwright-fab-wheel-hidden .shardwright-fab-wheel-btn {
    transform: translate(-50%, -50%) rotate(var(--shardwright-wheel-rotation, 0deg)) scale(0) !important;
    opacity: 0;
    pointer-events: none;
    transition-duration: 0.2s;
    transition-delay: 0ms;
}

.shardwright-fab-wheel-btn:hover::before,
.shardwright-fab-wheel-btn:focus-visible::before {
    background: color-mix(in srgb, var(--shardwright-primary) 82%, white 8%) !important;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
}

.shardwright-fab-wheel-btn:hover::after,
.shardwright-fab-wheel-btn:focus-visible::after {
    background: color-mix(in srgb, var(--shardwright-bg-secondary) 88%, transparent) !important;
}

.shardwright-fab-wheel-btn.is-active::before {
    background: color-mix(in srgb, var(--shardwright-primary) 90%, white 8%) !important;
    box-shadow: 0 7px 16px rgba(0, 0, 0, 0.45);
}

.shardwright-fab-wheel-btn.is-active::after {
    background: color-mix(in srgb, var(--shardwright-primary) 18%, var(--shardwright-bg-primary)) !important;
}

.shardwright-fab-wheel-btn:focus-visible {
    outline: none;
}

.shardwright-fab-panel {
    position: fixed;
    min-width: 208px;
    max-width: min(272px, calc(100vw - 16px));
    background: color-mix(in srgb, var(--shardwright-bg-primary) 95%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--shardwright-border);
    border-radius: 12px;
    box-shadow: var(--shardwright-shadow-lg, 0 10px 28px rgba(0, 0, 0, 0.35));
    color: var(--shardwright-text-primary);
    overflow: visible;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.96);
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.shardwright-fab-panel::before {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    background: inherit;
    border-left: 1px solid var(--shardwright-border);
    border-top: 1px solid var(--shardwright-border);
    transform: rotate(45deg);
}

.shardwright-fab-panel[data-arrow='left']::before {
    left: -6px;
    top: calc(var(--shardwright-fab-arrow-offset, 24px) - 5px);
}

.shardwright-fab-panel[data-arrow='right']::before {
    right: -6px;
    top: calc(var(--shardwright-fab-arrow-offset, 24px) - 5px);
    transform: rotate(225deg);
}

.shardwright-fab-panel[data-arrow='top']::before {
    top: -6px;
    left: calc(var(--shardwright-fab-arrow-offset, 24px) - 5px);
    transform: rotate(45deg);
}

.shardwright-fab-panel[data-arrow='bottom']::before {
    bottom: -6px;
    left: calc(var(--shardwright-fab-arrow-offset, 24px) - 5px);
    transform: rotate(225deg);
}

.shardwright-fab-panel.is-active {
    opacity: 1;
    pointer-events: auto;
    transform: scale(1);
}

/* Bottom sheet mode for mobile */
.shardwright-fab-panel-sheet {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    width: auto !important;
    max-width: none !important;
    max-height: 70vh;
    border-radius: 16px 16px 0 0 !important;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
    transform: translateY(0) !important;
    animation: shardwright-fab-sheet-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.shardwright-fab-panel-sheet[data-arrow]::before {
    display: none !important;
}

/* Drag handle for sheet */
.shardwright-fab-panel-sheet::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 4px;
    background: var(--shardwright-text-secondary, rgba(0, 0, 0, 0.3));
    border-radius: 2px;
    opacity: 0.5;
}

/* Scrollable sheet body */
.shardwright-fab-panel-sheet .shardwright-fab-panel-body {
    overflow-y: auto;
    max-height: calc(70vh - 36px);
    -webkit-overflow-scrolling: touch;
}

/* Backdrop when sheet is active */
.shardwright-fab-sheet-active {
    z-index: 2147483646 !important;
    pointer-events: auto !important;
    background: rgba(0, 0, 0, 0.4);
    animation: shardwright-fab-backdrop-fade-in 0.3s ease-out;
}

@keyframes shardwright-fab-sheet-slide-up {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

@keyframes shardwright-fab-backdrop-fade-in {
    from {
        background: rgba(0, 0, 0, 0);
    }
    to {
        background: rgba(0, 0, 0, 0.4);
    }
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

@media (min-width: 769px) {
    .shardwright-fab-panel-actions,
    .shardwright-fab-panel-advanced {
        min-width: 296px;
        max-width: min(312px, calc(100vw - 16px));
    }

    .shardwright-fab-panel-actions .shardwright-fab-section-items-grid,
    .shardwright-fab-panel-advanced .shardwright-fab-section-items-grid {
        grid-template-columns: repeat(2, minmax(130px, 1fr));
    }
}

@media (max-width: 768px) {
    .shardwright-fab-panels {
        --shardwright-fab-wheel-width: calc(58px * var(--shardwright-fab-mobile-scale, 1));
        --shardwright-fab-wheel-height: calc(70px * var(--shardwright-fab-mobile-scale, 1));
        --shardwright-fab-radius: calc(28px * var(--shardwright-fab-mobile-scale, 1));
        --shardwright-fab-arc-offset: calc(5px * var(--shardwright-fab-mobile-scale, 1));
        --shardwright-fab-wheel-corner-radius: calc(12px * var(--shardwright-fab-mobile-scale, 1));
        --shardwright-fab-wheel-icon-offset-x: calc(6px * var(--shardwright-fab-mobile-scale, 1));
    }

    .shardwright-fab-wheel-icon {
        font-size: calc(18px * var(--shardwright-fab-mobile-scale, 1));
        transform: translateX(calc(7px * var(--shardwright-fab-mobile-scale, 1))) rotate(var(--shardwright-wheel-icon-rotation, 0deg));
    }

    /* Only apply to non-sheet panels */
    .shardwright-fab-panel:not(.shardwright-fab-panel-sheet) {
        max-width: calc(100vw - 16px);
        left: 8px !important;
        right: 8px !important;
        width: auto;
    }

    .shardwright-fab-action {
        touch-action: manipulation;
    }
}

@media (max-width: 414px) {
    .shardwright-fab-panel:not(.shardwright-fab-panel-sheet) {
        left: 8px !important;
        right: 8px !important;
        width: auto;
        max-width: none;
    }
}
`;
