import { hashTextSha256Compat } from './summarization/crypto-compat.js';

export const SHARDWRIGHT_METADATA_NAMESPACE = 'shardwright';
export const LEGACY_METADATA_NAMESPACE = 'summary_sharder';
export const METADATA_MIGRATION_MARKER = '__shardwrightIdentityMigration';
export const METADATA_MIGRATION_POLICY = 'shardwright-metadata-identity-v1';

const MESSAGE_FIELDS = Object.freeze([
    'messageIdentity',
    'archive',
    'evidencePolicy',
    'speakerIdentity',
]);

const CHAT_FIELDS = Object.freeze([
    'architecturalDecisionCapacityOverrides',
    'architecturalMemoryBinding',
    'chatId',
    'coldArchive',
    'lastUsedPromptName',
    'messageIdentity',
    'messageTombstones',
    'shardManifests',
    'summarizedRanges',
]);

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (isRecord(value)) {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .filter((key) => value[key] !== undefined)
                .map((key) => [key, canonicalize(value[key])])
        );
    }
    return value;
}

async function hashSnapshot(value, cryptoApi) {
    return hashTextSha256Compat(JSON.stringify(canonicalize(value)), cryptoApi);
}

function createConflict(scope, index = null) {
    const locator = index === null ? 'chat metadata' : `message ${index}`;
    const error = new Error(`Canonical and legacy ${locator} coexist without a completed Shardwright migration marker.`);
    error.code = 'SHARDWRIGHT_METADATA_MIGRATION_CONFLICT';
    error.scope = scope;
    error.messageIndex = index;
    return error;
}

async function buildMigrationCandidate(owner, fields, scope, options = {}) {
    if (!isRecord(owner)) return null;
    const legacy = owner[LEGACY_METADATA_NAMESPACE];
    const canonical = owner[SHARDWRIGHT_METADATA_NAMESPACE];

    if (canonical !== undefined) {
        if (!isRecord(canonical)) throw createConflict(scope, options.messageIndex ?? null);
        const marker = canonical[METADATA_MIGRATION_MARKER];
        if (legacy !== undefined && isRecord(legacy) && marker?.policy === METADATA_MIGRATION_POLICY) {
            const sourceHash = await hashSnapshot(legacy, options.cryptoApi);
            if (marker.status === 'MIGRATED'
                && marker.sourceNamespace === LEGACY_METADATA_NAMESPACE
                && marker.destinationNamespace === SHARDWRIGHT_METADATA_NAMESPACE
                && marker.sourceHash === sourceHash
                && /^sha256:[0-9a-f]{64}$/u.test(String(marker.destinationHash || ''))) {
                return null;
            }
        }
        if (legacy !== undefined) throw createConflict(scope, options.messageIndex ?? null);
        return null;
    }
    if (legacy === undefined) return null;
    if (!isRecord(legacy)) throw createConflict(scope, options.messageIndex ?? null);

    const recognized = {};
    for (const field of fields) {
        if (legacy[field] !== undefined) recognized[field] = cloneJson(legacy[field]);
    }
    const unrecognizedKeys = Object.keys(legacy)
        .filter((key) => !fields.includes(key) && key !== METADATA_MIGRATION_MARKER)
        .sort();
    const sourceHash = await hashSnapshot(legacy, options.cryptoApi);
    const destinationHash = await hashSnapshot(recognized, options.cryptoApi);
    recognized[METADATA_MIGRATION_MARKER] = {
        policy: METADATA_MIGRATION_POLICY,
        status: 'MIGRATED',
        sourceNamespace: LEGACY_METADATA_NAMESPACE,
        destinationNamespace: SHARDWRIGHT_METADATA_NAMESPACE,
        sourceHash,
        destinationHash,
        unrecognizedKeys,
        completedAt: options.completedAt,
    };
    return { owner, destination: recognized, scope, messageIndex: options.messageIndex ?? null };
}

export async function migrateShardwrightMetadataIdentity(options = {}) {
    const messages = Array.isArray(options.messages) ? options.messages : [];
    const chatMetadata = isRecord(options.chatMetadata) ? options.chatMetadata : {};
    const cryptoApi = options.cryptoApi || globalThis.crypto;
    const completedAt = new Date(Number.isFinite(options.now) ? options.now : Date.now()).toISOString();
    const plans = [];

    const chatPlan = await buildMigrationCandidate(chatMetadata, CHAT_FIELDS, 'CHAT', {
        cryptoApi,
        completedAt,
    });
    if (chatPlan) plans.push(chatPlan);

    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        if (!isRecord(message)) continue;
        const messageExtra = isRecord(message.extra) ? message.extra : null;
        if (!messageExtra) continue;
        const plan = await buildMigrationCandidate(messageExtra, MESSAGE_FIELDS, 'MESSAGE', {
            cryptoApi,
            completedAt,
            messageIndex: index,
        });
        if (plan) plans.push(plan);
    }

    for (const plan of plans) {
        plan.owner[SHARDWRIGHT_METADATA_NAMESPACE] = plan.destination;
    }

    return {
        changed: plans.length > 0,
        chatMetadataMigrated: plans.some((plan) => plan.scope === 'CHAT'),
        messagesMigrated: plans.filter((plan) => plan.scope === 'MESSAGE').length,
    };
}
