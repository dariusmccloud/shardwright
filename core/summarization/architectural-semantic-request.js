import { createJsonSchemaResponseFormat } from '../api/structured-output.js';
import {
    ARCHITECTURAL_SEMANTIC_PROMPT_VERSION,
    DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT,
} from './architectural-semantic-prompt.js';

export const ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID = 'https://summary-sharder/architectural-intermediate/v1';
export const ARCHITECTURAL_INTERMEDIATE_SCHEMA_VERSION = 1;
export const ARCHITECTURAL_INTERMEDIATE_RESPONSE_NAME = 'architectural_intermediate_v1';
export const ARCHITECTURAL_INTERMEDIATE_SCHEMA_URL = new URL(
    './architectural-intermediate-schema-v1.json',
    import.meta.url,
);

let defaultSchemaPromise = null;

function verifyArchitecturalIntermediateSchema(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        throw new Error('Architectural intermediate schema response must be a JSON object.');
    }
    if (schema.$id !== ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID) {
        throw new Error(`Architectural intermediate schema identity mismatch: ${String(schema.$id || 'missing')}`);
    }
    if (schema?.properties?.schemaVersion?.const !== ARCHITECTURAL_INTERMEDIATE_SCHEMA_VERSION) {
        throw new Error('Architectural intermediate schema version mismatch.');
    }
    return schema;
}

async function fetchArchitecturalIntermediateSchema(fetchImpl, schemaUrl) {
    if (typeof fetchImpl !== 'function') {
        throw new Error('Architectural intermediate schema loader requires fetch support.');
    }

    const response = await fetchImpl(schemaUrl);
    if (!response?.ok) {
        throw new Error(`Could not load architectural intermediate schema (${response?.status || 'unknown'}).`);
    }

    return verifyArchitecturalIntermediateSchema(await response.json());
}

/**
 * Load the normative browser-side schema. Default loads are cached; injected
 * test/custom loads remain isolated from the runtime cache.
 *
 * @param {{fetchImpl?:Function,schemaUrl?:URL|string}} options
 * @returns {Promise<Object>}
 */
export async function loadArchitecturalIntermediateSchema(options = {}) {
    const hasOverrides = Object.hasOwn(options, 'fetchImpl') || Object.hasOwn(options, 'schemaUrl');
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const schemaUrl = options.schemaUrl || ARCHITECTURAL_INTERMEDIATE_SCHEMA_URL;

    if (hasOverrides) {
        return await fetchArchitecturalIntermediateSchema(fetchImpl, schemaUrl);
    }

    defaultSchemaPromise ||= fetchArchitecturalIntermediateSchema(fetchImpl, schemaUrl)
        .catch((error) => {
            defaultSchemaPromise = null;
            throw error;
        });
    return await defaultSchemaPromise;
}

/**
 * Build the dormant C0.6.9 semantic-generation request contract.
 *
 * @param {{fetchImpl?:Function,schemaUrl?:URL|string}} options
 * @returns {Promise<Object>}
 */
export async function createArchitecturalSemanticRequestDescriptor(options = {}) {
    const schema = await loadArchitecturalIntermediateSchema(options);
    return {
        schemaId: ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID,
        schemaVersion: ARCHITECTURAL_INTERMEDIATE_SCHEMA_VERSION,
        promptVersion: ARCHITECTURAL_SEMANTIC_PROMPT_VERSION,
        systemPrompt: DEFAULT_ARCHITECTURAL_SEMANTIC_PROMPT,
        structuredOutput: createJsonSchemaResponseFormat({
            name: ARCHITECTURAL_INTERMEDIATE_RESPONSE_NAME,
            schema,
        }),
    };
}
