# Spurly Chat Support Agent: System Architecture Documentation

This document provides a highly technical, detailed analysis of the architecture and implementation of **Spurly**, an AI-powered live chat support widget and backend assistant. It acts as an engineering manual detailing how the system handles live conversations, manages session states, integrates with Large Language Models (LLMs), and communicates across different layers.

---

## 1. High-Level Architecture Overview

Spurly is architected as a decoupled client-server application consisting of a **Next.js 16 Frontend** and an **Express.js (TypeScript) Backend API**, with database persistence provided by a **PostgreSQL** database managed via **Prisma ORM**.

The diagram below maps out the system's component relationships, data flow boundaries, and external communications:

```mermaid
graph TD
    %% Frontend Subsystem
    subgraph Frontend [Next.js App Client]
        UI[SupportChatWidget] -->|uses| HookChat[useChat Hook]
        HookChat -->|persists sessions| LocalStorage[(Browser LocalStorage)]
        HookChat -->|uses| HookConv[useConversation Hook]
        HookChat -->|fetches & mutates| APIClient[API Service Client]
    end

    %% Network Boundary
    APIClient -->|HTTP Request / SSE Connection| WebServer[Express API Server]

    %% Backend Subsystem
    subgraph Backend [Express TypeScript Server]
        WebServer -->|routing| Routers[Chat Routes]
        Routers -->|rate limiting| RateLimit[Rate Limit Middlewares]
        RateLimit -->|validation| ZodVal[Zod Validation Middleware]
        ZodVal -->|dispatch| Controllers[Chat Controller]
        
        Controllers -->|calls| Services[Chat Service]
        
        Services -->|reads / writes| Repos[Repositories: Conversation & Message]
        Repos -->|queries| Prisma[Prisma ORM]
        
        Services -->|orchestrates| LLM[LLM Service]
        LLM -->|uses| KB[Knowledge Base System]
        LLM -->|formats prompts| Prompts[Prompt Templates]
        LLM -->|queries| LLMProvider[OpenRouter Provider]
    end

    %% External & Persistence Boundaries
    Prisma -->|SQL queries| DB[(PostgreSQL Database)]
    LLMProvider -->|Axios POST / SSE Stream| OpenRouter[OpenRouter AI Gateway]

    %% Styling
    classDef frontend fill:#000000,stroke:#0288d1,stroke-width:2px;
    classDef backend fill:#000000,stroke:#5d4037,stroke-width:2px;
    classDef external fill:#000000,stroke:#37474f,stroke-width:2px,stroke-dasharray: 5 5;
    classDef db fill:#000000,stroke:#2e7d32,stroke-width:2px;

    class UI,HookChat,HookConv,APIClient,LocalStorage frontend;
    class WebServer,Routers,RateLimit,ZodVal,Controllers,Services,Repos,Prisma,LLM,KB,Prompts,LLMProvider backend;
    class OpenRouter external;
    class DB db;
```

---

## 2. Database Design & Schema

Persistence is handled by a PostgreSQL database. Schema operations and database migrations are managed using Prisma ORM

### 2.1 Prisma Schema Entity Definitions
The database schema consists of two primary models: `Conversation` and `Message`. An index is configured on `conversationId` to optimize history lookups, and a cascading delete is configured to keep message logs clean when sessions are deleted.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Sender {
  USER
  AI
}

model Conversation {
  id        String    @id @default(cuid())
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  sender         Sender
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}
```

---

## 3. Backend Architecture & Layers

The backend follows a strict **layered clean-architecture pattern**. Each layer has a single responsibility, reducing coupling and making the codebase modular and testable.

### 3.1 Architecture Layers

```
                                  +-----------------------+
                                  |     Express Router    |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |    Rate Limiting &    |
                                  |    Zod Validation     |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |    Chat Controller    |
                                  +-----------+-----------+
                                              |
                                              v
                                  +-----------------------+
                                  |     Chat Service      | <---+
                                  +-----+-----------+-----+     |
                                        |           |           |
                                        v           v           v
                        +------------------+     +------------------+
                        | ConversationRepo |     |   LLM Service    |
                        |   MessageRepo    |     +--------+---------+
                        +--------+---------+              |
                                 |                        v
                                 v               +------------------+
                        +------------------+     | OpenRouter Prov. |
                        |    Prisma / DB   |     +------------------+
                        +------------------+
