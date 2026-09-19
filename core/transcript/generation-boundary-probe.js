// Volatile diagnostics for the SillyTavern generation boundary.
// This probe records only the synchronous event shape; it performs no retrieval,
// identity inference, persistence, or prompt mutation.

import { ensureShardwrightNamespace } from '../shardwright-runtime-identity.js';

let latestProbe = null;
let latestDispatchProbe = null;
const probeHistory = [];
const MAX_PROBE_HISTORY = 12;

export function recordGenerationBoundaryProbe({ eventType, generationType = '', options, dryRun = false, contextSnapshot = null, argumentShapes = [] } = {}) {
    const snapshot = {
        eventType: String(eventType || ''),
        generationType: String(generationType || ''),
        dryRun: dryRun === true,
        optionKeys: options && typeof options === 'object' ? Object.freeze(Object.keys(options).sort()) : Object.freeze([]),
        contextKeys: contextSnapshot && typeof contextSnapshot === 'object' ? Object.freeze(Object.keys(contextSnapshot).sort()) : Object.freeze([]),
        argumentShapes: Object.freeze(argumentShapes.map((value) => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value)),
        capturedAt: Date.now(),
    };
    latestProbe = Object.freeze(snapshot);
    if (dryRun !== true) latestDispatchProbe = latestProbe;
    probeHistory.push(latestProbe);
    if (probeHistory.length > MAX_PROBE_HISTORY) probeHistory.shift();
    return latestProbe;
}

export function getLatestGenerationBoundaryProbe() {
    return latestProbe;
}

export function getLatestGenerationDispatchProbe() {
    return latestDispatchProbe;
}

export function clearGenerationBoundaryProbe() {
    latestProbe = null;
    latestDispatchProbe = null;
    probeHistory.length = 0;
}

export function getGenerationBoundaryProbeHistory() {
    return Object.freeze([...probeHistory]);
}

export function installGenerationBoundaryProbe({ eventSource, eventType, resolveContext = () => null } = {}) {
    if (!eventSource || typeof eventSource.on !== 'function' || !eventType || typeof resolveContext !== 'function') return false;
    eventSource.on(eventType, (...args) => {
        const [type, options, dryRun] = args;
        let contextSnapshot = null;
        try { contextSnapshot = resolveContext(options); } catch { contextSnapshot = null; }
        recordGenerationBoundaryProbe({ eventType, generationType: type, options, dryRun, contextSnapshot, argumentShapes: args });
    });
    return true;
}

export function installGenerationBoundaryProbeCapability(target = globalThis) {
    const namespace = ensureShardwrightNamespace('transcript', target);
    if (namespace.getLastGenerationBoundaryProbe !== undefined && namespace.getLastGenerationBoundaryProbe !== getLatestGenerationBoundaryProbe) throw new Error('Shardwright transcript probe capability conflict.');
    namespace.getLastGenerationBoundaryProbe = getLatestGenerationBoundaryProbe;
    namespace.getLastGenerationDispatchProbe = getLatestGenerationDispatchProbe;
    namespace.getGenerationBoundaryProbeHistory = getGenerationBoundaryProbeHistory;
    namespace.clearGenerationBoundaryProbe = clearGenerationBoundaryProbe;
    return namespace;
}
