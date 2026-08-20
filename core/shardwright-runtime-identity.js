export const SHARDWRIGHT_ROOT_GLOBAL = 'Shardwright';
export const SHARDWRIGHT_INTERCEPTOR_GLOBAL = 'shardwright_rearrangeChat';
export const LEGACY_SUMMARY_SHARDER_INTERCEPTOR_GLOBAL = 'summary_sharder_rearrangeChat';

function createIdentityCollisionError(identifier) {
    const error = new Error(`Shardwright cannot claim runtime identifier "${identifier}" because it is already owned by an incompatible value.`);
    error.code = 'SHARDWRIGHT_RUNTIME_IDENTITY_COLLISION';
    error.identifier = identifier;
    return error;
}

function isOwnedObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function ensureShardwrightRoot(target = globalThis) {
    const existing = target?.[SHARDWRIGHT_ROOT_GLOBAL];
    if (existing === undefined) {
        const root = {};
        target[SHARDWRIGHT_ROOT_GLOBAL] = root;
        return root;
    }
    if (!isOwnedObject(existing)) {
        throw createIdentityCollisionError(SHARDWRIGHT_ROOT_GLOBAL);
    }
    return existing;
}

export function ensureShardwrightNamespace(name, target = globalThis) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
        throw new TypeError('Shardwright namespace name is required.');
    }

    const root = ensureShardwrightRoot(target);
    const existing = root[normalizedName];
    if (existing === undefined) {
        const namespace = {};
        root[normalizedName] = namespace;
        return namespace;
    }
    if (!isOwnedObject(existing)) {
        throw createIdentityCollisionError(`${SHARDWRIGHT_ROOT_GLOBAL}.${normalizedName}`);
    }
    return existing;
}

export function registerShardwrightInterceptor(interceptor, target = globalThis) {
    if (typeof interceptor !== 'function') {
        throw new TypeError('Shardwright generation interceptor must be a function.');
    }

    const existingGlobal = target?.[SHARDWRIGHT_INTERCEPTOR_GLOBAL];
    if (existingGlobal !== undefined && existingGlobal !== interceptor) {
        throw createIdentityCollisionError(SHARDWRIGHT_INTERCEPTOR_GLOBAL);
    }

    const interceptors = ensureShardwrightNamespace('interceptors', target);
    if (interceptors.generate !== undefined && interceptors.generate !== interceptor) {
        throw createIdentityCollisionError(`${SHARDWRIGHT_ROOT_GLOBAL}.interceptors.generate`);
    }

    target[SHARDWRIGHT_INTERCEPTOR_GLOBAL] = interceptor;
    interceptors.generate = interceptor;
    return interceptor;
}
