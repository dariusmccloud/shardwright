import test from 'node:test';
import assert from 'node:assert/strict';

import {
    LEGACY_SUMMARY_SHARDER_INTERCEPTOR_GLOBAL,
    SHARDWRIGHT_INTERCEPTOR_GLOBAL,
    ensureShardwrightNamespace,
    ensureShardwrightRoot,
    registerShardwrightInterceptor,
} from './shardwright-runtime-identity.js';
import { installLoadTraceDebugApi } from './summarization/load-profiler.js';
import { withSummarySharderSaveDiagnostics } from './summarization/save-diagnostics.js';

test('creates one owned Shardwright root and nested namespaces', () => {
    const target = {};

    const root = ensureShardwrightRoot(target);
    const diagnostics = ensureShardwrightNamespace('diagnostics', target);

    assert.equal(target.Shardwright, root);
    assert.equal(root.diagnostics, diagnostics);
    assert.equal(ensureShardwrightRoot(target), root);
    assert.equal(ensureShardwrightNamespace('diagnostics', target), diagnostics);
});

test('registers only the Shardwright interceptor and preserves a legacy owner', () => {
    const legacyInterceptor = () => 'legacy';
    const shardwrightInterceptor = () => 'shardwright';
    const target = {
        [LEGACY_SUMMARY_SHARDER_INTERCEPTOR_GLOBAL]: legacyInterceptor,
    };

    registerShardwrightInterceptor(shardwrightInterceptor, target);

    assert.equal(target[SHARDWRIGHT_INTERCEPTOR_GLOBAL], shardwrightInterceptor);
    assert.equal(target.Shardwright.interceptors.generate, shardwrightInterceptor);
    assert.equal(target[LEGACY_SUMMARY_SHARDER_INTERCEPTOR_GLOBAL], legacyInterceptor);
});

test('refuses incompatible root and interceptor ownership', () => {
    assert.throws(
        () => ensureShardwrightRoot({ Shardwright: 'foreign' }),
        { code: 'SHARDWRIGHT_RUNTIME_IDENTITY_COLLISION', identifier: 'Shardwright' }
    );

    const target = {
        [SHARDWRIGHT_INTERCEPTOR_GLOBAL]: () => 'foreign',
    };
    assert.throws(
        () => registerShardwrightInterceptor(() => 'shardwright', target),
        { code: 'SHARDWRIGHT_RUNTIME_IDENTITY_COLLISION', identifier: SHARDWRIGHT_INTERCEPTOR_GLOBAL }
    );
});

test('installs profiler and transient save diagnostics beneath the owned root', async () => {
    const target = {};
    const profiler = installLoadTraceDebugApi(target);

    assert.equal(target.Shardwright.loadProfiler, profiler);
    assert.equal(target.summarySharderLoadProfiler, undefined);

    const previousRoot = globalThis.Shardwright;
    const previousLooseContext = globalThis.summarySharderSaveDiagnosticContext;
    delete globalThis.Shardwright;
    delete globalThis.summarySharderSaveDiagnosticContext;
    try {
        await withSummarySharderSaveDiagnostics({ source: 'test' }, async () => {
            assert.equal(globalThis.Shardwright.diagnostics.saveContext.source, 'test');
            assert.equal(globalThis.summarySharderSaveDiagnosticContext, undefined);
        });
        assert.equal(globalThis.Shardwright.diagnostics.saveContext, undefined);
    } finally {
        if (previousRoot === undefined) delete globalThis.Shardwright;
        else globalThis.Shardwright = previousRoot;
        if (previousLooseContext === undefined) delete globalThis.summarySharderSaveDiagnosticContext;
        else globalThis.summarySharderSaveDiagnosticContext = previousLooseContext;
    }
});
