export const TEXTAREA_RESIZE_CSS = `
/* ======================================================================
   TEXTAREA RESIZE CONSISTENCY
   Ensure all SS textareas expose a visible bottom-right resize affordance.
   ====================================================================== */

#shardwright-settings textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
#shardwright-panel textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
.shardwright-modal textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
[class*="shardwright-"][class*="-modal"] textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
.popup:has([class*="shardwright-"][class*="-modal"]) textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
.popup.shardwright-owned-popup textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
.shardwright-fab textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
.shardwright-fab-panels textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
.shardwright-fab-generating textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]) {
    --shardwright-resize-corner-size: 10px;
    --shardwright-resize-corner-hit-scale: 2.2;
    --shardwright-resize-corner-inset: 3px;
    --shardwright-resize-corner-gap: 4px;
    resize: vertical !important;
    overflow: auto;
    min-height: 44px;
    padding-right: 12px;
    padding-bottom: 12px;
    background-repeat: no-repeat !important;
    background-size:
        var(--shardwright-resize-corner-size) var(--shardwright-resize-corner-size),
        var(--shardwright-resize-corner-size) var(--shardwright-resize-corner-size),
        var(--shardwright-resize-corner-size) var(--shardwright-resize-corner-size) !important;
    background-position:
        calc(100% - var(--shardwright-resize-corner-inset)) calc(100% - var(--shardwright-resize-corner-inset)),
        calc(100% - (var(--shardwright-resize-corner-inset) + var(--shardwright-resize-corner-gap))) calc(100% - var(--shardwright-resize-corner-inset)),
        calc(100% - var(--shardwright-resize-corner-inset)) calc(100% - (var(--shardwright-resize-corner-inset) + var(--shardwright-resize-corner-gap))) !important;
    background-image:
        linear-gradient(
            135deg,
            transparent 44%,
            currentColor 44%,
            currentColor 56%,
            transparent 56%
        ),
        linear-gradient(
            135deg,
            transparent 44%,
            currentColor 44%,
            currentColor 56%,
            transparent 56%
        ),
        linear-gradient(
            135deg,
            transparent 44%,
            currentColor 44%,
            currentColor 56%,
            transparent 56%
        ) !important;
}

textarea.shardwright-resize-active {
    cursor: ns-resize !important;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none !important;
    overscroll-behavior: none !important;
    overflow-y: hidden !important;
}

html.shardwright-resize-lock,
body.shardwright-resize-lock {
    overscroll-behavior: none !important;
}

body.shardwright-resize-lock {
    overflow: hidden !important;
}

@media (max-width: 768px) {
    #shardwright-settings textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    #shardwright-panel textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    .shardwright-modal textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    [class*="shardwright-"][class*="-modal"] textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    .popup:has([class*="shardwright-"][class*="-modal"]) textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    .popup.shardwright-owned-popup textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    .shardwright-fab textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    .shardwright-fab-panels textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]),
    .shardwright-fab-generating textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"]) {
        --shardwright-resize-corner-size: 14px;
        --shardwright-resize-corner-hit-scale: 3.15;
        --shardwright-resize-corner-inset: 4px;
        --shardwright-resize-corner-gap: 5px;
        padding-right: 16px;
        padding-bottom: 16px;
    }

    #shardwright-settings textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    #shardwright-panel textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    .shardwright-modal textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    [class*="shardwright-"][class*="-modal"] textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    .popup:has([class*="shardwright-"][class*="-modal"]) textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    .popup.shardwright-owned-popup textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    .shardwright-fab textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    .shardwright-fab-panels textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer,
    .shardwright-fab-generating textarea:not([readonly]):not([disabled]):not([data-shardwright-no-resize-assist="1"])::-webkit-resizer {
        background:
            linear-gradient(135deg, transparent 40%, currentColor 40%, currentColor 60%, transparent 60%);
        background-size: var(--shardwright-resize-corner-size) var(--shardwright-resize-corner-size);
    }
}
`;
