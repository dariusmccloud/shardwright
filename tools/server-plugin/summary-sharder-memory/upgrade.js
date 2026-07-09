import {
    createError,
    getAuthenticatedUserRoot,
    getStoragePaths,
    getUpgradeReplayPreflight,
} from './core.js';
import { replayInterpretiveLedger, replayPublicationLedger } from './interpretive.js';
import { recoverPromotionState } from './promotion.js';

export const UPGRADE_REPLAY_ALLOWED_STATUSES = Object.freeze(['READY_TO_UPGRADE', 'PROJECTION_STALE']);

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

export function replayGovernedMemoryState(request, options = {}) {
    const userRoot = getAuthenticatedUserRoot(request);
    const paths = getStoragePaths(userRoot);
    const preflight = options.preflight || getUpgradeReplayPreflight(paths);
    if (!UPGRADE_REPLAY_ALLOWED_STATUSES.includes(preflight.status)) {
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
    const promotionRecovery = recoverPromotionState(request, { now });
    const interpretiveReplay = replayInterpretiveLedger(request, { now });
    const publicationReplay = replayPublicationLedger(request, { now });

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
}
