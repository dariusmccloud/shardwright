export const SETTINGS_PANEL_CSS = `
/* ==========================================================================
   SECTION 2: MAIN SETTINGS PANEL
   ========================================================================== */

#shardwright-settings {
    margin-top: 10px;
}

#shardwright-settings .inline-drawer-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    max-height: 72vh;
    padding: 10px;
}

#shardwright-panel {
    background: var(--shardwright-bg-primary);
    color: var(--shardwright-text-primary);
    border: 1px solid var(--shardwright-border);
    padding: 10px;
    border-radius: 8px;
}

#shardwright-panel h3,
#shardwright-panel h4 {
    color: var(--shardwright-text-primary);
    margin: 0 0 10px 0;
}

#shardwright-panel p {
    color: var(--shardwright-text-secondary);
}

#shardwright-panel .shardwright-hint {
    color: var(--shardwright-text-muted);
    font-family: var(--shardwright-font-muted, inherit);
    font-size: var(--shardwright-font-size-muted, 12px);
    margin: 3px 0 0 0;
}

#shardwright-settings label,
#shardwright-settings .shardwright-block > label,
#shardwright-settings .shardwright-sharder-controls h4,
#shardwright-settings .checkbox_label span {
    color: var(--shardwright-text-primary) !important;
}

#shardwright-settings .shardwright-hint,
#shardwright-settings p.shardwright-hint {
    color: var(--shardwright-text-hint) !important;
    font-family: var(--shardwright-font-hint, inherit);
    font-size: var(--shardwright-font-size-hint, inherit);
}

#shardwright-settings select.text_pole,
#shardwright-settings select.text_pole option {
    color: var(--shardwright-text-secondary) !important;
}

#shardwright-active-prompt-display {
    color: var(--shardwright-text-secondary) !important;
    font-style: italic;
}

#shardwright-length-slider-section label {
    color: var(--shardwright-text-primary);
}

/* ==========================================================================
   SECTION 2A: SETTINGS PANEL LAYOUT REFACTOR
   ========================================================================== */

#shardwright-settings .shardwright-settings-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior-y: auto;
    display: flex;
    flex-direction: column;
    padding: 4px 2px 8px;
    scroll-padding-top: 4px;
    scroll-padding-bottom: 8px;
}

#shardwright-settings .shardwright-bg {
    background: var(--shardwright-bg-primary);
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

#shardwright-settings .shardwright-bg > * {
    flex-shrink: 0;
}

#shardwright-settings .shardwright-action-bar {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

#shardwright-settings .shardwright-action-bar-primary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
}

#shardwright-settings .shardwright-action-bar-secondary {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

#shardwright-settings .shardwright-action-bar .menu_button {
    width: 100%;
}

#shardwright-settings .shardwright-action-bar-secondary .menu_button {
    flex: 1;
    min-width: 120px;
}

#shardwright-settings .shardwright-settings-accordion {
    margin-bottom: 0;
    border-radius: 4px;
    background: var(--shardwright-bg-secondary);
}

#shardwright-settings .shardwright-settings-accordion .shardwright-accordion-header {
    min-height: 32px;
    padding: 8px 10px;
}

#shardwright-settings .shardwright-settings-accordion .shardwright-accordion-content {
    max-height: none;
    overflow: visible;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

#shardwright-settings .shardwright-settings-accordion.expanded .shardwright-accordion-content {
    max-height: clamp(180px, 38vh, 360px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior-y: auto;
}

#shardwright-settings .shardwright-settings-section {
    background: var(--shardwright-bg-secondary);
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 4px;
}

#shardwright-settings .shardwright-control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

#shardwright-settings .shardwright-control-group .shardwright-block {
    margin-bottom: 0;
}

#shardwright-settings .shardwright-inline-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
}

#shardwright-settings .shardwright-inline-row > label {
    flex-shrink: 0;
    white-space: nowrap;
    margin: 0;
}

#shardwright-settings .shardwright-inline-row > .shardwright-segmented-toggle,
#shardwright-settings .shardwright-inline-row > .shardwright-tag-input,
#shardwright-settings .shardwright-inline-row > .shardwright-range-pair,
#shardwright-settings .shardwright-inline-row > input,
#shardwright-settings .shardwright-inline-row > .text_pole,
#shardwright-settings .shardwright-inline-row > .shardwright-inline-with-unit {
    flex: 1;
    min-width: 0;
}

#shardwright-settings .shardwright-inline-with-unit {
    display: flex;
    align-items: center;
    gap: 6px;
}

#shardwright-settings .shardwright-inline-with-unit .text_pole {
    width: 72px;
}

#shardwright-settings .shardwright-toggle-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 10px;
    min-height: 32px;
}

#shardwright-settings .shardwright-toggle-row > label {
    min-width: 0;
    margin: 0;
}

#shardwright-settings .shardwright-toggle-row .shardwright-info-hint-btn {
    justify-self: end;
    pointer-events: auto;
    z-index: 1;
}

#shardwright-settings .shardwright-api-status-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

#shardwright-settings .shardwright-lorebook-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

#shardwright-settings .shardwright-lorebook-toggles {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

#shardwright-settings .shardwright-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}

#shardwright-settings .shardwright-debug-suggestions {
    border-top: 1px solid var(--shardwright-border);
    padding-top: 6px;
}

#shardwright-settings .shardwright-debug-suggestions > label {
    display: block;
    margin-bottom: 4px;
}

#shardwright-settings .shardwright-accordion-content code {
    font-family: var(--shardwright-font-muted, monospace);
    font-size: 0.95em;
}

/* Prompts List */
#shardwright-prompts-list {
    margin-bottom: 8px;
}

#shardwright-prompts-list select {
    width: 100%;
    margin-bottom: 5px;
}

#shardwright-prompts-list textarea {
    font-family: monospace;
    font-size: 11px;
    resize: vertical;
}

/* ==========================================================================
   SECTION 3: FORM CONTROLS
   ========================================================================== */

#shardwright-panel input[type="text"],
#shardwright-panel input[type="number"],
#shardwright-panel textarea,
#shardwright-panel select,
#shardwright-settings input[type="text"],
#shardwright-settings input[type="number"],
#shardwright-settings textarea,
#shardwright-settings select,
.shardwright-modal input[type="text"],
.shardwright-modal input[type="number"],
.shardwright-modal textarea,
.shardwright-modal select {
    background: var(--shardwright-bg-input);
    border: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-primary);
    border-radius: 4px;
    padding: 6px 10px;
    transition: border-color var(--shardwright-transition);
}

#shardwright-panel input:focus,
#shardwright-panel textarea:focus,
#shardwright-panel select:focus,
#shardwright-settings input:focus,
#shardwright-settings textarea:focus,
#shardwright-settings select:focus,
.shardwright-modal input:focus,
.shardwright-modal textarea:focus,
.shardwright-modal select:focus {
    border-color: var(--shardwright-border-focus);
    outline: none;
}

#shardwright-settings .checkbox_label,
#shardwright-panel .checkbox_label,
.shardwright-modal .checkbox_label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: var(--shardwright-text-primary);
}

#shardwright-settings .checkbox_label input[type="checkbox"],
#shardwright-panel .checkbox_label input[type="checkbox"],
.shardwright-modal .checkbox_label input[type="checkbox"] {
    accent-color: var(--shardwright-primary);
}

/* Horizontal Rules */
#shardwright-settings .sysHR,
#shardwright-panel .sysHR,
.shardwright-modal .sysHR {
    border: none;
    border-top: 1px solid var(--shardwright-border);
    margin: 15px 0;
}

/* ==========================================================================
   SECTION 4: BUTTONS
   ========================================================================== */

#shardwright-panel .menu_button,
.shardwright-modal .menu_button,
body:not(.shardwright-theme-default) #shardwright-settings .menu_button {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    color: var(--shardwright-text-primary);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    transition: all var(--shardwright-transition);
}

#shardwright-panel .menu_button:hover,
.shardwright-modal .menu_button:hover,
body:not(.shardwright-theme-default) #shardwright-settings .menu_button:hover {
    border-color: var(--shardwright-primary);
    color: var(--shardwright-primary);
    background: var(--shardwright-highlight);
}

#shardwright-panel .menu_button:active,
.shardwright-modal .menu_button:active,
body:not(.shardwright-theme-default) #shardwright-settings .menu_button:active {
    background: var(--shardwright-primary-active);
    color: white;
}

#shardwright-panel .menu_button:disabled,
.shardwright-modal .menu_button:disabled,
body:not(.shardwright-theme-default) #shardwright-settings .menu_button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@media (max-width: 680px) {
    #shardwright-settings .shardwright-action-bar-primary,
    #shardwright-settings .shardwright-buttons {
        grid-template-columns: 1fr;
    }

    #shardwright-settings .shardwright-settings-accordion.expanded .shardwright-accordion-content {
        max-height: none;
        overflow-y: visible;
    }
}
`;
