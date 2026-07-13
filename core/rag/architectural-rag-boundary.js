export function excludeArchitecturalResults(results) {
    return (Array.isArray(results) ? results : []).filter(item =>
        String(item?.metadata?.shardProfile || '').trim() !== 'architectural'
    );
}

export function filterResultsByOriginBoundary(results) {
    return excludeArchitecturalResults(results);
}
