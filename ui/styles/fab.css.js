export const FAB_CSS = `
/* ======================================================================
   FLOATING ACTION BUTTON (FAB) - Crystal Trigger
   ====================================================================== */
.shardwright-fab {
    position: absolute !important;
    bottom: 80px;
    right: 20px;
    z-index: 2147483647 !important;
}

.shardwright-fab:not([style*="left"]):not([style*="top"]) {
    bottom: 80px !important;
    right: 20px !important;
    left: auto !important;
    top: auto !important;
}

.shardwright-fab-trigger {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 68%, black);
    background: color-mix(in srgb, var(--shardwright-bg-primary) 94%, transparent);
    color: var(--shardwright-text-primary);
    font-size: 20px;
    cursor: grab;
    box-shadow: var(--shardwright-shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.3));
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--shardwright-transition, 0.16s ease), transform 0.16s ease, border-color 0.16s ease;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    position: relative;
    overflow: visible;
}

.shardwright-fab:not(.shardwright-fab-generating) .shardwright-fab-trigger::before,
.shardwright-fab:not(.shardwright-fab-generating) .shardwright-fab-trigger::after {
    content: none;
}

.shardwright-fab.shardwright-fab-open .shardwright-fab-trigger {
    border-color: color-mix(in srgb, var(--shardwright-primary) 84%, white 6%);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.42);
}

.shardwright-fab-trigger:hover {
    background: color-mix(in srgb, var(--shardwright-bg-secondary) 88%, transparent);
    transform: scale(1.06);
}

.shardwright-fab-trigger:active,
.shardwright-fab-dragging .shardwright-fab-trigger {
    cursor: grabbing;
    transform: scale(0.95);
}

.shardwright-crystal-icon {
    width: 28px;
    height: 28px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.shardwright-crystal-icon svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--shardwright-primary) 50%, transparent));
    animation: shardwright-crystal-idle-glow 2.8s ease-in-out infinite;
}

.shardwright-crystal-shard {
    fill: var(--shardwright-text-primary);
    stroke: var(--shardwright-bg-secondary);
    stroke-width: 0.3;
    transform-origin: center;
    transform-box: fill-box;
    will-change: transform, opacity;
}

.shardwright-crystal-shard--1 { opacity: 1; }
.shardwright-crystal-shard--2 { opacity: 0.92; }
.shardwright-crystal-shard--3 { opacity: 0.78; }
.shardwright-crystal-shard--4 { opacity: 0.86; }
.shardwright-crystal-shard--5a { opacity: 0.74; }
.shardwright-crystal-shard--5b { opacity: 0.8; }

@keyframes shardwright-crystal-idle-glow {
    0%, 100% { filter: drop-shadow(0 0 3px color-mix(in srgb, var(--shardwright-primary) 44%, transparent)); }
    50% { filter: drop-shadow(0 0 10px color-mix(in srgb, var(--shardwright-primary) 68%, transparent)); }
}

/* ======================================================================
   SHARD ORBITS (open state)
   ====================================================================== */
.shardwright-fab.shardwright-fab-open .shardwright-crystal-shard.shardwright-shard-orbit-1 { animation: shardwright-shard-orbit-1 2.2s linear infinite; }
.shardwright-fab.shardwright-fab-open .shardwright-crystal-shard.shardwright-shard-orbit-2 { animation: shardwright-shard-orbit-2 2.9s linear infinite reverse; }
.shardwright-fab.shardwright-fab-open .shardwright-crystal-shard.shardwright-shard-orbit-3 { animation: shardwright-shard-orbit-3 3.4s linear infinite; }
.shardwright-fab.shardwright-fab-open .shardwright-crystal-shard.shardwright-shard-orbit-4 { animation: shardwright-shard-orbit-4 2.6s linear infinite reverse; }
.shardwright-fab.shardwright-fab-open .shardwright-crystal-shard.shardwright-shard-orbit-5a { animation: shardwright-shard-orbit-5a 3.8s linear infinite; }
.shardwright-fab.shardwright-fab-open .shardwright-crystal-shard.shardwright-shard-orbit-5b { animation: shardwright-shard-orbit-5b 2.4s linear infinite reverse; }

@keyframes shardwright-shard-orbit-1 {
    0% { transform: translate(-8px, -3px) rotate(0deg); }
    25% { transform: translate(-3px, -11px) rotate(80deg); }
    50% { transform: translate(8px, -2px) rotate(170deg); }
    75% { transform: translate(2px, 9px) rotate(260deg); }
    100% { transform: translate(-8px, -3px) rotate(360deg); }
}

@keyframes shardwright-shard-orbit-2 {
    0% { transform: translate(11px, -1px) rotate(0deg); }
    25% { transform: translate(6px, -12px) rotate(-95deg); }
    50% { transform: translate(-8px, -3px) rotate(-185deg); }
    75% { transform: translate(-3px, 9px) rotate(-275deg); }
    100% { transform: translate(11px, -1px) rotate(-360deg); }
}

@keyframes shardwright-shard-orbit-3 {
    0% { transform: translate(-10px, 6px) rotate(0deg); }
    25% { transform: translate(-15px, -2px) rotate(90deg); }
    50% { transform: translate(3px, -7px) rotate(180deg); }
    75% { transform: translate(13px, 4px) rotate(270deg); }
    100% { transform: translate(-10px, 6px) rotate(360deg); }
}

@keyframes shardwright-shard-orbit-4 {
    0% { transform: translate(9px, 7px) rotate(0deg); }
    25% { transform: translate(14px, -2px) rotate(-95deg); }
    50% { transform: translate(-2px, -10px) rotate(-190deg); }
    75% { transform: translate(-13px, 3px) rotate(-280deg); }
    100% { transform: translate(9px, 7px) rotate(-360deg); }
}

@keyframes shardwright-shard-orbit-5a {
    0% { transform: translate(-3px, 12px) rotate(0deg); }
    25% { transform: translate(-12px, 8px) rotate(86deg); }
    50% { transform: translate(-10px, -6px) rotate(170deg); }
    75% { transform: translate(8px, -8px) rotate(258deg); }
    100% { transform: translate(-3px, 12px) rotate(360deg); }
}

@keyframes shardwright-shard-orbit-5b {
    0% { transform: translate(4px, 13px) rotate(0deg); }
    25% { transform: translate(13px, 7px) rotate(-88deg); }
    50% { transform: translate(10px, -7px) rotate(-172deg); }
    75% { transform: translate(-9px, -9px) rotate(-265deg); }
    100% { transform: translate(4px, 13px) rotate(-360deg); }
}

/* ======================================================================
   GENERATING STATE
   ====================================================================== */
.shardwright-fab-generating .shardwright-crystal-icon svg {
    animation: shardwright-crystal-generating-glow 2s ease-in-out infinite;
}

@keyframes shardwright-crystal-generating-glow {
    0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--shardwright-primary) 48%, transparent)); }
    25% { filter: drop-shadow(0 0 14px color-mix(in srgb, var(--shardwright-primary) 70%, transparent)); }
    50% { filter: drop-shadow(0 0 7px color-mix(in srgb, var(--shardwright-primary) 52%, transparent)); }
    75% { filter: drop-shadow(0 0 14px color-mix(in srgb, var(--shardwright-primary) 70%, transparent)); }
}

.shardwright-fab-generating .shardwright-crystal-shard--1 {
    animation: shardwright-shard-1 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.shardwright-fab-generating .shardwright-crystal-shard--2 {
    animation: shardwright-shard-2 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.05s;
}

.shardwright-fab-generating .shardwright-crystal-shard--3 {
    animation: shardwright-shard-3 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.1s;
}

.shardwright-fab-generating .shardwright-crystal-shard--4 {
    animation: shardwright-shard-4 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.15s;
}

.shardwright-fab-generating .shardwright-crystal-shard--5a {
    animation: shardwright-shard-5a 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.08s;
}

.shardwright-fab-generating .shardwright-crystal-shard--5b {
    animation: shardwright-shard-5b 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.11s;
}

@keyframes shardwright-shard-1 {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    15% { transform: translate(-8px, -10px) rotate(-15deg); opacity: 0.9; }
    30% { transform: translate(-12px, -6px) rotate(-40deg); opacity: 0.8; }
    50% { transform: translate(-6px, 8px) rotate(-180deg); opacity: 0.7; }
    70% { transform: translate(4px, 10px) rotate(-300deg); opacity: 0.8; }
    85% { transform: translate(2px, 3px) rotate(-345deg); opacity: 0.9; }
    100% { transform: translate(0, 0) rotate(-360deg); opacity: 1; }
}

@keyframes shardwright-shard-2 {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    15% { transform: translate(9px, -9px) rotate(20deg); opacity: 0.9; }
    30% { transform: translate(13px, -3px) rotate(50deg); opacity: 0.8; }
    50% { transform: translate(5px, 10px) rotate(180deg); opacity: 0.7; }
    70% { transform: translate(-5px, 8px) rotate(310deg); opacity: 0.8; }
    85% { transform: translate(-1px, 2px) rotate(350deg); opacity: 0.9; }
    100% { transform: translate(0, 0) rotate(360deg); opacity: 1; }
}

@keyframes shardwright-shard-3 {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    15% { transform: translate(-11px, 2px) rotate(-25deg); opacity: 0.9; }
    30% { transform: translate(-9px, 9px) rotate(-60deg); opacity: 0.75; }
    50% { transform: translate(6px, 12px) rotate(-200deg); opacity: 0.7; }
    70% { transform: translate(10px, -2px) rotate(-320deg); opacity: 0.8; }
    85% { transform: translate(3px, -1px) rotate(-350deg); opacity: 0.9; }
    100% { transform: translate(0, 0) rotate(-360deg); opacity: 1; }
}

@keyframes shardwright-shard-4 {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    15% { transform: translate(10px, 4px) rotate(18deg); opacity: 0.9; }
    30% { transform: translate(11px, 10px) rotate(55deg); opacity: 0.75; }
    50% { transform: translate(-4px, 13px) rotate(190deg); opacity: 0.7; }
    70% { transform: translate(-9px, -3px) rotate(315deg); opacity: 0.8; }
    85% { transform: translate(-2px, -1px) rotate(352deg); opacity: 0.9; }
    100% { transform: translate(0, 0) rotate(360deg); opacity: 1; }
}

@keyframes shardwright-shard-5a {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
    15% { transform: translate(-3px, 12px) rotate(-8deg); opacity: 0.8; }
    30% { transform: translate(-10px, 12px) rotate(-40deg); opacity: 0.72; }
    50% { transform: translate(-13px, 1px) rotate(-170deg); opacity: 0.65; }
    70% { transform: translate(1px, -8px) rotate(-292deg); opacity: 0.74; }
    85% { transform: translate(1px, -2px) rotate(-348deg); opacity: 0.78; }
    100% { transform: translate(0, 0) rotate(-360deg); opacity: 0.7; }
}

@keyframes shardwright-shard-5b {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 0.78; }
    15% { transform: translate(3px, 11px) rotate(10deg); opacity: 0.86; }
    30% { transform: translate(9px, 13px) rotate(42deg); opacity: 0.8; }
    50% { transform: translate(12px, 2px) rotate(176deg); opacity: 0.7; }
    70% { transform: translate(-2px, -8px) rotate(298deg); opacity: 0.8; }
    85% { transform: translate(-1px, -2px) rotate(350deg); opacity: 0.84; }
    100% { transform: translate(0, 0) rotate(360deg); opacity: 0.78; }
}

.shardwright-fab-generating .shardwright-fab-trigger::before,
.shardwright-fab-generating .shardwright-fab-trigger::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--shardwright-primary) 80%, white);
    pointer-events: none;
}

.shardwright-fab-generating .shardwright-fab-trigger::before {
    animation: shardwright-sparkle-orbit-a 2.4s linear infinite;
}

.shardwright-fab-generating .shardwright-fab-trigger::after {
    animation: shardwright-sparkle-orbit-b 2.4s linear infinite 1.2s;
}

@keyframes shardwright-sparkle-orbit-a {
    0% { transform: translate(0, -20px) scale(0); opacity: 0; }
    10% { transform: translate(12px, -16px) scale(1); opacity: 1; }
    40% { transform: translate(18px, 8px) scale(0.7); opacity: 0.6; }
    70% { transform: translate(-14px, 14px) scale(0.4); opacity: 0.3; }
    100% { transform: translate(-18px, -10px) scale(0); opacity: 0; }
}

@keyframes shardwright-sparkle-orbit-b {
    0% { transform: translate(0, 18px) scale(0); opacity: 0; }
    10% { transform: translate(-14px, 12px) scale(1); opacity: 1; }
    40% { transform: translate(-16px, -10px) scale(0.7); opacity: 0.6; }
    70% { transform: translate(12px, -16px) scale(0.4); opacity: 0.3; }
    100% { transform: translate(16px, 12px) scale(0); opacity: 0; }
}

@media (max-width: 768px) {
    .shardwright-fab-trigger {
        width: calc(56px * var(--shardwright-fab-mobile-scale, 1));
        height: calc(56px * var(--shardwright-fab-mobile-scale, 1));
        font-size: calc(22px * var(--shardwright-fab-mobile-scale, 1));
    }

    .shardwright-crystal-icon {
        width: calc(28px * var(--shardwright-fab-mobile-scale, 1));
        height: calc(28px * var(--shardwright-fab-mobile-scale, 1));
    }
}
`;
