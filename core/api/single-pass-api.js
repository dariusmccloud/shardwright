/**
 * Sharder orchestration for Summary Sharder.
 */

import { getAllMessages } from '../chat/chat-state.js';
import { buildChatText } from '../chat/chat-text-builder.js';
import { applyContextCleanup } from '../processing/context-cleanup.js';
import { handleSummaryResult } from '../summarization/output.js';
import {
    addHiddenRange,
    subtractHiddenRange,
    shiftRangesOnInsert,
    recomputeVisibility
} from '../chat/range-operations.js';
import {
    createAbortController,
    clearAbortController,
    throwIfAborted
} from './abort-controller.js';
import { startUiOperation, endUiOperation } from './api-ui-helpers.js';
import { log } from '../logger.js';
import { ARCHITECTURAL_PROFILE, normalizeSharderProfile } from '../summarization/sharder-section-registry.js';
import {
    SHARD_ARTIFACT_KINDS,
    buildManagedShardManifest,
    createManagedShardManifestId,
    getPersistedMessageId,
} from '../summarization/shard-integrity-core.js';
import { finalizeArchitecturalReviewForSave } from '../summarization/architectural-live-finalization.js';
import { refreshCurrentChatShardIntegrity } from '../summarization/shard-integrity-runtime.js';
import { buildSinglePassInput } from './single-pass-input.js';
import { resolveSelectedShardsForRun } from './sharder-run-selection.js';
import {
    startSharderHeadlessOperation,
    executeSharderHeadlessRun,
    refreshSharderIntegrityAfterSave,
    cleanupSharderHeadlessOperation,
} from './sharder-run-execution.js';

let isSharderRunning = false;

async function runPipelineWithAnalysis(chatText, settings, startIndex, endIndex, selectedShards = [], extractKeywords = false, messageIds = [], currentManifest = null) {
    const { runSharderPipeline } = await import('../sharder/single-pass-pipeline.js');
    const result = await runSharderPipeline(chatText, settings, {
        startIndex,
        endIndex,
        extractKeywords,
        messageIds,
        currentManifest,
        existingShards: (selectedShards || []).map((s) => ({
            content: s.content,
            identifier: s.identifier,
            messageRangeStart: s.messageRangeStart,
            projectionMetadata: s.projectionMetadata || null,
            sourceManifest: s.sourceManifest || null,
        })),
    });

    const { analyzeMessageCoverage } = await import('../sharder/message-coverage-analyzer.js');
    const coverageReport = analyzeMessageCoverage(chatText, result.sections, { startIndex, endIndex });

    let shardReport = null;
    if ((selectedShards || []).length > 0
        && normalizeSharderProfile(settings?.sharderProfile) !== ARCHITECTURAL_PROFILE) {
        const { analyzeSinglePassPruning } = await import('../sharder/shard-pruning-analyzer.js');
        shardReport = analyzeSinglePassPruning(selectedShards, result.sections);
    }

    result.llmPruningReport = {
        totalPruned: (shardReport?.totalPruned || 0) + (coverageReport?.totalUncovered || 0),
        sections: [...(shardReport?.sections || [])],
        sectionOverview: [...(shardReport?.sectionOverview || [])],
        uncoveredMessages: coverageReport?.uncoveredMessages || [],
        totalUncovered: coverageReport?.totalUncovered || 0,
    };

    return result;
}

/**
 * Run Sharder pipeline without UI side effects.
 * @param {number} startIndex
 * @param {number} endIndex
 * @param {Object} settings
 * @param {Array<{content:string,type:string,identifier:string,parsedSections:Object,messageRangeStart?:number}>} selectedShards
 * @returns {Promise<{result:Object, chatText:string, extractKeywords:boolean}>}
 */
