import { spawn } from 'node:child_process';

const TERMINATION_GRACE_MS = 5000;

function processError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function runTaskkill(pid) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const killer = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });
        const timer = setTimeout(() => {
            try { killer.kill('SIGKILL'); } catch { /* process already exited */ }
            finish({ ok: false, reason: 'TASKKILL_TIMEOUT' });
        }, TERMINATION_GRACE_MS);
        killer.once('error', (error) => finish({ ok: false, reason: error.code || 'TASKKILL_UNAVAILABLE' }));
        killer.once('close', (code) => finish({ ok: code === 0, reason: code === 0 ? null : `TASKKILL_EXIT_${code}` }));
    });
}

async function killProcessTree(pid) {
    if (!Number.isInteger(pid) || pid < 1) return { ok: false, reason: 'PID_UNAVAILABLE' };
    if (process.platform === 'win32') return runTaskkill(pid);
    try {
        process.kill(-pid, 'SIGKILL');
        return { ok: true };
    } catch (error) {
        if (error.code === 'ESRCH') return { ok: true };
        try { process.kill(pid, 'SIGKILL'); } catch { /* best-effort direct-child fallback */ }
        return { ok: false, reason: error.code || 'PROCESS_GROUP_KILL_FAILED' };
    }
}

/** Spawn a child in its own process group and expose whole-tree termination. */
export function spawnProcessTree(executable, args = [], options = {}) {
    if (typeof executable !== 'string' || executable.length === 0 || !Array.isArray(args)
        || args.some((argument) => typeof argument !== 'string')) {
        throw processError('PROCESS_ARGUMENTS_INVALID', 'An executable and string argument list are required.');
    }

    const child = spawn(executable, args, {
        cwd: options.cwd,
        env: options.env,
        windowsHide: true,
        detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let termination;
    const maxBuffer = options.maxBuffer ?? 16 * 1024 * 1024;
    let resolveResult;
    let rejectResult;
    const result = new Promise((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
    });
    const closed = new Promise((resolve) => child.once('close', resolve));

    const append = (current, chunk, streamName) => {
        const next = current + chunk.toString('utf8');
        if (Buffer.byteLength(next, 'utf8') > maxBuffer) {
            void terminate('PROCESS_OUTPUT_LIMIT').catch(() => {});
            rejectResult(processError('PROCESS_OUTPUT_LIMIT', `${streamName} exceeded ${maxBuffer} bytes.`));
            settled = true;
            return current;
        }
        return next;
    };

    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk, 'stdout'); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk, 'stderr'); });
    child.once('error', (error) => {
        if (!settled) {
            settled = true;
            rejectResult(error);
        }
    });
    child.once('close', (code, signal) => {
        if (settled) return;
        settled = true;
        if (termination) {
            rejectResult(processError(termination.code, termination.message));
            return;
        }
        resolveResult({ exitCode: Number.isInteger(code) ? code : 1, signal, stdout, stderr });
    });

    child.stdin.once('error', (error) => {
        if (error?.code === 'EPIPE' || error?.code === 'ECONNRESET') return;
        if (settled) return;
        settled = true;
        rejectResult(error);
    });

    async function terminate(code = 'PROCESS_TERMINATED', message = 'The process tree was terminated.') {
        if (termination) return termination.promise;
        let resolveTermination;
        termination = { code, message, promise: new Promise((resolve) => { resolveTermination = resolve; }) };
        const killed = await killProcessTree(child.pid);
        if (!killed.ok && child.exitCode === null && child.signalCode === null) {
            try { child.kill('SIGKILL'); } catch { /* already exited */ }
        }
        await Promise.race([
            closed,
            new Promise((resolve) => setTimeout(resolve, TERMINATION_GRACE_MS)),
        ]);
        if (!killed.ok && child.exitCode === null && child.signalCode === null) {
            const error = processError('PROCESS_TREE_KILL_FAILED', `Could not confirm process-tree termination (${killed.reason}).`);
            if (!settled) {
                settled = true;
                rejectResult(error);
            }
            resolveTermination(error);
            throw error;
        }
        if (!settled) {
            settled = true;
            rejectResult(processError(code, message));
        }
        resolveTermination();
    }

    const onAbort = () => { void terminate('PROCESS_ABORTED', 'The process tree was aborted.').catch(() => {}); };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    child.once('close', () => options.signal?.removeEventListener('abort', onAbort));
    if (options.signal?.aborted) onAbort();

    if (options.input !== undefined && options.input !== null) child.stdin.end(options.input);
    else child.stdin.end();

    return Object.freeze({ child, result, terminate });
}

export { killProcessTree };
