import { spawnProcessTree } from './process-tree.js';
import {
    isUnavailableOutput,
    separateVerdictPreamble,
    parseCodexFinalMessage,
    renderRolePrompt,
    scrubApiKeyEnvironment,
    unavailable,
    validateFixtureCwd,
} from './cli-adapter-common.js';

export const CODEX_RESTRICTED_WORKSPACE_ARGS = Object.freeze([
    '-a', 'never',
    '-c', 'windows.sandbox="elevated"',
    '-c', 'sandbox_workspace_write.exclude_tmpdir_env_var=true',
    '-c', 'sandbox_workspace_write.exclude_slash_tmp=true',
]);

export function buildCodexCommand(input, { executable = 'codex' } = {}) {
    const cwd = validateFixtureCwd(input?.repoRoot, { allowedRepositoryRoot: input?.allowedRepositoryRoot });
    const prompt = renderRolePrompt({ ...input, adapterId: 'codex' });
    const args = [
        ...CODEX_RESTRICTED_WORKSPACE_ARGS,
        'exec',
        '--ignore-user-config',
        '--cd', cwd,
        '--sandbox', input.role === 'reviewer' ? 'read-only' : 'workspace-write',
        '--ephemeral',
        '--ignore-rules',
        '--json',
        '-',
    ];
    return { executable, args, cwd, prompt };
}

export function createCodexAdapter({ executable = 'codex', prefixArgs = [], environment = process.env } = {}) {
    let active = null;
    return {
        id: 'codex',
        async run(input) {
            let command;
            try { command = buildCodexCommand(input, { executable }); }
            catch (error) { return unavailable(error.code || 'AGENT_INPUT_INVALID', error.message); }
            const handle = spawnProcessTree(command.executable, [...prefixArgs, ...command.args], {
                cwd: command.cwd,
                env: scrubApiKeyEnvironment(environment),
                signal: input.signal,
                input: command.prompt,
            });
            active = handle;
            try {
                const output = await handle.result;
                if (isUnavailableOutput(output)) return unavailable('CLI_AUTH_OR_USAGE_UNAVAILABLE', output.stderr || output.stdout);
                if (output.exitCode !== 0) return unavailable('CLI_EXIT_NONZERO', output.stderr || `Codex exited ${output.exitCode}.`);
                const response = parseCodexFinalMessage(output.stdout);
                if (!response) return unavailable('CLI_OUTPUT_MALFORMED', output.stderr || 'Codex returned no final agent_message event.');
                return input.role === 'reviewer'
                    ? { ...separateVerdictPreamble(response), prompt: command.prompt, command: [command.executable, ...prefixArgs, ...command.args] }
                    : { response, prompt: command.prompt, command: [command.executable, ...prefixArgs, ...command.args] };
            } catch (error) {
                if (input.signal?.aborted) throw error;
                return unavailable(error.code || 'CLI_SPAWN_FAILED', error.message);
            } finally {
                active = null;
            }
        },
        async terminate() { await active?.terminate(); },
    };
}
