export const VARIABLES_CSS = `
/* ==========================================================================
   SECTION 1: CSS VARIABLES & THEMING
   ========================================================================== */

#shardwright-settings,
#shardwright-panel,
.shardwright-modal,
[class*="shardwright-"][class*="-modal"],
.popup:has([class*="shardwright-"][class*="-modal"]),
.popup.shardwright-owned-popup,
.shardwright-fab,
.shardwright-fab-panels,
.shardwright-fab-generating,
.shardwright-info-hint-popover {
    /* Primary colors */
    --shardwright-primary: var(--SmartThemeQuoteColor, rgba(198, 198, 198, 1));
    --shardwright-primary-hover: var(--SmartThemeQuoteColor, rgba(128, 128, 128, 1));
    --shardwright-primary-active: var(--SmartThemeQuoteColor, rgba(198, 198, 198, 1));

    /* Background colors */
    --shardwright-bg-primary: var(--SmartThemeBlurTintColor, rgba(0, 0, 0, 0.45));
    --shardwright-bg-secondary: rgba(0, 0, 0, 0.2);
    --shardwright-bg-tertiary: rgba(0, 0, 0, 0.3);
    --shardwright-bg-input: rgba(0, 0, 0, 0.3);

    /* Text colors */
    --shardwright-text-primary: var(--SmartThemeBodyColor, #ffffff);
    --shardwright-text-secondary: color-mix(in srgb, var(--shardwright-text-primary) 72%, transparent);
    --shardwright-text-muted: color-mix(in srgb, var(--shardwright-text-primary) 52%, transparent);
    --shardwright-text-hint: color-mix(in srgb, var(--shardwright-text-primary) 45%, transparent);
    --shardwright-quote: var(--SmartThemeQuoteColor, #b4a7d6);

    /* Border colors */
    --shardwright-border: color-mix(in srgb, var(--shardwright-text-primary) 16%, transparent);
    --shardwright-border-focus: var(--shardwright-primary);

    /* Status colors */
    --shardwright-success: #4caf50;
    --shardwright-warning: #ff9800;
    --shardwright-error: #f44336;
    --shardwright-info: #2196f3;

    /* Shadows */
    --shardwright-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    --shardwright-shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.4);

    /* Effects */
    --shardwright-highlight: color-mix(in srgb, var(--shardwright-primary) 22%, transparent);
    --shardwright-overlay-bg: rgba(0, 0, 0, 0.6);
    --shardwright-focus-glow: color-mix(in srgb, var(--shardwright-primary) 28%, transparent);
    --shardwright-nsfw-accent: #ff6b9d;
    --shardwright-consolidation: #9b59b6;

    /* Motion */
    --shardwright-transition: 0.2s ease;

    /* Action buttons */
    --shardwright-rescue-bg: #9b59b6;
    --shardwright-rescue-bg-hover: #8e44ad;
    --shardwright-stop-bg: #e74c3c;
    --shardwright-stop-hover: #c0392b;

    /* Weight colors */
    --shardwright-weight-critical: #ff4444;
    --shardwright-weight-major: #ff8c00;
    --shardwright-weight-moderate: #ffd700;
    --shardwright-weight-minor: #90ee90;
    --shardwright-weight-trivial: #d3d3d3;

    /* Font aliases used across modules */
    --shardwright-font-secondary: var(--shardwright-font-primary, var(--mainFontFamily, inherit));
    --shardwright-font-size-secondary: var(--shardwright-font-size-primary, var(--mainFontSize, inherit));
    --shardwright-font-muted: var(--shardwright-font-primary, var(--mainFontFamily, inherit));
    --shardwright-font-size-muted: 0.9em;
    --shardwright-font-hint: var(--shardwright-font-primary, var(--mainFontFamily, inherit));
    --shardwright-font-size-hint: 0.85em;
}

/* Font normalization for SS surfaces */
#shardwright-settings,
#shardwright-panel,
.shardwright-modal,
[class*="shardwright-"][class*="-modal"],
.popup:has([class*="shardwright-"][class*="-modal"]),
.popup.shardwright-owned-popup,
.shardwright-fab,
.shardwright-fab-panels {
    font-family: var(--shardwright-font-primary, var(--mainFontFamily, var(--mainFont, inherit)));
    font-size: var(--shardwright-font-size-primary, var(--mainFontSize, inherit));
}

#shardwright-settings :is(button, input, select, textarea),
#shardwright-panel :is(button, input, select, textarea),
.shardwright-modal :is(button, input, select, textarea),
[class*="shardwright-"][class*="-modal"] :is(button, input, select, textarea),
.popup:has([class*="shardwright-"][class*="-modal"]) :is(button, input, select, textarea),
.popup.shardwright-owned-popup :is(button, input, select, textarea),
.shardwright-fab-panels :is(button, input, select, textarea) {
    font-family: inherit;
    font-size: inherit;
}

/* ==========================================================================
   SECTION 2: THIRD-PARTY THEME DEFENSE
   Scoped overrides with !important to protect SS form elements from
   aggressive global selectors (e.g. Moonlit Echoes Theme's unscoped
   input[type="range"] / input[type="checkbox"] rules).
   ========================================================================== */

/* Range sliders */
#shardwright-settings input[type="range"],
#shardwright-panel input[type="range"],
.shardwright-modal input[type="range"],
[class*="shardwright-"][class*="-modal"] input[type="range"],
.popup:has([class*="shardwright-"][class*="-modal"]) input[type="range"],
.shardwright-fab input[type="range"],
.shardwright-fab-panels input[type="range"],
.shardwright-fab-generating input[type="range"] {
    background: var(--shardwright-border) !important;
    box-shadow: none !important;
    filter: none !important;
    outline: none !important;
}

#shardwright-settings .shardwright-range-pair,
#shardwright-panel .shardwright-range-pair,
.shardwright-modal .shardwright-range-pair,
[class*="shardwright-"][class*="-modal"] .shardwright-range-pair,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-range-pair,
.shardwright-fab .shardwright-range-pair,
.shardwright-fab-panels .shardwright-range-pair,
.shardwright-fab-generating .shardwright-range-pair {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto auto !important;
    column-gap: 8px !important;
    align-items: center !important;
}

#shardwright-settings .shardwright-range-number,
#shardwright-panel .shardwright-range-number,
.shardwright-modal .shardwright-range-number,
[class*="shardwright-"][class*="-modal"] .shardwright-range-number,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-range-number,
.shardwright-fab .shardwright-range-number,
.shardwright-fab-panels .shardwright-range-number,
.shardwright-fab-generating .shardwright-range-number {
    width: 6ch !important;
    min-width: 6ch !important;
    text-align: right !important;
}

#shardwright-settings .shardwright-range-unit,
#shardwright-panel .shardwright-range-unit,
.shardwright-modal .shardwright-range-unit,
[class*="shardwright-"][class*="-modal"] .shardwright-range-unit,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-range-unit,
.shardwright-fab .shardwright-range-unit,
.shardwright-fab-panels .shardwright-range-unit,
.shardwright-fab-generating .shardwright-range-unit {
    white-space: nowrap !important;
}

/* Range slider thumbs */
#shardwright-settings input[type="range"]::-webkit-slider-thumb,
#shardwright-panel input[type="range"]::-webkit-slider-thumb,
.shardwright-modal input[type="range"]::-webkit-slider-thumb,
[class*="shardwright-"][class*="-modal"] input[type="range"]::-webkit-slider-thumb,
.popup:has([class*="shardwright-"][class*="-modal"]) input[type="range"]::-webkit-slider-thumb,
.shardwright-fab input[type="range"]::-webkit-slider-thumb,
.shardwright-fab-panels input[type="range"]::-webkit-slider-thumb,
.shardwright-fab-generating input[type="range"]::-webkit-slider-thumb {
    background: var(--shardwright-primary) !important;
    border: 2px solid var(--shardwright-bg-primary) !important;
    box-shadow: none !important;
}

/* Checkboxes */
#shardwright-settings input[type="checkbox"],
#shardwright-panel input[type="checkbox"],
.shardwright-modal input[type="checkbox"],
[class*="shardwright-"][class*="-modal"] input[type="checkbox"],
.popup:has([class*="shardwright-"][class*="-modal"]) input[type="checkbox"],
.shardwright-fab input[type="checkbox"],
.shardwright-fab-panels input[type="checkbox"],
.shardwright-fab-generating input[type="checkbox"] {
    accent-color: var(--shardwright-primary) !important;
}

/* Checkbox labels: custom skin to avoid host-theme checkbox/tick overrides */
#shardwright-settings .checkbox_label input[type="checkbox"],
#shardwright-panel .checkbox_label input[type="checkbox"],
.shardwright-modal .checkbox_label input[type="checkbox"],
[class*="shardwright-"][class*="-modal"] .checkbox_label input[type="checkbox"],
.popup:has([class*="shardwright-"][class*="-modal"]) .checkbox_label input[type="checkbox"],
.shardwright-fab .checkbox_label input[type="checkbox"],
.shardwright-fab-panels .checkbox_label input[type="checkbox"],
.shardwright-fab-generating .checkbox_label input[type="checkbox"] {
    appearance: none !important;
    -webkit-appearance: none !important;
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    margin: 0 !important;
    border-radius: 3px !important;
    border: 1px solid var(--shardwright-border) !important;
    background: var(--shardwright-bg-tertiary) !important;
    box-shadow: none !important;
    filter: none !important;
    display: inline-grid !important;
    place-content: center !important;
    cursor: pointer !important;
    position: relative !important;
}

#shardwright-settings .checkbox_label input[type="checkbox"]::before,
#shardwright-panel .checkbox_label input[type="checkbox"]::before,
.shardwright-modal .checkbox_label input[type="checkbox"]::before,
[class*="shardwright-"][class*="-modal"] .checkbox_label input[type="checkbox"]::before,
.popup:has([class*="shardwright-"][class*="-modal"]) .checkbox_label input[type="checkbox"]::before,
.shardwright-fab .checkbox_label input[type="checkbox"]::before,
.shardwright-fab-panels .checkbox_label input[type="checkbox"]::before,
.shardwright-fab-generating .checkbox_label input[type="checkbox"]::before {
    content: '' !important;
    width: 9px !important;
    height: 9px !important;
    transform: scale(0) !important;
    transition: transform var(--shardwright-transition) !important;
    clip-path: polygon(14% 44%, 0 59%, 43% 100%, 100% 22%, 84% 8%, 43% 69%) !important;
    background: var(--shardwright-bg-primary) !important;
}

#shardwright-settings .checkbox_label input[type="checkbox"]:checked,
#shardwright-panel .checkbox_label input[type="checkbox"]:checked,
.shardwright-modal .checkbox_label input[type="checkbox"]:checked,
[class*="shardwright-"][class*="-modal"] .checkbox_label input[type="checkbox"]:checked,
.popup:has([class*="shardwright-"][class*="-modal"]) .checkbox_label input[type="checkbox"]:checked,
.shardwright-fab .checkbox_label input[type="checkbox"]:checked,
.shardwright-fab-panels .checkbox_label input[type="checkbox"]:checked,
.shardwright-fab-generating .checkbox_label input[type="checkbox"]:checked {
    background: var(--shardwright-primary) !important;
    border-color: var(--shardwright-primary) !important;
}

#shardwright-settings .checkbox_label input[type="checkbox"]:checked::before,
#shardwright-panel .checkbox_label input[type="checkbox"]:checked::before,
.shardwright-modal .checkbox_label input[type="checkbox"]:checked::before,
[class*="shardwright-"][class*="-modal"] .checkbox_label input[type="checkbox"]:checked::before,
.popup:has([class*="shardwright-"][class*="-modal"]) .checkbox_label input[type="checkbox"]:checked::before,
.shardwright-fab .checkbox_label input[type="checkbox"]:checked::before,
.shardwright-fab-panels .checkbox_label input[type="checkbox"]:checked::before,
.shardwright-fab-generating .checkbox_label input[type="checkbox"]:checked::before {
    transform: scale(1) !important;
}

#shardwright-settings .checkbox_label input[type="checkbox"]:focus-visible,
#shardwright-panel .checkbox_label input[type="checkbox"]:focus-visible,
.shardwright-modal .checkbox_label input[type="checkbox"]:focus-visible,
[class*="shardwright-"][class*="-modal"] .checkbox_label input[type="checkbox"]:focus-visible,
.popup:has([class*="shardwright-"][class*="-modal"]) .checkbox_label input[type="checkbox"]:focus-visible,
.shardwright-fab .checkbox_label input[type="checkbox"]:focus-visible,
.shardwright-fab-panels .checkbox_label input[type="checkbox"]:focus-visible,
.shardwright-fab-generating .checkbox_label input[type="checkbox"]:focus-visible {
    outline: 1px solid var(--shardwright-border-focus) !important;
    outline-offset: 2px !important;
}

#shardwright-settings .checkbox_label input[type="checkbox"]:disabled,
#shardwright-panel .checkbox_label input[type="checkbox"]:disabled,
.shardwright-modal .checkbox_label input[type="checkbox"]:disabled,
[class*="shardwright-"][class*="-modal"] .checkbox_label input[type="checkbox"]:disabled,
.popup:has([class*="shardwright-"][class*="-modal"]) .checkbox_label input[type="checkbox"]:disabled,
.shardwright-fab .checkbox_label input[type="checkbox"]:disabled,
.shardwright-fab-panels .checkbox_label input[type="checkbox"]:disabled,
.shardwright-fab-generating .checkbox_label input[type="checkbox"]:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
}

/* Tag controls */
#shardwright-settings .shardwright-tag-input,
#shardwright-panel .shardwright-tag-input,
.shardwright-modal .shardwright-tag-input,
[class*="shardwright-"][class*="-modal"] .shardwright-tag-input,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-tag-input,
.shardwright-fab .shardwright-tag-input,
.shardwright-fab-panels .shardwright-tag-input,
.shardwright-fab-generating .shardwright-tag-input {
    background: var(--shardwright-bg-input) !important;
    border: 1px solid var(--shardwright-border) !important;
    box-shadow: none !important;
    filter: none !important;
}

#shardwright-settings .shardwright-tag-remove,
#shardwright-panel .shardwright-tag-remove,
.shardwright-modal .shardwright-tag-remove,
[class*="shardwright-"][class*="-modal"] .shardwright-tag-remove,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-tag-remove,
.shardwright-fab .shardwright-tag-remove,
.shardwright-fab-panels .shardwright-tag-remove,
.shardwright-fab-generating .shardwright-tag-remove {
    appearance: none !important;
    -webkit-appearance: none !important;
    border: none !important;
    background: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    filter: none !important;
    color: inherit !important;
    text-shadow: none !important;
    font-family: inherit !important;
    text-transform: none !important;
    text-decoration: none !important;
    padding: 0 !important;
    margin: 0 !important;
    line-height: 1 !important;
}

/* Info hint button */
#shardwright-settings .shardwright-info-hint-btn,
#shardwright-panel .shardwright-info-hint-btn,
.shardwright-modal .shardwright-info-hint-btn,
[class*="shardwright-"][class*="-modal"] .shardwright-info-hint-btn,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-info-hint-btn,
.shardwright-fab .shardwright-info-hint-btn,
.shardwright-fab-panels .shardwright-info-hint-btn,
.shardwright-fab-generating .shardwright-info-hint-btn {
    appearance: none !important;
    -webkit-appearance: none !important;
    border: none !important;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    filter: none !important;
    text-shadow: none !important;
    padding: 0 !important;
}

#shardwright-settings .shardwright-tag,
#shardwright-panel .shardwright-tag,
.shardwright-modal .shardwright-tag,
[class*="shardwright-"][class*="-modal"] .shardwright-tag,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-tag,
.shardwright-fab .shardwright-tag,
.shardwright-fab-panels .shardwright-tag,
.shardwright-fab-generating .shardwright-tag {
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 2px 8px !important;
    border-radius: 3px !important;
    background:
        linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08)),
        var(--shardwright-bg-secondary) !important;
    border: 1px solid var(--shardwright-border) !important;
}

#shardwright-settings .shardwright-tag-input-field,
#shardwright-settings .shardwright-tag-input input,
#shardwright-panel .shardwright-tag-input-field,
#shardwright-panel .shardwright-tag-input input,
.shardwright-modal .shardwright-tag-input-field,
.shardwright-modal .shardwright-tag-input input,
[class*="shardwright-"][class*="-modal"] .shardwright-tag-input-field,
[class*="shardwright-"][class*="-modal"] .shardwright-tag-input input,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-tag-input-field,
.popup:has([class*="shardwright-"][class*="-modal"]) .shardwright-tag-input input,
.shardwright-fab .shardwright-tag-input-field,
.shardwright-fab .shardwright-tag-input input,
.shardwright-fab-panels .shardwright-tag-input-field,
.shardwright-fab-panels .shardwright-tag-input input,
.shardwright-fab-generating .shardwright-tag-input-field,
.shardwright-fab-generating .shardwright-tag-input input {
    appearance: none !important;
    -webkit-appearance: none !important;
    background: transparent !important;
    background-image: none !important;
    border: none !important;
    box-shadow: none !important;
    filter: none !important;
}

/* Links */
#shardwright-settings a,
#shardwright-panel a,
.shardwright-modal a,
[class*="shardwright-"][class*="-modal"] a,
.popup:has([class*="shardwright-"][class*="-modal"]) a,
.shardwright-fab a,
.shardwright-fab-panels a,
.shardwright-fab-generating a {
    color: var(--shardwright-primary) !important;
}

#shardwright-settings a:hover,
#shardwright-panel a:hover,
.shardwright-modal a:hover,
[class*="shardwright-"][class*="-modal"] a:hover,
.popup:has([class*="shardwright-"][class*="-modal"]) a:hover,
.shardwright-fab a:hover,
.shardwright-fab-panels a:hover,
.shardwright-fab-generating a:hover {
    color: var(--shardwright-primary-hover) !important;
}

/* Text selection */
#shardwright-settings ::selection,
#shardwright-panel ::selection,
.shardwright-modal ::selection,
[class*="shardwright-"][class*="-modal"] ::selection,
.popup:has([class*="shardwright-"][class*="-modal"]) ::selection,
.shardwright-fab ::selection,
.shardwright-fab-panels ::selection,
.shardwright-fab-generating ::selection {
    background-color: var(--shardwright-highlight) !important;
}

/* Headings */
#shardwright-settings :is(h1, h3),
#shardwright-panel :is(h1, h3),
.shardwright-modal :is(h1, h3),
[class*="shardwright-"][class*="-modal"] :is(h1, h3),
.popup:has([class*="shardwright-"][class*="-modal"]) :is(h1, h3),
.shardwright-fab :is(h1, h3),
.shardwright-fab-panels :is(h1, h3),
.shardwright-fab-generating :is(h1, h3) {
    color: var(--shardwright-text-primary) !important;
    border-color: var(--shardwright-border) !important;
}

/* Textarea caret */
#shardwright-settings textarea,
#shardwright-panel textarea,
.shardwright-modal textarea,
[class*="shardwright-"][class*="-modal"] textarea,
.popup:has([class*="shardwright-"][class*="-modal"]) textarea,
.shardwright-fab textarea,
.shardwright-fab-panels textarea,
.shardwright-fab-generating textarea {
    caret-color: var(--shardwright-primary) !important;
}

.shardwright-hidden {
    display: none !important;
}
`;
