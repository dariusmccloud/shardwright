import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sqlite from 'node:sqlite';

const SCHEMA_VERSION = 2;

function hash(value) {
    return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function normalizeText(value) {
    return String(value ?? '').replace(/\r\n/g, '\n').trim();
}

function parseAttributes(raw) {
    const attributes = {};
    const matcher = /([\w-]+)\s*=\s*(["'])(.*?)\2/g;
    for (let match = matcher.exec(raw); match; match = matcher.exec(raw)) {
        attributes[match[1].toLowerCase()] = match[3];
    }
    return attributes;
}

/**
 * Parses CharMemory's documented <memory> blocks without modifying their source.
 * The source locator is intentionally not the identity: it is only a safe matching aid.
 */
export function parseMemoryBlocks(content) {
    const blocks = [];
    const matcher = /<memory\b([^>]*)>([\s\S]*?)<\/memory>/gi;
    for (let match = matcher.exec(String(content ?? '')); match; match = matcher.exec(String(content ?? ''))) {
        const attributes = parseAttributes(match[1]);
        const text = normalizeText(match[2]);
        if (!text) continue;
        const chat = normalizeText(attributes.chat || '');
        const date = normalizeText(attributes.date || '');
        blocks.push({
            text,
            contentHash: hash(text),
            sourceChat: chat,
            sourceDate: date,
            anchorKey: `${chat}\u0000${date}`,
            locatorOrdinal: blocks.length,
        });
    }
    return blocks;
}

export class ContinuityBridgeError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function ensureDirectory(directory) {
    fs.mkdirSync(directory, { recursive: true });
}

function sourceHash(content) {
    return hash(String(content ?? '').replace(/\r\n/g, '\n'));
}

function createStableId() {
    return `block:${crypto.randomUUID()}`;
}

function safeFtsQuery(query) {
    const terms = String(query ?? '').match(/[\p{L}\p{N}_'-]{2,}/gu) || [];
    return [...new Set(terms.map((term) => `"${term.replaceAll('"', '""')}"`))].join(' OR ');
}

function countContentHashes(blocks) {
    const counts = new Map();
    for (const block of blocks) {
        counts.set(block.content_hash || block.contentHash, (counts.get(block.content_hash || block.contentHash) || 0) + 1);
    }
    return counts;
}

export class ContinuityStore {
    constructor(storageRoot) {
        ensureDirectory(storageRoot);
        this.dbPath = path.join(storageRoot, 'continuity-bridge.db');
        this.db = new sqlite.DatabaseSync(this.dbPath);
        this.initialize();
    }

    initialize() {
        this.db.exec(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS bridge_sources (
                source_id TEXT PRIMARY KEY,
                source_hash TEXT NOT NULL,
                synced_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS bridge_blocks (
                stable_id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                anchor_key TEXT NOT NULL,
                locator_ordinal INTEGER NOT NULL,
                current_revision INTEGER NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                retired_at INTEGER
            );
            CREATE INDEX IF NOT EXISTS bridge_blocks_source_active
                ON bridge_blocks(source_id, active);
            CREATE TABLE IF NOT EXISTS bridge_block_revisions (
                stable_id TEXT NOT NULL,
                revision INTEGER NOT NULL,
                content_hash TEXT NOT NULL,
                content TEXT NOT NULL,
                source_chat TEXT NOT NULL DEFAULT '',
                source_date TEXT NOT NULL DEFAULT '',
                provenance_recorded INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (stable_id, revision)
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS bridge_current_fts USING fts5(
                stable_id UNINDEXED,
                source_id UNINDEXED,
                content
            );
        `);
        const columns = this.db.prepare('PRAGMA table_info(bridge_block_revisions)').all();
        const knownColumns = new Set(columns.map(column => column.name));
        if (!knownColumns.has('source_chat')) this.db.exec("ALTER TABLE bridge_block_revisions ADD COLUMN source_chat TEXT NOT NULL DEFAULT ''");
        if (!knownColumns.has('source_date')) this.db.exec("ALTER TABLE bridge_block_revisions ADD COLUMN source_date TEXT NOT NULL DEFAULT ''");
        if (!knownColumns.has('provenance_recorded')) this.db.exec('ALTER TABLE bridge_block_revisions ADD COLUMN provenance_recorded INTEGER NOT NULL DEFAULT 0');
        this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }

    close() {
        this.db.close();
    }

    getSource(sourceId) {
        return this.db.prepare('SELECT source_id, source_hash, synced_at FROM bridge_sources WHERE source_id = ?').get(sourceId) || null;
    }

    describeSource(sourceId) {
        const source = this.getSource(sourceId);
        if (!source) return null;
        const activeBlockCount = this.db.prepare(`
            SELECT COUNT(*) AS count FROM bridge_blocks WHERE source_id = ? AND active = 1
        `).get(sourceId).count;
        const revisionCount = this.db.prepare(`
            SELECT COUNT(*) AS count
            FROM bridge_block_revisions r
            JOIN bridge_blocks b ON b.stable_id = r.stable_id
            WHERE b.source_id = ?
        `).get(sourceId).count;
        return {
            sourceId: source.source_id,
            sourceHash: source.source_hash,
            syncedAt: source.synced_at,
            activeBlockCount,
            revisionCount,
        };
    }

    getActiveBlocks(sourceId) {
        return this.db.prepare(`
            SELECT b.stable_id, b.anchor_key, b.locator_ordinal, b.current_revision,
                   r.content_hash, r.content, r.source_chat, r.source_date, r.provenance_recorded
            FROM bridge_blocks b
            JOIN bridge_block_revisions r
              ON r.stable_id = b.stable_id AND r.revision = b.current_revision
            WHERE b.source_id = ? AND b.active = 1
            ORDER BY b.locator_ordinal ASC
        `).all(sourceId);
    }

    /**
     * Version 0.1 used the mutable Data Bank attachment URL as source identity.
     * CharMemory replaces that URL on save. Adopt exactly one prior URL source only
     * when its block multiset proves it differs by no more than one changed block.
     */
    findLegacyUrlSourceForMigration(sourceId, incoming) {
        const sources = this.db.prepare(`
            SELECT source_id FROM bridge_sources
            WHERE source_id LIKE '/user/files/%'
        `).all();
        const incomingCounts = countContentHashes(incoming);
        const candidates = [];

        for (const { source_id: legacySourceId } of sources) {
            const active = this.getActiveBlocks(legacySourceId);
            if (active.length !== incoming.length) continue;
            const existingCounts = countContentHashes(active);
            let unchangedCount = 0;
            for (const [contentHash, count] of incomingCounts) {
                unchangedCount += Math.min(count, existingCounts.get(contentHash) || 0);
            }
            if (incoming.length - unchangedCount <= 1) candidates.push(legacySourceId);
        }

        if (candidates.length > 1) {
            throw new ContinuityBridgeError(
                'CONTINUITY_LEGACY_SOURCE_AMBIGUOUS',
                'The previous URL-identified source cannot be migrated safely. The source was left unchanged.',
            );
        }
        return candidates[0] || null;
    }

    adoptLegacyUrlSource(legacySourceId, sourceId) {
        this.db.prepare('UPDATE bridge_sources SET source_id = ? WHERE source_id = ?').run(sourceId, legacySourceId);
        this.db.prepare('UPDATE bridge_blocks SET source_id = ? WHERE source_id = ?').run(sourceId, legacySourceId);
        this.db.prepare('UPDATE bridge_current_fts SET source_id = ? WHERE source_id = ?').run(sourceId, legacySourceId);
    }

    transaction(callback) {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const result = callback();
            this.db.exec('COMMIT');
            return result;
        } catch (error) {
            try {
                this.db.exec('ROLLBACK');
            } catch {
                // Preserve the originating refusal or write failure.
            }
            throw error;
        }
    }

    hasUnrecordedCurrentProvenance(sourceId) {
        return this.db.prepare(`
            SELECT 1
            FROM bridge_blocks b
            JOIN bridge_block_revisions r
              ON r.stable_id = b.stable_id AND r.revision = b.current_revision
            WHERE b.source_id = ? AND b.active = 1 AND r.provenance_recorded = 0
            LIMIT 1
        `).get(sourceId) !== undefined;
    }

    /**
     * Synchronizes a whole Markdown document only as a source snapshot. Unchanged content
     * exits before parsing or writing. A changed source adds revisions; it never rewrites one.
     */
    sync(sourceId, content, now = Date.now()) {
        if (!sourceId || typeof sourceId !== 'string') {
            throw new ContinuityBridgeError('CONTINUITY_SOURCE_REQUIRED', 'A stable source identifier is required.');
        }
        if (typeof content !== 'string') {
            throw new ContinuityBridgeError('CONTINUITY_SOURCE_CONTENT_REQUIRED', 'Markdown source content is required.');
        }

        const currentSourceHash = sourceHash(content);
        const previousSource = this.getSource(sourceId);
        if (previousSource?.source_hash === currentSourceHash && !this.hasUnrecordedCurrentProvenance(sourceId)) {
            return {
                sourceId,
                skipped: true,
                parsedBlocks: 0,
                insertedRevisions: 0,
                retiredBlocks: 0,
                migratedLegacySource: false,
                source: this.describeSource(sourceId),
            };
        }

        const incoming = parseMemoryBlocks(content);
        if (incoming.length === 0) {
            throw new ContinuityBridgeError('CONTINUITY_NO_MEMORY_BLOCKS', 'The selected source contains no readable <memory> blocks.');
        }
        const legacySourceId = previousSource ? null : this.findLegacyUrlSourceForMigration(sourceId, incoming);

        return this.transaction(() => {
            if (legacySourceId) this.adoptLegacyUrlSource(legacySourceId, sourceId);
            const active = this.getActiveBlocks(sourceId);
            const unused = new Map(active.map((block) => [block.stable_id, block]));
            const activeByOrdinal = new Map(active.map((block) => [block.locator_ordinal, block]));
            const planned = [];

            for (const [incomingOrdinal, block] of incoming.entries()) {
                const exactMatches = [...unused.values()].filter((candidate) => candidate.content_hash === block.contentHash);
                let matched = exactMatches.length === 1 ? exactMatches[0] : null;

                if (!matched && exactMatches.length > 1) {
                    const ordinalMatch = exactMatches.find((candidate) => candidate.locator_ordinal === block.locatorOrdinal);
                    if (ordinalMatch) matched = ordinalMatch;
                }

                if (!matched) {
                    const anchorMatches = [...unused.values()].filter((candidate) => candidate.anchor_key === block.anchorKey);
                    if (anchorMatches.length === 1) {
                        matched = anchorMatches[0];
                    } else if (anchorMatches.length > 1) {
                        // Duplicate CharMemory anchors are common. A locator alone is not
                        // identity: use unchanged neighbouring blocks as a bounded witness.
                        const previousIncomingHash = incoming[incomingOrdinal - 1]?.contentHash;
                        const nextIncomingHash = incoming[incomingOrdinal + 1]?.contentHash;
                        const scored = anchorMatches.map((candidate) => {
                            const previousStored = activeByOrdinal.get(candidate.locator_ordinal - 1);
                            const nextStored = activeByOrdinal.get(candidate.locator_ordinal + 1);
                            const score = Number(Boolean(previousIncomingHash && previousStored?.content_hash === previousIncomingHash))
                                + Number(Boolean(nextIncomingHash && nextStored?.content_hash === nextIncomingHash));
                            return { candidate, score };
                        });
                        const bestScore = Math.max(...scored.map((entry) => entry.score));
                        const best = scored.filter((entry) => entry.score === bestScore);
                        if (bestScore > 0 && best.length === 1) {
                            matched = best[0].candidate;
                        } else {
                            throw new ContinuityBridgeError(
                                'CONTINUITY_AMBIGUOUS_BLOCK_MATCH',
                                'A changed memory block cannot be matched safely to its prior revision. The source was left unchanged.',
                            );
                        }
                    }
                }

                if (matched) unused.delete(matched.stable_id);
                planned.push({ block, matched });
            }

            let insertedRevisions = 0;
            let backfilledProvenance = 0;
            for (const { block, matched } of planned) {
                if (!matched) {
                    const stableId = createStableId();
                    this.db.prepare(`
                        INSERT INTO bridge_blocks (stable_id, source_id, anchor_key, locator_ordinal, current_revision, active, retired_at)
                        VALUES (?, ?, ?, ?, 1, 1, NULL)
                    `).run(stableId, sourceId, block.anchorKey, block.locatorOrdinal);
                    this.db.prepare(`
                        INSERT INTO bridge_block_revisions (stable_id, revision, content_hash, content, source_chat, source_date, provenance_recorded, created_at)
                        VALUES (?, 1, ?, ?, ?, ?, 1, ?)
                    `).run(stableId, block.contentHash, block.text, block.sourceChat, block.sourceDate, now);
                    this.db.prepare('INSERT INTO bridge_current_fts (stable_id, source_id, content) VALUES (?, ?, ?)')
                        .run(stableId, sourceId, block.text);
                    insertedRevisions += 1;
                    continue;
                }

                const contentUnchanged = matched.content_hash === block.contentHash;
                const provenanceUnchanged = Number(matched.provenance_recorded) === 1
                    && matched.source_chat === block.sourceChat
                    && matched.source_date === block.sourceDate;
                this.db.prepare(`
                    UPDATE bridge_blocks
                    SET anchor_key = ?, locator_ordinal = ?, active = 1, retired_at = NULL
                    WHERE stable_id = ?
                `).run(block.anchorKey, block.locatorOrdinal, matched.stable_id);
                if (contentUnchanged && provenanceUnchanged) continue;

                if (contentUnchanged && Number(matched.provenance_recorded) === 0) {
                    // A pre-v2 revision did not have source fields at creation. This one-time,
                    // source-derived migration fills only missing provenance; it creates no new
                    // content revision and does no FTS work.
                    this.db.prepare(`
                        UPDATE bridge_block_revisions
                        SET source_chat = ?, source_date = ?, provenance_recorded = 1
                        WHERE stable_id = ? AND revision = ?
                    `).run(block.sourceChat, block.sourceDate, matched.stable_id, matched.current_revision);
                    backfilledProvenance += 1;
                    continue;
                }

                const nextRevision = Number(matched.current_revision) + 1;
                this.db.prepare(`
                    INSERT INTO bridge_block_revisions (stable_id, revision, content_hash, content, source_chat, source_date, provenance_recorded, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                `).run(matched.stable_id, nextRevision, block.contentHash, block.text, block.sourceChat, block.sourceDate, now);
                this.db.prepare('UPDATE bridge_blocks SET current_revision = ? WHERE stable_id = ?')
                    .run(nextRevision, matched.stable_id);
                this.db.prepare('DELETE FROM bridge_current_fts WHERE stable_id = ?').run(matched.stable_id);
                this.db.prepare('INSERT INTO bridge_current_fts (stable_id, source_id, content) VALUES (?, ?, ?)')
                    .run(matched.stable_id, sourceId, block.text);
                insertedRevisions += 1;
            }

            for (const removed of unused.values()) {
                this.db.prepare('UPDATE bridge_blocks SET active = 0, retired_at = ? WHERE stable_id = ?')
                    .run(now, removed.stable_id);
                this.db.prepare('DELETE FROM bridge_current_fts WHERE stable_id = ?').run(removed.stable_id);
            }

            this.db.prepare(`
                INSERT INTO bridge_sources (source_id, source_hash, synced_at)
                VALUES (?, ?, ?)
                ON CONFLICT(source_id) DO UPDATE SET source_hash = excluded.source_hash, synced_at = excluded.synced_at
            `).run(sourceId, currentSourceHash, now);

            return {
                sourceId,
                skipped: false,
                parsedBlocks: incoming.length,
                insertedRevisions,
                backfilledProvenance,
                retiredBlocks: unused.size,
                migratedLegacySource: Boolean(legacySourceId),
                source: this.describeSource(sourceId),
            };
        });
    }

    search(sourceId, query, limit = 24) {
        const ftsQuery = safeFtsQuery(query);
        if (!ftsQuery) return [];
        const boundedLimit = Math.max(1, Math.min(Number(limit) || 24, 24));
        return this.db.prepare(`
            SELECT f.stable_id AS stableId, r.content, r.source_chat AS sourceChat,
                   r.source_date AS sourceDate, r.provenance_recorded AS provenanceRecorded,
                   bm25(bridge_current_fts) AS rank
            FROM bridge_current_fts f
            JOIN bridge_blocks b ON b.stable_id = f.stable_id
            JOIN bridge_block_revisions r ON r.stable_id = b.stable_id AND r.revision = b.current_revision
            WHERE bridge_current_fts MATCH ? AND f.source_id = ?
            ORDER BY rank ASC, f.stable_id ASC
            LIMIT ?
        `).all(ftsQuery, sourceId, boundedLimit);
    }

    revisions(stableId) {
        return this.db.prepare(`
            SELECT stable_id AS stableId, revision, content_hash AS contentHash, content,
                   source_chat AS sourceChat, source_date AS sourceDate,
                   provenance_recorded AS provenanceRecorded, created_at AS createdAt
            FROM bridge_block_revisions WHERE stable_id = ? ORDER BY revision ASC
        `).all(stableId);
    }
}
