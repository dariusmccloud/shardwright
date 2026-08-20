function fnv1a32(input, seed = 2166136261) {
    let hash = seed >>> 0;
    const str = String(input || '');
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

/** Build a deterministic numeric hash accepted by the current vector backend. */
export function buildChunkHash(input) {
    const base = String(input || '');
    const h1 = fnv1a32(`a|${base}`);
    const h2 = fnv1a32(`b|${base}`);
    const value = ((h1 & 0x001fffff) * 4294967296) + (h2 >>> 0);
    return value > 0 ? value : 1;
}
