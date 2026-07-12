const JSON_SCHEMA_RESPONSE_TYPE = 'json_schema';
const RESPONSE_FORMAT_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isPlainObject(value) {
    return Boolean(value)
        && typeof value === 'object'
        && !Array.isArray(value);
}

/**
 * Build an OpenAI-compatible strict JSON Schema response format.
 *
 * @param {{name:string, schema:Object, strict?:boolean}} options
 * @returns {{type:'json_schema',json_schema:{name:string,strict:boolean,schema:Object}}}
 */
export function createJsonSchemaResponseFormat({ name, schema, strict = true } = {}) {
    const normalizedName = String(name || '').trim();
    if (!RESPONSE_FORMAT_NAME_PATTERN.test(normalizedName)) {
        throw new Error('Structured-output schema name must contain 1-64 letters, numbers, underscores, or hyphens.');
    }
    if (!isPlainObject(schema)) {
        throw new Error('Structured-output schema must be a JSON object.');
    }
    if (strict !== true) {
        throw new Error('Structured-output JSON Schema requests must use strict mode.');
    }

    return {
        type: JSON_SCHEMA_RESPONSE_TYPE,
        json_schema: {
            name: normalizedName,
            strict: true,
            schema,
        },
    };
}

/**
 * Add a structured-output descriptor without mutating the base request body.
 *
 * @param {Object} body
 * @param {Object|null|undefined} responseFormat
 * @returns {Object}
 */
export function applyStructuredOutputFormat(body, responseFormat) {
    if (!isPlainObject(body)) {
        throw new Error('Structured-output request body must be a JSON object.');
    }
    if (responseFormat == null) {
        return body;
    }
    if (!isPlainObject(responseFormat)
        || responseFormat.type !== JSON_SCHEMA_RESPONSE_TYPE
        || !isPlainObject(responseFormat.json_schema)) {
        throw new Error('Structured-output response format must be a JSON Schema descriptor.');
    }

    const normalizedFormat = createJsonSchemaResponseFormat(responseFormat.json_schema);
    return {
        ...body,
        response_format: normalizedFormat,
    };
}
