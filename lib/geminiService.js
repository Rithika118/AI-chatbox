const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';


function buildGeminiPayload({ prompt, image, systemInstruction }) {
  const parts = [];

  if (prompt) {
    parts.push({ text: prompt });
  }

  if (image?.dataUrl) {
    const base64 = image.dataUrl.split(',')[1] || '';
    parts.push({
      inlineData: {
        mimeType: image.mimeType || 'image/png',
        data: base64,
      },
    });
  }

  return {
    contents: [{ role: 'user', parts }],
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
  };
}

function getGeminiErrorMessage(apiKey) {
  if (!apiKey) {
    return 'Missing GEMINI_API_KEY. Set it in the .env file before using Gemini.';
  }
  return null;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log(
    "Gemini key loaded:",
    apiKey ? apiKey.substring(0, 5) : "MISSING"
  );

  const errorMessage = getGeminiErrorMessage(apiKey);

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return new GoogleGenerativeAI(apiKey);
}

async function generateGeminiResponse({ prompt, image, systemInstruction, model = DEFAULT_MODEL }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const errorMessage = getGeminiErrorMessage(apiKey);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const client = getGeminiClient();
  const modelInstance = client.getGenerativeModel({ model });
  const payload = buildGeminiPayload({ prompt, image, systemInstruction });

  let result;

try {
  result = await modelInstance.generateContent(payload);
} catch (error) {
  console.error(
    "Gemini full error:",
    error.message,
    error.status,
    error.errorDetails
  );
  throw error;
}
  const response = await result.response;
  return response.text();
}

module.exports = {
  buildGeminiPayload,
  getGeminiErrorMessage,
  getGeminiClient,
  generateGeminiResponse,
};
