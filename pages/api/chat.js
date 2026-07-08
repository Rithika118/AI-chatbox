import { generateAssistantReply } from '../../lib/aiService';
import { getRecentMessages, appendMessage } from '../../lib/db';
import { detectRoute } from '../../lib/requestRouter';
import 'dotenv/config';

const HISTORY_LIMIT = 10;

function normalizeText(value) {
  return (value || '').toString().trim();
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return {};
}

async function callConfiguredProvider({ route, history, userMessage, provider }) {
  const normalizedProvider = normalizeText(provider || 'auto').toLowerCase() || 'auto';

  if (normalizedProvider === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Missing ANTHROPIC_API_KEY. Set it before using Claude.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 400,
        messages: [
          { role: 'user', content: userMessage.content || 'Help with this request.' },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Claude request failed.');
    }

    return data?.content?.[0]?.text || null;
  }

  return generateAssistantReply({
    route,
    history,
    userMessage,
    provider: normalizedProvider,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = parseBody(req);
    const sessionId = normalizeText(body.sessionId);
    const message = normalizeText(body.message);
    const image = body.image || null;
    const document = body.document || null;
    const provider = normalizeText(body.provider || 'auto').toLowerCase() || 'auto';

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    if (!message && !image && !document) {
      return res.status(400).json({ error: 'message, image, or document is required.' });
    }

    const fallbackMessage = message || (image ? 'Please analyze the attached image.' : document ? 'Please analyze the attached document.' : 'How can I help?');
    const history = await getRecentMessages(sessionId, HISTORY_LIMIT);
    const userMessage = {
      content: fallbackMessage,
      image,
      document,
    };

    await appendMessage(sessionId, {
      role: 'user',
      content: fallbackMessage,
      image,
      document,
    });

    const route = detectRoute({ hasImage: Boolean(image), hasDocument: Boolean(document) });
    let reply = '';

    try {
      reply = await callConfiguredProvider({ route, history, userMessage, provider });
    } catch (error) {
      console.error('AI provider request failed:', error);
      return res.status(502).json({
        error: error.message || 'The AI provider could not generate a response right now.',
        sessionId,
      });
    }

    if (!normalizeText(reply)) {
      return res.status(502).json({
        error: 'The AI provider returned an empty response. Please try again.',
        sessionId,
      });
    }

    await appendMessage(sessionId, {
      role: 'assistant',
      content: reply,
    });

    return res.status(200).json({ reply, sessionId });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Unable to process chat request right now.' });
  }
}