export async function runSharderHeadless(startIndex, endIndex, settings, selectedShards = []) {
    const messages = getAllMessages();

    if (!messages || messages.length === 0) {
        throw new Error('No messages to process');
    }

    const { chatText, messageIds } = buildSinglePassInput(
        messages,
        startIndex,
        endIndex,
        settings,
        {
            buildChatText,
            applyContextCleanup,
            getPersistedMessageId,
        },
    );

    if (!chatText.trim()) {
        throw new Error('Selected message range is empty');
    }

    const extractKeywords = settings.outputMode === 'lorebook'
        && settings.lorebookEntryOptions?.extractKeywords !== false;
    const architecturalRun = normalizeSharderProfile(settings?.sharderProfile) === ARCHITECTURAL_PROFILE;
    const artifactKind = settings.outputMode === 'lorebook'
        ? SHARD_ARTIFACT_KINDS.LOREBOOK_SUMMARY
        : SHARD_ARTIFACT_KINDS.SYSTEM_SHARD;
    const currentManifest = architecturalRun
        ? await buildManagedShardManifest(messages, {
            manifestId: createManagedShardManifestId(artifactKind),
            artifactKind,
            startIndex,
            endIndex,
        })
        : null;
    if (architecturalRun && !currentManifest) {
        const error = new Error('Architectural post-review finalization requires a complete persisted source manifest.');
        error.code = 'ARCH_POST_REVIEW_CURRENT_MANIFEST_MISSING';
        throw error;
    }

    const result = await runPipelineWithAnalysis(
        chatText,
        settings,
        startIndex,
        endIndex,
        selectedShards,
        extractKeywords,
        messageIds,
        currentManifest
    );
    throwIfAborted('sharder pipeline');

    return {
        result,
        chatText,
        extractKeywords,
        messageIds,
        currentManifest,
    };
}

/**
 * Run Sharder generation on a message range.
 * @param {number} startIndex
 * @param {number} endIndex
 * @param {Object} settings
 * @param {Array<{content:string,type:string,identifier:string,parsedSections:Object,messageRangeStart?:number}>} selectedShards
 */
