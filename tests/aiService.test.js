const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAssistantReply } = require('../lib/aiService');

test('throws a helpful error when Gemini is requested without an API key', async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  await assert.rejects(
    () => generateAssistantReply({
      route: '/api/chat',
      history: [],
      userMessage: { content: 'Who is the Prime Minister of India?' },
      provider: 'gemini',
    }),
    /GEMINI_API_KEY/i,
  );
});
