const express = require('express');
const next = require('next');
require('dotenv').config();
const { detectRoute } = require('./lib/requestRouter');
const { getRecentMessages, appendMessage } = require('./lib/db');
const { generateAssistantReply } = require('./lib/aiService');

const dev = process.env.NODE_ENV !== 'production';
const host = 'localhost';
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

async function handleRequest(req, res, route) {
  const payload = req.body || {};
  const sessionId = payload.sessionId || 'default-session';
  const messageText = payload.message || '';
  const provider = payload.provider || process.env.DEFAULT_PROVIDER || 'auto';

  const history = await getRecentMessages(sessionId, 10);

  await appendMessage(sessionId, {
    role: 'user',
    content: messageText,
    image: payload.image || null,
    document: payload.document || null,
  });

  const reply = await generateAssistantReply({
    route,
    history,
    userMessage: {
      role: 'user',
      content: messageText,
      image: payload.image || null,
      document: payload.document || null,
    },
    provider,
  });

  await appendMessage(sessionId, {
    role: 'assistant',
    content: reply,
  });

  res.status(200).json({ reply, route, sessionId });
}

app.prepare().then(() => {
  const server = express();

  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ extended: true, limit: '10mb' }));

  server.post('/api/chat', (req, res) => handleRequest(req, res, '/api/chat'));
  server.post('/api/chat/image', (req, res) => handleRequest(req, res, '/api/chat/image'));
  server.post('/api/chat/rag', (req, res) => handleRequest(req, res, '/api/chat/rag'));
  server.post('/api/chat/multimodal', (req, res) => handleRequest(req, res, '/api/chat/multimodal'));

  server.all('*', (req, res) => handle(req, res));

  server.listen(port, host, () => {
    console.log(`> Ready on http://${host}:${port}`);
  });
});
