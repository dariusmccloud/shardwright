import assert from 'node:assert/strict';
import test from 'node:test';
import { formatEvidenceWithProvenance } from './provenance-view.js';

test('renders exact source chat and source date without turning it into an event claim', () => {
    assert.equal(formatEvidenceWithProvenance([{
        content: '- CSP origin record.',
        sourceChat: 'Jeep Architecture Discussion',
        sourceDate: '2026-07-11',
        provenanceRecorded: 1,
    }]), '[Memory · chat: Jeep Architecture Discussion · source date: 2026-07-11]\n- CSP origin record.');
});

test('labels legacy records with unavailable provenance instead of inventing it', () => {
    assert.equal(formatEvidenceWithProvenance([{ content: '- Historical record.', provenanceRecorded: 0 }]), '[Memory · source details unavailable]\n- Historical record.');
});
