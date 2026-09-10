import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { init } from './index.js';

function createRouter() {
    const routes = { post: new Map(), get: new Map() };
    return {
        routes,
        post(pathname, handler) { routes.post.set(pathname, handler); },
        get(pathname, handler) { routes.get.set(pathname, handler); },
    };
}

function response() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        send(body) { this.body = body; return this; },
    };
}

test('sync and search routes use authenticated user-local storage only', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'continuity-routes-'));
    try {
        const router = createRouter();
        await init(router);
        const request = {
            user: { directories: { root } },
            body: {
                sourceId: 'file:jeep-memories.md',
                content: '<memory chat="Jeep" date="2026-09-05">\n- The desert remains home.\n</memory>',
            },
        };
        const syncResponse = response();
        await router.routes.post.get('/sync')(request, syncResponse);
        assert.equal(syncResponse.statusCode, 200);
        assert.equal(syncResponse.body.ok, true);

        const searchResponse = response();
        await router.routes.post.get('/search')({
            user: request.user,
            body: { sourceId: request.body.sourceId, query: 'desert', limit: 2 },
        }, searchResponse);
        assert.equal(searchResponse.body.ok, true);
        assert.match(searchResponse.body.results[0].content, /desert/);

        const inspectResponse = response();
        await router.routes.post.get('/inspect')({
            user: request.user,
            body: { sourceId: request.body.sourceId },
        }, inspectResponse);
        assert.equal(inspectResponse.body.ok, true);
        assert.equal(inspectResponse.body.source.activeBlockCount, 1);
        assert.equal(inspectResponse.body.source.revisionCount, 1);
        assert.equal(fs.existsSync(path.join(root, 'charmemory-continuity-bridge', 'continuity-bridge.db')), true);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
