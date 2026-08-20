export const MODAL_BASE_CSS = `
/* Primary Action Buttons */
.shardwright-primary-btn {
    background: var(--shardwright-primary) !important;
    border-color: var(--shardwright-primary) !important;
    color: white !important;
}

.shardwright-primary-btn:hover {
    background: var(--shardwright-primary-hover) !important;
    border-color: var(--shardwright-primary-hover) !important;
}

/* Main UI Buttons
   Default theme: inherit SillyTavern's native '.menu_button' styling.
   Non-default themes: apply Shardwright themed button colors.
*/
body:not(.shardwright-theme-default) #shardwright-run-summarize,
body:not(.shardwright-theme-default) #shardwright-stop-summarize,
body:not(.shardwright-theme-default) #shardwright-visibility-button,
body:not(.shardwright-theme-default) #shardwright-manage-chats-btn,
body:not(.shardwright-theme-default) #shardwright-open-themes-btn,
body:not(.shardwright-theme-default) #shardwright-open-rag-btn,
body:not(.shardwright-theme-default) #shardwright-open-prompts-btn,
body:not(.shardwright-theme-default) #shardwright-open-api-config-modal,
body:not(.shardwright-theme-default) #shardwright-open-cleanup-btn,
body:not(.shardwright-theme-default) #shardwright-lorebook-options-btn,
body:not(.shardwright-theme-default) [id^="shardwright-"][class*="menu_button"] {
    background: var(--shardwright-bg-secondary) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
}

body:not(.shardwright-theme-default) #shardwright-run-summarize:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-stop-summarize:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-visibility-button:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-manage-chats-btn:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-open-themes-btn:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-open-rag-btn:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-open-prompts-btn:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-open-api-config-modal:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-open-cleanup-btn:hover:not(:disabled),
body:not(.shardwright-theme-default) #shardwright-lorebook-options-btn:hover:not(:disabled),
body:not(.shardwright-theme-default) [id^="shardwright-"][class*="menu_button"]:hover:not(:disabled) {
    background: var(--shardwright-highlight) !important;
    border-color: var(--shardwright-primary) !important;
    color: var(--shardwright-primary) !important;
}

/* Stop Button */
body:not(.shardwright-theme-default) #shardwright-stop-summarize {
    background-color: var(--shardwright-stop-bg) !important;
    border-color: var(--shardwright-stop-bg) !important;
    color: white !important;
}

body:not(.shardwright-theme-default) #shardwright-stop-summarize:hover {
    background-color: var(--shardwright-stop-hover) !important;
}

/* Rescue Button */
.shardwright-rescue-btn {
    font-size: 11px !important;
    padding: 4px 10px !important;
    background: var(--shardwright-rescue-bg) !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
}

.shardwright-rescue-btn:hover {
    background: var(--shardwright-rescue-bg-hover) !important;
}

.shardwright-rescue-btn.rescued {
    background: var(--shardwright-success) !important;
}

.shardwright-rescue-btn.rescued:hover {
    background: #27ae60 !important;
}

/* ==========================================================================
   SECTION 5: MODAL BASE STYLES
   ========================================================================== */

.shardwright-modal {
    background: var(--shardwright-bg-primary);
    color: var(--shardwright-text-primary);
    border: 1px solid var(--shardwright-border);
    border-radius: 12px;
    box-shadow: var(--shardwright-shadow-lg);
    padding: 20px;
}

.shardwright-modal h3 {
    color: var(--shardwright-text-primary);
    margin: 0 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--shardwright-border);
}

.shardwright-modal h4 {
    color: var(--shardwright-text-primary);
    margin: 15px 0 10px 0;
}

.shardwright-modal p {
    line-height: 1.5;
}

.shardwright-modal hr {
    border: none;
    border-top: 1px solid var(--shardwright-border);
    margin: 15px 0;
}

/* Universal Modal Theming - Target popup wrapper */
.popup:has([class*="shardwright-"][class*="-modal"]) {
    --customThemeColor: var(--shardwright-primary) !important;
    --customThemeColor1: var(--shardwright-primary) !important;
    --customThemeColor2: var(--shardwright-primary-hover) !important;
    background: var(--shardwright-bg-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-radius: 12px !important;
    box-shadow: var(--shardwright-shadow-lg) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup {
    --customThemeColor: var(--shardwright-primary) !important;
    --customThemeColor1: var(--shardwright-primary) !important;
    --customThemeColor2: var(--shardwright-primary-hover) !important;
    background: var(--shardwright-bg-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-radius: 12px !important;
    box-shadow: var(--shardwright-shadow-lg) !important;
}

.popup-overlay:has(+ .popup [class*="shardwright-"][class*="-modal"]),
.popup-bg:has(~ .popup [class*="shardwright-"][class*="-modal"]) {
    background: var(--shardwright-overlay-bg) !important;
}

body:not(.shardwright-theme-default) .popup-overlay:has(+ .popup.shardwright-owned-popup),
body:not(.shardwright-theme-default) .popup-bg:has(~ .popup.shardwright-owned-popup) {
    background: var(--shardwright-overlay-bg) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .shardwright-owned-popup-content {
    background: transparent;
    color: var(--shardwright-text-primary);
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .shardwright-owned-popup-content h3 {
    color: var(--shardwright-text-primary) !important;
    margin: 0 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--shardwright-border) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .shardwright-owned-popup-content p {
    line-height: 1.5;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-input.text_pole,
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup textarea.popup-input.text_pole {
    background: var(--shardwright-bg-input) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-input.text_pole:focus,
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup textarea.popup-input.text_pole:focus {
    border-color: var(--shardwright-border-focus) !important;
}

[class*="shardwright-"][class*="-modal"] {
    background: var(--shardwright-bg-primary);
    color: var(--shardwright-text-primary);
}

[class*="shardwright-"][class*="-modal"] h3,
[class*="shardwright-"][class*="-modal"] h4 {
    color: var(--shardwright-text-primary);
}

.shardwright-text-hint {
    color: var(--shardwright-text-hint) !important;
    font-family: var(--shardwright-font-hint, inherit);
    font-size: var(--shardwright-font-size-hint, inherit);
}

/* Modal Form Controls */
[class*="shardwright-"][class*="-modal"] input.text_pole,
[class*="shardwright-"][class*="-modal"] textarea.text_pole,
[class*="shardwright-"][class*="-modal"] select.text_pole {
    background: var(--shardwright-bg-input) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
}

[class*="shardwright-"][class*="-modal"] input.text_pole:focus,
[class*="shardwright-"][class*="-modal"] textarea.text_pole:focus {
    border-color: var(--shardwright-border-focus) !important;
}

[class*="shardwright-"][class*="-modal"] .menu_button {
    background: var(--shardwright-bg-secondary);
    color: var(--shardwright-text-primary);
    border: 1px solid var(--shardwright-border);
}

[class*="shardwright-"][class*="-modal"] .menu_button:hover:not(:disabled) {
    background: var(--shardwright-highlight);
    border-color: var(--shardwright-primary);
}

[class*="shardwright-"][class*="-modal"] .menu_button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

[class*="shardwright-"][class*="-modal"] img:not(.shardwright-dropdown-trigger img) {
    max-width: 100%;
    max-height: 120px;
    object-fit: contain;
}

/* Popup Buttons */
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-button-ok,
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-button-cancel,
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-controls .menu_button,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-button-ok,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-button-cancel,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-controls .menu_button {
    background: var(--shardwright-bg-secondary) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-button-ok,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-button-ok {
    background: var(--shardwright-primary) !important;
    border-color: var(--shardwright-primary) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-button-ok:hover,
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-button-ok:focus-visible,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-button-ok:hover,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-button-ok:focus-visible {
    background: var(--shardwright-primary-hover) !important;
    border-color: var(--shardwright-primary-hover) !important;
    color: var(--shardwright-text-primary) !important;
    filter: none !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-controls .menu_button:hover,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-controls .menu_button:hover {
    background: var(--shardwright-highlight) !important;
    border-color: var(--shardwright-primary) !important;
    color: var(--shardwright-text-primary) !important;
}

body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-content .popup-header,
body:not(.shardwright-theme-default) .popup.shardwright-owned-popup .popup-content h3,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-content .popup-header,
.popup:has([class*="shardwright-"][class*="-modal"]) .popup-content h3 {
    color: var(--shardwright-text-primary) !important;
    border-color: var(--shardwright-border) !important;
}

/* Popup Controls with Left Buttons */
.popup:has(.shardwright-prompts-modal) .popup-controls {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    gap: 10px;
}

.shardwright-popup-left-buttons {
    display: flex;
    gap: 5px;
    margin-right: auto;
}

.shardwright-popup-left-buttons .menu_button {
    background: var(--shardwright-bg-secondary);
    color: var(--shardwright-text-primary);
    border: 1px solid var(--shardwright-border);
}

.shardwright-popup-left-buttons .menu_button:hover {
    background: var(--shardwright-highlight);
    border-color: var(--shardwright-primary);
}

.shardwright-debug-export-modal {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: min(900px, 80vw);
}

.shardwright-debug-export-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.shardwright-debug-export-textarea {
    width: 100%;
    min-height: min(56vh, 540px);
    resize: vertical;
    font-family: var(--shardwright-font-muted, Consolas, monospace);
    font-size: 12px;
    line-height: 1.45;
    white-space: pre;
}

/* ==========================================================================
   SECTION 6: SECTIONS, PANELS & BLOCKS
   ========================================================================== */

.shardwright-section,
.shardwright-panel,
.shardwright-block {
    background: var(--shardwright-bg-secondary);
    border: 1px solid var(--shardwright-border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
}

.shardwright-section-header {
    color: var(--shardwright-text-primary);
    font-weight: 600;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}
`;
