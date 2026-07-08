import React from 'react';

const ChatMessage = ({ sender, message, image, document }) => (
  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, marginBottom: 10, background: sender === 'assistant' ? '#f8fafc' : '#ffffff' }}>
    <strong>{sender === 'assistant' ? 'Assistant' : 'You'}:</strong>
    <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{message}</div>
    {image?.dataUrl ? <img src={image.dataUrl} alt="uploaded preview" style={{ maxWidth: '220px', marginTop: 8, borderRadius: 8 }} /> : null}
    {document?.name ? <div style={{ marginTop: 8, color: '#475569', fontSize: 13 }}>Document: {document.name}</div> : null}
  </div>
);

export default ChatMessage;
