import { applyStructuredOutputFormat } from './structured-output.js';

/**
 * Builds the Connection Manager override payload without mutating caller data.
 * Structured output is only forwarded to chat-completions profiles.
 *
 * @param {Object} options
 * @param {number} options.temperature
 * @param {number} options.topP
 * @param {boolean} options.removeStopStrings
 * @param {Object|null} options.structuredOutput
 * @param {boolean} options.supportsStructuredOutput
 * @returns {Object}
 */
export function buildConnectionProfileOverridePayload(options) {
    const {
        temperature,
        topP,
        removeStopStrings = false,
        structuredOutput = null,
        supportsStructuredOutput = false,
    } = options || {};

    const payload = {
        temperature,
        top_p: topP,
    };

    if (removeStopStrings === true) {
        payload.stop = [];
    }

    if (!supportsStructuredOutput || structuredOutput == null) {
        return payload;
    }

    const normalized = applyStructuredOutputFormat({}, structuredOutput).response_format;
    return {
        ...payload,
        json_schema: {
            name: normalized.json_schema.name,
            value: normalized.json_schema.schema,
            strict: normalized.json_schema.strict,
        },
    };
}
