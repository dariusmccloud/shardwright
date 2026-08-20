export const RAG_DEBUG_CSS = `
.shardwright-rag-debug-modal {
    max-height: 82vh;
}

.shardwright-rag-debug-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
}

.shardwright-rag-debug-tab {
    border: 1px solid var(--shardwright-border);
    background: var(--shardwright-bg-secondary);
    color: var(--shardwright-text-secondary);
    border-radius: 6px;
    padding: 6px 10px;
    cursor: pointer;
}

.shardwright-rag-debug-tab.active {
    color: var(--shardwright-text-primary);
    border-color: var(--shardwright-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--shardwright-primary) 30%, transparent);
}

.shardwright-rag-debug-tab-panel {
    display: none;
}

.shardwright-rag-debug-tab-panel.active {
    display: block;
}

.shardwright-rag-debug-health-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 8px;
}

.shardwright-rag-debug-health-card {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 10px;
}

.shardwright-rag-debug-health-card.ok {
    border-color: color-mix(in srgb, var(--shardwright-success) 40%, var(--shardwright-border));
}

.shardwright-rag-debug-health-card.warn {
    border-color: color-mix(in srgb, var(--shardwright-warning) 45%, var(--shardwright-border));
}

.shardwright-rag-debug-health-card.error {
    border-color: color-mix(in srgb, var(--shardwright-error) 45%, var(--shardwright-border));
}

.shardwright-rag-debug-health-title {
    color: var(--shardwright-text-primary);
    font-weight: 700;
}

.shardwright-rag-debug-health-state {
    color: var(--shardwright-text-secondary);
    font-size: 12px;
    margin-top: 4px;
}

.shardwright-rag-debug-health-meta {
    color: var(--shardwright-text-muted);
    font-size: 11px;
    margin-top: 6px;
}

.shardwright-rag-debug-block {
    margin-top: 8px;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 8px;
}

.shardwright-rag-debug-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}

.shardwright-rag-debug-item {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 6px 8px;
}

.shardwright-rag-debug-item summary {
    cursor: pointer;
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
}

.shardwright-rag-debug-item summary > * {
    min-width: 0;
}

.shardwright-rag-debug-item-snippet {
    overflow-wrap: anywhere;
}

.shardwright-rag-debug-item-snippet.no-score {
    grid-column: 2 / -1;
}

.shardwright-rag-debug-item .badge {
    color: var(--shardwright-primary);
    font-weight: 700;
}

.shardwright-rag-debug-item-body {
    margin-top: 8px;
    display: grid;
    gap: 8px;
}

.shardwright-rag-debug-item-body pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.4;
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-secondary);
    padding: 8px;
    max-height: 240px;
    overflow: auto;
}

.shardwright-rag-debug-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.shardwright-rag-debug-stage {
    border: 1px solid var(--shardwright-border);
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 6px 8px;
}

.shardwright-rag-debug-stage summary {
    cursor: pointer;
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 8px;
    align-items: center;
}

.shardwright-rag-debug-stage summary > * {
    min-width: 0;
}

.shardwright-rag-debug-stage summary > span:nth-child(2),
.shardwright-rag-debug-stage summary > span:nth-child(4) {
    overflow-wrap: anywhere;
}

.shardwright-rag-debug-stage .badge {
    background: color-mix(in srgb, var(--shardwright-primary) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 50%, transparent);
    color: var(--shardwright-primary);
    border-radius: 999px;
    min-width: 20px;
    text-align: center;
    padding: 1px 6px;
}

.shardwright-rag-debug-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    padding: 4px 0;
    border-bottom: 1px dashed color-mix(in srgb, var(--shardwright-border) 80%, transparent);
}

.shardwright-rag-debug-row:last-child {
    border-bottom: none;
}

.shardwright-rag-debug-score-step {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 4px 10px;
    font-size: 12px;
}

.shardwright-rag-debug-bar-row {
    display: grid;
    grid-template-columns: 140px 1fr auto;
    gap: 8px;
    align-items: center;
    margin: 4px 0;
}

.shardwright-rag-debug-bar-row .name,
.shardwright-rag-debug-bar-row .count {
    font-size: 12px;
    color: var(--shardwright-text-secondary);
}

.shardwright-rag-debug-bar-row .bar {
    position: relative;
    height: 10px;
    background: color-mix(in srgb, var(--shardwright-bg-secondary) 85%, transparent);
    border: 1px solid var(--shardwright-border);
    border-radius: 999px;
    overflow: hidden;
}

.shardwright-rag-debug-bar-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--shardwright-primary) 70%, transparent);
    width: 0;
}

.shardwright-rag-debug-injection-preview {
    margin-top: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    border: 1px solid color-mix(in srgb, var(--shardwright-primary) 45%, var(--shardwright-border));
    border-left-width: 4px;
    border-radius: 6px;
    background: var(--shardwright-bg-primary);
    padding: 10px;
    min-height: 80px;
    max-height: 260px;
    overflow: auto;
}

@media (max-width: 600px) {
    .shardwright-rag-debug-split {
        grid-template-columns: 1fr;
    }

    .shardwright-rag-debug-stage summary {
        grid-template-columns: auto 1fr;
    }
}
`;
