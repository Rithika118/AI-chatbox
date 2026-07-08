# finlaticswebdev_project3

A multimodal AI assistant built with Next.js, Express, Prisma, and generative AI providers for chat, image, and document understanding.

## What I built

This project is a web-based assistant that accepts text messages, image uploads, and document uploads. It routes requests through a Node/Express backend, stores conversation history with Prisma, and uses generative AI to create assistant responses.

### Technologies used

- Next.js (React) for the frontend UI
- Express and a custom `server.js` for request handling and server-side routing
- Prisma ORM with SQLite/PostgreSQL-compatible schema for storing sessions and messages
- `@google/generative-ai` and external AI APIs for multimodal responses
- `pdf-parse` and `mammoth` for extracting document text
- `react`, `react-dom` for UI rendering
- `dotenv` for environment configuration

## 2–3 Minute Explanation Outline

### 1. Problem statement

Users need a single conversational interface that can understand typed questions, images, and documents together. Existing chat apps usually handle only text, so the challenge is to make a multimodal assistant that can safely accept files and still deliver helpful answers.

### 2. Architecture

- Frontend: `pages/index.js` provides a simple chat UI with message composition, image upload, and document upload.
- Server: `server.js` uses Express plus Next.js request handling.
- API: `/api/chat` endpoint processes incoming chat requests and hands them off to AI services.
- Routing: `lib/requestRouter.js` decides whether the request is plain chat, image-only, document RAG, or full multimodal.
- Persistence: `lib/db.js` uses Prisma to store conversations and message history.

### 3. AI integration

- `lib/aiService.js` builds prompts from user input, conversation history, and optional document context.
- It supports provider selection: OpenAI or Gemini, with a fallback to whichever API key is configured.
- For RAG/document mode, it extracts text from PDFs, Word documents, and text files, chunks the content, creates embeddings, and retrieves the best related segments.
- For multimodal requests, it includes image and document data in the prompt so the assistant can answer based on attachments.

### 4. Challenges faced

- Handling multiple input formats (text, images, documents) in a single chat flow.
- Building document text extraction and lightweight semantic search without a full vector DB.
- Keeping session context while allowing users to upload large files safely.
- Managing environment-specific API provider settings and error conditions from external AI services.

### 5. Future improvements

- Add proper file validation, size limits, and real upload progress indicators.
- Replace mock/local embedding logic with a true vector database like pgvector or Pinecone.
- Add support for more providers and better multimodal prompt engineering.
- Build a richer UI with conversation threads, user profiles, and message search.
- Add automated tests for the full end-to-end chat flow and provider integration.

