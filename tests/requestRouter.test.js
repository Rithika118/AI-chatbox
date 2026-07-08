const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRoute } = require('../lib/requestRouter');

test('routes plain text to the standard chat endpoint', () => {
  assert.equal(detectRoute({ hasImage: false, hasDocument: false }), '/api/chat');
});

test('routes image-only messages to the vision endpoint', () => {
  assert.equal(detectRoute({ hasImage: true, hasDocument: false }), '/api/chat/image');
});

test('routes document-only messages to the RAG endpoint', () => {
  assert.equal(detectRoute({ hasImage: false, hasDocument: true }), '/api/chat/rag');
});

test('routes image plus document messages to the multimodal endpoint', () => {
  assert.equal(detectRoute({ hasImage: true, hasDocument: true }), '/api/chat/multimodal');
});