export async function runSharder(startIndex, endIndex, settings, selectedShards = undefined) {
    if (isSharderRunning) {
        toastr.warning('Sharder is already running');
        return;
    }

    isSharderRunning = true;

    let progressToast = null;
    const originalText = 'Run Sharder';
    let operationStarted = false;
    let opId = null;

    try {
        const messages = getAllMessages();
        if (!messages || messages.length === 0) {
            toastr.warning('No messages to process');
            return;
        }

        const { findSavedExtractions } = await import('../summarization/sharder-pipeline.js');
        const { isSavedShardCompatibleWithProfile } = await import('../summarization/saved-shard-identity.js');
        const { getActiveSharderProfile, shouldBypassShardSelectionForRag } = await import('../summarization/shard-selection-policy.js');
        const { openShardSelectionModal, parseSelectedShards } = await import('../../ui/modals/summarization/shard-selection-modal.js');

        const selection = await resolveSelectedShardsForRun(startIndex, endIndex, settings, selectedShards, {
            shouldBypassShardSelectionForRag,
            getActiveSharderProfile,
            findSavedExtractions,
            isSavedShardCompatibleWithProfile,
            parseSelectedShards,
            openShardSelectionModal,
        });

        if (!selection.confirmed) {
            toastr.info('Sharder cancelled');
            return;
        }

        if (selection.mode === 'auto-include-overlap-filtered' && selection.excludedOverlapCount > 0) {
            toastr.info(`${selection.excludedOverlapCount} overlapping saved shard(s) were ignored. This run will use only non-overlapping baselines.`);
        }

        const started = startSharderHeadlessOperation(startIndex, endIndex, {
            createAbortController,
            startUiOperation,
            showProgressToast: (message, title, options) => toastr.info(message, title, options),
        });
        ({ progressToast, operationStarted, opId } = started);
        const headless = await executeSharderHeadlessRun(startIndex, endIndex, settings, selection.selectedShards, {
            runSharderHeadless,
            throwIfAborted,
        });

        const { openSharderReviewModal } = await import('../../ui/modals/summarization/single-pass-review-modal.js');

        let latestPipelineResult = headless.result;
        const regenFn = async () => {
            throwIfAborted('sharder regenerate');
            const result = await runPipelineWithAnalysis(
                headless.chatText,
                settings,
                startIndex,
                endIndex,
                selection.selectedShards,
                headless.extractKeywords,
                headless.messageIds,
                headless.currentManifest
            );
            latestPipelineResult = result;
            throwIfAborted('sharder regenerate');
            return result;
        };

        throwIfAborted('sharder review');
        const review = await openSharderReviewModal(headless.result, settings, regenFn);
        throwIfAborted('sharder review');

        if (!review.confirmed) {
            toastr.info('Sharder cancelled');
            return;
        }

        let finalOutput = review.finalOutput;
        let resultMetadata = review.resultMetadata || null;
        if (normalizeSharderProfile(settings?.sharderProfile) === ARCHITECTURAL_PROFILE) {
            const finalized = await finalizeArchitecturalReviewForSave({
                pipelineResult: latestPipelineResult,
                review,
                currentManifest: headless.currentManifest,
            });
            finalOutput = finalized.finalOutput;
            resultMetadata = finalized.resultMetadata;
        }

        throwIfAborted('sharder output');
        const outputResult = await handleSummaryResult(
            settings,
            finalOutput,
            startIndex,
            endIndex,
            false,
            headless.result.extractedKeywords || [],
            null,
            review.archiveOptions || null,
            resultMetadata
        );

        if (outputResult.didInjectToContext) {
            const didInsertSystemMessage = outputResult.mode === 'system';

            if (outputResult.mode === 'system') {
                const insertionIndex = endIndex + 1;
                if (didInsertSystemMessage) {
                    await shiftRangesOnInsert(insertionIndex, 1, { skipVisibilityUpdate: true });
                }
                await addHiddenRange(startIndex, endIndex, {
                    hidden: settings.hideAllSummarized || false,
                    skipVisibilityUpdate: true
                });
                if (didInsertSystemMessage) {
                    await subtractHiddenRange(insertionIndex, insertionIndex, { skipVisibilityUpdate: true });
                }
            } else {
                await addHiddenRange(startIndex, endIndex, {
                    hidden: settings.hideAllSummarized || false,
                    skipVisibilityUpdate: true
                });
            }

            await recomputeVisibility();

            if (!resultMetadata?.architecturalReplayArtifact) {
                await refreshSharderIntegrityAfterSave(
                    {
                        reason: 'sharder-saved',
                        registerOutput: {
                            outputUID: outputResult.outputUID,
                            artifactKind: outputResult.mode === 'system'
                                ? SHARD_ARTIFACT_KINDS.SYSTEM_SHARD
                                : SHARD_ARTIFACT_KINDS.LOREBOOK_SUMMARY,
                            startIndex,
                            endIndex,
                        },
                    },
                    {
                        refreshIntegrity: refreshCurrentChatShardIntegrity,
                        reportFailure: (integrityError) => {
                            log.error('Sharder output saved, but shard integrity refresh failed:', integrityError);
                            toastr.warning('Sharder output was saved, but shard integrity could not be refreshed.');
                        },
                    },
                );
            }
        }

        const archivedCount = review.archivedItems?.length || 0;
        toastr.success(archivedCount > 0
            ? `Sharder output saved (${archivedCount} items archived)`
            : 'Sharder output saved');
    } catch (error) {
        if (error.name === 'AbortError') {
            toastr.info('Sharder stopped');
            return;
        }

        if (error.message === 'No messages to process' || error.message === 'Selected message range is empty') {
            toastr.warning(error.message);
            return;
        }

        log.error('Sharder failed:', error);
        if (Array.isArray(error?.diagnostics) && error.diagnostics.length > 0) {
            log.error('Sharder validation diagnostics:', error.diagnostics.map((diagnostic) => ({ ...diagnostic })));
        }
        toastr.error(`Sharder failed: ${error.message}`);
    } finally {
        cleanupSharderHeadlessOperation(
            { progressToast, operationStarted, opId, originalText },
            {
                clearProgressToast: (toastRef) => toastr.clear(toastRef),
                clearAbortController,
                endUiOperation,
            }
        );
        isSharderRunning = false;
    }
}


