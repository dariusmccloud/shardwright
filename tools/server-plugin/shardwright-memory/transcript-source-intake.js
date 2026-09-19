// Bounded source-intake coordinator.
// Converts one authenticated, observed source revision into durable revision,
// message, and visibility custody, then advances the rebuildable projection.

import fs from 'node:fs';

import { createError, resolveChatJsonlPath } from './core.js';
import { readTranscriptSourceRegistryLedger } from './transcript-source-registry.js';
import { observeRegisteredTranscriptSource, TranscriptObservationState } from './transcript-source-observer.js';
import { admitTranscriptSourceObservation } from './transcript-source-revision.js';
import { parseTranscriptMessageCandidates } from './transcript-message-parser.js';
import { admitTranscriptMessageCandidates } from './transcript-message-ledger.js';
import { projectTranscriptVisibility } from './transcript-visibility-projection.js';
import { admitTranscriptVisibilityProjection } from './transcript-visibility-ledger.js';
import { projectTranscriptIncrementally } from './transcript-incremental-projector.js';

function registeredSource(paths, sourceLogicalId) {
    const source = readTranscriptSourceRegistryLedger(paths)
        .map((entry) => entry.payload)
        .find((entry) => entry.sourceLogicalId === String(sourceLogicalId || '').trim());
    if (!source) throw createError(404, 'Registered transcript source is unknown.', 'TIR_INTAKE_SOURCE_UNKNOWN');
    return source;
}

function locator(source) {
    if (source.sourceClass === 'DIRECT') return { isGroup: false, avatarUrl: source.sourceResolutionLocator.avatarUrl, chatLocator: source.sourceResolutionLocator.chatLocator };
    return { isGroup: true, groupId: source.sourceResolutionLocator.groupId, chatLocator: source.sourceResolutionLocator.chatLocator };
}

export function admitTranscriptSourceToIndex(paths, request, sourceLogicalId, options = {}) {
    const source = registeredSource(paths, sourceLogicalId);
    const receipt = observeRegisteredTranscriptSource(paths, request, source.sourceLogicalId, { observedAt: options.observedAt });
    if (receipt.observationState !== TranscriptObservationState.OBSERVED) {
        return Object.freeze({ state: 'REFUSED', reason: `SOURCE_${receipt.observationState}`, receipt });
    }

    const resolved = resolveChatJsonlPath(request, locator(source));
    const bytes = fs.readFileSync(resolved.chatFilePath);
    const revision = admitTranscriptSourceObservation(paths, receipt);
    const parsed = parseTranscriptMessageCandidates(revision.entry, bytes);
    const messages = admitTranscriptMessageCandidates(paths, revision.entry, parsed);
    const visibilityProjection = projectTranscriptVisibility(messages.entry.batch, bytes);
    const visibility = admitTranscriptVisibilityProjection(paths, receipt.sourceRevisionHash, visibilityProjection);
    const projection = projectTranscriptIncrementally(paths, receipt.characterInstanceId);

    return Object.freeze({
        state: 'CURRENT',
        sourceLogicalId: receipt.sourceLogicalId,
        characterInstanceId: receipt.characterInstanceId,
        observation: receipt,
        revision: Object.freeze({ appended: revision.appended, entryId: revision.entry.entryId }),
        messages: Object.freeze({ appended: messages.appended, entryId: messages.entry.entryId, rowCount: messages.entry.batch.rows.length, invalidLineCount: parsed.invalidLines.length }),
        visibility: Object.freeze({ appended: visibility.appended, entryId: visibility.entry.entryId, rowCount: visibility.entry.projection.rows.length, tombstoneCount: visibility.entry.projection.tombstones.length }),
        projection: Object.freeze({ state: projection.state, changedDocuments: projection.changedDocuments, changedLinks: projection.changedLinks, generation: projection.generation, projectionHash: projection.projectionHash }),
    });
}
