import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const DRIVE_PATH = /^[a-z]:/iu;
const GIT_METADATA_SEGMENT = '.git';

function manifestError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function isOutsideRoot(root, target) {
    const relative = path.relative(root, target);
    return relative === '..'
        || relative.startsWith(`..${path.sep}`)
        || path.isAbsolute(relative);
}

/**
 * Validate and canonicalize a declared path or a discovered relative path.
 * Backslashes are treated as path separators so Windows declarations have the
 * same serialized form as POSIX declarations.
 */
export function validateManifestPath(input) {
    if (typeof input !== 'string' || input.length === 0) {
        throw manifestError('MANIFEST_PATH_INVALID', 'A non-empty relative path is required.');
    }
    if (CONTROL_CHARACTER.test(input)) {
        throw manifestError('MANIFEST_PATH_CONTROL_CHARACTER', 'Manifest paths cannot contain control characters.');
    }

    const posixInput = input.replaceAll('\\', '/');
    if (posixInput.startsWith('/') || posixInput.startsWith('//') || DRIVE_PATH.test(posixInput)) {
        throw manifestError('MANIFEST_PATH_ABSOLUTE', 'Absolute, drive-letter, and network paths are not allowed in a manifest.');
    }

    const normalized = path.posix.normalize(posixInput);
    if (normalized === '..' || normalized.startsWith('../') || normalized.startsWith('/')) {
        throw manifestError('MANIFEST_PATH_OUTSIDE_REPOSITORY', 'The manifest path resolves outside the repository root.');
    }

    if (normalized === '.') return '';
    return normalized.replace(/\/+$/u, '');
}

function validateResolvedPath(repoRoot, relativePath) {
    const targetPath = relativePath === ''
        ? repoRoot
        : path.resolve(repoRoot, ...relativePath.split('/'));
    if (isOutsideRoot(repoRoot, targetPath)) {
        throw manifestError('MANIFEST_PATH_OUTSIDE_REPOSITORY', 'The manifest path resolves outside the repository root.');
    }
    return targetPath;
}

function readPolicyHash(repoRoot) {
    const policyPath = path.join(repoRoot, '.gitattributes');
    let stat;
    try {
        stat = fs.lstatSync(policyPath);
    } catch (error) {
        if (error?.code === 'ENOENT') return 'NONE';
        throw error;
    }

    if (stat.isSymbolicLink() || !stat.isFile()) {
        throw manifestError('MANIFEST_POLICY_FILE_INVALID', 'The repository .gitattributes policy must be a regular file.');
    }
    return sha256(fs.readFileSync(policyPath));
}

function lstatOrMissing(filePath) {
    try {
        return fs.lstatSync(filePath);
    } catch (error) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
        throw error;
    }
}

function utf8PathCompare(left, right) {
    return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function serializeEntries(entries) {
    return entries.map((entry) => `${entry.path}\t${entry.size}\t${entry.state}\t${entry.contentHash}`).join('\n');
}

function addEntry(entriesByPath, entry, sourcePath) {
    const previous = entriesByPath.get(entry.path);
    if (previous) {
        if (previous.sourcePath !== sourcePath) {
            throw manifestError('MANIFEST_PATH_COLLISION', `Distinct filesystem paths normalize to the same manifest path: ${entry.path}`);
        }
        return;
    }
    entriesByPath.set(entry.path, { ...entry, sourcePath });
}

function addLinkEntry(entriesByPath, relativePath, fullPath) {
    const target = fs.readlinkSync(fullPath);
    const targetBytes = Buffer.from(target, 'utf8');
    addEntry(entriesByPath, {
        path: relativePath,
        size: String(targetBytes.byteLength),
        state: 'LINK',
        contentHash: sha256(targetBytes),
    }, fullPath);
}

function addPresentFile(entriesByPath, relativePath, fullPath) {
    const bytes = fs.readFileSync(fullPath);
    addEntry(entriesByPath, {
        path: relativePath,
        size: String(bytes.byteLength),
        state: 'PRESENT',
        contentHash: sha256(bytes),
    }, fullPath);
}

function addMissingEntry(entriesByPath, relativePath, fullPath) {
    addEntry(entriesByPath, {
        path: relativePath,
        size: '-',
        state: 'MISSING',
        contentHash: '',
    }, fullPath);
}

function shouldExcludeGitPath(relativePath) {
    return relativePath.split('/').includes(GIT_METADATA_SEGMENT);
}

function walkDirectory(repoRoot, fullDirectoryPath, relativeDirectoryPath, entriesByPath) {
    const children = fs.readdirSync(fullDirectoryPath, { withFileTypes: true });
    for (const child of children) {
        const relativePath = validateManifestPath(
            relativeDirectoryPath ? `${relativeDirectoryPath}/${child.name}` : child.name,
        );
        if (shouldExcludeGitPath(relativePath)) continue;

        const fullPath = path.join(fullDirectoryPath, child.name);
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
            addLinkEntry(entriesByPath, relativePath, fullPath);
        } else if (stat.isDirectory()) {
            walkDirectory(repoRoot, fullPath, relativePath, entriesByPath);
        } else if (stat.isFile()) {
            addPresentFile(entriesByPath, relativePath, fullPath);
        } else {
            throw manifestError('MANIFEST_ENTRY_TYPE_UNSUPPORTED', `Unsupported filesystem entry: ${relativePath}`);
        }
    }
}

