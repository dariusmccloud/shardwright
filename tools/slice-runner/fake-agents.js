/** Create a deterministic scripted agent for runner tests; no CLI is launched. */
export function createFakeAgent(id, steps = []) {
    const script = [...steps];
    const calls = [];
    return {
        id,
        calls,
        async run(input) {
            calls.push(input);
            const step = script.shift();
            if (!step) throw new Error(`Fake agent ${id} has no scripted step remaining.`);
            if (step.delayMs) await new Promise((resolve) => setTimeout(resolve, step.delayMs));
            if (step.error) throw step.error instanceof Error ? step.error : new Error(String(step.error));
            if (typeof step.run === 'function') return step.run(input);
            return step.result;
        },
    };
}
