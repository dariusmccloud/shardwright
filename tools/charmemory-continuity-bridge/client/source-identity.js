/**
 * Produces a stable bridge source identity from the Character Data Bank owner and
 * the logical file name. Attachment URLs are deliberately excluded: CharMemory
 * replaces an attachment URL when an edited file is uploaded.
 */
export function deriveCharMemorySourceId(characterAvatar, fileName) {
    const avatar = String(characterAvatar || '').trim();
    const name = String(fileName || '').trim();
    if (!avatar || !name) return null;
    return `charmemory-source:${JSON.stringify([avatar, name])}`;
}
