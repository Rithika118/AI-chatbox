const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { generateGeminiResponse } = require('./geminiService');

function normalizeText(value) {
  return (value || '').toString().trim();
}

function getBase64FromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const [, base64] = dataUrl.split(',');
  return base64 || null;
}

function createEmbedding(text) {
  const normalized = normalizeText(text).toLowerCase();
  return Array.from({ length: 8 }, (_, index) => {
    const charCode = normalized.charCodeAt(index % normalized.length) || 1;
    return ((charCode * (index + 1)) % 17) / 17;
  });
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * (b[index] || 0), 0);
  const aNorm = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const bNorm = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (!aNorm || !bNorm) return 0;
  return dot / (aNorm * bNorm);
}

function chunkText(text, size = 500) {
  const chunks = [];
  const safeText = normalizeText(text);
  for (let index = 0; index < safeText.length; index += size) {
    chunks.push(safeText.slice(index, index + size));
  }
  return chunks;
}

async function extractTextFromDocument(document) {
  if (!document?.dataUrl) return '';

  const buffer = Buffer.from(getBase64FromDataUrl(document.dataUrl), 'base64');
  const mimeType = document.mimeType || '';

  if (mimeType.includes('pdf')) {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }

  if (mimeType.includes('word') || document.name?.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (mimeType.includes('text') || document.name?.endsWith('.txt')) {
    return buffer.toString('utf8');
  }

  return '';
}

async function buildRagContext(userMessage) {
  const document = userMessage.document;
  if (!document?.dataUrl) return '';

  const text = await extractTextFromDocument(document);
  if (!text) return '';

  const chunks = chunkText(text);
  const embeddings = chunks.map((chunk) => createEmbedding(chunk));
  const queryEmbedding = createEmbedding(userMessage.content || '');
  const scored = chunks
    .map((chunk, index) => ({ chunk, score: cosineSimilarity(queryEmbedding, embeddings[index]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return scored.map((item) => item.chunk).join('\n\n');
}

function convertHistoryToMessages(history = []) {
  return history.map((item) => ({ role: item.role, content: item.content || '' }));
}

function buildPrompt({ route, history, userMessage, context }) {
  const systemPrompt = route === '/api/chat/rag' || route === '/api/chat/multimodal'
    ? 'You are a helpful multimodal assistant. Use the supplied context when available and remain concise.'
    : 'You are a helpful multimodal assistant. Be conversational, practical, and concise.';

  const conversation = convertHistoryToMessages(history);
  const content = [];

  if (userMessage.content) {
    content.push(`User message: ${userMessage.content}`);
  }

  if (userMessage.image?.dataUrl) {
    content.push('The user also attached an image. Describe what you see and help with the request.');
  }

  if (context) {
    content.push(`Document context:\n${context}`);
  }

  return { systemPrompt, conversation, content: content.join('\n\n') };
}

async function callOpenAI({ prompt, userMessage }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY. Set it in the .env file before using OpenAI.');
  }

  const content = [];
  if (prompt.content) {
    content.push({ type: 'text', text: prompt.content });
  }
  if (userMessage.image?.dataUrl) {
    content.push({ type: 'image_url', image_url: { url: userMessage.image.dataUrl } });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        ...prompt.conversation,
        { role: 'user', content },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (!normalizeText(reply)) {
    throw new Error('OpenAI returned an empty response.');
  }

  return reply;
}

async function callGemini({ prompt, userMessage }) {
  const reply = await generateGeminiResponse({
    prompt: prompt.content,
    image: userMessage.image,
    systemInstruction: prompt.systemPrompt,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });

  if (!normalizeText(reply)) {
    throw new Error('Gemini returned an empty response.');
  }

  return reply;
}

async function generateAssistantReply({ route, history, userMessage, provider = 'auto' }) {
  const context = route === '/api/chat/rag' || route === '/api/chat/multimodal'
    ? await buildRagContext(userMessage)
    : '';
  const prompt = buildPrompt({ route, history, userMessage, context });

  const normalizedProvider = normalizeText(provider || 'auto').toLowerCase() || 'auto';
  let chosenProvider = normalizedProvider;

  if (normalizedProvider === 'auto') {
    if (process.env.GEMINI_API_KEY) {
      chosenProvider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      chosenProvider = 'openai';
    } else {
      throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY in your .env file.');
    }
  }

  if (chosenProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY. Set it in the .env file before using Gemini.');
  }

  if (chosenProvider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY. Set it in the .env file before using OpenAI.');
  }

  if (chosenProvider === 'openai') {
    return callOpenAI({ prompt, userMessage });
  }

  if (chosenProvider === 'gemini') {
    return callGemini({ prompt, userMessage });
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

module.exports = { generateAssistantReply, extractTextFromDocument };
