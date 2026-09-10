/**
 * A bridge-owned logical source is deliberately excluded from SillyTavern's
 * native file-vector path. Native exclusions are URL based, while CharMemory
 * replaces URLs on every save; retaining the logical source ID makes the
 * handoff durable across those replacements.
 */
export function claimNativeVectorHandoff(extensionSettings, moduleName, sourceId, sourceUrl) {
    if (!sourceId || !sourceUrl) return false;

    const bridgeSettings = extensionSettings[moduleName] ??= {};
    bridgeSettings.managedSourceIds ??= [];
    extensionSettings.disabled_attachments ??= [];

    let changed = false;
    if (!bridgeSettings.managedSourceIds.includes(sourceId)) {
        bridgeSettings.managedSourceIds.push(sourceId);
        changed = true;
    }
    if (!extensionSettings.disabled_attachments.includes(sourceUrl)) {
        extensionSettings.disabled_attachments.push(sourceUrl);
        changed = true;
    }
    return changed;
}

