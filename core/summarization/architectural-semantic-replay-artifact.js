import { hashTextSha256Compat } from './crypto-compat.js';
import {
    ARCHITECTURAL_FINALIZED_SCHEMA_ID,
    ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
    hashArchitecturalSourceManifestSet,
    normalizeArchitecturalSourceManifestSet,
    renderFinalizedArchitecturalPayload,
} from './architectural-finalized-semantic.js';
import {
    ARCHITECTURAL_SEMANTIC_NORMALIZATION_CONTRACT_VERSION,
    ARCHITECTURAL_SEMANTIC_RENDERER_VERSION,
} from './architectural-semantic-renderer.js';

export const ARCHITECTURAL_SEMANTIC_REPLAY_ARTIFACT_SCHEMA_VERSION = 2;
export const ARCHITECTURAL_SEMANTIC_REPLAY_ARTIFACT_KIND = 'architectural-semantic-replay';
export const ARCHITECTURAL_SEMANTIC_GENERATION_CONTRACT_VERSION = 1;

export const ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES = Object.freeze({
    ARTIFACT_INVALID: 'ARCH_SEMANTIC_REPLAY_ARTIFACT_INVALID',
    VERSION_UNSUPPORTED: 'ARCH_SEMANTIC_REPLAY_VERSION_UNSUPPORTED',
    PAYLOAD_HASH_MISMATCH: 'ARCH_SEMANTIC_REPLAY_PAYLOAD_HASH_MISMATCH',
    OUTPUT_HASH_MISMATCH: 'ARCH_SEMANTIC_REPLAY_OUTPUT_HASH_MISMATCH',
    OUTPUT_MISMATCH: 'ARCH_SEMANTIC_REPLAY_OUTPUT_MISMATCH',
});

export class ArchitecturalSemanticReplayError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'ArchitecturalSemanticReplayError';
        this.code = code;
    }
}

function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function clonePayload(payload) {
    return JSON.parse(JSON.stringify(payload));
}

async function hashPayload(payload, cryptoApi) {
    return await hashTextSha256Compat(stableStringify(payload), cryptoApi);
}

export async function createArchitecturalSemanticReplayArtifact(options = {}) {
    const payload = clonePayload(options.semanticPayload);
    const canonicalOutput = String(options.canonicalOutput || '');
    const rendered = await renderFinalizedArchitecturalPayload(payload, options);
    if (rendered.output !== canonicalOutput) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.OUTPUT_MISMATCH,
            'Finalized semantic payload does not reproduce the supplied canonical Architectural shard.',
        );
    }
    const sourceManifests = normalizeArchitecturalSourceManifestSet(payload.sourceManifests);
    const sourceManifestSetHash = await hashArchitecturalSourceManifestSet(sourceManifests, options.cryptoApi);
    const artifactBody = {
        artifactKind: ARCHITECTURAL_SEMANTIC_REPLAY_ARTIFACT_KIND,
        artifactSchemaVersion: ARCHITECTURAL_SEMANTIC_REPLAY_ARTIFACT_SCHEMA_VERSION,
        generationContractVersion: ARCHITECTURAL_SEMANTIC_GENERATION_CONTRACT_VERSION,
        normalizationContractVersion: ARCHITECTURAL_SEMANTIC_NORMALIZATION_CONTRACT_VERSION,
        sourceManifests,
        sourceManifestSetHash,
        semanticSchemaId: ARCHITECTURAL_FINALIZED_SCHEMA_ID,
        semanticSchemaVersion: ARCHITECTURAL_FINALIZED_SCHEMA_VERSION,
        semanticPromptVersion: Number(options.semanticPromptVersion),
        semanticRendererVersion: Number(options.semanticRendererVersion),
        semanticPayload: payload,
        semanticPayloadHash: await hashPayload(payload, options.cryptoApi),
        canonicalOutput,
        canonicalOutputHash: await hashTextSha256Compat(canonicalOutput, options.cryptoApi),
    };
    const artifactHash = await hashTextSha256Compat(stableStringify(artifactBody), options.cryptoApi);
    return {
        artifactId: `archreplay_${artifactHash.slice('sha256:'.length)}`,
        artifactHash,
        ...artifactBody,
    };
}

