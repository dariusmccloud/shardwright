export const MESSAGES_CSS = `
/* Use input/primary background so default theme doesn't end up fully transparent */
    background: var(--shardwright-bg-input) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-radius: 4px !important;
    box-shadow: var(--shardwright-shadow-lg) !important;
    max-height: 300px;
    overflow: hidden;
    flex-direction: column;
}

.shardwright-dropdown-menu.open {
    display: flex;
}

.shardwright-dropdown-search {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 8px !important;
    border-bottom: 1px solid var(--shardwright-border) !important;
    background: var(--shardwright-bg-input) !important;
    flex-shrink: 0;
}

.shardwright-dropdown-search input[type="text"],
.shardwright-dropdown-menu .shardwright-dropdown-search input,
#shardwright-settings input[id$="-search"],
#shardwright-panel input[id$="-search"],
.shardwright-modal input[id$="-search"],
[class*="shardwright-"][class*="-modal"] input[id$="-search"],
[class*="shardwright-"][class*="-dropdown-container"] input[id$="-search"] {
    width: 100% !important;
    height: 36px !important;
    max-height: none !important;
    min-height: 36px !important;
    padding: 8px 12px !important;
    margin: 0 !important;
    background: var(--shardwright-bg-input) !important;
    color: var(--shardwright-text-primary) !important;
    border: 1px solid var(--shardwright-border) !important;
    border-radius: 4px !important;
    box-sizing: border-box !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    outline: none !important;
}

.shardwright-dropdown-search input[type="text"]:focus,
[class*="shardwright-"][class*="-dropdown-container"] input[id$="-search"]:focus {
    border-color: var(--shardwright-border-focus) !important;
    box-shadow: 0 0 0 2px var(--shardwright-focus-glow) !important;
}

.shardwright-dropdown-search input::placeholder,
[class*="shardwright-"][class*="-dropdown-container"] input[id$="-search"]::placeholder {
    color: var(--shardwright-text-muted) !important;
    opacity: 0.7;
}

.shardwright-dropdown-options {
    overflow-y: auto;
    max-height: 250px;
    flex: 1;
}

.shardwright-dropdown-option {
    padding: 8px 12px !important;
    cursor: pointer;
    color: var(--shardwright-text-primary) !important;
    border-bottom: 1px solid var(--shardwright-border);
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    background: transparent;
    transition: background 0.15s ease;
}

.shardwright-dropdown-option:last-child {
    border-bottom: none;
}

.shardwright-dropdown-option:hover {
    background: var(--shardwright-highlight) !important;
}

.shardwright-dropdown-option.selected {
    background: var(--shardwright-primary) !important;
    color: white !important;
}

.shardwright-dropdown-option-avatar,
.shardwright-dropdown-option img {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    max-width: 32px !important;
    max-height: 32px !important;
    border-radius: 50% !important;
    object-fit: cover !important;
    flex-shrink: 0 !important;
}

.shardwright-dropdown-option-name,
.shardwright-dropdown-option .shardwright-option-name {
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    margin-right: 10px;
}

.shardwright-dropdown-option .shardwright-option-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
}

.shardwright-dropdown-empty {
    padding: 12px !important;
    color: var(--shardwright-text-muted) !important;
    text-align: center;
    font-style: italic;
}

.shardwright-character-dropdown-container.disabled .shardwright-dropdown-trigger,
.shardwright-chat-dropdown-container.disabled .shardwright-dropdown-trigger {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--shardwright-bg-tertiary) !important;
}

/* Selected Tags (Multi-select) */
.shardwright-selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
    min-height: 30px;
    align-items: center;
}

.shardwright-selected-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    background: var(--shardwright-primary);
    border-radius: 3px;
    font-size: 12px;
    color: white;
}

.shardwright-selected-tag .shardwright-tag-remove {
    cursor: pointer;
    font-size: 14px;
    opacity: 0.7;
    line-height: 1;
}

.shardwright-selected-tag .shardwright-tag-remove:hover {
    opacity: 1;
}

/* Chat/Character Option Info */
.shardwright-chat-option-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.shardwright-chat-option-name {
    color: var(--shardwright-text-primary);
    font-weight: 500;
}

.shardwright-chat-option-details {
    color: var(--shardwright-text-muted);
    font-family: var(--shardwright-font-muted, inherit);
    font-size: var(--shardwright-font-size-muted, 0.85em);
}

.shardwright-char-option-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.shardwright-char-option-info img {
    width: 32px !important;
    height: 32px !important;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
}

.shardwright-char-option-name {
    color: var(--shardwright-text-primary);
}

/* ==========================================================================
   SECTION 8: MESSAGE STYLING
   ========================================================================== */

.mes.shardwright-summarized {
    opacity: 0.4;
    border-left: 3px solid var(--shardwright-warning);
    transition: opacity 0.3s ease;
}

.mes.shardwright-summarized:hover {
    opacity: 0.8;
}

.mes.shardwright-hidden {
    display: none !important;
}

.shardwright-text-hidden {
    display: none !important;
}

.mes.shardwright-collapsed .mes_text {
    display: none;
}

/* ==========================================================================
   SECTION 23: WEIGHT INDICATORS
   ========================================================================== */

.shardwright-weight-critical,
.shardwright-weight-5 {
    color: var(--shardwright-weight-critical) !important;
}

.shardwright-weight-major,
.shardwright-weight-4 {
    color: var(--shardwright-weight-major) !important;
}

.shardwright-weight-moderate,
.shardwright-weight-3 {
    color: var(--shardwright-weight-moderate) !important;
}

.shardwright-weight-minor,
.shardwright-weight-2 {
    color: var(--shardwright-weight-minor) !important;
}

.shardwright-weight-trivial,
.shardwright-weight-1 {
    color: var(--shardwright-weight-trivial) !important;
}

.shardwright-weight-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
}

.shardwright-weight-badge.critical {
    background: rgba(255, 68, 68, 0.2);
    border: 1px solid var(--shardwright-weight-critical);
}

.shardwright-weight-badge.major {
    background: rgba(255, 140, 0, 0.2);
    border: 1px solid var(--shardwright-weight-major);
}

.shardwright-weight-badge.moderate {
    background: rgba(255, 215, 0, 0.2);
    border: 1px solid var(--shardwright-weight-moderate);
}

.shardwright-weight-badge.minor {
    background: rgba(144, 238, 144, 0.2);
    border: 1px solid var(--shardwright-weight-minor);
}

.shardwright-weight-badge.trivial {
    background: rgba(211, 211, 211, 0.2);
    border: 1px solid var(--shardwright-weight-trivial);
}

/* ==========================================================================
   SECTION 24: NSFW CONTENT
   ========================================================================== */

.shardwright-nsfw-badge,
.shardwright-nsfw-indicator {
    background: var(--shardwright-nsfw-accent);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
}

.shardwright-nsfw-section {
    border-left: 3px solid var(--shardwright-nsfw-accent);
    background: rgba(255, 107, 157, 0.1);
}

.shardwright-nsfw-warning {
    color: var(--shardwright-nsfw-accent);
    font-weight: 600;
}

/* ==========================================================================
   SECTION 25: QUOTES & DIALOGUE
   ========================================================================== */

.shardwright-quote,
.shardwright-dialogue {
    color: var(--shardwright-quote);
    font-style: italic;
    border-left: 2px solid var(--shardwright-quote);
    padding-left: 10px;
    margin: 5px 0;
}

.shardwright-speaker {
    color: var(--shardwright-text-primary);
    font-weight: 600;
    font-style: normal;
}

/* ==========================================================================
   SECTION 26: STATS DISPLAY
   ========================================================================== */

.shardwright-stats {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.shardwright-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
}
`;
