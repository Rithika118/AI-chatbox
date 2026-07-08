const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGeminiPayload, getGeminiErrorMessage } = require('../lib/geminiService');

test('builds multimodal Gemini payload with text and inline image data', () => {
  const payload = buildGeminiPayload({
    prompt: 'Describe this image',
    image: { dataUrl: 'data:image/png;base64,abc123', mimeType: 'image/png' },
  });

  assert.equal(payload.contents[0].parts[0].text, 'Describe this image');
  assert.equal(payload.contents[0].parts[1].inlineData.mimeType, 'image/png');
  assert.equal(payload.contents[0].parts[1].inlineData.data, 'abc123');
});

test('returns a helpful error message when the Gemini key is missing', () => {
  assert.match(getGeminiErrorMessage(null), /GEMINI_API_KEY/i);
});
