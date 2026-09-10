import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { parseTranscriptMessageCandidates, TranscriptTimestampTier } from './transcript-message-parser.js';

function revision(bytes) { return { receipt: { observationState: 'OBSERVED', sourceLogicalId: 'source-one', characterInstanceId: 'character-jeep', sourceRevisionHash: `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}` } }; }

test('parses complete messages in source order with native timestamp limits',()=>{const bytes=Buffer.from('{"chat_metadata":{"title":"x"}}\n{"mes":"first","mesid":7,"name":"Chris","is_user":true,"send_date":123}\n{"mes":"second","name":"Jeep"}\n');const parsed=parseTranscriptMessageCandidates(revision(bytes),bytes);assert.equal(parsed.candidates.length,2);assert.equal(parsed.candidates[0].sourceLocalOrder,1);assert.equal(parsed.candidates[0].nativeMessageId,'7');assert.equal(parsed.candidates[0].timestampTier,TranscriptTimestampTier.METADATA_NATIVE);assert.equal(parsed.candidates[1].timestampTier,TranscriptTimestampTier.UNAVAILABLE);assert.equal(parsed.candidates[1].completeContent,'second');});
test('refuses bytes that do not match the observed immutable revision',()=>{const expected=Buffer.from('{"mes":"one"}\n');assert.throws(()=>parseTranscriptMessageCandidates(revision(expected),Buffer.from('{"mes":"two"}\n')),(error)=>error?.code==='TIR_PARSE_REVISION_HASH_MISMATCH');});
test('keeps invalid JSONL visible and never persists candidates',()=>{const bytes=Buffer.from('{"mes":"valid"}\nnot json\n');const parsed=parseTranscriptMessageCandidates(revision(bytes),bytes);assert.equal(parsed.candidates.length,1);assert.equal(parsed.invalidLines.length,1);assert.equal(Object.hasOwn(parsed.candidates[0],'messageRecordId'),false);});
