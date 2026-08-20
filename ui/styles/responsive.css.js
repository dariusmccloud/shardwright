export const RESPONSIVE_CSS = `
/* ==========================================================================
   SECTION 30: MOBILE RESPONSIVE STYLES
   ========================================================================== */

@media (max-width: 768px) {
    /* Remove min-width constraints that cause overflow on mobile */
    .shardwright-prompts-modal {
        min-width: unset !important;
        width: 100%;
        padding: 10px;
    }

    .shardwright-chat-manager-modal {
        min-width: unset !important;
        width: 100%;
        padding: 10px;
    }

    .shardwright-clean-context-modal {
        min-width: unset !important;
        width: 100%;
    }

    /* Tab buttons: allow wrapping and fill available space */
    .shardwright-tab-header {
        flex-wrap: wrap;
    }

    .shardwright-tab-button {
        padding: 8px 10px;
        font-size: 13px;
        flex: 1 1 auto;
        text-align: center;
    }

    /* Ensure textareas stay readable on mobile */
    .shardwright-prompts-tab-content textarea,
    .shardwright-sharder-prompts-tab textarea,
    .shardwright-events-prompt-tab textarea {
        font-size: 12px !important;
    }

    /* Stack chat manager action buttons vertically */
    .shardwright-action-buttons {
        flex-direction: column;
    }

    .shardwright-action-buttons .menu_button {
        min-width: unset;
    }

    /* Popup footer controls: allow wrapping on narrow screens */
    .popup:has(.shardwright-prompts-modal) .popup-controls {
        flex-wrap: wrap;
        gap: 5px;
    }

    .shardwright-popup-left-buttons {
        flex-wrap: wrap;
    }

    /* RAG Settings Modal */
    .shardwright-rag-modal {
        padding: 10px;
    }

    .shardwright-rag-status-bar {
        grid-template-columns: 1fr;
    }

    .shardwright-rag-grid-two {
        grid-template-columns: 1fr;
    }

    .shardwright-rag-accordion[data-rag-section="backend"] .shardwright-accordion-content {
        grid-template-columns: 1fr;
    }

    #shardwright-rag-reranker-config,
    #shardwright-rag-qdrant-config {
        grid-template-columns: 1fr;
    }

    .shardwright-rag-actions-primary {
        grid-template-columns: 1fr;
    }

    .shardwright-rag-actions-secondary {
        flex-direction: column;
    }

    .shardwright-rag-actions-secondary .menu_button {
        min-width: unset;
        width: 100%;
    }

    .shardwright-rag-vectorization-grid {
        grid-template-columns: 1fr;
    }

    .shardwright-rag-actions-row {
        flex-direction: column;
    }

    .shardwright-rag-actions-row .menu_button {
        min-width: unset;
        width: 100%;
    }

    .shardwright-rag-section {
        padding: 8px;
    }

    .shardwright-rag-template {
        min-height: 80px;
        font-size: 12px;
    }
}
`;
