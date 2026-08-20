/**
 * RAG Settings Modal Component for Shardwright
 */

import { Popup, POPUP_RESULT, POPUP_TYPE } from '../../../../../../popup.js';
import { saveSettings, getDefaultSettings } from '../../../core/settings.js';
import { openRagBrowserModal } from '../management/rag-browser-modal.js';
import { openRagDebugModal } from '../management/rag-debug-modal.js';
import { LorebookDropdown } from '../../dropdowns/lorebook-dropdown.js';
import { createSegmentedToggle, createRangeSliderPair, infoHintHtml, mountInfoHints } from '../../common/index.js';
import { debounce } from '../../common/ui-utils.js';
import { showSsConfirm } from '../../common/modal-base.js';
import {
    checkPluginAvailability,
    checkBackendHealth,
    initBackend,
    getCollectionStats,
    getShardCollectionId,
    getStandardCollectionId,
    checkEmbeddingAvailability,
    hasRagEmbeddingApiKey,
    storeRagEmbeddingApiKey,
    clearRagEmbeddingApiKey,
    hasRagRerankerApiKey,
    storeRagRerankerApiKey,
    clearRagRerankerApiKey,
    checkRerankerHealth,
    testEmbeddingConnection,
    testRerankerConnection,
    resolveShardChunkingMode,
    vectorizeAllShardsByMode,
    vectorizeAllStandardSummaries,
    purgeCollection,
} from '../../../core/rag/index.js';
import { ragLog } from '../../../core/logger.js';
import { getArchitecturalRagUiPosture } from '../../../core/rag/architectural-rag-ui.js';

const HYBRID_WEIGHT_STEP = 0.05;
const HYBRID_WEIGHT_DEFAULT_ALPHA = 0.4;
const HYBRID_WEIGHT_DEFAULT_BETA = 0.6;

/**
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

/**
 * @param {number} value
 * @param {number} step
 * @returns {number}
 */
function roundToStep(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
        return clamp01(value);
    }
    const rounded = Math.round(value / step) * step;
    return clamp01(Number(rounded.toFixed(getStepDecimals(step))));
}

/**
 * @param {number} step
 * @returns {number}
 */