```

1. **Route Layer (`routes/`)**: Establishes endpoints and binds schemas and rate limiters.
2. **Controller Layer (`controllers/`)**: Manages HTTP-level concerns: parsing parameters, extracting payloads, choosing response modes (JSON vs. Server-Sent Events stream), handling connection closures, and mapping downstream exceptions to global API response handlers.
3. **Service Layer (`services/`)**: Contains the business logic of the application. Coordinates session lookups/fallback initialization, context loading limits, prompt engineering formatting, token stream generation, and DB write operations.
4. **Repository Layer (`repositories/`)**: Abstracts direct SQL/Prisma operations. Provides clean CRUD interfaces for conversations and message storage.
5. **LLM Integration Layer (`services/llm/`)**: Decouples prompt configuration and external provider protocols from the rest of the application.

---

### 3.2 Layer Implementations

#### A. Route Layer (`routes/chat.routes.ts`)
Maps URLs defined in the centralized routes configuration to the controller, applying isolated input validators and route-specific rate limits.

#### B. Controller Layer (`controllers/chat.controller.ts`)
Extracts HTTP parameters, handles standard HTTP JSON returns using a unified success wrapper, and configures Server-Sent Events (SSE) headers for real-time text generation.
* **SSE Handling**: When a stream is requested, the controller writes appropriate headers (`text/event-stream`), manages connection closure listeners (e.g. aborting LLM calls on client disconnect via `AbortSignal`), iterates over the generator returned by the service, and flushes output tokens to the socket.

#### C. Service Layer (`services/chat.service.ts`)
Performs the core workflow orchestration. 
* **State Flow for Message Submission**:
  1. Resolves a `sessionId` (creates a new database record if it is absent or invalid).
  2. Pulls the latest messages (capped at `MAX_CONTEXT_MESSAGES = 10` to manage context size and control token costs).
  3. Commits the new user message to the database.
  4. Combines the system prompt, FAQs knowledge base, conversational history, and new message into a standard OpenAI-compatible prompt format.
  5. Requests completions from the LLM. In case of API failure, it logs the exception and returns a preconfigured fallback support response.
  6. Writes the finished AI reply back to the database.

#### D. Repository Layer (`repositories/`)
Encapsulates all interaction with Prisma.
* ConversationRepository: Implements methods like `create()` and `findById(id)`.
* MessageRepository: Implements `create(conversationId, sender, content)` and `findRecentByConversationId(conversationId, limit)`.

---

## 4. LLM & Prompt Orchestration

The application is built to be model-independent. It isolates provider implementations using an interface contract, allowing developers to switch providers (e.g., from OpenRouter to direct OpenAI or Anthropic SDKs) without editing core business flows.

### 4.1 Interface Contract
Defined in `llm.service.ts`
```typescript
export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  generateReply(messages: PromptMessage[], model?: string): Promise<string>;
  generateReplyStream(
    messages: PromptMessage[],
    model?: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown>;
}
```

### 4.2 OpenRouter Provider (`services/llm/openrouter.provider.ts`)
Communicates with the OpenRouter API gateway.
* **Default Model**: Configured via the `OPENROUTER_MODEL` environment variable (defaults to `google/gemini-2.5-flash`).
* **Streaming Parser**: Implements an `AsyncGenerator` using a `TextDecoder` buffer loop over the response payload, parsing server-sent JSON chunks (formatted as `data: {...}`) and yielding individual tokens in real time. It respects `AbortSignal` for quick termination.

### 4.3 Prompt Composition (`services/llm/prompts.ts`)
The prompt generator `prompts.ts` constructs the token payload. It appends:
1. **System Instructions**: Defines persona behavior (be friendly, concise, keep replies under 3 sentences, politely escalate if information is unavailable).
2. **Injectable FAQ Knowledge Base**: Loads a static context file containing policies for shipping, returns, non-refundable items, integration channels, and support hours.
3. **Chat History**: Appends historical logs in chronological order.
4. **Current User Prompt**: Injects the latest message.

```
+-----------------------------------------------------------+
| SYSTEM PROMPT: Guidelines, constraints & support persona  |
+-----------------------------------------------------------+
| KNOWLEDGE BASE: Policies, features, and hours             |
+-----------------------------------------------------------+
| HISTORICAL CONTEXT: Up to 10 past messages (chrono order) |
+-----------------------------------------------------------+
| CURRENT USER MESSAGE: The latest customer input           |
+-----------------------------------------------------------+
```

---

## 5. Frontend Architecture & Flow

The frontend is a modular, single-page application built on Next.js 16. It handles session recovery, state persistence, UI optimistic rendering, and stream parsing.

### 5.1 Component Structure

* **`SupportChatWidget`**: Floating entry component containing structural layout triggers, transition states (open/closed), and screen toggles.
  - **Screen 1**: If an active `sessionId` is present, renders `ChatWindow` (message thread bubbles, dynamic typing indicator, initial sample-question chips) and `ChatInput` for user message entry.
  - **Screen 2**: If `sessionId === null`, renders `ConversationHistoryList` showing past sessions stored in the browser, allowing the user to resume, delete, or start a new conversation.
* **`ChatHeader`**: Displays current chat info, hosts dropdown triggers to view past sessions, start a new chat session, or close the widget.

### 5.2 State Management Hooks

The state architecture uses two custom React hooks for separation of concerns:

#### useConversation Hook (`hooks/useConversation.ts`)
Manages persistence of session IDs in `localStorage` under keys `spurly_chat_active_session_id` and `spurly_chat_past_sessions`. It uses lazy initialization (safely wrapping accesses in `typeof window !== 'undefined'` checks) to prevent Next.js SSR hydration mismatches.

#### useChat Hook (`hooks/useChat.ts`)
Orchestrates API calls, optimistic UI states, query invalidations, and streaming chunk updates.
* **State Operations**:
  - Leverages `@tanstack/react-query` to fetch history detail and manage metadata refresh states.
  - Intercepts message creation via a React Query mutation:
    1. Triggers an **optimistic update** appending the user's message immediately.
    2. Appends an empty placeholder message with `sender: 'AI'` to the message array.
    3. Triggers the SSE connection via `sendChatMessageStream`.
    4. Gradually updates the last AI message's text block as tokens arrive.
    5. On success, invalidates react-query cache items to pull the exact synced timeline from the database.

### 5.3 Streaming API Client (`services/api.ts`)
The API Client `api.ts` wraps the native `fetch` reader API for handling SSE connections.
* **Chunk Decoding Pipeline**:
  ```
  [Fetch ReadableStream]
           |
           v
    [TextDecoder] ---> Appends to incoming string buffer
                             |
                             v
               Is there a newline character?
               |                           |
             (Yes)                        (No)
               |                           |
               v                           v
     Extract 'data: {...}'         Wait for next chunk
               |
               v
       JSON.parse payload
               |
               v
       Trigger onChunk() 
       Callback (emit to hook)
  ```
* If the server returns a standard JSON payload instead of an SSE stream (e.g., if streaming is disabled or an error occurs early in execution), the client handles this by parsing the JSON immediately and invoking the callback once.

---

## 6. API Specifications & Contracts

All endpoints return a structured envelope wrapper `ApiResponseEnvelope` to ensure a consistent API structure.

### 6.1 Envelope Format
```typescript
interface ApiResponseEnvelope<T> {
  status: number;      // HTTP Status Code
  message: string;     // Context/Confirmation Message
  data: T | null;      // Payload Object
}
```

### 6.2 Endpoint Reference

#### A. Send Message
* **URL**: `/chat/message`
* **Method**: `POST`
* **Rate Limits**: 50 requests / 15 minutes.
* **Headers**: `Content-Type: application/json`
* **Zod Payload Rules**:
  - `message`: Required, string, trimmed, 1-1000 characters.
  - `sessionId`: Optional, nullable string.
  - `stream`: Optional, nullable boolean.
  - `model`: Optional, nullable string.
* **Standard Response** (when `stream` is `false` or unsupported):
  ```json
  {
    "status": 200,
    "message": "Message processed successfully",
    "data": {
      "reply": "We accept returns within 30 days of delivery.",
      "sessionId": "cldh190s80000z3018e6abcde"
    }
  }
  ```
* **Streaming Response** (when `stream` is `true`):
  - Sends headers:
    ```http
    Content-Type: text/event-stream
    Cache-Control: no-cache
    Connection: keep-alive
    ```
  - Yields sequence data:
    ```sse
    data: {"sessionId":"cldh190s80000z3018e6abcde"}
    
    data: {"token":"We "}
    
    data: {"token":"accept "}
    
    data: {"token":"returns."}
    
    data: [DONE]
    ```

#### B. Get Session History
* **URL**: `/chat/history/:sessionId`
* **Method**: `GET`
* **Response**:
  ```json
  {
    "status": 200,
    "message": "Chat history retrieved successfully",
    "data": {
      "messages": [
        {
          "sender": "USER",
          "content": "Hi there",
          "createdAt": "2026-06-26T12:00:00.000Z"
        },
        {
          "sender": "AI",
          "content": "Hello! How can I help you today?",
          "createdAt": "2026-06-26T12:00:01.000Z"
        }
      ]
    }
  }
  ```

#### C. Get Multiple Sessions Metadata
* **URL**: `/chat/sessions`
* **Method**: `POST`
* **Request Payload**:
  ```json
  {
    "sessionIds": ["cldh190s80000z3018e6abcde", "cldh290s80000z3018e6fghij"]
  }
  ```
* **Response**: Returns session creation timestamps and details of their last message, sorted chronologically:
  ```json
  {
    "status": 200,
    "message": "Sessions info retrieved successfully",
    "data": [
      {
        "id": "cldh190s80000z3018e6abcde",
        "createdAt": "2026-06-26T12:00:00.000Z",
        "lastMessage": {
          "sender": "AI",
          "content": "Hello! How can I help you today?",
          "createdAt": "2026-06-26T12:00:01.000Z"
        }
      }
    ]
  }
  ```

---

## 7. Cross-Cutting Concerns

### 7.1 Input Validation & Sanitization
All client request bodies are validated using **Zod** middleware `validation.middleware.ts`. Inputs are trimmed to remove whitespace, and invalid payloads are rejected at the route boundary with a `400 Bad Request` status before hitting business services.

### 7.2 Standardized Exception Strategy
The backend defines a base `AppError` class extending native JS `Error`, with structured subclasses:
* `ValidationError` (status `400`)
* `DatabaseError` (status `500`)
* `LLMError` (status `502`)

The global Express error-handling middleware `error.middleware.ts` catches all unhandled exceptions. In production (`NODE_ENV=production`), it automatically sanitizes error output, returning a generic message to prevent exposing stack traces, credentials, or internal query parameters.

### 7.3 Structured Logging
Logging uses **Pino** `logger.ts`.
* Request logs are intercepted by `requestLogger.middleware.ts` to log method, path, response status, client IP, and execution latency.
* Key parameters like API credentials or authorization tokens are excluded from logging.

### 7.4 Rate Limiting Configuration
Two rate limits are applied via `express-rate-limit` in `rateLimiter.middleware.ts`:
1. **General API Rate Limiter**: 200 requests per 15 minutes per IP. Applied globally across all API routes.
2. **Chat Endpoint Rate Limiter**: 50 requests per 15 minutes per IP. Applied specifically to message transmission endpoints to prevent LLM credit consumption abuse.

---

## 8. Development & Deployment Configurations

### 8.1 Local Environment Variables
A `.env` config file is required for both subsystems.

**Backend Configuration (`backend/.env`)**:
```env
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/spurly?schema=public"

# Frontend Origin for CORS headers
FRONTEND_URL="http://localhost:3000"

# OpenRouter Configuration
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_MODEL="google/gemini-2.5-flash"

# Toggle Streaming Capabilities
STREAM_ENABLED=true
```

**Frontend Configuration (`frontend/.env.local`)**:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

### 8.2 Build and Run Execution Lifecycle

#### Database Setup
```bash
# Apply migrations to sync the database schema
npx prisma migrate dev

# Seed databases (if seed scripts are provided)
npx prisma db seed
```

#### Running Locally
```bash
# Launch development servers (Backend running on 5000, Frontend on 3000)
# Inside /backend:
npm run dev

# Inside /frontend:
npm run dev
```
