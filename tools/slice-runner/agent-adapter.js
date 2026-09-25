export class AgentTimeoutError extends Error {
    constructor(adapterId, timeoutMs) {
        super(`Agent ${adapterId} exceeded its ${timeoutMs} ms timeout.`);
        this.name = 'AgentTimeoutError';
        this.code = 'AGENT_TIMEOUT';
    }
}

export function assertAgentAdapter(adapter) {
    if (!adapter || typeof adapter.id !== 'string' || adapter.id.trim() === ''
        || typeof adapter.run !== 'function') {
        const error = new TypeError('An agent adapter must have a non-empty id and a run function.');
        error.code = 'AGENT_ADAPTER_INVALID';
        throw error;
    }
}

/** Apply a timeout only to an agent operation; human decisions use no timeout. */
export async function runAgentWithTimeout(adapter, input, timeoutMs) {
    assertAgentAdapter(adapter);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
        const error = new TypeError('Agent timeout must be a positive safe integer.');
        error.code = 'AGENT_TIMEOUT_INVALID';
        throw error;
    }

    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new AgentTimeoutError(adapter.id, timeoutMs));
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            Promise.resolve().then(() => adapter.run({ ...input, signal: controller.signal })),
            timeout,
        ]);
    } finally {
        clearTimeout(timer);
    }
}