function getStepDecimals(step) {
    const parts = String(step).split('.');
    return parts[1] ? parts[1].length : 0;
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatWeight(value) {
    return clamp01(Number(value)).toFixed(getStepDecimals(HYBRID_WEIGHT_STEP));
}

/**
 * @param {number} alpha
 * @param {number} beta
 * @returns {{ alpha: number, beta: number }}
 */
function normalizeHybridWeights(alpha, beta) {
    const safeAlpha = Number.isFinite(alpha) ? alpha : HYBRID_WEIGHT_DEFAULT_ALPHA;
    const safeBeta = Number.isFinite(beta) ? beta : HYBRID_WEIGHT_DEFAULT_BETA;
    const total = safeAlpha + safeBeta;
    const normalizedAlpha = total > 0 ? (safeAlpha / total) : HYBRID_WEIGHT_DEFAULT_ALPHA;
    const roundedAlpha = roundToStep(normalizedAlpha, HYBRID_WEIGHT_STEP);
    const roundedBeta = roundToStep(1 - roundedAlpha, HYBRID_WEIGHT_STEP);
    return { alpha: roundedAlpha, beta: roundedBeta };
}

/**
 * @param {number|string} v
 * @param {number} fallback
 * @returns {number}
 */
function toInt(v, fallback) {
    const parsed = parseInt(String(v), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * @param {number|string} v
 * @param {number} fallback
 * @returns {number}
 */
function toFloat(v, fallback) {
    const parsed = parseFloat(String(v));
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * @param {string} key
 * @param {string} title
 * @param {string} icon
 * @param {string} content
 * @param {boolean} [defaultOpen=false]
 * @returns {string}
 */
function buildRagAccordion(key, title, icon, content, defaultOpen = false) {
    const openDisplay = key === 'backend' ? 'grid' : 'block';
    const expanded = defaultOpen ? ' expanded' : '';
    const hiddenClass = defaultOpen ? '' : ' shardwright-hidden';
    const ariaExpanded = defaultOpen ? 'true' : 'false';

    return `
        <div class="shardwright-review-accordion shardwright-rag-accordion${expanded}" data-rag-section="${key}">
            <div class="shardwright-accordion-header" role="button" tabindex="0" aria-expanded="${ariaExpanded}">
                <span class="shardwright-accordion-toggle">
                    <i class="fa-solid fa-chevron-right"></i>
                </span>
                <span class="shardwright-accordion-title">
                    <i class="fa-solid ${icon}"></i> ${title}
                </span>
            </div>
            <div class="shardwright-accordion-content${hiddenClass}" data-expanded-display="${openDisplay}">
                ${content}
            </div>
        </div>
    `;
}

/**
 * @param {Object} rag
 * @param {boolean} isSharder
 * @returns {string}
 */
function renderModalHtml(rag, isSharder, architecturalPosture = null) {
    const backend = rag.backend || 'vectra';
    const isQdrant = backend === 'qdrant';
    const isMilvus = backend === 'milvus';
    const qdrantUseCloud = rag.backendConfig?.qdrantUseCloud === true;
    const rerankerEnabled = !!rag.reranker?.enabled;
    const isHybridWeighted = rag.hybridFusionMethod === 'weighted';
    const showWeightedSlider = rag.scoringMethod === 'hybrid' && isHybridWeighted && rerankerEnabled;
    const showWeightedInputs = isHybridWeighted && !rerankerEnabled;
    const normalizedWeights = normalizeHybridWeights(rag.hybridAlpha ?? HYBRID_WEIGHT_DEFAULT_ALPHA, rag.hybridBeta ?? HYBRID_WEIGHT_DEFAULT_BETA);
    const modeBadgeClass = isSharder ? 'shardwright-rag-mode-sharder' : 'shardwright-rag-mode-standard';
    const modeLabel = isSharder ? 'Sharder Mode' : 'Standard Mode';

    return `
        <div class="shardwright-rag-modal">
            <h3 class="shardwright-rag-title">RAG Settings - <span class="shardwright-rag-mode-badge ${modeBadgeClass}">${modeLabel}</span></h3>
            <div class="shardwright-rag-master-toggle">
                <label class="checkbox_label">
                    <input id="shardwright-rag-enabled" class="shardwright-rag-control" type="checkbox" ${rag.enabled ? 'checked' : ''} />
                    <span>Enable RAG</span>
                </label>
            </div>
            ${architecturalPosture ? `
                <div class="shardwright-rag-warning">
                    <strong>${architecturalPosture.label}:</strong> ${architecturalPosture.description}<br />
                    ${architecturalPosture.warmArchive}
                </div>
            ` : ''}

            <div id="shardwright-rag-body" class="${rag.enabled ? '' : 'shardwright-hidden'}">
                <div class="shardwright-rag-status-bar">
                    <div class="shardwright-rag-status-item" id="shardwright-rag-status-reranker">
                        <div class="shardwright-rag-status-label">Re-Ranker</div>
                        <div class="shardwright-rag-status-value" id="shardwright-rag-reranker-status">Checking...</div>
                    </div>
                    <div class="shardwright-rag-status-item" id="shardwright-rag-status-embedding">
                        <div class="shardwright-rag-status-label">Embedding Source</div>
                        <div class="shardwright-rag-status-value" id="shardwright-rag-embedding-status">Checking...</div>
                    </div>
                    <div class="shardwright-rag-status-item" id="shardwright-rag-status-backend">
                        <div class="shardwright-rag-status-label">Backend</div>
                        <div class="shardwright-rag-status-value" id="shardwright-rag-backend-health">Checking...</div>
                    </div>
                </div>
                <div class="shardwright-rag-status-actions">
                    <div class="shardwright-rag-actions-primary">
                        <input id="shardwright-rag-refresh-health" class="menu_button" type="button" value="Refresh Health" />
                        <input id="shardwright-rag-test-embedding" class="menu_button shardwright-rag-control" type="button" value="Test Embedding Source" />
                        <input id="shardwright-rag-test-reranker" class="menu_button shardwright-rag-control" type="button" value="Test Re-ranker" />
                        <input id="shardwright-rag-init-backend" class="menu_button shardwright-rag-control" type="button" value="Initialize Backend" />
                    </div>
                    <div class="shardwright-rag-actions-secondary">
                        <input id="shardwright-rag-vectorize-all" class="menu_button shardwright-rag-control" type="button" value="Vectorize All Shards" />
                        <input id="shardwright-rag-open-browser" class="menu_button shardwright-rag-control" type="button" value="Browse Collections" />
                        <input id="shardwright-rag-open-debug" class="menu_button shardwright-rag-control" type="button" value="Debug RAG" />
                        <input id="shardwright-rag-open-history" class="menu_button shardwright-rag-control" type="button" value="RAG History" />
                        <input id="shardwright-rag-purge-all" class="menu_button shardwright-rag-control shardwright-rag-btn-destructive" type="button" value="Purge All Vectors" />
                        <input id="shardwright-rag-reset-defaults" class="menu_button shardwright-rag-control" type="button" value="Reset to Defaults" />
                    </div>
                    <p id="shardwright-rag-embedding-test-status" class="shardwright-rag-inline-hint shardwright-text-hint">Embedding source test: not run</p>
                    <p id="shardwright-rag-reranker-test-status" class="shardwright-rag-inline-hint shardwright-text-hint">Re-ranker test: not run</p>
                    <p id="shardwright-rag-autosave-status" class="shardwright-rag-inline-hint shardwright-text-hint">All changes autosave.</p>
                </div>
                <div id="shardwright-rag-warning" class="shardwright-rag-warning shardwright-hidden"></div>

                ${buildRagAccordion('backend', 'Backend', 'fa-server', `
                    <div class="shardwright-rag-backend-left">
                        <div class="shardwright-block">
                            <label for="shardwright-rag-backend">Backend Source</label>
                            <select id="shardwright-rag-backend" class="text_pole shardwright-rag-control">
                                <option value="vectra" ${backend === 'vectra' ? 'selected' : ''}>Vectra (default, local)</option>
                                <option value="lancedb" ${backend === 'lancedb' ? 'selected' : ''}>LanceDB (local)</option>
                                <option value="qdrant" ${backend === 'qdrant' ? 'selected' : ''}>Qdrant</option>
                                <option value="milvus" ${backend === 'milvus' ? 'selected' : ''}>Milvus</option>
                            </select>
                        </div>
                        <div id="shardwright-rag-qdrant-config" class="${isQdrant ? '' : 'shardwright-hidden'}">
                            <div id="shardwright-rag-qdrant-local" class="${qdrantUseCloud ? 'shardwright-hidden' : ''}">
                                <div class="shardwright-block">
                                    <label for="shardwright-rag-qdrant-address">API Address</label>
                                    <input id="shardwright-rag-qdrant-address" class="text_pole shardwright-rag-control" type="text" value="${rag.backendConfig?.qdrantAddress || 'localhost:6333'}" placeholder="localhost:6333">
                                </div>
                                <div class="shardwright-block">
                                    <label for="shardwright-rag-qdrant-local-key">Qdrant Key (optional)</label>
                                    <input id="shardwright-rag-qdrant-local-key" class="text_pole shardwright-rag-control" type="password" value="${rag.backendConfig?.qdrantApiKey || ''}">
                                </div>                                                                                             
                            </div>
                            <div id="shardwright-rag-qdrant-cloud" class="${qdrantUseCloud ? '' : 'shardwright-hidden'}">
                                <div class="shardwright-block">
                                    <label for="shardwright-rag-qdrant-url">Cloud URL</label>
                                    <input id="shardwright-rag-qdrant-url" class="text_pole shardwright-rag-control" type="text" value="${rag.backendConfig?.qdrantUrl || ''}" placeholder="https://cluster-id.region.aws.cloud.qdrant.io" />
                                </div>
                                <div class="shardwright-block">
                                    <label for="shardwright-rag-qdrant-cloud-key">Qdrant Cloud Key</label>
                                    <input id="shardwright-rag-qdrant-cloud-key" class="text_pole shardwright-rag-control" type="password" value="${rag.backendConfig?.qdrantApiKey || ''}" />
                                </div>
                            </div>
                            <label class="checkbox_label">
                                <input id="shardwright-rag-qdrant-use-cloud" class="shardwright-rag-control" type="checkbox" ${qdrantUseCloud ? 'checked' : ''} />
                                <span>Use Qdrant Cloud</span>
                            </label>                            
                        </div>

                        <div id="shardwright-rag-milvus-config" class="${isMilvus ? '' : 'shardwright-hidden'}">
                            <h5 class="shardwright-rag-subsection-title">Milvus Connection</h5>
                            <div class="shardwright-block">
                                <label for="shardwright-rag-milvus-address">Milvus Address</label>
                                <input id="shardwright-rag-milvus-address" class="text_pole shardwright-rag-control" type="text" value="${rag.backendConfig?.milvusAddress || 'localhost:19530'}" />
                            </div>
                            <div class="shardwright-block">
                                <label for="shardwright-rag-milvus-token">Milvus Token (optional)</label>
                                <input id="shardwright-rag-milvus-token" class="text_pole shardwright-rag-control" type="password" value="${rag.backendConfig?.milvusToken || ''}" />
                            </div>
                        </div>
                    </div>
                    <div class="shardwright-rag-backend-right">
                        <div class="shardwright-block">
                            <label for="shardwright-rag-source">Embedding Source</label>
                            <select id="shardwright-rag-source" class="text_pole shardwright-rag-control">
                                <option value="transformers" ${(rag.source || 'transformers') === 'transformers' ? 'selected' : ''}>Transformers (local)</option>
                                <option value="openai" ${rag.source === 'openai' ? 'selected' : ''}>OpenAI</option>
                                <option value="ollama" ${rag.source === 'ollama' ? 'selected' : ''}>Ollama</option>
                                <option value="llamacpp" ${rag.source === 'llamacpp' ? 'selected' : ''}>llama.cpp</option>
                                <option value="vllm" ${rag.source === 'vllm' ? 'selected' : ''}>vLLM</option>
                                <option value="koboldcpp" ${rag.source === 'koboldcpp' ? 'selected' : ''}>KoboldCpp</option>
                                <option value="bananabread" ${rag.source === 'bananabread' ? 'selected' : ''}>Bananabread</option>
                                <option value="extras" ${rag.source === 'extras' ? 'selected' : ''}>Extras API</option>
                                <option value="openrouter" ${rag.source === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                                <option value="linkapi" ${rag.source === 'linkapi' ? 'selected' : ''}>LinkAPI</option>
                                <option value="custom" ${rag.source === 'custom' ? 'selected' : ''}>Custom OpenAI-Compatible (Direct)</option>
                            </select>
                        </div>
                        <div class="shardwright-block">
                            <label id="shardwright-rag-api-url-label" for="shardwright-rag-api-url">Embedding API URL (optional override)</label>
                            <input id="shardwright-rag-api-url" class="text_pole shardwright-rag-control" type="text" value="${rag.apiUrl || ''}" placeholder="Leave blank to use default; e.g. http://localhost:11434" />
                            <p id="shardwright-rag-api-url-hint" class="shardwright-rag-inline-hint shardwright-text-hint">Overrides the default URL for this source. Useful for OpenAI-compatible proxies or custom endpoints.</p>
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-model">Embedding Model (optional) ${infoHintHtml('shardwright-rag-embedding-model-hint', 'Model name sent to the embedding provider. For Custom source, this is required.')}</label>
                            <input id="shardwright-rag-model" class="text_pole shardwright-rag-control" type="text" value="${rag.model || ''}" placeholder="text-embedding-3-large" />
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-embedding-key">Embedding API Key (secure storage)</label>
                            <input id="shardwright-rag-embedding-key" class="text_pole" type="password" value="" placeholder="Enter new key to update; leave blank to keep current" />
                            <div class="shardwright-rag-actions-row shardwright-rag-actions-row-tight">
                                <input id="shardwright-rag-store-embedding-key" class="menu_button" type="button" value="Store Key" />
                                <input id="shardwright-rag-clear-embedding-key" class="menu_button" type="button" value="Clear Key" />
                            </div>
                            <p id="shardwright-rag-embedding-key-status" class="shardwright-rag-inline-hint shardwright-text-hint">Checking secure key status...</p>
                        </div>
                    </div>
                    <h5 class="shardwright-rag-subsection-title">Vectorization</h5>
                    <div class="shardwright-rag-vectorization-grid">
                        <div class="shardwright-block">
                            <label class="checkbox_label">
                                <input id="shardwright-rag-auto-vectorize-new" class="shardwright-rag-control" type="checkbox" ${rag.autoVectorizeNewSummaries ? 'checked' : ''} />
                                <span>Auto-Vector New Summaries</span>
                            </label>
                        </div>
                        ${isSharder ? `
                        <div class="shardwright-block">
                            <label for="shardwright-rag-chunking-mode">Shard Chunking Mode ${infoHintHtml('shardwright-rag-chunking-mode-hint', 'Section-aware mode splits shards into superseding, cumulative, and rolling chunks with replacement/merge pruning behavior.')}</label>
                            <div id="shardwright-rag-chunking-mode-host"></div>
                        </div>
                        ` : `
                        <div class="shardwright-block">
                            <label for="shardwright-rag-prose-chunking-mode">Prose Chunking Mode ${infoHintHtml('shardwright-rag-prose-chunking-mode-hint', 'Paragraph splits on double newlines. Full Summary indexes the whole summary as one chunk.')}</label>
                            <div id="shardwright-rag-prose-chunking-mode-host"></div>
                        </div>
                        `}
                        <div class="shardwright-block">
                            <label class="checkbox_label">
                                <input id="shardwright-rag-use-lorebooks-vectorization" class="shardwright-rag-control" type="checkbox" ${rag.useLorebooksForVectorization ? 'checked' : ''} />
                                <span>Use Lorebook ${infoHintHtml('shardwright-rag-vectorization-lorebooks-hint', 'Selected lorebooks are scanned for shard-style entries when bulk vectorizing.')}</span>
                            </label>
                            <div id="shardwright-rag-vectorization-lorebook-options" class="shardwright-rag-vectorization-lorebook-options ${rag.useLorebooksForVectorization ? '' : 'shardwright-hidden'}">
                                <div id="shardwright-rag-vectorization-lorebook-dropdown"></div>
                            </div>
                        </div>

                        <div class="shardwright-rag-stats" id="shardwright-rag-stats">Loading collection stats...</div>
                    </div>
                `)}

                ${buildRagAccordion('retrieval', 'Retrieval', 'fa-magnifying-glass', `
                    <div class="shardwright-rag-grid-two">
                        <div class="shardwright-block">
                            <label class="checkbox_label">
                                <input id="shardwright-rag-include-lorebook-shards" class="shardwright-rag-control" type="checkbox" ${rag.includeLorebooksInShardSelection ? 'checked' : ''} />
                                <span>Scan Lorebooks for Shard Selection (System output only) ${infoHintHtml('shardwright-rag-lorebook-selection-hint', 'Overrides shard discovery gating so sharder shard pickers also scan selected lorebooks while output mode is set to system.')}</span>
                            </label>
                        </div>
                    </div>

                    <div class="shardwright-rag-subsection">
                        <div class="shardwright-block">
                            <label class="checkbox_label">
                                <input id="shardwright-rag-reranker-enabled" class="shardwright-rag-control" type="checkbox" ${rag.reranker?.enabled ? 'checked' : ''} />
                                <span>Enable Re-ranker (Optional) ${infoHintHtml('shardwright-rag-reranker-enabled-hint', 'Re-sorts retrieved chunks with a stronger relevance model so the most useful memories rise to the top.')}</span>
                            </label>
                        </div>
                        <div id="shardwright-rag-reranker-config" class="${rag.reranker?.enabled ? '' : 'shardwright-hidden'}">
                            <div class="shardwright-block">
                                <label for="shardwright-rag-reranker-provider">Re-ranker Provider</label>
                                <select id="shardwright-rag-reranker-provider" class="text_pole shardwright-rag-control">
                                    <option value="similharity" ${(rag.reranker?.provider || 'similharity') === 'similharity' ? 'selected' : ''}>Similharity Proxy</option>
                                    <option value="openrouter" ${rag.reranker?.provider === 'openrouter' ? 'selected' : ''}>OpenRouter (Direct)</option>
                                    <option value="linkapi" ${rag.reranker?.provider === 'linkapi' ? 'selected' : ''}>LinkAPI (Direct)</option>
                                    <option value="custom" ${rag.reranker?.provider === 'custom' ? 'selected' : ''}>Custom Endpoint (Direct)</option>
                                </select>
                            </div>
                            <div class="shardwright-block">
                                <label id="shardwright-rag-reranker-url-label" for="shardwright-rag-reranker-url">Re-ranker API URL</label>
                                <input id="shardwright-rag-reranker-url" class="text_pole shardwright-rag-control" type="text" value="${rag.reranker?.apiUrl || ''}" placeholder="http://localhost:8080/rerank" />
                                <p id="shardwright-rag-reranker-url-hint" class="shardwright-rag-inline-hint shardwright-text-hint">Upstream reranker URL passed to Similharity.</p>
                            </div>
                            <div class="shardwright-block">
                                <label for="shardwright-rag-reranker-model">Re-ranker Model (optional)</label>
                                <input id="shardwright-rag-reranker-model" class="text_pole shardwright-rag-control" type="text" value="${rag.reranker?.model || ''}" placeholder="bge-reranker-v2-m3" />
                            </div>
                            <div class="shardwright-block">
                                <label for="shardwright-rag-reranker-key">Re-ranker API Key (secure storage)</label>
                                <input id="shardwright-rag-reranker-key" class="text_pole" type="password" value="" placeholder="Enter new key to update; leave blank to keep current" />
                                <div class="shardwright-rag-actions-row shardwright-rag-actions-row-tight">
                                    <input id="shardwright-rag-store-reranker-key" class="menu_button" type="button" value="Store Key" />
                                    <input id="shardwright-rag-clear-reranker-key" class="menu_button" type="button" value="Clear Key" />
                                </div>
                                <p id="shardwright-rag-reranker-key-status" class="shardwright-rag-inline-hint shardwright-text-hint">Checking secure key status...</p>
                            </div>
                        </div>
                    </div>
                    <div class="shardwright-rag-grid-two">
                        <div class="shardwright-block">
                            <label for="shardwright-rag-insert-count">Insert Count</label>
                            <span class="shardwright-rag-sublabel">Chunks injected per generation</span>
                            <input id="shardwright-rag-insert-count" class="text_pole shardwright-rag-control" type="number" min="1" value="${rag.insertCount ?? 5}" />
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-query-count">Query Count</label>
                            <span class="shardwright-rag-sublabel">Recent messages used as the search query</span>
                            <input id="shardwright-rag-query-count" class="text_pole shardwright-rag-control" type="number" min="1" value="${rag.queryCount ?? 2}" />
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-protect-count">Protect Count</label>
                            <span class="shardwright-rag-sublabel">Recent messages checked for duplicate content</span>
                            <input id="shardwright-rag-protect-count" class="text_pole shardwright-rag-control" type="number" min="0" value="${rag.protectCount ?? 5}" />
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-max-items">Max Items per Section</label>
                            <span class="shardwright-rag-sublabel">Cap items per section in compacted blocks (Rolling/Anchors)</span>
                            <input id="shardwright-rag-max-items" class="text_pole shardwright-rag-control" type="number" min="1" value="${rag.maxItemsPerCompactedSection ?? 5}" />
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-threshold">Score Threshold ${infoHintHtml('shardwright-rag-score-threshold-hint', 'Minimum relevance score a chunk must meet to be included (0-1). Higher = stricter.')}</label>
                            <div id="shardwright-rag-threshold-host"></div>
                        </div>
                        ${!isSharder ? `
                        <div class="shardwright-block">
                            <label for="shardwright-rag-freshness">Recency Freshness Weight ${infoHintHtml('shardwright-rag-freshness-weight-hint', 'Gives a small score boost to the most recent summaries (0-1). Prevents context loss for non-sharder mode.')}</label>
                            <div id="shardwright-rag-freshness-host"></div>
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-recent-count">Recent Summary Count ${infoHintHtml('shardwright-rag-recent-count-hint', 'Number of most-recent summaries to always include, regardless of relevance score.')}</label>
                            <input id="shardwright-rag-recent-count" class="text_pole shardwright-rag-control" type="number" min="0" value="${rag.recentSummaryCount ?? 1}" />
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-max-chunks-per-shard">Max Chunks per Shard ${infoHintHtml('shardwright-rag-max-chunks-per-shard-hint', 'Cap paragraphs from the same summary to prevent one long entry from crowding out others.')}</label>
                            <input id="shardwright-rag-max-chunks-per-shard" class="text_pole shardwright-rag-control" type="number" min="1" value="${rag.maxChunksPerShard ?? 2}" />
                        </div>
                        ` : ''}
                    </div>

                    <div class="shardwright-rag-grid-two">
                        <div class="shardwright-block">
                            <label for="shardwright-rag-scoring">Scoring Method ${infoHintHtml('shardwright-rag-scoring-method-hint', 'How matches are scored: keyword, BM25, or hybrid (vector + BM25).')}</label>
                            <select id="shardwright-rag-scoring" class="text_pole shardwright-rag-control">
                                <option value="keyword" ${rag.scoringMethod === 'keyword' ? 'selected' : ''}>Keyword</option>
                                <option value="bm25" ${rag.scoringMethod === 'bm25' ? 'selected' : ''}>BM25</option>
                                <option value="hybrid" ${rag.scoringMethod === 'hybrid' ? 'selected' : ''}>Hybrid</option>
                            </select>
                            <p class="shardwright-rag-inline-hint shardwright-text-hint" id="shardwright-rag-hybrid-hint"></p>
                        </div>
                        <div class="shardwright-block">
                            <label for="shardwright-rag-injection-mode">Injection Mode ${infoHintHtml('shardwright-rag-injection-mode-hint', 'Where memories are inserted: the extension prompt or a variable you place in your prompt text.')}</label>
                            <select id="shardwright-rag-injection-mode" class="text_pole shardwright-rag-control">
                                <option value="extension_prompt" ${(rag.injectionMode ?? 'extension_prompt') === 'extension_prompt' ? 'selected' : ''}>Extension Prompt (Position / Depth)</option>
                                <option value="variable" ${rag.injectionMode === 'variable' ? 'selected' : ''}>Variable ({{getvar::...}})</option>
                            </select>
                        </div>
                    </div>

                    <div id="shardwright-rag-ext-prompt-controls" class="${(rag.injectionMode ?? 'extension_prompt') !== 'extension_prompt' ? 'shardwright-hidden' : ''}">
                        <div class="shardwright-rag-grid-two">
                            <div class="shardwright-block">
                                <label for="shardwright-rag-position">Injection Position</label>
                                <select id="shardwright-rag-position" class="text_pole shardwright-rag-control">
                                    <option value="0" ${(rag.position ?? 0) === 0 ? 'selected' : ''}>After System Prompt (0)</option>
                                    <option value="1" ${(rag.position ?? 0) === 1 ? 'selected' : ''}>In Chat at Depth (1)</option>
                                    <option value="2" ${(rag.position ?? 0) === 2 ? 'selected' : ''}>Before System Prompt (2)</option>
                                </select>
                            </div>
                            <div class="shardwright-block">
                                <label for="shardwright-rag-depth">Injection Depth</label>
                                <input id="shardwright-rag-depth" class="text_pole shardwright-rag-control" type="number" min="0" value="${rag.depth ?? 2}" />
                            </div>
                        </div>
                    </div>

                    <div id="shardwright-rag-var-controls" class="${rag.injectionMode === 'variable' ? '' : 'shardwright-hidden'}">
                        <div class="shardwright-block">
                            <label for="shardwright-rag-var-name">Variable Name</label>
                            <input id="shardwright-rag-var-name" class="text_pole shardwright-rag-control" type="text" value="${rag.injectionVariableName || 'shardwright_rag_memory'}" />
                            <p class="shardwright-text-hint">Place <code>{{getvar::${rag.injectionVariableName || 'shardwright_rag_memory'}}}</code> anywhere in your character card, system prompt, or author's note to inject memories there.</p>
                        </div>
                    </div>

                    <div id="shardwright-rag-hybrid-controls" class="${rag.scoringMethod === 'hybrid' ? '' : 'shardwright-hidden'}">
                        <div class="shardwright-rag-grid-two">
                            <div class="shardwright-block">
                                <label for="shardwright-rag-hybrid-fusion">Hybrid Fusion Method ${infoHintHtml('shardwright-rag-hybrid-fusion-hint', 'How vector and BM25 scores are combined (RRF or weighted blend).')}</label>
                                <div id="shardwright-rag-hybrid-fusion-host"></div>
                            </div>
                            <div class="shardwright-block">
                                <label for="shardwright-rag-hybrid-overfetch">Hybrid Overfetch Multiplier ${infoHintHtml('shardwright-rag-hybrid-overfetch-hint', 'Fetches extra candidates before fusion so hybrid scoring has more to choose from. Higher = more recall, more cost.')}</label>
                                <input id="shardwright-rag-hybrid-overfetch" class="text_pole shardwright-rag-control" type="number" min="1" max="12" value="${rag.hybridOverfetchMultiplier ?? 4}" />
                            </div>
                        </div>
                        <div class="shardwright-rag-grid-two">
                            <div class="shardwright-block ${rag.hybridFusionMethod !== 'weighted' ? '' : 'shardwright-hidden'}" id="shardwright-rag-rrf-k-wrap">
                                <label for="shardwright-rag-hybrid-rrf-k">RRF k</label>
                                <input id="shardwright-rag-hybrid-rrf-k" class="text_pole shardwright-rag-control" type="number" min="1" max="500" value="${rag.hybridRrfK ?? 60}" />
                            </div>
                            <div class="shardwright-block ${showWeightedSlider ? '' : 'shardwright-hidden'}" id="shardwright-rag-weighted-slider-wrap">
                                <label for="shardwright-rag-hybrid-weight">Vector vs BM25 ${infoHintHtml('shardwright-rag-hybrid-weight-hint', 'Adjusts how much semantic similarity (vector) vs keyword relevance (BM25) contributes in hybrid mode.')}</label>
                                <div class="shardwright-rag-weighted-scale">
                                    <span class="shardwright-rag-weighted-label">Vector <strong id="shardwright-rag-hybrid-weight-vector">${formatWeight(normalizedWeights.alpha)}</strong></span>
                                    <span class="shardwright-rag-weighted-label">BM25 <strong id="shardwright-rag-hybrid-weight-bm25">${formatWeight(normalizedWeights.beta)}</strong></span>
                                </div>
                                <div id="shardwright-rag-hybrid-weight-host"></div>
                            </div>
                            <div class="shardwright-block ${showWeightedInputs ? '' : 'shardwright-hidden'}" id="shardwright-rag-weighted-alpha-wrap">
                                <label for="shardwright-rag-hybrid-alpha">Weighted Alpha (Vector)</label>
                                <input id="shardwright-rag-hybrid-alpha" class="text_pole shardwright-rag-control" type="number" min="0" max="1" step="0.05" value="${rag.hybridAlpha ?? 0.4}" />
                            </div>
                            <div class="shardwright-block ${showWeightedInputs ? '' : 'shardwright-hidden'}" id="shardwright-rag-weighted-beta-wrap">
                                <label for="shardwright-rag-hybrid-beta">Weighted Beta (BM25)</label>
                                <input id="shardwright-rag-hybrid-beta" class="text_pole shardwright-rag-control" type="number" min="0" max="1" step="0.05" value="${rag.hybridBeta ?? 0.6}" />
                            </div>
                        </div>
                        <p id="shardwright-rag-hybrid-weighted-hint" class="shardwright-rag-inline-hint shardwright-text-hint shardwright-rag-hybrid-weighted-hint ${rag.scoringMethod === 'hybrid' && rag.hybridFusionMethod === 'weighted' ? '' : 'shardwright-hidden'}">Values are normalized as proportional weights (e.g., 2:3 = 0.4:0.6).</p>
                    </div>

                    <div class="shardwright-block">
                        <label for="shardwright-rag-template">Injection Template ({{text}} required)</label>
                        <textarea id="shardwright-rag-template" class="text_pole shardwright-rag-control shardwright-rag-template">${rag.template || 'Recalled memories:\n{{text}}'}</textarea>
                    </div>

                    ${isSharder ? `
                    <div class="shardwright-block">
                        <label class="checkbox_label">
                            <input id="shardwright-rag-scene-expand" class="shardwright-rag-control" type="checkbox" ${rag.sceneExpansion !== false ? 'checked' : ''} />
                            <span>Scene Expansion ${infoHintHtml('shardwright-rag-scene-expansion-hint', 'If a chunk from a scene is found, pull in the rest of that scene for fuller context.')}</span>
                        </label>
                    </div>
                    <div class="shardwright-block ${rag.sceneExpansion !== false ? '' : 'shardwright-hidden'}" id="shardwright-rag-scene-max-wrap">
                        <label for="shardwright-rag-scene-max">Max Scene Expansion Chunks</label>
                        <div id="shardwright-rag-scene-max-host"></div>
                    </div>
                    ` : `
                    <p class="shardwright-rag-inline-hint shardwright-text-hint shardwright-rag-scene-mode-hint">Scene Expansion is available in Sharder Mode.</p>
                    `}

                `)}
            </div>
        </div>
    `;
}

/**
 * @param {Object} rag
 * @param {string} collectionId
 */
async function updateStats(rag, collectionId) {
    const statsEl = document.getElementById('shardwright-rag-stats');
    if (!statsEl) return;

    try {
        const stats = await getCollectionStats(collectionId, rag);
        const count = stats?.stats?.count ?? stats?.stats?.total ?? stats?.count ?? stats?.total ?? 0;
        statsEl.textContent = `Collection Stats: fragments=${count}`;
    } catch (error) {
        statsEl.textContent = `Collection stats unavailable: ${error?.message || error}`;
    }
}

function setControlState(disabled) {
    for (const el of document.querySelectorAll('.shardwright-rag-control')) {
        if (typeof el.setDisabled === 'function') {
            el.setDisabled(!!disabled);
            continue;
        }

        if ('disabled' in el) {
            el.disabled = !!disabled;
        }
    }
}

function setupRagAccordionHandlers() {
    const toggleAccordion = (header) => {
        const accordion = header.closest('.shardwright-review-accordion');
        if (!accordion) return;

        const content = accordion.querySelector('.shardwright-accordion-content');
        if (!content) return;

        const isExpanded = accordion.classList.toggle('expanded');
        content.classList.toggle('shardwright-hidden', !isExpanded);
        header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    };

    for (const header of document.querySelectorAll('.shardwright-rag-accordion .shardwright-accordion-header')) {
        if (!header.hasAttribute('role')) {
            header.setAttribute('role', 'button');
        }
        if (!header.hasAttribute('tabindex')) {
            header.setAttribute('tabindex', '0');
        }

        header.addEventListener('click', (e) => {
            if (e.target?.closest?.('button, input, select, textarea, a, label')) return;
            toggleAccordion(header);
        });

        header.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            e.preventDefault();
            toggleAccordion(header);
        });
    }
}

function updateBackendConditionalUi() {
    const backend = document.getElementById('shardwright-rag-backend')?.value || 'vectra';

    const qdrant = document.getElementById('shardwright-rag-qdrant-config');
    const milvus = document.getElementById('shardwright-rag-milvus-config');

    qdrant?.classList.toggle('shardwright-hidden', backend !== 'qdrant');
    milvus?.classList.toggle('shardwright-hidden', backend !== 'milvus');
    updateQdrantCloudUi();

    const hybridHint = document.getElementById('shardwright-rag-hybrid-hint');

    if (hybridHint) {
        hybridHint.textContent = (backend === 'qdrant' || backend === 'milvus')
            ? 'Hybrid uses native fusion on this backend.'
            : 'Hybrid uses client-side BM25 + fusion fallback on this backend.';
    }
}

function updateMasterToggleUi() {
    const enabled = !!document.getElementById('shardwright-rag-enabled')?.checked;
    const body = document.getElementById('shardwright-rag-body');
    body?.classList.toggle('shardwright-hidden', !enabled);
}

function updateQdrantCloudUi() {
    const useCloud = !!document.getElementById('shardwright-rag-qdrant-use-cloud')?.checked;
    const local = document.getElementById('shardwright-rag-qdrant-local');
    const cloud = document.getElementById('shardwright-rag-qdrant-cloud');
    local?.classList.toggle('shardwright-hidden', useCloud);
    cloud?.classList.toggle('shardwright-hidden', !useCloud);
}

function updateChunkingUi() {
    // Placeholder for future mode-specific controls.
}

function updateHybridUi() {
    const scoringMethod = document.getElementById('shardwright-rag-scoring')?.value || 'keyword';
    const fusionMethod = document.getElementById('shardwright-rag-hybrid-fusion')?.value || 'rrf';
    const rerankerEnabled = !!document.getElementById('shardwright-rag-reranker-enabled')?.checked;

    const hybridWrap = document.getElementById('shardwright-rag-hybrid-controls');
    const rrfWrap = document.getElementById('shardwright-rag-rrf-k-wrap');
    const sliderWrap = document.getElementById('shardwright-rag-weighted-slider-wrap');
    const alphaWrap = document.getElementById('shardwright-rag-weighted-alpha-wrap');
    const betaWrap = document.getElementById('shardwright-rag-weighted-beta-wrap');
    const weightedHint = document.getElementById('shardwright-rag-hybrid-weighted-hint');
    const showWeightedSlider = scoringMethod === 'hybrid' && fusionMethod === 'weighted' && rerankerEnabled;
    const showWeightedInputs = scoringMethod === 'hybrid' && fusionMethod === 'weighted' && !rerankerEnabled;

    hybridWrap?.classList.toggle('shardwright-hidden', scoringMethod !== 'hybrid');
    rrfWrap?.classList.toggle('shardwright-hidden', !(scoringMethod === 'hybrid' && fusionMethod !== 'weighted'));
    sliderWrap?.classList.toggle('shardwright-hidden', !showWeightedSlider);
    alphaWrap?.classList.toggle('shardwright-hidden', !showWeightedInputs);
    betaWrap?.classList.toggle('shardwright-hidden', !showWeightedInputs);
    weightedHint?.classList.toggle('shardwright-hidden', !(scoringMethod === 'hybrid' && fusionMethod === 'weighted'));
    syncWeightedSliderFromInputs();
}

function updateInjectionModeUi() {
    const mode = document.getElementById('shardwright-rag-injection-mode')?.value || 'extension_prompt';
    document.getElementById('shardwright-rag-ext-prompt-controls')?.classList.toggle('shardwright-hidden', mode !== 'extension_prompt');
    document.getElementById('shardwright-rag-var-controls')?.classList.toggle('shardwright-hidden', mode !== 'variable');
}

function updateExpansionUi() {
    const sceneExpandEl = document.getElementById('shardwright-rag-scene-expand');
    if (!sceneExpandEl) return; // not present in standard mode
    const sceneEnabled = !!sceneExpandEl.checked;
    const sceneWrap = document.getElementById('shardwright-rag-scene-max-wrap');
    sceneWrap?.classList.toggle('shardwright-hidden', !sceneEnabled);
}

/** Default URLs and models for each embedding source (static, allocated once). */
const EMBEDDING_SOURCE_DEFAULTS = {
    transformers: { url: 'http://localhost:5000', model: 'sentence-transformers/all-MiniLM-L6-v2' },
    openai: { url: 'https://api.openai.com/v1', model: 'text-embedding-3-small' },
    ollama: { url: 'http://localhost:11434', model: 'nomic-embed-text' },
    llamacpp: { url: 'http://localhost:8000', model: 'default' },
    vllm: { url: 'http://localhost:8000', model: 'default' },
    koboldcpp: { url: 'http://localhost:5001', model: 'default' },
    bananabread: { url: 'http://localhost:8008', model: 'default' },
    extras: { url: 'http://localhost:5100', model: 'default' },
    openrouter: { url: 'https://openrouter.ai/api/v1', model: 'openai/text-embedding-3-small' },
    linkapi: { url: 'https://api.linkapi.ai/v1', model: 'qwen3-embedding-8b' },
    custom: { url: '', model: '' },
};

/** Default URLs and models for each re-ranker provider (static, allocated once). */
const RERANKER_PROVIDER_DEFAULTS = {
    similharity: { url: 'http://localhost:8000/rerank', model: 'bge-reranker-v2-m3' },
    openrouter: { url: 'https://openrouter.ai/api/v1', model: 'openai/text-embedding-3-small' },
    linkapi: { url: 'https://api.linkapi.ai/v1', model: 'qwen3-reranker-8b' },
    custom: { url: '', model: '' },
};

/** Whether the given re-ranker provider uses direct mode (calls API from browser). */
function isDirectRerankerProvider(provider) {
    return provider === 'custom' || provider === 'openrouter' || provider === 'linkapi';
}

/** Sources that are always direct (call API from browser, never via Similharity plugin). */
const ALWAYS_DIRECT_EMBEDDING_SOURCES = new Set(['custom', 'linkapi']);

/**
 * OpenAI-compatible sources where user overrides (apiUrl/apiKey) trigger direct mode.
 * The Similharity plugin ignores overrides for these, so direct is the only way they take effect.
 */
const OPENAI_COMPATIBLE_EMBEDDING_SOURCES = new Set(['openai', 'openrouter', 'togetherai', 'mistral', 'electronhub']);

/**
 * Sources where the Similharity plugin reads apiUrl from req.body (proxy overrides work).
 */
const PROXY_OVERRIDE_SOURCES = new Set(['ollama', 'llamacpp', 'vllm', 'koboldcpp', 'bananabread', 'extras']);

/**
 * Sources where the plugin uses its own internal config — user cannot override URL/key/model.
 */
const PLUGIN_ONLY_SOURCES = new Set(['transformers']);

function updateEmbeddingModeUi() {
    const source = document.getElementById('shardwright-rag-source')?.value || 'transformers';
    const isCustom = ALWAYS_DIRECT_EMBEDDING_SOURCES.has(source);
    const isOpenAICompat = OPENAI_COMPATIBLE_EMBEDDING_SOURCES.has(source);
    const isPluginOnly = PLUGIN_ONLY_SOURCES.has(source);
    const urlLabel = document.getElementById('shardwright-rag-api-url-label');
    const urlHint = document.getElementById('shardwright-rag-api-url-hint');
    const urlInput = document.getElementById('shardwright-rag-api-url');
    const modelInput = document.getElementById('shardwright-rag-model');
    const embeddingKeyBlock = document.getElementById('shardwright-rag-embedding-key')?.closest('.shardwright-block');

    const defaults = EMBEDDING_SOURCE_DEFAULTS[source] || { url: '', model: '' };

    // Disable fields for transformers (plugin handles everything internally)
    if (urlInput) urlInput.disabled = isPluginOnly;
    if (modelInput) modelInput.disabled = isPluginOnly;
    if (embeddingKeyBlock) embeddingKeyBlock.style.opacity = isPluginOnly ? '0.5' : '';

    if (urlLabel) {
        if (isPluginOnly) {
            urlLabel.textContent = 'Embedding API URL (managed by Similharity plugin)';
        } else if (isCustom) {
            urlLabel.textContent = 'Embedding Endpoint URL (required)';
        } else if (isOpenAICompat) {
            urlLabel.textContent = 'Embedding API URL (enables direct mode when set)';
        } else {
            urlLabel.textContent = 'Embedding API URL (optional override)';
        }
    }
    if (urlInput) {
        if (isPluginOnly) {
            urlInput.placeholder = 'Not configurable — plugin uses built-in transformers';
        } else if (isCustom) {
            // Show actual default for known sources (linkapi), generic pattern for truly custom
            urlInput.placeholder = source === 'linkapi'
                ? 'https://api.linkapi.ai/v1'
                : 'https://api.example.com/v1 — /embeddings is appended automatically';
        } else {
            urlInput.placeholder = `${defaults.url}`;
        }
    }
    if (modelInput) {
        if (isPluginOnly) {
            modelInput.placeholder = 'Not configurable — plugin uses built-in model';
        } else if (isCustom) {
            modelInput.placeholder = 'Required for custom endpoint';
        } else {
            modelInput.placeholder = `${defaults.model}`;
        }
    }
    if (urlHint) {
        if (isPluginOnly) {
            urlHint.textContent = 'Transformers runs locally via the Similharity plugin. URL, model, and API key settings have no effect.';
        } else if (isCustom) {
            urlHint.textContent = 'Direct mode calls this URL from the browser. Provide your base URL (e.g. https://api.example.com/v1) — /embeddings is appended automatically.';
        } else if (isOpenAICompat) {
            urlHint.textContent = 'Setting a URL or API key enables direct mode (calls the API from the browser instead of proxying through the Similharity plugin). Leave blank to use ST\'s global config via the plugin.';
        } else {
            urlHint.textContent = 'Overrides the default URL for this source. The Similharity plugin forwards this URL to the backend.';
        }
    }
}

function updateRerankerUi() {
    const enabled = !!document.getElementById('shardwright-rag-reranker-enabled')?.checked;
    const provider = document.getElementById('shardwright-rag-reranker-provider')?.value || 'similharity';
    const isDirect = isDirectRerankerProvider(provider);
    const wrap = document.getElementById('shardwright-rag-reranker-config');
    const urlLabel = document.getElementById('shardwright-rag-reranker-url-label');
    const urlHint = document.getElementById('shardwright-rag-reranker-url-hint');
    const urlInput = document.getElementById('shardwright-rag-reranker-url');
    const modelInput = document.getElementById('shardwright-rag-reranker-model');

    wrap?.classList.toggle('shardwright-hidden', !enabled);
    updateHybridUi();

    const defaults = RERANKER_PROVIDER_DEFAULTS[provider] || { url: '', model: '' };

    if (urlLabel) {
        urlLabel.textContent = isDirect ? 'Re-ranker Endpoint URL (Optional override)' : 'Re-ranker API URL';
    }
    if (urlInput) {
        // Show actual defaults for known direct providers
        if (provider === 'linkapi') {
            urlInput.placeholder = 'https://api.linkapi.ai/v1';
        } else if (provider === 'openrouter') {
            urlInput.placeholder = 'https://openrouter.ai/api/v1';
        } else if (isDirect) {
            urlInput.placeholder = 'https://api.example.com/v1 — /rerank is appended automatically';
        } else {
            urlInput.placeholder = `Default: ${defaults.url}`;
        }
    }
    if (modelInput) {
        modelInput.placeholder = isDirect
            ? 'Required for direct endpoint'
            : `Default: ${defaults.model}`;
    }
    if (urlHint) {
        urlHint.textContent = isDirect
            ? 'Direct mode calls this URL from the browser. /rerank is appended automatically.'
            : 'Upstream reranker URL passed to Similharity.';
    }
}

function setRangePairValue(id, value) {
    const input = document.getElementById(id);
    const pair = input?.closest?.('.shardwright-range-pair');
    if (pair && typeof pair.setValue === 'function') {
        pair.setValue(value);
        return;
    }
    if (input) {
        input.value = value ?? '';
    }
    const numberInput = document.getElementById(`${id}-input`);
    if (numberInput) {
        numberInput.value = value ?? '';
    }
}

function setHybridWeightLabels(alpha, beta) {
    const vectorEl = document.getElementById('shardwright-rag-hybrid-weight-vector');
    const bm25El = document.getElementById('shardwright-rag-hybrid-weight-bm25');
    if (vectorEl) vectorEl.textContent = formatWeight(alpha);
    if (bm25El) bm25El.textContent = formatWeight(beta);
}

function setHybridWeightInputs(alpha, beta) {
    const alphaInput = document.getElementById('shardwright-rag-hybrid-alpha');
    const betaInput = document.getElementById('shardwright-rag-hybrid-beta');
    if (alphaInput) alphaInput.value = formatWeight(alpha);
    if (betaInput) betaInput.value = formatWeight(beta);
}

function applyHybridSliderValue(betaValue) {
    const beta = roundToStep(clamp01(betaValue), HYBRID_WEIGHT_STEP);
    const alpha = roundToStep(1 - beta, HYBRID_WEIGHT_STEP);
    setHybridWeightLabels(alpha, beta);
    setHybridWeightInputs(alpha, beta);
}

function syncWeightedSliderFromInputs() {
    const alphaInput = document.getElementById('shardwright-rag-hybrid-alpha');
    const betaInput = document.getElementById('shardwright-rag-hybrid-beta');
    if (!alphaInput && !betaInput) return;

    const rawAlpha = toFloat(alphaInput?.value, HYBRID_WEIGHT_DEFAULT_ALPHA);
    const rawBeta = toFloat(betaInput?.value, HYBRID_WEIGHT_DEFAULT_BETA);
    const normalized = normalizeHybridWeights(rawAlpha, rawBeta);
    setRangePairValue('shardwright-rag-hybrid-weight', normalized.beta);
    setHybridWeightLabels(normalized.alpha, normalized.beta);
    const sliderWrap = document.getElementById('shardwright-rag-weighted-slider-wrap');
    const sliderVisible = sliderWrap && !sliderWrap.classList.contains('shardwright-hidden');
    if (sliderVisible) {
        setHybridWeightInputs(normalized.alpha, normalized.beta);
    }
}

/**
 * @param {Object} base
 * @param {boolean} isSharder
 * @returns {Object}
 */
function readRagDraft(base, isSharder) {
    const draft = {
        ...base,
        vectorizationLorebookNames: Array.isArray(base.vectorizationLorebookNames)
            ? [...base.vectorizationLorebookNames]
            : [],
        backendConfig: {
            ...(base.backendConfig || {}),
        },
    };

    draft.enabled = !!document.getElementById('shardwright-rag-enabled')?.checked;
    draft.backend = document.getElementById('shardwright-rag-backend')?.value || 'vectra';
    draft.source = document.getElementById('shardwright-rag-source')?.value?.trim() || 'transformers';
    draft.apiUrl = document.getElementById('shardwright-rag-api-url')?.value?.trim() || '';
    draft.model = document.getElementById('shardwright-rag-model')?.value?.trim() || '';

    draft.backendConfig.qdrantAddress = document.getElementById('shardwright-rag-qdrant-address')?.value?.trim() || 'localhost:6333';
    draft.backendConfig.qdrantUseCloud = !!document.getElementById('shardwright-rag-qdrant-use-cloud')?.checked;
    const qdrantLocalKey = document.getElementById('shardwright-rag-qdrant-local-key')?.value || '';
    const qdrantCloudKey = document.getElementById('shardwright-rag-qdrant-cloud-key')?.value || '';
    draft.backendConfig.qdrantApiKey = draft.backendConfig.qdrantUseCloud ? qdrantCloudKey : qdrantLocalKey;
    draft.backendConfig.qdrantUrl = document.getElementById('shardwright-rag-qdrant-url')?.value?.trim() || '';
    draft.backendConfig.milvusAddress = document.getElementById('shardwright-rag-milvus-address')?.value?.trim() || 'localhost:19530';
    draft.backendConfig.milvusToken = document.getElementById('shardwright-rag-milvus-token')?.value || '';

    draft.reranker = {
        enabled: !!document.getElementById('shardwright-rag-reranker-enabled')?.checked,
        provider: document.getElementById('shardwright-rag-reranker-provider')?.value || 'similharity',
        apiUrl: document.getElementById('shardwright-rag-reranker-url')?.value?.trim() || '',
        model: document.getElementById('shardwright-rag-reranker-model')?.value?.trim() || '',
        secretId: base.reranker?.secretId || null,
        providerConfigs: base.reranker?.providerConfigs && typeof base.reranker.providerConfigs === 'object'
            ? { ...base.reranker.providerConfigs }
            : {},
    };

    // Sync current flat embedding values into sourceConfigs for the active source
    if (!draft.sourceConfigs || typeof draft.sourceConfigs !== 'object') {
        draft.sourceConfigs = {};
    }
    draft.sourceConfigs[draft.source] = {
        apiUrl: draft.apiUrl,
        model: draft.model,
        embeddingSecretId: draft.embeddingSecretId,
    };

    // Sync current flat reranker values into providerConfigs for the active provider
    draft.reranker.providerConfigs[draft.reranker.provider] = {
        apiUrl: draft.reranker.apiUrl,
        model: draft.reranker.model,
        secretId: draft.reranker.secretId,
    };

    draft.autoVectorizeNewSummaries = !!document.getElementById('shardwright-rag-auto-vectorize-new')?.checked;
    draft.useLorebooksForVectorization = !!document.getElementById('shardwright-rag-use-lorebooks-vectorization')?.checked;
    draft.includeLorebooksInShardSelection = !!document.getElementById('shardwright-rag-include-lorebook-shards')?.checked;

    if (isSharder) {
        draft.chunkingStrategy = 'per_message';
        draft.batchSize = 5;
        const chunkingMode = document.getElementById('shardwright-rag-chunking-mode')?.value === 'section'
            ? 'section'
            : 'standard';
        draft.chunkingMode = chunkingMode;
        draft.sceneAwareChunking = false;
        draft.sectionAwareChunking = chunkingMode === 'section';
        draft.sceneExpansion = !!document.getElementById('shardwright-rag-scene-expand')?.checked;
        draft.maxSceneExpansionChunks = Math.max(1, Math.min(25, toInt(document.getElementById('shardwright-rag-scene-max')?.value, 10)));
    } else {
        draft.proseChunkingMode = document.getElementById('shardwright-rag-prose-chunking-mode')?.value === 'full_summary'
            ? 'full_summary'
            : 'paragraph';
    }

    draft.scoringMethod = document.getElementById('shardwright-rag-scoring')?.value || 'keyword';
    draft.hybridFusionMethod = document.getElementById('shardwright-rag-hybrid-fusion')?.value || 'rrf';
    draft.hybridRrfK = Math.max(1, Math.min(500, toInt(document.getElementById('shardwright-rag-hybrid-rrf-k')?.value, 60)));
    draft.hybridAlpha = Math.min(1, Math.max(0, toFloat(document.getElementById('shardwright-rag-hybrid-alpha')?.value, 0.4)));
    draft.hybridBeta = Math.min(1, Math.max(0, toFloat(document.getElementById('shardwright-rag-hybrid-beta')?.value, 0.6)));
    draft.hybridOverfetchMultiplier = Math.max(1, Math.min(12, toInt(document.getElementById('shardwright-rag-hybrid-overfetch')?.value, 4)));
    draft.insertCount = Math.max(1, toInt(document.getElementById('shardwright-rag-insert-count')?.value, 5));
    draft.queryCount = Math.max(1, toInt(document.getElementById('shardwright-rag-query-count')?.value, 2));
    draft.protectCount = Math.max(0, toInt(document.getElementById('shardwright-rag-protect-count')?.value, 5));
    draft.maxItemsPerCompactedSection = Math.max(1, toInt(document.getElementById('shardwright-rag-max-items')?.value, 5));
    draft.scoreThreshold = Math.min(1, Math.max(0, toFloat(document.getElementById('shardwright-rag-threshold')?.value, 0.25)));
    draft.recencyFreshnessWeight = Math.min(1, Math.max(0, toFloat(document.getElementById('shardwright-rag-freshness')?.value, 0.1)));
    draft.recentSummaryCount = Math.max(0, toInt(document.getElementById('shardwright-rag-recent-count')?.value, 1));
    draft.maxChunksPerShard = Math.max(1, toInt(document.getElementById('shardwright-rag-max-chunks-per-shard')?.value, 2));
    draft.position = toInt(document.getElementById('shardwright-rag-position')?.value, 0);
    draft.depth = Math.max(0, toInt(document.getElementById('shardwright-rag-depth')?.value, 2));
    draft.template = document.getElementById('shardwright-rag-template')?.value || 'Recalled memories:\n{{text}}';
    draft.injectionMode = document.getElementById('shardwright-rag-injection-mode')?.value || 'extension_prompt';
    draft.injectionVariableName = document.getElementById('shardwright-rag-var-name')?.value?.trim() || 'shardwright_rag_memory';

    return draft;
}

/**
 * @param {Object} draft
 * @param {boolean} isSharder
 */
function updateDomFromDraft(draft, isSharder) {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (typeof el.setValue === 'function') {
            el.setValue(value);
            return;
        }
        if ('value' in el) {
            el.value = value ?? '';
        }
    };

    const setChecked = (id, checked) => {
        const el = document.getElementById(id);
        if (el && 'checked' in el) {
            el.checked = !!checked;
        }
    };

    setChecked('shardwright-rag-enabled', draft.enabled);
    setValue('shardwright-rag-backend', draft.backend || 'vectra');
    setValue('shardwright-rag-source', draft.source || 'transformers');
    setValue('shardwright-rag-api-url', draft.apiUrl || '');
    setValue('shardwright-rag-model', draft.model || '');

    setValue('shardwright-rag-qdrant-address', draft.backendConfig?.qdrantAddress || 'localhost:6333');
    setChecked('shardwright-rag-qdrant-use-cloud', draft.backendConfig?.qdrantUseCloud === true);
    setValue('shardwright-rag-qdrant-local-key', draft.backendConfig?.qdrantApiKey || '');
    setValue('shardwright-rag-qdrant-cloud-key', draft.backendConfig?.qdrantApiKey || '');
    setValue('shardwright-rag-qdrant-url', draft.backendConfig?.qdrantUrl || '');
    setValue('shardwright-rag-milvus-address', draft.backendConfig?.milvusAddress || 'localhost:19530');
    setValue('shardwright-rag-milvus-token', draft.backendConfig?.milvusToken || '');

    setChecked('shardwright-rag-auto-vectorize-new', draft.autoVectorizeNewSummaries !== false);
    setChecked('shardwright-rag-use-lorebooks-vectorization', draft.useLorebooksForVectorization === true);
    setChecked('shardwright-rag-include-lorebook-shards', draft.includeLorebooksInShardSelection === true);

    if (isSharder) {
        setValue('shardwright-rag-chunking-mode', draft.chunkingMode || 'standard');
        setChecked('shardwright-rag-scene-expand', draft.sceneExpansion !== false);
        setRangePairValue('shardwright-rag-scene-max', draft.maxSceneExpansionChunks ?? 10);
    } else {
        setValue('shardwright-rag-prose-chunking-mode', draft.proseChunkingMode || 'paragraph');
    }

    setValue('shardwright-rag-scoring', draft.scoringMethod || 'keyword');
    setValue('shardwright-rag-hybrid-fusion', draft.hybridFusionMethod || 'rrf');
    setValue('shardwright-rag-hybrid-rrf-k', draft.hybridRrfK ?? 60);
    setValue('shardwright-rag-hybrid-alpha', draft.hybridAlpha ?? 0.4);
    setValue('shardwright-rag-hybrid-beta', draft.hybridBeta ?? 0.6);
    syncWeightedSliderFromInputs();
    setValue('shardwright-rag-hybrid-overfetch', draft.hybridOverfetchMultiplier ?? 4);
    setValue('shardwright-rag-insert-count', draft.insertCount ?? 5);
    setValue('shardwright-rag-query-count', draft.queryCount ?? 2);
    setValue('shardwright-rag-protect-count', draft.protectCount ?? 5);
    setValue('shardwright-rag-max-items', draft.maxItemsPerCompactedSection ?? 5);
    setRangePairValue('shardwright-rag-threshold', draft.scoreThreshold ?? 0.25);
    setRangePairValue('shardwright-rag-freshness', draft.recencyFreshnessWeight ?? 0.1);
    setValue('shardwright-rag-position', draft.position ?? 0);
    setValue('shardwright-rag-depth', draft.depth ?? 2);
    setValue('shardwright-rag-template', draft.template || 'Recalled memories:\n{{text}}');
    setValue('shardwright-rag-injection-mode', draft.injectionMode || 'extension_prompt');
    setValue('shardwright-rag-var-name', draft.injectionVariableName || 'shardwright_rag_memory');

    setChecked('shardwright-rag-reranker-enabled', draft.reranker?.enabled);
    setValue('shardwright-rag-reranker-provider', draft.reranker?.provider || 'similharity');
    setValue('shardwright-rag-reranker-url', draft.reranker?.apiUrl || '');
    setValue('shardwright-rag-reranker-model', draft.reranker?.model || '');
}

/**
 * @param {Object} settings
 * @param {Object} saved
 * @param {string} ragBlockKey - 'rag' or 'ragStandard'
 */
function applyRagSettings(settings, saved, ragBlockKey) {
    const target = settings[ragBlockKey] || {};
    settings[ragBlockKey] = {
        ...target,
        ...saved,
        sourceConfigs: {
            ...(target.sourceConfigs || {}),
            ...(saved.sourceConfigs || {}),
        },
        backendConfig: {
            ...(target.backendConfig || {}),
            ...(saved.backendConfig || {}),
        },
        reranker: {
            ...(target.reranker || {}),
            ...(saved.reranker || {}),
            providerConfigs: {
                ...(target.reranker?.providerConfigs || {}),
                ...(saved.reranker?.providerConfigs || {}),
            },
        },
        vectorizationLorebookNames: Array.isArray(saved.vectorizationLorebookNames)
            ? [...saved.vectorizationLorebookNames]
            : (Array.isArray(target.vectorizationLorebookNames) ? [...target.vectorizationLorebookNames] : []),
    };
    // Ensure sceneAwareChunking stays false
    if (ragBlockKey === 'rag') {
        settings[ragBlockKey].sceneAwareChunking = false;
    }
}

/**
 * @param {Object} ragDraft
 */
async function runStatusChecks(ragDraft) {
    const rerankerEl = document.getElementById('shardwright-rag-reranker-status');
    const embedEl = document.getElementById('shardwright-rag-embedding-status');
    const backendEl = document.getElementById('shardwright-rag-backend-health');
    const warningEl = document.getElementById('shardwright-rag-warning');
    const summarize = (value, max = 90) => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        return text.length > max ? `${text.slice(0, max - 3)}...` : text;
    };

    try {
        const [plugin, embedding, backendHealth, embeddingHealth, rerankerHealth] = await Promise.all([
            checkPluginAvailability(),
            Promise.resolve(checkEmbeddingAvailability()),
            checkBackendHealth(ragDraft.backend || 'vectra'),
            testEmbeddingConnection(ragDraft, 'Shardwright settings health check')
                .then(result => ({
                    success: !!result?.success,
                    dimensions: Number(result?.dimensions) || 0,
                    error: '',
                }))
                .catch(error => ({
                    success: false,
                    dimensions: 0,
                    error: error?.message || String(error),
                })),
            checkRerankerHealth(ragDraft),
        ]);
        const ragSource = String(ragDraft?.source || '').trim();
        const ragModel = String(ragDraft?.model || '').trim();
        const ragApiUrl = String(ragDraft?.apiUrl || '').trim();
        const globalSource = String(embedding?.source || '').trim();
        const hasRagSource = !!ragSource;
        const sourceMismatch = hasRagSource && globalSource && ragSource !== globalSource;
        const backendName = String(ragDraft?.backend || 'vectra').trim() || 'vectra';

        if (rerankerEl) {
            rerankerEl.textContent = rerankerHealth.statusText;
        }

        if (embedEl) {
            const healthText = embeddingHealth.success ? 'Healthy' : 'Unhealthy';
            const sourceText = hasRagSource ? ragSource : 'not set';
            const modelText = ragModel || 'default';
            const apiText = ragApiUrl || 'default';
            const dimsText = embeddingHealth.success ? ` (${embeddingHealth.dimensions}d)` : '';
            const errorText = !embeddingHealth.success && embeddingHealth.error
                ? `: ${summarize(embeddingHealth.error)}`
                : '';
            const alwaysDirect = ALWAYS_DIRECT_EMBEDDING_SOURCES.has(ragSource);
            const openaiCompat = OPENAI_COMPATIBLE_EMBEDDING_SOURCES.has(ragSource);
            const hasOverrides = !!(ragApiUrl || ragDraft?.embeddingSecretId);
            const isDirectTest = alwaysDirect || (openaiCompat && hasOverrides);
            const proxyNote = (!isDirectTest && embeddingHealth.success)
                ? ' (via Similharity plugin)'
                : '';
            embedEl.textContent = `${sourceText} - ${healthText}${dimsText}${errorText}${proxyNote}; model ${modelText}; api ${apiText}`;
        }

        if (backendEl) {
            backendEl.textContent = backendHealth.healthy
                ? `${backendName} - Healthy`
                : `${backendName} - Unhealthy${backendHealth.message ? `: ${summarize(backendHealth.message)}` : ''}`;
        }

        const warnings = [];
        if (!plugin.available) {
            warnings.push('Similharity plugin is unavailable. Enable server plugins and install Similharity.');
        }
        if (!hasRagSource && !embedding.available) {
            warnings.push('Embedding source is not configured. Set it in SillyTavern Extensions > Vectors.');
        }
        if (!hasRagSource) {
            warnings.push('RAG embedding source is empty. Set "Embedding API/Source" in this modal.');
        }
        if (sourceMismatch) {
            warnings.push(`RAG source (${ragSource}) differs from ST vectors source (${globalSource}). Tests and vector operations use the RAG source.`);
        }

        if (warningEl) {
            if (warnings.length > 0) {
                warningEl.classList.remove('shardwright-hidden');
                warningEl.textContent = warnings.join(' ');
            } else {
                warningEl.classList.add('shardwright-hidden');
                warningEl.textContent = '';
            }
        }

        setControlState(!plugin.available);
    } catch (error) {
        ragLog.warn('Status check failed:', error?.message || error);
        if (warningEl) {
            warningEl.classList.remove('shardwright-hidden');
            warningEl.textContent = `Status check failed: ${error?.message || error}`;
        }
    }
}

/**
 * @param {Object} src
 * @param {boolean} isSharder
 * @returns {Object}
 */
function buildRagDraftFromSource(src, isSharder) {
    const source = src || {};

    return {
        enabled: source.enabled ?? false,
        backend: source.backend || 'vectra',
        source: source.source || 'transformers',
        apiUrl: source.apiUrl || '',
        model: source.model || '',
        embeddingSecretId: source.embeddingSecretId || null,
        sourceConfigs: source.sourceConfigs && typeof source.sourceConfigs === 'object'
            ? JSON.parse(JSON.stringify(source.sourceConfigs))
            : {},
        backendConfig: {
            qdrantAddress: source.backendConfig?.qdrantAddress
                || `${source.backendConfig?.qdrantHost || 'localhost'}:${source.backendConfig?.qdrantPort ?? 6333}`,
            qdrantUseCloud: source.backendConfig?.qdrantUseCloud === true
                || String(source.backendConfig?.qdrantUrl || '').trim().length > 0,
            qdrantApiKey: source.backendConfig?.qdrantApiKey || '',
            qdrantUrl: source.backendConfig?.qdrantUrl || '',
            milvusAddress: source.backendConfig?.milvusAddress || 'localhost:19530',
            milvusToken: source.backendConfig?.milvusToken || '',
        },
        autoVectorizeNewSummaries: source.autoVectorizeNewSummaries !== false,
        useLorebooksForVectorization: source.useLorebooksForVectorization === true,
        vectorizationLorebookNames: Array.isArray(source.vectorizationLorebookNames)
            ? [...source.vectorizationLorebookNames]
            : [],
        includeLorebooksInShardSelection: source.includeLorebooksInShardSelection === true,
        insertCount: source.insertCount ?? 5,
        queryCount: source.queryCount ?? 2,
        protectCount: source.protectCount ?? 5,
        maxItemsPerCompactedSection: source.maxItemsPerCompactedSection ?? 5,
        scoreThreshold: source.scoreThreshold ?? 0.25,
        scoringMethod: source.scoringMethod || 'keyword',
        hybridFusionMethod: source.hybridFusionMethod || 'rrf',
        hybridRrfK: source.hybridRrfK ?? 60,
        hybridAlpha: source.hybridAlpha ?? 0.4,
        hybridBeta: source.hybridBeta ?? 0.6,
        hybridOverfetchMultiplier: source.hybridOverfetchMultiplier ?? 4,
        position: source.position ?? 0,
        depth: source.depth ?? 2,
        template: source.template || 'Recalled memories:\n{{text}}',
        injectionMode: source.injectionMode || 'extension_prompt',
        injectionVariableName: source.injectionVariableName || 'shardwright_rag_memory',
        reranker: {
            enabled: source.reranker?.enabled ?? false,
            provider: source.reranker?.provider || source.reranker?.mode || 'similharity',
            apiUrl: source.reranker?.apiUrl || '',
            model: source.reranker?.model || '',
            secretId: source.reranker?.secretId || null,
            providerConfigs: source.reranker?.providerConfigs && typeof source.reranker.providerConfigs === 'object'
                ? JSON.parse(JSON.stringify(source.reranker.providerConfigs))
                : {},
        },
        // Sharder-only fields
        ...(isSharder ? {
            chunkingStrategy: (() => {
                const c = source.chunkingStrategy;
                return (c === 'conversation_turns' || c === 'message_batch' || c === 'per_message') ? c : 'per_message';
            })(),
            batchSize: source.batchSize ?? 5,
            chunkingMode: resolveShardChunkingMode(source),
            sceneAwareChunking: source.sceneAwareChunking === true,
            sectionAwareChunking: source.sectionAwareChunking === true,
            sceneExpansion: source.sceneExpansion !== false,
            maxSceneExpansionChunks: source.maxSceneExpansionChunks ?? 10,
        } : {
            // Standard-only fields
            proseChunkingMode: source.proseChunkingMode || 'paragraph',
        }),
    };
}
/**
 * Open the RAG settings modal.
 * @param {Object} settings
 */
export async function openRagSettingsModal(settings) {
    const isSharder = settings?.sharderMode === true;
    const ragBlockKey = isSharder ? 'rag' : 'ragStandard';
    const defaults = getDefaultSettings();

    // Ensure the target block exists
    if (!settings[ragBlockKey]) {
        settings[ragBlockKey] = { ...(defaults[ragBlockKey] || defaults.rag) };
    }

    const src = settings[ragBlockKey];

    // Build the working draft from the active block
    const rag = buildRagDraftFromSource(src, isSharder);

    const buildSecretSettingsView = () => {
        // Sync liveDraft secretIds onto the real settings object so writes
        // from storeRagEmbeddingApiKey/storeRagRerankerApiKey propagate back.
        const ragBlock = settings[ragBlockKey];
        if (ragBlock) {
            ragBlock.embeddingSecretId = liveDraft.embeddingSecretId || null;
            if (ragBlock.reranker) {
                ragBlock.reranker.secretId = liveDraft.reranker?.secretId || null;
            }
        }
        return { ...settings, rag: ragBlock };
    };

    let collectionId = null;
    try {
        collectionId = isSharder ? getShardCollectionId() : getStandardCollectionId();
    } catch {
        // No chat open — collection-specific features will be disabled
    }

    const popup = new Popup(
        renderModalHtml(rag, isSharder, getArchitecturalRagUiPosture(settings)),
        POPUP_TYPE.TEXT,
        null,
        {
            okButton: 'Close',
            cancelButton: null,
            wide: true,
            large: false,
        },
    );

    const showPromise = popup.show();
    let liveDraft = {
        ...rag,
        vectorizationLorebookNames: [...(rag.vectorizationLorebookNames || [])],
        sourceConfigs: rag.sourceConfigs ? JSON.parse(JSON.stringify(rag.sourceConfigs)) : {},
        backendConfig: { ...(rag.backendConfig || {}) },
        reranker: {
            ...(rag.reranker || {}),
            providerConfigs: rag.reranker?.providerConfigs
                ? JSON.parse(JSON.stringify(rag.reranker.providerConfigs))
                : {},
        },
    };
    let pendingEmbeddingKey = '';
    let pendingRerankerKey = '';
    const syncSecretIdsToActiveConfigs = () => {
        const ragBlock = settings[ragBlockKey];
        if (!ragBlock) return;

        const source = ragBlock.source || 'transformers';
        if (!ragBlock.sourceConfigs || typeof ragBlock.sourceConfigs !== 'object') {
            ragBlock.sourceConfigs = {};
        }
        if (!ragBlock.sourceConfigs[source]) {
            ragBlock.sourceConfigs[source] = {};
        }
        ragBlock.sourceConfigs[source].embeddingSecretId = ragBlock.embeddingSecretId || null;
        ragBlock.sourceConfigs[source].apiUrl = ragBlock.apiUrl || '';
        ragBlock.sourceConfigs[source].model = ragBlock.model || '';

        if (!ragBlock.reranker || typeof ragBlock.reranker !== 'object') {
            ragBlock.reranker = {};
        }
        const provider = ragBlock.reranker.provider || 'similharity';
        if (!ragBlock.reranker.providerConfigs || typeof ragBlock.reranker.providerConfigs !== 'object') {
            ragBlock.reranker.providerConfigs = {};
        }
        if (!ragBlock.reranker.providerConfigs[provider]) {
            ragBlock.reranker.providerConfigs[provider] = {};
        }
        ragBlock.reranker.providerConfigs[provider].secretId = ragBlock.reranker.secretId || null;
        ragBlock.reranker.providerConfigs[provider].apiUrl = ragBlock.reranker.apiUrl || '';
        ragBlock.reranker.providerConfigs[provider].model = ragBlock.reranker.model || '';
    };
    const syncLiveDraftSecretIdsFromSettings = () => {
        const ragBlock = settings[ragBlockKey];
        if (!ragBlock) return;

        liveDraft.embeddingSecretId = ragBlock.embeddingSecretId || null;
        if (!liveDraft.sourceConfigs || typeof liveDraft.sourceConfigs !== 'object') {
            liveDraft.sourceConfigs = {};
        }
        const source = liveDraft.source || ragBlock.source || 'transformers';
        if (!liveDraft.sourceConfigs[source]) {
            liveDraft.sourceConfigs[source] = {};
        }
        liveDraft.sourceConfigs[source].embeddingSecretId = liveDraft.embeddingSecretId;

        if (!liveDraft.reranker || typeof liveDraft.reranker !== 'object') {
            liveDraft.reranker = {};
        }
        liveDraft.reranker.secretId = ragBlock.reranker?.secretId || null;
        if (!liveDraft.reranker.providerConfigs || typeof liveDraft.reranker.providerConfigs !== 'object') {
            liveDraft.reranker.providerConfigs = {};
        }
        const provider = liveDraft.reranker.provider || ragBlock.reranker?.provider || 'similharity';
        if (!liveDraft.reranker.providerConfigs[provider]) {
            liveDraft.reranker.providerConfigs[provider] = {};
        }
        liveDraft.reranker.providerConfigs[provider].secretId = liveDraft.reranker.secretId;
    };

    requestAnimationFrame(async () => {
        let vectorizationLorebookDropdown = null;
        mountInfoHints(document.querySelector('.shardwright-rag-modal'));

        const syncDraftFromDom = () => {
            liveDraft = readRagDraft(liveDraft, isSharder);
        };
        const autosaveStatusEl = document.getElementById('shardwright-rag-autosave-status');
        const setAutosaveStatus = (message) => {
            if (!autosaveStatusEl) return;
            autosaveStatusEl.textContent = message;
        };
        const persistDraft = () => {
            syncDraftFromDom();
            applyRagSettings(settings, liveDraft, ragBlockKey);
            syncSecretIdsToActiveConfigs();

            try {
                saveSettings(settings);
                setAutosaveStatus('Saved.');
                return true;
            } catch (error) {
                ragLog.warn('RAG settings autosave failed:', error?.message || error);
                setAutosaveStatus('Save failed. Check logs.');
                return false;
            }
        };
        const persistDraftDebounced = debounce(() => {
            persistDraft();
        }, 400);

        const updateVectorizationLorebookUi = () => {
            const enabled = !!document.getElementById('shardwright-rag-use-lorebooks-vectorization')?.checked;
            const optionsDiv = document.getElementById('shardwright-rag-vectorization-lorebook-options');
            optionsDiv?.classList.toggle('shardwright-hidden', !enabled);

            if (!enabled) {
                return;
            }

            if (!vectorizationLorebookDropdown) {
                vectorizationLorebookDropdown = new LorebookDropdown('shardwright-rag-vectorization-lorebook-dropdown', {
                    initialSelection: Array.isArray(liveDraft.vectorizationLorebookNames)
                        ? [...liveDraft.vectorizationLorebookNames]
                        : [],
                    onSelectionChange: (selection) => {
                        liveDraft.vectorizationLorebookNames = Array.isArray(selection) ? [...selection] : [];
                        setAutosaveStatus('Saving...');
                        persistDraft();
                    },
                });
            }

            vectorizationLorebookDropdown.render();
            vectorizationLorebookDropdown.setSelection(
                Array.isArray(liveDraft.vectorizationLorebookNames)
                    ? [...liveDraft.vectorizationLorebookNames]
                    : [],
            );
        };

        const resetToDefaults = async () => {
            const confirm = await showSsConfirm(
                'Reset to Defaults',
                'Reset RAG settings to defaults for this mode? Connection settings will be preserved.'
            );
            if (confirm !== POPUP_RESULT.AFFIRMATIVE) {
                return;
            }

            const defaultSource = defaults[ragBlockKey] || defaults.rag;
            const defaultDraft = buildRagDraftFromSource(defaultSource, isSharder);
            const preservedReranker = {
                enabled: liveDraft.reranker?.enabled ?? false,
                provider: liveDraft.reranker?.provider || 'similharity',
                apiUrl: liveDraft.reranker?.apiUrl || '',
                model: liveDraft.reranker?.model || '',
                secretId: liveDraft.reranker?.secretId || null,
                providerConfigs: liveDraft.reranker?.providerConfigs
                    ? { ...liveDraft.reranker.providerConfigs }
                    : {},
            };

            const resetDraft = {
                ...defaultDraft,
                backend: liveDraft.backend,
                backendConfig: { ...(liveDraft.backendConfig || {}) },
                source: liveDraft.source,
                sourceConfigs: liveDraft.sourceConfigs
                    ? { ...liveDraft.sourceConfigs }
                    : {},
                apiUrl: liveDraft.apiUrl,
                model: liveDraft.model,
                embeddingSecretId: liveDraft.embeddingSecretId || null,
                reranker: {
                    ...(defaultDraft.reranker || {}),
                    ...preservedReranker,
                },
            };

            liveDraft = {
                ...resetDraft,
                vectorizationLorebookNames: Array.isArray(resetDraft.vectorizationLorebookNames)
                    ? [...resetDraft.vectorizationLorebookNames]
                    : [],
                backendConfig: { ...(resetDraft.backendConfig || {}) },
                sourceConfigs: { ...(resetDraft.sourceConfigs || {}) },
                reranker: {
                    ...(resetDraft.reranker || {}),
                    providerConfigs: { ...(resetDraft.reranker?.providerConfigs || {}) },
                },
            };

            updateDomFromDraft(liveDraft, isSharder);
            updateBackendConditionalUi();
            updateMasterToggleUi();
            updateQdrantCloudUi();
            updateChunkingUi();
            updateHybridUi();
            updateExpansionUi();
            updateEmbeddingModeUi();
            updateRerankerUi();
            updateInjectionModeUi();
            updateVectorizationLorebookUi();

            liveDraft = readRagDraft(liveDraft, isSharder);
            persistDraft();
            await runStatusChecks(liveDraft);
            if (collectionId) {
                await updateStats(liveDraft, collectionId);
            }
        };

        const mountSegmentedToggle = (hostId, controlId, options, value) => {
            const host = document.getElementById(hostId);
            if (!host) {
                return;
            }

            const segmented = createSegmentedToggle({
                options,
                value,
                className: 'shardwright-rag-control',
            });
            segmented.id = controlId;
            host.replaceChildren(segmented);
        };

        const mountRangePair = (hostId, controlId, min, max, step, value) => {
            const host = document.getElementById(hostId);
            if (!host) {
                return;
            }

            const pair = createRangeSliderPair({
                id: controlId,
                min,
                max,
                step,
                value,
                className: 'shardwright-rag-control',
            });
            host.replaceChildren(pair);
        };

        const mountHybridWeightSlider = (hostId, controlId, value) => {
            const host = document.getElementById(hostId);
            if (!host) {
                return;
            }

            const pair = createRangeSliderPair({
                id: controlId,
                min: 0,
                max: 1,
                step: HYBRID_WEIGHT_STEP,
                value,
                className: 'shardwright-rag-control',
            });

            const sync = () => {
                applyHybridSliderValue(pair.value);
            };
            pair.addEventListener('input', sync);
            pair.addEventListener('change', sync);

            host.replaceChildren(pair);
            syncWeightedSliderFromInputs();
        };

        mountRangePair('shardwright-rag-threshold-host', 'shardwright-rag-threshold', 0, 1, 0.01, rag.scoreThreshold ?? 0.25);
        mountRangePair('shardwright-rag-freshness-host', 'shardwright-rag-freshness', 0, 1, 0.01, rag.recencyFreshnessWeight ?? 0.1);
        mountRangePair('shardwright-rag-scene-max-host', 'shardwright-rag-scene-max', 1, 25, 1, rag.maxSceneExpansionChunks ?? 10);
        const normalizedWeights = normalizeHybridWeights(rag.hybridAlpha ?? HYBRID_WEIGHT_DEFAULT_ALPHA, rag.hybridBeta ?? HYBRID_WEIGHT_DEFAULT_BETA);
        mountHybridWeightSlider('shardwright-rag-hybrid-weight-host', 'shardwright-rag-hybrid-weight', normalizedWeights.beta);

        mountSegmentedToggle(
            'shardwright-rag-chunking-mode-host',
            'shardwright-rag-chunking-mode',
            [
                { value: 'standard', label: 'Standard' },
                { value: 'section', label: 'Section-Aware' },
            ],
            rag.chunkingMode || 'standard',
        );

        mountSegmentedToggle(
            'shardwright-rag-prose-chunking-mode-host',
            'shardwright-rag-prose-chunking-mode',
            [
                { value: 'paragraph', label: 'Paragraph' },
                { value: 'full_summary', label: 'Full Summary' },
            ],
            rag.proseChunkingMode || 'paragraph',
        );

        mountSegmentedToggle(
            'shardwright-rag-hybrid-fusion-host',
            'shardwright-rag-hybrid-fusion',
            [
                { value: 'rrf', label: 'RRF' },
                { value: 'weighted', label: 'Weighted' },
            ],
            rag.hybridFusionMethod || 'rrf',
        );

        const embeddingKeyInput = document.getElementById('shardwright-rag-embedding-key');
        const rerankerKeyInput = document.getElementById('shardwright-rag-reranker-key');

        // Track the active source/provider independently so swap logic works
        // even after syncDraftFromDom has already updated liveDraft.
        let activeEmbeddingSource = liveDraft.source || 'transformers';
        let activeRerankerProvider = liveDraft.reranker?.provider || 'similharity';

        // Per-provider config swap: saves old provider's fields, loads new provider's fields.
        // Uses `input` event (fires before `change` on <select>) and is registered before
        // the .shardwright-rag-control handlers so the DOM is swapped before syncDraftFromDom reads it.
        const sourceSelect = document.getElementById('shardwright-rag-source');
        const providerSelect = document.getElementById('shardwright-rag-reranker-provider');

        sourceSelect?.addEventListener('input', () => {
            const newSource = sourceSelect.value || 'transformers';
            if (activeEmbeddingSource === newSource) return;

            // Save current DOM values for the old source
            if (!liveDraft.sourceConfigs) liveDraft.sourceConfigs = {};
            liveDraft.sourceConfigs[activeEmbeddingSource] = {
                apiUrl: document.getElementById('shardwright-rag-api-url')?.value?.trim() || '',
                model: document.getElementById('shardwright-rag-model')?.value?.trim() || '',
                embeddingSecretId: liveDraft.embeddingSecretId || null,
            };

            // Load the new source's config (or blank)
            const newConfig = liveDraft.sourceConfigs[newSource] || {};
            const urlInput = document.getElementById('shardwright-rag-api-url');
            const modelInput = document.getElementById('shardwright-rag-model');
            if (urlInput) urlInput.value = newConfig.apiUrl || '';
            if (modelInput) modelInput.value = newConfig.model || '';
            liveDraft.embeddingSecretId = newConfig.embeddingSecretId || null;

            // Clear pending key (was for old source)
            pendingEmbeddingKey = '';
            if (embeddingKeyInput) embeddingKeyInput.value = '';

            activeEmbeddingSource = newSource;
        });

        providerSelect?.addEventListener('input', () => {
            const newProvider = providerSelect.value || 'similharity';
            if (activeRerankerProvider === newProvider) return;

            // Save current DOM values for the old provider
            if (!liveDraft.reranker) liveDraft.reranker = {};
            if (!liveDraft.reranker.providerConfigs) liveDraft.reranker.providerConfigs = {};
            liveDraft.reranker.providerConfigs[activeRerankerProvider] = {
                apiUrl: document.getElementById('shardwright-rag-reranker-url')?.value?.trim() || '',
                model: document.getElementById('shardwright-rag-reranker-model')?.value?.trim() || '',
                secretId: liveDraft.reranker.secretId || null,
            };

            // Load the new provider's config (or blank)
            const newConfig = liveDraft.reranker.providerConfigs[newProvider] || {};
            const urlInput = document.getElementById('shardwright-rag-reranker-url');
            const modelInput = document.getElementById('shardwright-rag-reranker-model');
            if (urlInput) urlInput.value = newConfig.apiUrl || '';
            if (modelInput) modelInput.value = newConfig.model || '';
            liveDraft.reranker.secretId = newConfig.secretId || null;

            // Clear pending key (was for old provider)
            pendingRerankerKey = '';
            if (rerankerKeyInput) rerankerKeyInput.value = '';

            activeRerankerProvider = newProvider;
        });

        for (const control of document.querySelectorAll('.shardwright-rag-control')) {
            const isTextLikeControl = control.matches('input[type="text"], input[type="password"], input[type="number"], textarea');
            control.addEventListener('input', () => {
                syncDraftFromDom();
                if (isTextLikeControl) {
                    setAutosaveStatus('Saving...');
                    persistDraftDebounced();
                }
            });
            control.addEventListener('change', () => {
                syncDraftFromDom();
                setAutosaveStatus('Saving...');
                persistDraft();
            });

            if (isTextLikeControl) {
                control.addEventListener('blur', () => {
                    setAutosaveStatus('Saving...');
                    persistDraft();
                });
            }
        }

        embeddingKeyInput?.addEventListener('input', () => {
            pendingEmbeddingKey = embeddingKeyInput.value || '';
        });

        rerankerKeyInput?.addEventListener('input', () => {
            pendingRerankerKey = rerankerKeyInput.value || '';
        });

        updateBackendConditionalUi();
        updateMasterToggleUi();
        updateQdrantCloudUi();
        updateChunkingUi();
        updateHybridUi();
        updateExpansionUi();
        updateEmbeddingModeUi();
        updateRerankerUi();
        updateVectorizationLorebookUi();
        setupRagAccordionHandlers();

        const embeddingKeyStatusEl = document.getElementById('shardwright-rag-embedding-key-status');
        const refreshEmbeddingKeyStatus = async () => {
            const hasKey = await hasRagEmbeddingApiKey(buildSecretSettingsView());
            if (embeddingKeyStatusEl) {
                embeddingKeyStatusEl.textContent = hasKey
                    ? 'A secure embedding key is stored.'
                    : 'No secure embedding key stored.';
            }
        };
        await refreshEmbeddingKeyStatus();

        const rerankerKeyStatusEl = document.getElementById('shardwright-rag-reranker-key-status');
        const refreshRerankerKeyStatus = async () => {
            const hasKey = await hasRagRerankerApiKey(buildSecretSettingsView());
            if (rerankerKeyStatusEl) {
                rerankerKeyStatusEl.textContent = hasKey
                    ? 'A secure re-ranker key is stored.'
                    : 'No secure re-ranker key stored.';
            }
        };
        await refreshRerankerKeyStatus();

        const initialDraft = readRagDraft(liveDraft, isSharder);
        await runStatusChecks(initialDraft);
        if (collectionId) {
            await updateStats(initialDraft, collectionId);
        } else {
            const statsEl = document.getElementById('shardwright-rag-stats');
            if (statsEl) statsEl.textContent = 'Collection stats: no chat open';
        }

        document.getElementById('shardwright-rag-backend')?.addEventListener('change', async () => {
            updateBackendConditionalUi();
            const draft = readRagDraft(liveDraft, isSharder);
            await runStatusChecks(draft);
            if (collectionId) await updateStats(draft, collectionId);
        });
        document.getElementById('shardwright-rag-enabled')?.addEventListener('change', () => {
            updateMasterToggleUi();
        });
        document.getElementById('shardwright-rag-qdrant-use-cloud')?.addEventListener('change', () => {
            updateQdrantCloudUi();
        });

        for (const id of [
            'shardwright-rag-source',
            'shardwright-rag-model',
            'shardwright-rag-api-url',
            'shardwright-rag-reranker-enabled',
            'shardwright-rag-reranker-provider',
            'shardwright-rag-reranker-url',
            'shardwright-rag-reranker-model',
        ]) {
            document.getElementById(id)?.addEventListener('change', async () => {
                const draft = readRagDraft(liveDraft, isSharder);
                await runStatusChecks(draft);
            });
        }

        document.getElementById('shardwright-rag-scoring')?.addEventListener('change', () => {
            updateHybridUi();
        });
        document.getElementById('shardwright-rag-hybrid-fusion')?.addEventListener('change', () => {
            updateHybridUi();
        });
        document.getElementById('shardwright-rag-injection-mode')?.addEventListener('change', () => {
            updateInjectionModeUi();
        });

        // Scene expansion toggle only exists in Sharder Mode
        if (isSharder) {
            document.getElementById('shardwright-rag-scene-expand')?.addEventListener('change', () => {
                updateExpansionUi();
            });
        }

        document.getElementById('shardwright-rag-source')?.addEventListener('change', () => {
            updateEmbeddingModeUi();
            refreshEmbeddingKeyStatus();
        });
        document.getElementById('shardwright-rag-reranker-enabled')?.addEventListener('change', () => {
            updateRerankerUi();
        });
        document.getElementById('shardwright-rag-reranker-provider')?.addEventListener('change', () => {
            updateRerankerUi();
            refreshRerankerKeyStatus();
        });
        document.getElementById('shardwright-rag-use-lorebooks-vectorization')?.addEventListener('change', () => {
            updateVectorizationLorebookUi();
        });

        document.getElementById('shardwright-rag-store-reranker-key')?.addEventListener('click', async () => {
            const newRerankerKey = String(pendingRerankerKey || '').trim();
            if (!newRerankerKey) {
                toastr.warning('Enter a re-ranker key first');
                return;
            }

            const stored = await storeRagRerankerApiKey(buildSecretSettingsView(), newRerankerKey);
            if (!stored) {
                toastr.error('Failed to store re-ranker API key securely');
                return;
            }

            pendingRerankerKey = '';
            if (rerankerKeyInput) {
                rerankerKeyInput.value = '';
            }
            syncLiveDraftSecretIdsFromSettings();
            setAutosaveStatus('Saving...');
            persistDraft();
            await refreshRerankerKeyStatus();
            toastr.success('Re-ranker API key stored securely');
        });

        document.getElementById('shardwright-rag-clear-reranker-key')?.addEventListener('click', async () => {
            const confirm = await showSsConfirm(
                'Clear Re-ranker API Key',
                'Remove the stored re-ranker API key from secure storage?',
            );
            if (confirm !== POPUP_RESULT.AFFIRMATIVE) {
                return;
            }

            const deleted = await clearRagRerankerApiKey(buildSecretSettingsView());
            pendingRerankerKey = '';
            if (rerankerKeyInput) {
                rerankerKeyInput.value = '';
            }
            syncLiveDraftSecretIdsFromSettings();
            setAutosaveStatus('Saving...');
            persistDraft();
            await refreshRerankerKeyStatus();
            if (deleted) {
                toastr.success('Stored re-ranker API key cleared');
            } else {
                toastr.warning('Could not confirm key deletion. Check server logs/settings.');
            }
        });

        document.getElementById('shardwright-rag-refresh-health')?.addEventListener('click', async () => {
            const draft = readRagDraft(liveDraft, isSharder);
            await runStatusChecks(draft);
        });

        document.getElementById('shardwright-rag-test-embedding')?.addEventListener('click', async () => {
            const btn = document.getElementById('shardwright-rag-test-embedding');
            const statusEl = document.getElementById('shardwright-rag-embedding-test-status');
            if (btn) btn.disabled = true;
            if (statusEl) {
                statusEl.textContent = 'Embedding source test: running...';
            }

            try {
                const draft = readRagDraft(liveDraft, isSharder);
                const testApiKey = String(pendingEmbeddingKey || '').trim();
                const result = await testEmbeddingConnection(
                    draft,
                    'Connection test',
                    { apiKeyOverride: testApiKey },
                );
                if (result.success) {
                    const msg = `Embedding source test passed (dimensions: ${result.dimensions}).`;
                    if (statusEl) statusEl.textContent = msg;
                    toastr.success(msg);
                } else {
                    const msg = 'Embedding source test failed (no embedding vector returned).';
                    if (statusEl) statusEl.textContent = msg;
                    toastr.error(msg);
                }
            } catch (error) {
                const msg = `Embedding source test failed: ${error?.message || error}`;
                if (statusEl) statusEl.textContent = msg;
                toastr.error(msg);
            } finally {
                if (btn) btn.disabled = false;
            }
        });

        document.getElementById('shardwright-rag-test-reranker')?.addEventListener('click', async () => {
            const btn = document.getElementById('shardwright-rag-test-reranker');
            const statusEl = document.getElementById('shardwright-rag-reranker-test-status');
            if (btn) btn.disabled = true;
            if (statusEl) {
                statusEl.textContent = 'Re-ranker test: running...';
            }

            try {
                const draft = readRagDraft(liveDraft, isSharder);
                const testApiKey = String(pendingRerankerKey || '').trim();
                const result = await testRerankerConnection(
                    draft,
                    { apiKeyOverride: testApiKey },
                );
                const modeText = String(result.mode || 'similharity');
                const targetText = String(result.target || '').trim() || '(default)';
                const detail = `${result.message} mode=${modeText}; target=${targetText}`;
                if (statusEl) {
                    statusEl.textContent = `Re-ranker test: ${detail}`;
                }
                if (result.success) {
                    toastr.success(detail);
                } else {
                    toastr.error(detail);
                }
            } catch (error) {
                const msg = `Re-ranker test failed: ${error?.message || error}`;
                if (statusEl) {
                    statusEl.textContent = msg;
                }
                toastr.error(msg);
            } finally {
                if (btn) btn.disabled = false;
            }
        });

        document.getElementById('shardwright-rag-store-embedding-key')?.addEventListener('click', async () => {
            const newEmbeddingKey = String(pendingEmbeddingKey || '').trim();
            if (!newEmbeddingKey) {
                toastr.warning('Enter an embedding key first');
                return;
            }

            const stored = await storeRagEmbeddingApiKey(buildSecretSettingsView(), newEmbeddingKey);
            if (!stored) {
                toastr.error('Failed to store embedding API key securely');
                return;
            }

            pendingEmbeddingKey = '';
            if (embeddingKeyInput) {
                embeddingKeyInput.value = '';
            }
            syncLiveDraftSecretIdsFromSettings();
            setAutosaveStatus('Saving...');
            persistDraft();
            await refreshEmbeddingKeyStatus();
            toastr.success('Embedding API key stored securely');
        });

        document.getElementById('shardwright-rag-clear-embedding-key')?.addEventListener('click', async () => {
            const confirm = await showSsConfirm(
                'Clear Embedding API Key',
                'Remove the stored embedding API key from secure storage?'
            );
            if (confirm !== POPUP_RESULT.AFFIRMATIVE) {
                return;
            }

            const deleted = await clearRagEmbeddingApiKey(buildSecretSettingsView());
            pendingEmbeddingKey = '';
            if (embeddingKeyInput) {
                embeddingKeyInput.value = '';
            }
            syncLiveDraftSecretIdsFromSettings();
            setAutosaveStatus('Saving...');
            persistDraft();
            await refreshEmbeddingKeyStatus();
            if (deleted) {
                toastr.success('Stored embedding API key cleared');
            } else {
                toastr.warning('Could not confirm key deletion. Check server logs/settings.');
            }
        });

        document.getElementById('shardwright-rag-init-backend')?.addEventListener('click', async () => {
            const draft = readRagDraft(liveDraft, isSharder);
            const backend = draft.backend;
            const useQdrantCloud = draft.backendConfig.qdrantUseCloud === true;
            const qdrantAddress = String(draft.backendConfig.qdrantAddress || '').trim();
            let qdrantHost = 'localhost';
            let qdrantPort = 6333;
            if (qdrantAddress) {
                const match = qdrantAddress.match(/^(.*):(\d+)$/);
                if (match) {
                    qdrantHost = String(match[1] || 'localhost').trim() || 'localhost';
                    qdrantPort = Math.max(1, toInt(match[2], 6333));
                } else {
                    qdrantHost = qdrantAddress;
                }
            }
            const cfg = {
                host: qdrantHost,
                port: qdrantPort,
                apiKey: draft.backendConfig.qdrantApiKey,
                url: useQdrantCloud ? draft.backendConfig.qdrantUrl : '',
                address: draft.backendConfig.milvusAddress,
                token: draft.backendConfig.milvusToken,
            };

            try {
                const result = await initBackend(backend, cfg);
                if (result.success) {
                    toastr.success(`${backend} initialized`);
                } else {
                    toastr.warning(result.message || `${backend} initialization returned no success status`);
                }
            } catch (error) {
                toastr.error(`Backend initialization failed: ${error?.message || error}`);
            }

            await runStatusChecks(draft);
        });

        document.getElementById('shardwright-rag-vectorize-all')?.addEventListener('click', async () => {
            if (!collectionId) {
                toastr.warning('Open a chat first to vectorize');
                return;
            }
            const draft = readRagDraft(liveDraft, isSharder);

            try {
                let result;
                if (isSharder) {
                    const temporarySettings = { ...settings, rag: draft };
                    result = await vectorizeAllShardsByMode(temporarySettings);
                    if (result.mode === 'section') {
                        const fallbackInfo = (result.sectionFallbackToStandard || 0) > 0
                            ? `, fallback=${result.sectionFallbackToStandard}`
                            : '';
                        toastr.success(`Section-aware vectorization: +${result.inserted}, -${result.deleted}, shards=${result.total}${fallbackInfo}`);
                    } else {
                        toastr.success(`Vectorized shards: +${result.inserted} (total discovered: ${result.total})`);
                    }
                } else {
                    const temporarySettings = { ...settings, ragStandard: draft };
                    result = await vectorizeAllStandardSummaries(temporarySettings);
                    toastr.success(`Vectorized standard summaries: +${result.inserted} (total discovered: ${result.total})`);
                }
            } catch (error) {
                toastr.error(`Vectorization failed: ${error?.message || error}`);
            }

            await updateStats(draft, collectionId);
        });

        document.getElementById('shardwright-rag-purge-all')?.addEventListener('click', async () => {
            if (!collectionId) {
                toastr.warning('Open a chat first to purge vectors');
                return;
            }
            const confirm = await showSsConfirm(
                'Purge All Vectors',
                'Delete all Shardwright vectors for this chat? This cannot be undone.'
            );

            if (confirm !== POPUP_RESULT.AFFIRMATIVE) {
                return;
            }

            const draft = readRagDraft(liveDraft, isSharder);

            try {
                await purgeCollection(collectionId, draft);
                toastr.success('All vectors purged for this chat');
            } catch (error) {
                toastr.error(`Purge failed: ${error?.message || error}`);
            }

            await updateStats(draft, collectionId);
        });

        document.getElementById('shardwright-rag-open-browser')?.addEventListener('click', async () => {
            const browserSettings = {
                ...settings,
                rag: { ...(settings.rag || {}) },
                ragStandard: { ...(settings.ragStandard || {}) },
            };
            applyRagSettings(browserSettings, readRagDraft(liveDraft, isSharder), ragBlockKey);
            await openRagBrowserModal(browserSettings);
            if (collectionId) await updateStats(readRagDraft(liveDraft, isSharder), collectionId);
        });

        document.getElementById('shardwright-rag-open-debug')?.addEventListener('click', async () => {
            const browserSettings = {
                ...settings,
                rag: { ...(settings.rag || {}) },
                ragStandard: { ...(settings.ragStandard || {}) },
            };
            applyRagSettings(browserSettings, readRagDraft(liveDraft, isSharder), ragBlockKey);
            await openRagDebugModal(browserSettings);
            if (collectionId) await updateStats(readRagDraft(liveDraft, isSharder), collectionId);
        });

        document.getElementById('shardwright-rag-open-history')?.addEventListener('click', async () => {
            const { openRagHistoryModal } = await import('../management/rag-history-modal.js');
            await openRagHistoryModal();
        });

        document.getElementById('shardwright-rag-reset-defaults')?.addEventListener('click', async () => {
            await resetToDefaults();
        });
    });

    await showPromise;
}