function addDeclaredPath(repoRoot, relativePath, entriesByPath) {
    if (shouldExcludeGitPath(relativePath)) return;

    const targetPath = validateResolvedPath(repoRoot, relativePath);
    const segments = relativePath === '' ? [] : relativePath.split('/');
    let currentPath = repoRoot;

    if (segments.length === 0) {
        walkDirectory(repoRoot, repoRoot, '', entriesByPath);
        return;
    }

    for (let index = 0; index < segments.length; index += 1) {
        currentPath = path.join(currentPath, segments[index]);
        const stat = lstatOrMissing(currentPath);
        if (!stat) {
            addMissingEntry(entriesByPath, relativePath, targetPath);
            return;
        }

        const currentRelativePath = segments.slice(0, index + 1).join('/');
        if (stat.isSymbolicLink()) {
            addLinkEntry(entriesByPath, currentRelativePath, currentPath);
            return;
        }

        const isFinalSegment = index === segments.length - 1;
        if (!isFinalSegment && !stat.isDirectory()) {
            addMissingEntry(entriesByPath, relativePath, targetPath);
            return;
        }

        if (!isFinalSegment) continue;
        if (stat.isDirectory()) {
            walkDirectory(repoRoot, currentPath, currentRelativePath, entriesByPath);
        } else if (stat.isFile()) {
            addPresentFile(entriesByPath, currentRelativePath, currentPath);
        } else {
            throw manifestError('MANIFEST_ENTRY_TYPE_UNSUPPORTED', `Unsupported filesystem entry: ${relativePath}`);
        }
    }
}

/** Compute the exact-byte worktree fingerprint for the declared path scope. */
export function computeFingerprint(repoRoot, inScopePaths) {
    if (typeof repoRoot !== 'string' || repoRoot.length === 0) {
        throw manifestError('MANIFEST_ROOT_INVALID', 'An existing repository root path is required.');
    }
    if (!Array.isArray(inScopePaths)) {
        throw manifestError('MANIFEST_SCOPE_INVALID', 'In-scope paths must be supplied as an array.');
    }

    const resolvedRoot = path.resolve(repoRoot);
    let rootStat;
    try {
        rootStat = fs.statSync(resolvedRoot);
    } catch (error) {
        throw manifestError('MANIFEST_ROOT_INVALID', `The repository root cannot be read: ${error?.message || error}`);
    }
    if (!rootStat.isDirectory()) {
        throw manifestError('MANIFEST_ROOT_INVALID', 'The repository root must be a directory.');
    }

    // Validate every caller-provided path before reading policy or source files.
    const normalizedPaths = inScopePaths.map((item) => validateManifestPath(item));
    for (const relativePath of normalizedPaths) validateResolvedPath(resolvedRoot, relativePath);

    const entriesByPath = new Map();
    for (const relativePath of normalizedPaths) {
        addDeclaredPath(resolvedRoot, relativePath, entriesByPath);
    }

    const entries = [...entriesByPath.values()]
        .map(({ sourcePath: _sourcePath, ...entry }) => entry)
        .sort((left, right) => utf8PathCompare(left.path, right.path));
    const serialized = serializeEntries(entries);
    const fingerprint = Object.freeze({
        policyHash: readPolicyHash(resolvedRoot),
        manifestHash: sha256(Buffer.from(serialized, 'utf8')),
    });

    return Object.freeze({
        entries: Object.freeze(entries.map((entry) => Object.freeze(entry))),
        serialized,
        fingerprint,
    });
}

/** Compare the policy/manifest pair, refusing comparison across policy changes. */
export function compareFingerprints(left, right) {
    for (const fingerprint of [left, right]) {
        if (!fingerprint || typeof fingerprint.policyHash !== 'string'
            || !/^(?:NONE|[a-f0-9]{64})$/u.test(fingerprint.policyHash)
            || typeof fingerprint.manifestHash !== 'string'
            || !/^[a-f0-9]{64}$/u.test(fingerprint.manifestHash)) {
            throw manifestError('MANIFEST_FINGERPRINT_INVALID', 'Both fingerprints must contain valid policy and manifest hashes.');
        }
    }

    if (left.policyHash !== right.policyHash) return 'STALE_REVIEW';
    if (left.manifestHash !== right.manifestHash) return 'CONTENT_CHANGED';
    return 'MATCH';
}