export async function replayArchitecturalSemanticArtifact(artifact, options = {}) {
    if (!artifact || typeof artifact !== 'object'
        || artifact.artifactKind !== ARCHITECTURAL_SEMANTIC_REPLAY_ARTIFACT_KIND) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.ARTIFACT_INVALID,
            'Architectural semantic replay artifact is missing or invalid.',
        );
    }
    if (artifact.artifactSchemaVersion !== ARCHITECTURAL_SEMANTIC_REPLAY_ARTIFACT_SCHEMA_VERSION
        || artifact.generationContractVersion !== ARCHITECTURAL_SEMANTIC_GENERATION_CONTRACT_VERSION
        || artifact.normalizationContractVersion !== ARCHITECTURAL_SEMANTIC_NORMALIZATION_CONTRACT_VERSION
        || artifact.semanticRendererVersion !== ARCHITECTURAL_SEMANTIC_RENDERER_VERSION
        || artifact.semanticSchemaId !== ARCHITECTURAL_FINALIZED_SCHEMA_ID
        || artifact.semanticSchemaVersion !== ARCHITECTURAL_FINALIZED_SCHEMA_VERSION) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.VERSION_UNSUPPORTED,
            'Architectural semantic replay artifact uses an unsupported artifact or renderer version.',
        );
    }

    const sourceManifests = normalizeArchitecturalSourceManifestSet(artifact.sourceManifests);
    const sourceManifestSetHash = await hashArchitecturalSourceManifestSet(sourceManifests, options.cryptoApi);
    if (sourceManifestSetHash !== artifact.sourceManifestSetHash
        || stableStringify(sourceManifests) !== stableStringify(artifact.semanticPayload?.sourceManifests)) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.ARTIFACT_INVALID,
            'Architectural semantic replay artifact source-manifest set does not match its bound payload or hash.',
        );
    }
    const payload = clonePayload(artifact.semanticPayload);
    const payloadHash = await hashPayload(payload, options.cryptoApi);
    if (payloadHash !== artifact.semanticPayloadHash) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.PAYLOAD_HASH_MISMATCH,
            'Persisted architectural semantic payload does not match its recorded hash.',
        );
    }

    const canonicalOutput = String(artifact.canonicalOutput || '');
    const canonicalOutputHash = await hashTextSha256Compat(canonicalOutput, options.cryptoApi);
    if (canonicalOutputHash !== artifact.canonicalOutputHash) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.OUTPUT_HASH_MISMATCH,
            'Persisted canonical architectural shard does not match its recorded hash.',
        );
    }

    const rendered = await renderFinalizedArchitecturalPayload(payload, options);
    if (rendered.output !== canonicalOutput) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.OUTPUT_MISMATCH,
            'Persisted semantic payload does not reproduce the persisted canonical architectural shard.',
        );
    }

    const artifactBody = { ...artifact };
    delete artifactBody.artifactId;
    delete artifactBody.artifactHash;
    const artifactHash = await hashTextSha256Compat(stableStringify(artifactBody), options.cryptoApi);
    const expectedArtifactId = `archreplay_${artifactHash.slice('sha256:'.length)}`;
    if (artifactHash !== artifact.artifactHash || expectedArtifactId !== artifact.artifactId) {
        throw new ArchitecturalSemanticReplayError(
            ARCHITECTURAL_SEMANTIC_REPLAY_ERROR_CODES.ARTIFACT_INVALID,
            'Architectural semantic replay artifact identity does not match its immutable content.',
        );
    }

    return {
        semanticPayload: payload,
        semanticPayloadHash: payloadHash,
        canonicalOutput,
        canonicalOutputHash,
        semanticSchemaId: artifact.semanticSchemaId,
        semanticSchemaVersion: artifact.semanticSchemaVersion,
        semanticPromptVersion: artifact.semanticPromptVersion,
        semanticRendererVersion: artifact.semanticRendererVersion,
        generationContractVersion: artifact.generationContractVersion,
        normalizationContractVersion: artifact.normalizationContractVersion,
        sourceManifests: clonePayload(sourceManifests),
        sourceManifestSetHash,
        artifactId: artifact.artifactId,
        artifactHash,
    };
}
