import validateIntermediatePayload from './architectural-intermediate-validator.generated.cjs';

export const ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID = 'https://summary-sharder/architectural-intermediate/v1';

function cloneErrorParams(params) {
    return params && typeof params === 'object' && !Array.isArray(params)
        ? { ...params }
        : {};
}

function fieldFromInstancePath(instancePath, params) {
    if (typeof params?.missingProperty === 'string') {
        return params.missingProperty;
    }
    if (typeof params?.additionalProperty === 'string') {
        return params.additionalProperty;
    }
    const segments = String(instancePath || '').split('/').filter(Boolean);
    return segments.findLast((segment) => !/^\d+$/u.test(segment)) || null;
}

export function validateArchitecturalIntermediatePayload(payload) {
    const ok = validateIntermediatePayload(payload);
    return {
        ok,
        schemaId: ARCHITECTURAL_INTERMEDIATE_SCHEMA_ID,
        errors: ok
            ? []
            : (validateIntermediatePayload.errors || []).map((error) => ({
                keyword: String(error.keyword || ''),
                instancePath: String(error.instancePath || ''),
                schemaPath: String(error.schemaPath || ''),
                field: fieldFromInstancePath(error.instancePath, error.params),
                message: String(error.message || 'Intermediate architectural payload is invalid.'),
                params: cloneErrorParams(error.params),
            })),
    };
}
