import { ensureShardwrightNamespace } from '../shardwright-runtime-identity.js';
import {
    buildMessageInitFingerprint,
    buildMessageRevisionHash,
    resolveMessageSpeakerIdentity,
} from '../summarization/message-identity-core.js';
import { EVIDENCE_POLICY_INCLUDE, MESSAGE_IDENTITY_SCHEMA_VERSION } from '../summarization/message-identity-schema.js';

export const RuntimeMessageIdentityCaptureState = Object.freeze({
    CAPTURED: 'CAPTURED',
    ALREADY_IDENTIFIED: 'ALREADY_IDENTIFIED',
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    MESSAGE_UNAVAILABLE: 'MESSAGE_UNAVAILABLE',
    MESSAGE_IDENTITY_AMBIGUOUS: 'MESSAGE_IDENTITY_AMBIGUOUS',
    MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE: 'MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE',
    MESSAGE_IDENTITY_RECONCILIATION_FAILED: 'MESSAGE_IDENTITY_RECONCILIATION_FAILED',
});

let latestCapture = null;

function text(value) {
    const result = String(value || '').trim();
    return result || '';
}

function validMessageId(value) {
    return /^msg_[0-9a-f]{32}$/u.test(text(value).toLowerCase());
}

function validIdentityMarker(value) {
    return value && value.schemaVersion === MESSAGE_IDENTITY_SCHEMA_VERSION
        && validMessageId(value.messageId)
        && /^sha256:[0-9a-f]{64}$/u.test(text(value.initFingerprint).toLowerCase())
        && /^sha256:[0-9a-f]{64}$/u.test(text(value.revisionHash).toLowerCase());
}

function makeMessageId(cryptoApi = globalThis.crypto) {
    const uuid = typeof cryptoApi?.randomUUID === 'function'
        ? cryptoApi.randomUUID()
        : '';
    const compact = uuid.replace(/-/gu, '').toLowerCase();
    if (!/^[0-9a-f]{32}$/u.test(compact)) return '';
    return `msg_${compact}`;
}

function cloneRoot(message) {
    const hadExtra = Boolean(message?.extra && typeof message.extra === 'object');
    const extra = hadExtra ? message.extra : {};
    const prior = extra.shardwright && typeof extra.shardwright === 'object'
        ? extra.shardwright
        : {};
    return { extra, prior, hadExtra };
}

function restoreRoot(message, extra, prior, hadRoot, hadExtra) {
    if (!hadRoot) {
        if (extra && Object.prototype.hasOwnProperty.call(extra, 'shardwright')) delete extra.shardwright;
        if (!hadExtra) delete message.extra;
        return;
    }
    extra.shardwright = prior;
}

export function getLastRuntimeMessageIdentityCapture() {
    return latestCapture;
}

export function clearLastRuntimeMessageIdentityCapture() {
    latestCapture = null;
}

export function installRuntimeMessageIdentityCaptureCapability(target = globalThis) {
    const namespace = ensureShardwrightNamespace('transcript', target);
    namespace.getLastRuntimeMessageIdentityCapture = getLastRuntimeMessageIdentityCapture;
    namespace.clearLastRuntimeMessageIdentityCapture = clearLastRuntimeMessageIdentityCapture;
    return namespace;
}

export function installRuntimeMessageIdentityCaptureAdapter({
    eventSource,
    eventType,
    resolveContext,
    persist,
    isEligible = () => true,
    cryptoApi,
} = {}) {
    if (!eventSource || typeof eventSource.on !== 'function' || !eventType || typeof resolveContext !== 'function') return false;
    const handler = async (type, options, dryRun) => {
        if (dryRun === true || isEligible(options) !== true) {
            latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.NOT_APPLICABLE });
            return latestCapture;
        }
        const context = resolveContext(options) || {};
        const message = context?.sourceMessage || context?.latestMessage || context?.message || null;
        return await captureRuntimeMessageIdentity({
            message,
            context,
            persist,
            cryptoApi,
        });
    };
    if (typeof eventSource.makeFirst === 'function') eventSource.makeFirst(eventType, handler);
    else eventSource.on(eventType, handler);
    return true;
}

export async function captureRuntimeMessageIdentity({
    message,
    context = {},
    persist,
    cryptoApi = globalThis.crypto,
    now = Date.now(),
} = {}) {
    if (!message || typeof message !== 'object') {
        latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.MESSAGE_UNAVAILABLE });
        return latestCapture;
    }
    if (typeof persist !== 'function') {
        latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE });
        return latestCapture;
    }

    const { extra, prior, hadExtra } = cloneRoot(message);
    const hadRoot = Object.prototype.hasOwnProperty.call(extra, 'shardwright');
    const priorIdentity = prior?.messageIdentity;
    if (hadRoot && priorIdentity && !validIdentityMarker(priorIdentity)) {
        latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_AMBIGUOUS });
        return latestCapture;
    }

    const messageId = validMessageId(priorIdentity?.messageId)
        ? text(priorIdentity.messageId).toLowerCase()
        : makeMessageId(cryptoApi);
    if (!messageId) {
        latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_RECONCILIATION_FAILED, reason: 'MESSAGE_ID_GENERATION_UNAVAILABLE' });
        return latestCapture;
    }

    try {
        const speakerIdentity = resolveMessageSpeakerIdentity(message, { context });
        const initFingerprint = text(priorIdentity?.initFingerprint) || await buildMessageInitFingerprint(message, {
            context,
            cryptoApi,
            speakerIdentity,
        });
        const revisionHash = await buildMessageRevisionHash(message, {
            context,
            cryptoApi,
            speakerIdentity,
        });
        const marker = {
            schemaVersion: MESSAGE_IDENTITY_SCHEMA_VERSION,
            messageId,
            initFingerprint,
            revisionHash,
        };
        const nextRoot = {
            ...prior,
            evidencePolicy: prior.evidencePolicy || EVIDENCE_POLICY_INCLUDE,
            speakerIdentity,
            messageIdentity: marker,
        };
        const changed = JSON.stringify(prior?.messageIdentity || null) !== JSON.stringify(marker)
            || JSON.stringify(prior?.speakerIdentity || null) !== JSON.stringify(speakerIdentity)
            || !prior?.evidencePolicy;
        if (!changed) {
            latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.ALREADY_IDENTIFIED, messageId, revisionHash });
            return latestCapture;
        }

        if (!message.extra || typeof message.extra !== 'object') message.extra = {};
        message.extra.shardwright = nextRoot;
        try {
            const receipt = await persist({ message, marker, capturedAt: now });
            if (receipt === false) throw new Error('HOST_MESSAGE_IDENTITY_PERSISTENCE_REJECTED');
        } catch (error) {
            restoreRoot(message, extra, prior, hadRoot, hadExtra);
            latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_PERSISTENCE_UNAVAILABLE, messageId, error: String(error?.message || error) });
            return latestCapture;
        }

        latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.CAPTURED, messageId, revisionHash, capturedAt: now });
        return latestCapture;
    } catch (error) {
        latestCapture = Object.freeze({ state: RuntimeMessageIdentityCaptureState.MESSAGE_IDENTITY_RECONCILIATION_FAILED, error: String(error?.message || error) });
        return latestCapture;
    }
}
