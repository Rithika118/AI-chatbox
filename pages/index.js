import React, { useEffect, useMemo, useState } from 'react';
import ChatMessage from '../components/ChatMessage';
import PdfUploader from '../components/PdfUploader';
const detectRoute = () => {
  return '/api/chat';
};

const MAX_IMAGE_BYTES = 2_000_000;
const MAX_DOCUMENT_BYTES = 5_000_000;

const HomePage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('demo-session');

  useEffect(() => {
    const stored = window.localStorage.getItem('multimodal-session');
    if (stored) {
      setSessionId(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('multimodal-session', sessionId);
  }, [sessionId]);

  const route = useMemo(() => detectRoute(), []);
  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!input.trim() && !imageFile && !documentFile) return;

    setLoading(true);
    const trimmedInput = input.trim();

    const userMessage = {
      sender: 'user',
      message: trimmedInput || 'Please help with the attached file.',
      image: null,
      document: null,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      let imagePayload = null;
      if (imageFile) {
        if (imageFile.size > MAX_IMAGE_BYTES) {
          throw new Error('Image is too large. Please use a smaller file.');
        }
        const dataUrl = await readFileAsDataUrl(imageFile);
        imagePayload = { dataUrl, mimeType: imageFile.type || 'image/png', name: imageFile.name };
      }

      let documentPayload = null;
      if (documentFile) {
        if (documentFile.size > MAX_DOCUMENT_BYTES) {
          throw new Error('Document is too large. Please use a smaller file.');
        }
        const dataUrl = await readFileAsDataUrl(documentFile);
        documentPayload = { dataUrl, mimeType: documentFile.type || 'application/octet-stream', name: documentFile.name };
      }

      const response = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: trimmedInput || 'Please help with the attached file.',
          image: imagePayload,
          document: documentPayload,
          provider: 'auto',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.reply || 'Request failed');
      }

      setMessages((current) => [...current, { sender: 'assistant', message: data.reply, image: null, document: null }]);
    } catch (error) {
      setMessages((current) => [...current, { sender: 'assistant', message: error.message || 'Something went wrong.', image: null, document: null }]);
    } finally {
      setInput('');
      setImageFile(null);
      setDocumentFile(null);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 8 }}>Multimodal AI Assistant</h1>
          <p style={{ margin: 0, color: '#475569' }}>Chat with text, images, and documents in one unified experience.</p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 16, boxShadow: '0 10px 35px rgba(15,23,42,0.08)', padding: 16 }}>
          <div style={{ minHeight: 420, maxHeight: 520, overflowY: 'auto', paddingRight: 6, marginBottom: 12 }}>
            {messages.length === 0 ? (
              <div style={{ color: '#64748b', padding: 20 }}>Ask a question, upload an image, or add a document to get started.</div>
            ) : (
              messages.map((message, index) => <ChatMessage key={`${message.sender}-${index}`} sender={message.sender} message={message.message} image={message.image} document={message.document} />)
            )}
            {loading ? <div style={{ color: '#2563eb' }}>Thinking…</div> : null}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <PdfUploader label="Upload image" onUpload={setImageFile} accept="image/*" />
              <PdfUploader label="Upload document" onUpload={setDocumentFile} />
            </div>
            {imageFile ? <div style={{ color: '#0f766e', marginBottom: 8 }}>Image ready: {imageFile.name}</div> : null}
            {documentFile ? <div style={{ color: '#0f766e', marginBottom: 8 }}>Document ready: {documentFile.name}</div> : null}
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Type your message, describe an image, or ask a question about a document"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: 12, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ color: '#64748b', fontSize: 13 }}>Route: {route}</div>
              <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 16px', cursor: 'pointer' }}>
                {loading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
