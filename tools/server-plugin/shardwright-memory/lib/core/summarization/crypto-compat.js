const NON_CRYPTO_HASH_SEEDS = [
    0x811c9dc5,
    0x9e3779b9,
    0x85ebca6b,
    0xc2b2ae35,
];

let fallbackRandomCounter = 0;

function fnv1a32(text, seed) {
    let hash = seed >>> 0;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

function nonCryptoDigestHex(text) {
    const input = String(text || '');
    return NON_CRYPTO_HASH_SEEDS
        .map((seed, index) => {
            const salted = `${index}:${input}:${input.length}`;
            return fnv1a32(salted, seed).toString(16).padStart(8, '0');
        })
        .join('')
        .repeat(2);
}

export async function hashTextSha256Compat(text, cryptoApi = globalThis.crypto) {
    if (cryptoApi?.subtle) {
        const buffer = new TextEncoder().encode(String(text || ''));
        const digest = await cryptoApi.subtle.digest('SHA-256', buffer);
        const hex = Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
        return `sha256:${hex}`;
    }

    return `sha256:${nonCryptoDigestHex(text)}`;
}

function randomBytesHex(byteCount, cryptoApi = globalThis.crypto) {
    if (typeof cryptoApi?.getRandomValues === 'function') {
        const bytes = new Uint8Array(byteCount);
        cryptoApi.getRandomValues(bytes);
        return Array.from(bytes)
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
    }

    fallbackRandomCounter += 1;
    let hex = '';
    while (hex.length < byteCount * 2) {
        const entropy = [
            Date.now(),
            fallbackRandomCounter,
            Math.random(),
            typeof performance?.now === 'function' ? performance.now() : 0,
            hex.length,
        ].join(':');
        hex += nonCryptoDigestHex(entropy);
    }
    return hex.slice(0, byteCount * 2);
}

export function makeRandomHexId(byteCount = 16, cryptoApi = globalThis.crypto) {
    if (typeof cryptoApi?.randomUUID === 'function') {
        return cryptoApi.randomUUID().replace(/-/gu, '').toLowerCase();
    }
    return randomBytesHex(byteCount, cryptoApi);
}
