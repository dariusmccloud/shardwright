import fs from 'node:fs';
import { createAdapter } from './core.js';
import { ensureTables } from './transcript-incremental-projector.js';

export function readTranscriptCoverage(paths, characterInstanceId) {
    if (typeof characterInstanceId !== 'string' || !characterInstanceId.trim()) {
        return Object.freeze({ state: 'REFUSED', reason: 'CHARACTER_INSTANCE_REQUIRED' });
    }
    if (!fs.existsSync(paths.transcriptIndexDbPath)) {
        return Object.freeze({ state: 'NO_PROJECTION', reason: 'TRANSCRIPT_INDEX_UNAVAILABLE', characterInstanceId });
    }
    const adapter = createAdapter(paths.transcriptIndexDbPath);
    try {
        const schemaPresent = Boolean(adapter.scalar("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'transcript_projection_generations'"));
        ensureTables(adapter);
        if (!schemaPresent) return Object.freeze({ state: 'NO_PROJECTION', reason: 'TRANSCRIPT_INDEX_SCHEMA_UNAVAILABLE', characterInstanceId });
        const generation = adapter.get('SELECT generation, projection_hash, status FROM transcript_projection_generations WHERE character_instance_id = ?', [characterInstanceId]) || null;
        const documents = Number(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_documents WHERE character_instance_id = ?', [characterInstanceId]));
        const occurrences = Number(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_occurrence_links WHERE document_id IN (SELECT document_id FROM transcript_fts_documents WHERE character_instance_id = ?)', [characterInstanceId]));
        const searchable = Number(adapter.scalar('SELECT COUNT(*) FROM transcript_fts_search WHERE character_instance_id = ?', [characterInstanceId]));
        return Object.freeze({ state: generation?.status === 'CURRENT' ? 'CURRENT' : 'STALE', characterInstanceId, generation, documents, occurrences, searchable });
    } finally {
        adapter.close();
    }
}
