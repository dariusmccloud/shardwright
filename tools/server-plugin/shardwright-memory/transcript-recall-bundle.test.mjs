import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTranscriptRecallBundle } from './transcript-recall-bundle.js';
import { registerTranscriptRecallBundleRoute } from './transcript-recall-bundle-route.js';

function makeRouter() { const routes = new Map(); return { routes, post(path, handler) { routes.set(path, handler); } }; }
async function invoke(handler, request) { let statusCode = 200; let payload = null; const response = { status(code) { statusCode = code; return this; }, send(value) { payload = value; return value; } }; await handler(request, response); return { statusCode, payload }; }
const row = (id, contentIncluded = true) => ({ messageRecordId: id, sourceLogicalId: 'source:one', sourceRevisionHash: 'sha256:rev', sourceLocalOrder: Number(id.slice(-1)), senderName: 'Jeep', senderIsUser: false, timestampValue: '2026-09-08T12:00:00.000Z', timestampTier: 'METADATA_NATIVE', visibilityState: contentIncluded ? 'VISIBLE' : 'HIDDEN', contentIncluded, ...(contentIncluded ? { completeContent: `content for ${id}` } : {}) });
const assembly = { state: 'WINDOWS', posture: 'CONTINUITY', windows: [{ documentId: 'document:one', anchorMessageRecordId: 'message:one', window: { posture: 'CONTINUITY', rows: [row('row-1')] } }, { documentId: 'document:two', anchorMessageRecordId: 'message:two', window: { posture: 'CONTINUITY', rows: [row('row-2')] } }] };

test('bundle preserves every anchored window, full content, and timestamp metadata', () => {
    const result = buildTranscriptRecallBundle(assembly);
    assert.equal(result.state, 'BUNDLE');
    assert.equal(result.windowCount, 2);
    assert.equal(result.rowCount, 2);
    assert.match(result.bundleText, /2026-09-08T12:00:00\.000Z/u);
    assert.match(result.bundleText, /content for row-1/u);
    assert.match(result.bundleText, /document:one[\s\S]*document:two/u);
});

test('route exposes an omitted row without inventing or substituting its content', async () => {
    const router = makeRouter();
    registerTranscriptRecallBundleRoute(router);
    const result = await invoke(router.routes.get('/transcript-recall/bundle'), { user: { directories: { root: 'C:/test-root' } }, body: { assembly: { state: 'WINDOWS', windows: [{ documentId: 'document:one', anchorMessageRecordId: 'message:one', window: { posture: 'CONTINUITY', rows: [row('row-1', false)] } }] } } });
    assert.equal(result.statusCode, 200);
    assert.match(result.payload.bundleText, /CONTENT OMITTED/u);
    assert.equal(result.payload.bundleText.includes('content for row-1'), false);
});

test('bundle refuses empty or incomplete assemblies', () => {
    assert.throws(() => buildTranscriptRecallBundle({ state: 'NO_MATCH', windows: [] }), (error) => error?.code === 'TIR_BUNDLE_WINDOWS_REQUIRED');
    assert.throws(() => buildTranscriptRecallBundle({ state: 'WINDOWS', windows: [{ documentId: 'document:one', anchorMessageRecordId: 'message:one', window: { rows: [{}] } }] }), (error) => error?.code === 'TIR_BUNDLE_ROW_INVALID');
});
