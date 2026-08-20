import fs from 'node:fs';
import path from 'node:path';

import {
    atomicWriteFile,
    createError,
    ensureStorageRoot,
    getStoragePaths,
    parseJsonlRecords,
    stableStringify,
} from './core.js';
import { replayArchitecturalSemanticArtifact } from './lib/core/summarization/architectural-semantic-replay-artifact.js';

export const ARCHITECTURAL_REPLAY_LEDGER_EVENT_TYPE = 'ARCHITECTURAL_REPLAY_ARTIFACT_REGISTERED';

function artifactPath(paths, artifactId) {
    return path.join(paths.architecturalReplayArtifactsRoot, `${artifactId}.json`);
}

function readLedger(paths) {
    if (!fs.existsSync(paths.architecturalReplayLedgerPath)) {
        return [];
    }
    const { records, invalidLines } = parseJsonlRecords(
        fs.readFileSync(paths.architecturalReplayLedgerPath, 'utf8'),
    );
    if (invalidLines.length > 0) {
        throw createError(500, 'Architectural replay ledger contains invalid JSONL records.', 'ARCH_REPLAY_LEDGER_INVALID');
    }
    return records;
}

function findRegistration(records, artifactId) {
    return records.find((record) => (
        record?.eventType === ARCHITECTURAL_REPLAY_LEDGER_EVENT_TYPE
        && record?.artifactId === artifactId
    )) || null;
}

function appendRegistration(paths, artifact, now) {
    const event = {
        eventId: `archreplayevent_${artifact.artifactHash.slice('sha256:'.length)}`,
        eventType: ARCHITECTURAL_REPLAY_LEDGER_EVENT_TYPE,
        occurredAt: Number.isFinite(now) ? now : Date.now(),
        artifactId: artifact.artifactId,
        artifactHash: artifact.artifactHash,
        sourceManifestSetHash: artifact.sourceManifestSetHash,
        sourceManifestIds: artifact.sourceManifests.map((manifest) => manifest.manifestId),
    };
    fs.appendFileSync(paths.architecturalReplayLedgerPath, `${JSON.stringify(event)}\n`, 'utf8');
    return event;
}

async function verifyArtifact(artifact, options, status) {
    try {
        return await replayArchitecturalSemanticArtifact(artifact, options);
    } catch (error) {
        if (!error.status) error.status = status;
        throw error;
    }
}

export async function persistArchitecturalReplayArtifact(userRoot, artifact, options = {}) {
    await verifyArtifact(artifact, options, 400);
    const paths = getStoragePaths(userRoot);
    ensureStorageRoot(paths.storageRoot);
    fs.mkdirSync(paths.architecturalReplayArtifactsRoot, { recursive: true });

    const targetPath = artifactPath(paths, artifact.artifactId);
    const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
    if (fs.existsSync(targetPath)) {
        let existing;
        try {
            existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        } catch {
            throw createError(409, 'Existing Architectural replay artifact is unreadable.', 'ARCH_REPLAY_ARTIFACT_CONFLICT');
        }
        if (stableStringify(existing) !== stableStringify(artifact)) {
            throw createError(409, 'Existing Architectural replay artifact conflicts with immutable content.', 'ARCH_REPLAY_ARTIFACT_CONFLICT');
        }
    } else {
        atomicWriteFile(targetPath, serialized);
    }

    const records = readLedger(paths);
    const existingRegistration = findRegistration(records, artifact.artifactId);
    if (existingRegistration) {
        if (existingRegistration.artifactHash !== artifact.artifactHash) {
            throw createError(409, 'Architectural replay ledger registration conflicts with artifact content.', 'ARCH_REPLAY_REGISTRATION_CONFLICT');
        }
        return { created: false, artifact, registration: existingRegistration };
    }

    const registration = appendRegistration(paths, artifact, options.now);
    return { created: true, artifact, registration };
}

export async function loadArchitecturalReplayArtifact(userRoot, artifactId, options = {}) {
    const normalizedId = String(artifactId || '').trim();
    if (!/^archreplay_[0-9a-f]{64}$/u.test(normalizedId)) {
        throw createError(400, 'Architectural replay artifact id is invalid.', 'ARCH_REPLAY_ARTIFACT_ID_INVALID');
    }

    const paths = getStoragePaths(userRoot);
    const registration = findRegistration(readLedger(paths), normalizedId);
    if (!registration) {
        throw createError(404, 'Architectural replay artifact registration was not found.', 'ARCH_REPLAY_ARTIFACT_NOT_FOUND');
    }

    const targetPath = artifactPath(paths, normalizedId);
    if (!fs.existsSync(targetPath)) {
        throw createError(409, 'Registered Architectural replay artifact file is missing.', 'ARCH_REPLAY_ARTIFACT_MISSING');
    }

    let artifact;
    try {
        artifact = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch {
        throw createError(409, 'Registered Architectural replay artifact is unreadable.', 'ARCH_REPLAY_ARTIFACT_INVALID');
    }
    if (artifact.artifactHash !== registration.artifactHash) {
        throw createError(409, 'Architectural replay artifact disagrees with its portable registration.', 'ARCH_REPLAY_REGISTRATION_MISMATCH');
    }

    const replay = await verifyArtifact(artifact, options, 409);
    return { artifact, registration, replay };
}
