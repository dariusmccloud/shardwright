export const COMPONENTS_CSS = `
/* ==========================================================================
   SECTION 8: SHARED UI COMPONENTS
   ========================================================================== */

.shardwright-segmented-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border-radius: 4px;
    overflow: hidden;
    background: var(--shardwright-bg-secondary);
}

.shardwright-segmented-toggle button {
    appearance: none;
    background: var(--shardwright-bg-secondary);
    background-color: var(--shardwright-bg-secondary);
    background-image: none;
    border: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-secondary);
    padding: 6px 12px;
    margin: 0 0 0 -1px;
    min-height: 32px;
    cursor: pointer;
    transition: background var(--shardwright-transition), color var(--shardwright-transition), border-color var(--shardwright-transition);
    line-height: 1.2;
    font: inherit;
    text-transform: none;
    text-decoration: none;
    vertical-align: middle;
    box-shadow: none;
}

.shardwright-segmented-toggle button:first-child {
    margin-left: 0;
}

.shardwright-segmented-toggle button:hover {
    border-color: var(--shardwright-primary);
    color: var(--shardwright-primary);
    background: var(--shardwright-highlight);
}

.shardwright-segmented-toggle button.active {
    background: var(--shardwright-highlight);
    background-color: var(--shardwright-highlight);
    color: var(--shardwright-primary);
    font-weight: 600;
    position: relative;
    z-index: 1;
}

.shardwright-segmented-toggle button:disabled {
    opacity: 0.6;
    color: var(--shardwright-text-muted);
    cursor: not-allowed;
}

[class*="shardwright-"][class*="-modal"] .shardwright-segmented-toggle button,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-segmented-toggle button {
    appearance: none !important;
    padding: 6px 12px !important;
    margin: 0 0 0 -1px !important;
    min-height: 32px !important;
    background: var(--shardwright-bg-secondary) !important;
    background-color: var(--shardwright-bg-secondary) !important;
    background-image: none !important;
    color: var(--shardwright-text-secondary) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-color: var(--shardwright-border) !important;
    font: inherit !important;
    line-height: 1.2 !important;
    text-transform: none !important;
    text-decoration: none !important;
    outline: none !important;
    box-shadow: none !important;
}

[class*="shardwright-"][class*="-modal"] .shardwright-segmented-toggle button:first-child,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-segmented-toggle button:first-child {
    margin-left: 0 !important;
}

[class*="shardwright-"][class*="-modal"] .shardwright-segmented-toggle button:hover:not(:disabled),
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-segmented-toggle button:hover:not(:disabled) {
    background: var(--shardwright-highlight) !important;
    color: var(--shardwright-primary) !important;
}

[class*="shardwright-"][class*="-modal"] .shardwright-segmented-toggle button.active,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-segmented-toggle button.active {
    background: var(--shardwright-highlight) !important;
    background-color: var(--shardwright-highlight) !important;
    color: var(--shardwright-primary) !important;
    font-weight: 600 !important;
    position: relative !important;
    z-index: 1 !important;
}

.shardwright-segmented-toggle button:focus-visible {
    outline: 1px solid var(--shardwright-border-focus);
    outline-offset: -1px;
}

.shardwright-tag-input {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    width: 100%;
    min-height: 32px;
    box-sizing: border-box;
    padding: 4px;
    border: 1px solid var(--shardwright-border);
    border-radius: 4px;
    background: var(--shardwright-bg-input);
    cursor: text;
}

.shardwright-tag-input:focus-within {
    border-color: var(--shardwright-border-focus);
    box-shadow: 0 0 0 1px var(--shardwright-focus-glow);
}

.shardwright-tag-container {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
}

.shardwright-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    padding: 2px 8px;
    border-radius: 3px;
    background:
        linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08)),
        var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-secondary);
    font-size: 12px;
    line-height: 1.2;
    text-shadow: none;
}

.shardwright-tag-remove {
    appearance: none;
    -webkit-appearance: none;
    border: none;
    background: transparent;
    background-image: none;
    box-shadow: none;
    filter: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    min-width: 14px;
    margin: 0;
    font-size: 12px;
    line-height: 1;
    padding: 0;
    font-family: inherit;
    text-shadow: none;
    text-transform: none;
    text-decoration: none;
}

.shardwright-tag-remove:hover {
    opacity: 1;
}

.shardwright-tag-input .shardwright-tag-input-field,
.shardwright-tag-input input {
    appearance: none;
    -webkit-appearance: none;
    border: none;
    outline: none;
    background: transparent;
    background-image: none;
    box-shadow: none;
    filter: none;
    color: var(--shardwright-text-primary);
    flex: 1;
    min-width: 60px;
    min-height: 24px;
    margin: 0;
    padding: 0 2px;
}

.shardwright-tag-input .shardwright-tag-input-field::placeholder,
.shardwright-tag-input input::placeholder {
    color: var(--shardwright-text-muted);
}

.shardwright-range-pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    column-gap: 8px;
    width: 100%;
}

.shardwright-range-slider {
    width: 100%;
    min-width: 0;
    color: var(--shardwright-border);
}

.shardwright-range-number {
    width: 6ch;
    min-width: 6ch;
    text-align: right;
}

.shardwright-range-unit {
    color: var(--shardwright-text-secondary);
    white-space: nowrap;
}

.shardwright-disabled-section {
    opacity: 0.5;
    pointer-events: none;
}

.shardwright-info-hint-btn {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    min-width: 18px;
    min-height: 18px;
    padding: 0;
    margin-left: 4px;
    border-radius: 50%;
    border: none !important;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: var(--shardwright-text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    box-shadow: none !important;
    filter: none !important;
    text-shadow: none !important;
    transition: color var(--shardwright-transition);
}

.shardwright-info-hint-btn i {
    font-size: 11px;
}

.shardwright-info-hint-btn:hover {
    color: var(--shardwright-primary);
    background: transparent !important;
}

.shardwright-info-hint-btn:focus-visible {
    outline: 1px solid var(--shardwright-border-focus);
    outline-offset: 2px;
}

.shardwright-info-hint-popover {
    position: absolute;
    display: inline-block;
    width: 320px !important;
    max-width: calc(100vw - 32px) !important;
    box-sizing: border-box;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid var(--shardwright-border) !important;
    background: var(--shardwright-bg-primary, rgba(0, 0, 0, 0.85)) !important;
    background-color: var(--shardwright-bg-primary, rgba(0, 0, 0, 0.85)) !important;
    color: var(--shardwright-text-primary);
    font-size: 12px;
    line-height: 1.4;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    z-index: 2147483647;
    box-shadow: var(--shardwright-shadow);
}

.popup .shardwright-info-hint-popover,
.shardwright-modal .shardwright-info-hint-popover {
    width: 320px !important;
    max-width: calc(100vw - 32px) !important;
}
`;
