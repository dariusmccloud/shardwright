import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    createError,
    getAuthenticatedUserRoot,
    getStoragePaths,
    getUpgradeReplayPreflight,
    replayableStatuses,
} from './core.js';
import { replayInterpretiveLedger, replayPublicationLedger } from './interpretive.js';
import { recoverPromotionState } from './promotion.js';

export const UPGRADE_REPLAY_DOMAIN_ORDER = Object.freeze([
    'promotion-state',
    'interpretive-governance',
    'publication-lifecycle',
]);

function buildDomainStep(domain, action, result, extra = {}) {
    return {
        domain,
        action,
        ...extra,
        result,
    };
}

function buildPromotionStep(recovery) {
    if (!recovery || recovery.recovered !== true) {
        return buildDomainStep('promotion-state', 'recover', 'noop', {
            state: recovery?.state || 'NONE',
        });
    }
    return buildDomainStep('promotion-state', 'recover', 'recovered', {
        state: recovery.state,
    });
}

function buildInterpretiveStep(replay) {
    return buildDomainStep('interpretive-governance', 'replay', 'replayed', {
        interpretationCount: Array.isArray(replay?.replayedInterpretations)
            ? replay.replayedInterpretations.length
            : 0,
        synthesisPolicyCount: Array.isArray(replay?.replayedSynthesisPolicies)
            ? replay.replayedSynthesisPolicies.length
            : 0,
        synthesisRunCount: Array.isArray(replay?.replayedSynthesisRuns)
            ? replay.replayedSynthesisRuns.length
            : 0,
    });
}

function buildPublicationStep(replay) {
    return buildDomainStep('publication-lifecycle', 'replay', 'replayed', {
        publicationPolicyCount: Array.isArray(replay?.replayedPublicationPolicies)
            ? replay.replayedPublicationPolicies.length
            : 0,
        authorizationCount: Array.isArray(replay?.replayedPublicationAuthorizations)
            ? replay.replayedPublicationAuthorizations.length
            : 0,
        publishedRecordCount: Array.isArray(replay?.replayedPublishedRecords)
            ? replay.replayedPublishedRecords.length
            : 0,
    });
}

function createReplayRollbackGuard(paths) {
    const storageRootExisted = fs.existsSync(paths.storageRoot);
    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-sharder-replay-'));
    const backupStorageRoot = path.join(backupRoot, path.basename(paths.storageRoot));
    if (storageRootExisted) {
        fs.cpSync(paths.storageRoot, backupStorageRoot, {
            recursive: true,
            force: true,
            errorOnExist: false,
        });
    }

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) {
            return;
        }
        cleaned = true;
        fs.rmSync(backupRoot, { recursive: true, force: true });
    };

    return {
        commit() {
            cleanup();
        },
        rollback() {
            try {
                fs.rmSync(paths.storageRoot, { recursive: true, force: true });
                if (storageRootExisted) {
                    fs.mkdirSync(path.dirname(paths.storageRoot), { recursive: true });
                    fs.cpSync(backupStorageRoot, paths.storageRoot, {
                        recursive: true,
                        force: true,
                        errorOnExist: false,
                    });
                }
            } finally {
                cleanup();
            }
        },
    };
}

export function replayGovernedMemoryState(request, options = {}) {
    const userRoot = getAuthenticatedUserRoot(request);
    const paths = getStoragePaths(userRoot);
    const preflight = options.preflight || getUpgradeReplayPreflight(paths);
    if (!replayableStatuses.has(preflight.status)) {
        throw createError(
            409,
            `Governed-memory replay is blocked: ${preflight.summary}`,
            'ARCH_UPGRADE_REPLAY_BLOCKED',
            {
                preflightStatus: preflight.status,
                technicalCodes: preflight.technicalCodes,
            },
        );
    }

    const now = options.now;
    const rollbackGuard = createReplayRollbackGuard(paths);
    try {
        const promotionRecovery = recoverPromotionState(request, { now });
        const interpretiveReplay = replayInterpretiveLedger(request, { now });
        const publicationReplay = replayPublicationLedger(request, { now });
        rollbackGuard.commit();

        return {
            ok: true,
            phase: 'c0.6.7',
            preflightStatus: preflight.status,
            preflightSummary: preflight.summary,
            domainOrder: [...UPGRADE_REPLAY_DOMAIN_ORDER],
            domains: [
                buildPromotionStep(promotionRecovery),
                buildInterpretiveStep(interpretiveReplay),
                buildPublicationStep(publicationReplay),
            ],
            promotionRecovery,
            interpretiveReplay,
            publicationReplay,
        };
    } catch (error) {
        try {
            rollbackGuard.rollback();
        } catch (rollbackError) {
            throw createError(
                500,
                `Governed-memory replay failed and rollback did not complete: ${error?.message || 'unknown replay error'}. Rollback error: ${rollbackError?.message || 'unknown rollback error'}`,
                'ARCH_UPGRADE_REPLAY_ROLLBACK_FAILED',
                {
                    causeErrorCode: error?.code || null,
                    rollbackErrorCode: rollbackError?.code || null,
                },
            );
        }
        throw error;
    }
}
