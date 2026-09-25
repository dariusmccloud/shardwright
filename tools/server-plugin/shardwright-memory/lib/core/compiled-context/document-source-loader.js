import fs from 'node:fs';
import path from 'node:path';

import { compileDocumentRegistry } from './document-compiler.js';

function sourceError(message, code, extra = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, extra);
    return error;
}

export function loadCompiledContextDocumentRegistry(descriptors) {
    if (!Array.isArray(descriptors) || descriptors.length === 0) {
        throw sourceError('At least one explicit compiled-context source descriptor is required.', 'COMPILED_CONTEXT_SOURCES_REQUIRED');
    }
    const documents = descriptors.map((descriptor, index) => {
        if (!descriptor || typeof descriptor !== 'object') {
            throw sourceError(`Compiled-context source descriptor ${index} is invalid.`, 'COMPILED_CONTEXT_SOURCE_DESCRIPTOR_INVALID');
        }
        const filePath = typeof descriptor.filePath === 'string' ? descriptor.filePath.trim() : '';
        if (!filePath) throw sourceError(`Compiled-context source descriptor ${index} has no file path.`, 'COMPILED_CONTEXT_SOURCE_PATH_REQUIRED');
        let stat;
        try {
            stat = fs.statSync(filePath);
        } catch (error) {
            throw sourceError(`Compiled-context source cannot be read: ${filePath}`, 'COMPILED_CONTEXT_SOURCE_UNREADABLE', { cause: error });
        }
        if (!stat.isFile()) throw sourceError(`Compiled-context source is not a file: ${filePath}`, 'COMPILED_CONTEXT_SOURCE_NOT_FILE');
        let text;
        try {
            text = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            throw sourceError(`Compiled-context source cannot be read: ${filePath}`, 'COMPILED_CONTEXT_SOURCE_UNREADABLE', { cause: error });
        }
        if (!text.trim()) throw sourceError(`Compiled-context source is empty: ${filePath}`, 'COMPILED_CONTEXT_SOURCE_EMPTY');
        return {
            documentLogicalId: descriptor.documentLogicalId,
            canonicalName: descriptor.canonicalName,
            text,
            sourcePath: path.resolve(filePath),
            byteLength: Buffer.byteLength(text, 'utf8'),
        };
    });
    const registry = compileDocumentRegistry(documents);
    return Object.freeze({
        registry,
        sources: Object.freeze(registry.documents.map((document, index) => Object.freeze({
            documentLogicalId: document.documentLogicalId,
            canonicalName: document.canonicalName,
            sourcePath: documents[index].sourcePath,
            byteLength: documents[index].byteLength,
            sourceRevisionHash: document.revisionHash,
        }))),
    });
}
