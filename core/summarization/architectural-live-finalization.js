import { finalizeArchitecturalPostReview } from './architectural-post-review-finalization.js';

export const ARCHITECTURAL_LIVE_FINALIZATION_ERROR_CODES = Object.freeze({
    CURRENT_MANIFEST_MISSING: 'ARCH_REPLAY_CURRENT_MANIFEST_MISSING',
    MANIFEST_REGISTRATION_MISSING: 'ARCH_REPLAY_MANIFEST_REGISTRATION_MISSING',
});

export async function finalizeArchitecturalReviewForSave(options = {}) {
    const currentManifest = options.currentManifest;
    if (!currentManifest?.manifestId) {
        const error = new Error('Architectural review finalization requires a current source manifest.');
        error.code = ARCHITECTURAL_LIVE_FINALIZATION_ERROR_CODES.CURRENT_MANIFEST_MISSING;
        throw error;
    }
    const finalized = await finalizeArchitecturalPostReview(
        options.pipelineResult?.metadata?.architecturalPostReviewPlan,
        options.review?.resultMetadata?.architecturalReviewIntent,
        { semanticPromptVersion: options.pipelineResult?.metadata?.semanticPromptVersion || 1 },
    );
    return {
        finalOutput: finalized.finalOutput,
        resultMetadata: {
            ...(options.review?.resultMetadata || {}),
            architecturalCurrentManifest: currentManifest,
            architecturalReplayArtifact: finalized.replayArtifact,
        },
    };
}

export async function persistArchitecturalReplayForSavedShard(options = {}, deps = {}) {
    const manifestId = String(options.currentManifest?.manifestId || '').trim();
    const registeredManifest = (options.integrityResult?.registeredManifests || [])
        .find((manifest) => manifest?.manifestId === manifestId);
    if (!manifestId || !registeredManifest) {
        const error = new Error('Saved Architectural shard did not register the manifest bound to its replay artifact.');
        error.code = ARCHITECTURAL_LIVE_FINALIZATION_ERROR_CODES.MANIFEST_REGISTRATION_MISSING;
        throw error;
    }
    if (typeof deps.persistReplayArtifact !== 'function') {
        throw new TypeError('Architectural replay persistence dependency is required.');
    }
    return await deps.persistReplayArtifact(options.replayArtifact);
}

export async function registerAndPersistArchitecturalReplay(options = {}, deps = {}) {
    if (typeof deps.refreshIntegrity !== 'function') {
        throw new TypeError('Architectural shard integrity refresh dependency is required.');
    }
    const integrityResult = await deps.refreshIntegrity({
        reason: 'architectural-replay-persistence',
        registerOutput: {
            outputUID: options.outputUID,
            manifestId: options.currentManifest?.manifestId,
            artifactKind: options.artifactKind,
            startIndex: options.startIndex,
            endIndex: options.endIndex,
        },
    });
    await persistArchitecturalReplayForSavedShard({
        currentManifest: options.currentManifest,
        replayArtifact: options.replayArtifact,
        integrityResult,
    }, {
        persistReplayArtifact: deps.persistReplayArtifact,
    });
    return integrityResult;
}
