import assert from 'node:assert/strict';
import test from 'node:test';

import { buildQueryText } from './retrieval-shared.js';

test('buildQueryText prefers recent user messages over assistant boilerplate', () => {
    const chat = [
        { is_user: false, name: 'Jeep', mes: 'Ready. What are you working on?\nPaste any of the following and I will optimize:\n- Character card\n- System prompt' },
        { is_user: true, name: 'Chris', mes: 'Explain provisional architecture snapshot' },
    ];

    assert.equal(
        buildQueryText(chat, 2),
        'Explain provisional architecture snapshot',
    );
});

test('buildQueryText keeps the latest user messages in chronological order', () => {
    const chat = [
        { is_user: true, name: 'Chris', mes: 'First question' },
        { is_user: false, name: 'Jeep', mes: 'Answer one' },
        { is_user: true, name: 'Chris', mes: 'Second question' },
        { is_user: false, name: 'Jeep', mes: 'Answer two' },
        { is_user: true, name: 'Chris', mes: 'Third question' },
    ];

    assert.equal(
        buildQueryText(chat, 2),
        'Second question\nThird question',
    );
});

test('buildQueryText falls back to recent non-user messages when no user messages exist', () => {
    const chat = [
        { is_user: false, name: 'Jeep', mes: 'System check complete.' },
        { is_user: false, name: 'Jeep', mes: 'Standing by.' },
    ];

    assert.equal(
        buildQueryText(chat, 2),
        'System check complete.\nStanding by.',
    );
});
