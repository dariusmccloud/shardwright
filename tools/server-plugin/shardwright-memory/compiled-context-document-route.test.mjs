import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { registerCompiledContextDocumentRoute } from './compiled-context-document-route.js';

function router() {
    const routes = new Map();
    return { routes, post(route, handler) { routes.set(route, handler); } };
}

async function invoke(handler, request) {
    let statusCode = 200;
    let payload = null;
    const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } };
    await handler(request, response);
    return { statusCode, payload };
}

function documents(suffix = '') {
    return [
        { documentLogicalId: 'rulebook', canonicalName: 'EICF - Documentation Rulebook', text: '# Rules\n\nUse controlled language.\n' },
        { documentLogicalId: 'style', canonicalName: 'EICF - Documentation Style Guide', text: '# Governance Surfaces\n\nSee `EICF - Documentation Rulebook`.\n\n# Document Structure\n\nUse a clear structure.\n' + suffix },
    ];
}

test('materializes and reads the managed compiled-context projection', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-compiled-context-route-'));
    try {
        const routes = router();
        registerCompiledContextDocumentRoute(routes);
        const request = { user: { directories: { root } }, body: { documents: documents() } };
        const materialized = await invoke(routes.routes.get('/compiled-context/projection/materialize'), request);
        assert.equal(materialized.statusCode, 200);
        assert.equal(materialized.payload.state, 'CURRENT');
        const inventory = await invoke(routes.routes.get('/compiled-context/projection/documents'), request);
        assert.deepEqual(inventory.payload.documents.map((row) => row.documentLogicalId), ['rulebook', 'style']);
        const references = await invoke(routes.routes.get('/compiled-context/projection/references'), { ...request, body: { documents: documents(), documentLogicalId: 'style' } });
        assert.equal(references.payload.references[0].resolutionState, 'RESOLVED');
        const plan = await invoke(routes.routes.get('/compiled-context/projection/plan'), { ...request, body: { documents: documents(), taskText: 'Draft a new EICF document.' } });
        assert.equal(plan.payload.state, 'PLAN');
        assert.equal(plan.payload.documents.length, 2);
        assert.equal(plan.payload.documents.find((row) => row.documentLogicalId === 'rulebook').units[0].exactText.startsWith('# Rules'), true);
        const stale = await invoke(routes.routes.get('/compiled-context/projection/status'), { ...request, body: { documents: documents('\nChanged.\n') } });
        assert.equal(stale.payload.state, 'STALE');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('materializes explicit source descriptors and returns source receipts', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-compiled-context-route-'));
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-compiled-context-sources-'));
    try {
        const rulebookPath = path.join(sourceRoot, 'rulebook.md');
        const stylePath = path.join(sourceRoot, 'style.md');
        fs.writeFileSync(rulebookPath, '# Rules\n\nUse controlled language.\n');
        fs.writeFileSync(stylePath, '# Governance Surfaces\n\nSee `EICF - Documentation Rulebook`.\n');
        const routes = router();
        registerCompiledContextDocumentRoute(routes);
        const result = await invoke(routes.routes.get('/compiled-context/projection/materialize-sources'), {
            user: { directories: { root } },
            body: { sources: [
                { documentLogicalId: 'rulebook', canonicalName: 'EICF - Documentation Rulebook', filePath: rulebookPath },
                { documentLogicalId: 'style', canonicalName: 'EICF - Documentation Style Guide', filePath: stylePath },
            ] },
        });
        assert.equal(result.statusCode, 200);
        assert.equal(result.payload.state, 'CURRENT');
        assert.equal(result.payload.sources.length, 2);
        assert.equal(result.payload.sources.every((source) => source.byteLength > 0 && source.sourceRevisionHash.startsWith('sha256:')), true);
        const plan = await invoke(routes.routes.get('/compiled-context/projection/plan-sources'), {
            user: { directories: { root } },
            body: { sources: [
                { documentLogicalId: 'rulebook', canonicalName: 'EICF - Documentation Rulebook', filePath: rulebookPath },
                { documentLogicalId: 'style', canonicalName: 'EICF - Documentation Style Guide', filePath: stylePath },
            ], taskText: 'Draft a new EICF document.' },
        });
        assert.equal(plan.statusCode, 200);
        assert.equal(plan.payload.state, 'PLAN');
        assert.equal(plan.payload.sources.length, 2);
        assert.equal(plan.payload.documents.length, 2);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(sourceRoot, { recursive: true, force: true });
    }
});

test('rejects an absent registry before opening projection storage', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-compiled-context-route-'));
    try {
        const routes = router();
        registerCompiledContextDocumentRoute(routes);
        const result = await invoke(routes.routes.get('/compiled-context/projection/status'), { user: { directories: { root } }, body: {} });
        assert.equal(result.statusCode, 400);
        assert.equal(result.payload.code, 'TIR_COMPILED_CONTEXT_DOCUMENTS_REQUIRED');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
