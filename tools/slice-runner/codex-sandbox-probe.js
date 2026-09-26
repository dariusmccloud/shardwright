import { spawnProcessTree } from './process-tree.js';
import * as fs from 'node:fs';
import path from 'node:path';
import { CODEX_RESTRICTED_WORKSPACE_ARGS } from './codex-adapter.js';
import { scrubApiKeyEnvironment } from './cli-adapter-common.js';

export function resolveProtectedCanaryPaths(nonce) {
    const oneDrive = process.env.OneDrive;
    const roots = [
        ['OneDrive', oneDrive],
        ['OneDrive-Documents', oneDrive ? path.join(oneDrive, 'Documents') : null],
        ['D-SillyTavern', process.env.SLICE_RUNNER_SILLYTAVERN_ROOT || 'D:\\AI\\Projects\\SillyTavern'],
        ['D-SillyBunny', process.env.SLICE_RUNNER_SILLYBUNNY_ROOT || 'D:\\AI\\Projects\\SillyBunny'],
    ];
    for (const [label, root] of roots) {
        if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
            const error = new Error(`Protected canary parent is unavailable: ${label} (${root || 'OneDrive environment variable missing'}).`);
            error.code = 'CANARY_PARENT_UNAVAILABLE';
            throw error;
        }
    }
    return roots.map(([label, root]) => path.join(root, `.shardwright-containment-${nonce}-${label}.txt`));
}

export function buildCodexSandboxCommand({ executable = 'codex', cwd, command, environment = process.env, tempDirectory }) {
    const env = scrubApiKeyEnvironment(environment);
    delete env.NODE_TEST_CONTEXT;
    delete env.NODE_TEST_WORKER_ID;
    if (tempDirectory) {
        env.TMP = tempDirectory;
        env.TEMP = tempDirectory;
    }
    const sandboxConfigArgs = CODEX_RESTRICTED_WORKSPACE_ARGS;
    return {
        executable,
        args: [
            ...sandboxConfigArgs.slice(0, 2),
            'sandbox', '--permission-profile', env.CODEX_PERMISSION_PROFILE || ':workspace', '-C', cwd,
            ...sandboxConfigArgs.slice(2),
            ...command,
        ],
        cwd,
        env,
    };
}

export async function runCodexSandboxCommand(options) {
    const invocation = buildCodexSandboxCommand(options);
    const processHandle = spawnProcessTree(invocation.executable, invocation.args, {
        cwd: invocation.cwd,
        env: invocation.env,
        maxBuffer: 4 * 1024 * 1024,
    });
    const result = await processHandle.result;
    return { ...result, command: [invocation.executable, ...invocation.args] };
}

/** Run an ordinary Node test through the exact Codex workspace-write boundary. */
export async function runSandboxedNodeTest({ executable = 'codex', repoRoot, testPath, nodeExecutable = process.execPath }) {
    const command = [nodeExecutable, '--test', testPath];
    const defaultResult = await runCodexSandboxCommand({ executable, cwd: repoRoot, command });
    if (defaultResult.exitCode === 0) return { ...defaultResult, tempCase: 'SYSTEM_TEMP' };

    const privateTemp = path.join(repoRoot, '.slice-runner-private-temp');
    fs.mkdirSync(privateTemp, { recursive: true });
    const privateResult = await runCodexSandboxCommand({ executable, cwd: repoRoot, command, tempDirectory: privateTemp });
    if (privateResult.exitCode !== 0) {
        const error = new Error(`Node test failed with system TEMP and private fixture TEMP. System result: ${defaultResult.stderr || defaultResult.stdout}; private result: ${privateResult.stderr || privateResult.stdout}`);
        error.code = 'SANDBOX_TOOLCHAIN_FAILED';
        error.defaultResult = defaultResult;
        error.privateResult = privateResult;
        throw error;
    }
    return { ...privateResult, tempCase: 'PRIVATE_FIXTURE_TEMP', defaultFailure: defaultResult.stderr || defaultResult.stdout };
}
