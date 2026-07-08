const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

async function getOrCreateConversation(sessionId) {
  const client = getPrismaClient();
  let conversation = await client.conversation.findUnique({
    where: { sessionId },
  });

  if (!conversation) {
    conversation = await client.conversation.create({
      data: { sessionId },
    });
  }

  return conversation;
}

async function getRecentMessages(sessionId, limit = 10) {
  const client = getPrismaClient();
  const conversation = await getOrCreateConversation(sessionId);
  const messages = await client.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

async function appendMessage(sessionId, payload) {
  const client = getPrismaClient();
  const conversation = await getOrCreateConversation(sessionId);

  const data = {
    conversationId: conversation.id,
    role: payload.role,
    content: payload.content || '',
    imageData: payload.image ? JSON.stringify(payload.image) : null,
    documentData: payload.document ? JSON.stringify(payload.document) : null,
  };

  return client.message.create({ data });
}

module.exports = { getRecentMessages, appendMessage };
