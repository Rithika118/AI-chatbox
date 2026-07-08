function detectRoute({ hasImage = false, hasDocument = false } = {}) {
  if (hasImage && hasDocument) return '/api/chat/multimodal';
  if (hasImage) return '/api/chat/image';
  if (hasDocument) return '/api/chat/rag';
  return '/api/chat';
}

module.exports = { detectRoute };
