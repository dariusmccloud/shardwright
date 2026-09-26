import { spawnProcessTree } from './process-tree.js';
import {
    isUnavailableOutput,
    separateVerdictPreamble,
    renderRolePrompt,
    scrubApiKeyEnvironment,
    unavailable,
    validateFixtureCwd,
} from './cli-adapter-common.js';

export function buildClaudeCommand(input, { executable = 'claude' } = {}) {
    const cwd = validateFixtureCwd(input?.repoRoot, { allowedRepositoryRoot: input?.allowedRepositoryRoot });
    const role = input.role;
    const prompt = renderRolePrompt({ ...input, adapterId: 'claude' });
    const args = [
        '--print',
        '--input-format', 'text',
        '--output-format', 'text',
        '--no-session-persistence',
        '--safe-mode',
        '--restricted',
        '--permission-mode', role === 'reviewer' ? 'plan' : 'dontAsk',
        '--tools', role === 'reviewer' ? 'Read' : 'Read,Edit',
        ...(role === 'implementer' ? ['--allowedTools', 'Edit(/**)'] : []),
        '-p',
    ];
    return { executable, args, cwd, prompt };
}

export function createClaudeAdapter({ executable = 'claude', prefixArgs = [], environment = process.env } = {}) {
    let active = null;
    return {
        id: 'claude',
        async run(input) {
            let command;
            try { command = buildClaudeCommand(input, { executable }); }
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
                if (output.exitCode !== 0) return unavailable('CLI_EXIT_NONZERO', output.stderr || `Claude exited ${output.exitCode}.`);
                const response = output.stdout.trim();
                if (!response) return unavailable('CLI_OUTPUT_EMPTY', output.stderr);
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
