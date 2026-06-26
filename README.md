# Spurly - AI Live Chat Support Platform

Spurly is a production-grade AI-powered customer support widget and companion backend API designed to automate customer engagement, resolve FAQs based on a structured Knowledge Base, and manage chat history. The application is built using a decoupled mono-repo architecture featuring a **Next.js 16 (React 19)** frontend widget and an **Express (TypeScript) + PostgreSQL** backend.

---

## ✨ Features

- **AI-Powered Customer Support**: Fully automated conversational assistant capable of answering store FAQs instantly.
- **Real-Time Streaming**: Delivers messages token-by-token using Server-Sent Events (SSE) for a responsive, chat-like experience.
- **Context-Aware Memory**: Preserves conversation history across turns by feeding recent message context (up to `MAX_CONTEXT_MESSAGES = 10`) to the model.
- **Static Knowledge Base**: Resolves queries based on local Markdown-based company guidelines, shipping policies, and store FAQs.
- **Persistent Chat History**: Securely persists sessions and messages using a PostgreSQL database managed via Prisma ORM.
- **Optimistic UI Updates**: Updates UI state immediately on user send, preventing lag while waiting for backend/LLM processing.
- **Session Restoration**: Uses client-side local storage to preserve active chat sessions across page reloads.
- **Robust Validation**: Enforces exact data schemas at API entry points using Zod validation.
- **Rate Limiting & Safety**: Leverages Express Rate Limit to guard endpoints against resource exhaustion.
- **Provider-Agnostic LLM Client**: Decoupled interface layout makes it simple to swap model gateways or APIs.

---

## 🎨 Design Philosophy

This project was intentionally built as a production-oriented miniature customer engagement platform rather than a simple chatbot. Key design goals were:

- **Clean Separation of Concerns**: Decoupled layers separating routes, schema validation, HTTP controllers, business services, and database repositories.
- **Provider-Agnostic AI Architecture**: Flexible wrapper interface around AI models, ensuring the engine can be replaced without rewriting core controllers or route workflows.
- **Stateless Backend**: Caches session references client-side (`localStorage`) to avoid tracking ephemeral sessions on every page request, keeping the backend stateless and lightweight.
- **Extensible Service Layer**: Readily modularized services that prepare the system for future integrations like Redis caching, RAG, and third-party APIs.
- **Streaming-First UX**: Prioritizes interactive fluidity by streaming tokens immediately to user message bubbles instead of blocking on long API calls.
- **Future-Ready Multi-Channel Support**: Architectural layout allows the backend to easily scale to handle messaging channels (WhatsApp, Messenger) beyond the web widget.

---

## 🚀 Architecture Overview

Spurly is designed around a **clean, decoupled, layered architecture** that ensures modularity, type-safety, and ease of testing.

### Subsystem Interaction Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Web Browser
    participant FE as Next.js 16 Frontend
    participant BE as Express API Server
    participant DB as PostgreSQL (Prisma)
    participant LLM as OpenRouter API Gateway

    User->>FE: Opens Chat Widget / Resumes Session
    FE->>BE: GET /chat/history/:sessionId
    BE->>DB: Fetch messages (ordered chronologically)
    DB-->>BE: Return message records
    BE-->>FE: Return history JSON array
    FE-->>User: Render history in ChatWindow

    User->>FE: Inputs message & clicks send
    FE->>FE: Render User message (Optimistic UI Update)
    FE->>BE: POST /chat/message (stream: true)
    BE->>DB: Save USER message to database
    BE->>DB: Fetch last 10 messages (context retrieval)
    DB-->>BE: Return message logs
    BE->>BE: Formulate prompt (System prompt + Knowledge Base + History + New message)
    BE->>LLM: Send POST stream request (Gemini-2.5-Flash)
    
    loop Stream Decoding
        LLM-->>BE: Yield response text token chunks
        BE-->>FE: Stream SSE lines (data: {"token": "..."})
        FE->>FE: Append tokens to UI Message Bubble in real time
    end

    FE-->>BE: [DONE] Connection closed / completed
    BE->>DB: Save full consolidated AI reply to database
```

### LLM Prompt Construction Flow

The backend constructs prompts dynamically for the LLM using a structured pipeline that contextually wraps user messages with relevant business rules and conversation logs:

```text
User Message
     ↓
Conversation History (Fetch up to last 10 messages from PostgreSQL)
     ↓
Knowledge Base (Load static Markdown FAQ guidelines)
     ↓
System Prompt (Combine instructions, persona guidelines, and restrictions)
     ↓
Prompt Builder (Format into a role-based message sequence)
     ↓
LLM (Request streaming response from OpenRouter API)
     ↓
Streaming Response (Stream SSE tokens back to Next.js UI)
     ↓
Persist Reply (Log and save full consolidated response to PostgreSQL)
```

### Backend Layer Structure
The backend codebase implements a strict separation of concerns through architectural layers:
* **Route Layer (`src/routes/`)**: Establishes API endpoints, mounts rate limiters, and binds JSON payload validators.
* **Validation Layer (`src/validators/` & `src/middleware/validation.middleware.ts`)**: Rejects malformed payload schemas at the boundary using **Zod**.
* **Controller Layer (`src/controllers/`)**: Extracts route inputs, configures HTTP response mechanisms (supporting standard JSON or SSE chunking), and registers Abort listeners to stop LLM streams on premature client closures.
* **Service Layer (`src/services/`)**: Orchestrates core business workflows—retrieves/creates sessions, fetches recent message context limits, feeds prompt builders, triggers the LLM Service, and invokes DB writes.
* **LLM Service Layer (`src/services/llm/`)**: Decouples API client protocols from prompt structures. Prompt builders combine system instructions and the static Markdown Knowledge Base with chat details.
* **Repository Layer (`src/repositories/`)**: Wraps Prisma Client operations. It isolates data persistence logic from business rules, allowing the service layer to remain database-agnostic, improving code modularity, and facilitating mock-based unit and integration testing.

---

## 🛠️ Technology Stack

### Frontend
* **Core**: Next.js 16 (App Router), React 19, TypeScript
* **Styling**: TailwindCSS v4, tw-animate-css
* **Data Fetching & Syncing**: TanStack Query (React Query) v5, Axios
* **Icons & Components**: Lucide-React, Shadcn UI v4 (leveraging Radix UI primitives)

### Backend
* **Core**: Node.js, Express.js, TypeScript
* **Database**: PostgreSQL (Neon Serverless in Production)
* **ORM**: Prisma Client v5
* **AI Provider Gateway**: OpenRouter API
* **Security & Verification**: Zod, Express Rate Limit
* **Telemetry & Logging**: Pino Logger, Pino-Pretty

---

## 📂 Project Structure

```text
spurly/
├── backend/                  # Express TypeScript Backend Project
│   ├── prisma/
│   │   ├── migrations/       # Database SQL schema migration logs
│   │   ├── schema.prisma     # Prisma database schema definition
│   │   └── seed.ts           # DB Seeding logic for sample data
│   ├── src/
│   │   ├── config/           # App variables & Environment configuration
│   │   ├── controllers/      # Express Controller logic (JSON & SSE handling)
│   │   ├── middleware/       # Global rate limiters, request loggers, & error catchers
│   │   ├── repositories/     # Data-access repository classes (Prisma wrappers)
│   │   ├── routes/           # Router registries mapping endpoints to controllers
│   │   ├── services/         # Business logic layer
│   │   │   └── llm/          # Prompts, static KB, and OpenRouter implementations
│   │   ├── utils/            # Standard response wrappers, custom AppError classes
│   │   ├── validators/       # Zod payload validation schemas
│   │   ├── app.ts            # Express App initialization and middleware stack
│   │   └── server.ts         # HTTP Server entry listener
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                 # Next.js App Router Frontend Project
    ├── src/
    │   ├── app/              # App router folders, layout definitions, context providers
    │   ├── components/       # Interface components (ChatWindow, Input, Bubbles)
    │   │   ├── chat/         # Floating support widget layout & conversation history page
    │   │   └── ui/           # Shared core UI component files (Buttons, Textareas)
    │   ├── hooks/            # Custom hooks (useChat state manager & useConversation caching)
    │   ├── lib/              # Client setups (Shadcn styling helpers)
    │   └── services/         # API HTTP fetch services & SSE stream reading pipelines
    ├── package.json
    └── tsconfig.json
```

---

## ⚙️ Getting Started & Setup

### Prerequisites
* **Node.js** (v18.x or higher recommended)
* **PostgreSQL Database** (local instance or hosted URL like Neon)

---

### Step 1: Install Dependencies
Install packages for both the backend and frontend services:

```bash
# Clone the repository and navigate to the project directory
cd spurly

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

---

### Step 2: Database Setup & Migration
Set up your PostgreSQL database using Prisma ORM inside the `backend` folder:

```bash
cd ../backend

# Create database schemas and run migrations
npx prisma migrate dev --name init

# Generate Prisma client library bindings
npx prisma generate

# Seed the database with initial conversations (optional)
npx prisma db seed
```

---

### Step 3: Configure Environment Variables

Create configuration files for the backend and frontend to connect components.

#### A. Backend Environment Setup (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

# Database Connection URL (PostgreSQL Connection String)
DATABASE_URL="postgresql://username:password@localhost:5432/spurly?schema=public"

# Allowed CORS origins
FRONTEND_URL="http://localhost:3000"

# OpenRouter Key and Model Configuration
OPENROUTER_API_KEY="your-openrouter-key-here"
OPENROUTER_MODEL="google/gemini-2.5-flash"

# Toggle Streaming Capability
STREAM_ENABLED=true
```

#### B. Frontend Environment Setup (`frontend/.env.local`)
Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

---

### Step 4: Run the Application
Start both development servers.

```bash
# Start Backend (runs on http://localhost:5000)
cd backend
npm run dev

# Start Frontend (runs on http://localhost:3000)
cd ../frontend
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`** to view the Spur Customer Hub and interact with the support chat widget.

---

## 🔒 API Endpoints

### Send Message
* **Endpoint**: `POST /chat/message`
* **Payload Schema**:
  ```json
  {
    "message": "What is your shipping policy?",
    "sessionId": "cldh190s80000z3018e6abcde",
    "stream": true,
    "model": "google/gemini-2.5-flash"
  }
  ```
* **Response**: Returns standard JSON if `stream` is `false`, otherwise opens a Server-Sent Events stream emitting text tokens.

### Get Chat History
* **Endpoint**: `GET /chat/history/:sessionId`
* **Response**:
  ```json
  {
    "status": 200,
    "message": "Chat history retrieved successfully",
    "data": {
      "messages": [
        { "sender": "USER", "content": "Hi", "createdAt": "2026-06-26T12:00:00Z" },
        { "sender": "AI", "content": "Hello! How can I help?", "createdAt": "2026-06-26T12:00:01Z" }
      ]
    }
  }
  ```

### Get Multiple Session Metadata
* **Endpoint**: `POST /chat/sessions`
* **Payload Schema**:
  ```json
  {
    "sessionIds": ["cldh190s80000z3018e6abcde"]
  }
  ```
* **Response**: Returns meta-details (creation date, last message sender & preview) to populate the customer's chat history tab.

---

## ⚖️ Engineering Tradeoffs & Decisions

### 1. LLM Provider Abstraction Layer
* **Decision**: Deployed a clean `LLMProvider` contract and model-agnostic architecture.
* **Rationale**: Directly coupling the backend to a single SDK makes switching vendors difficult. By isolating vendor logic inside provider classes (such as `OpenRouterProvider`), we can swap providers (e.g., migrating to direct Anthropic Claude or local Ollama endpoints) without modifying route controllers or conversation workflows.

### 2. Restricting Conversation Context window (`MAX_CONTEXT_MESSAGES = 10`)
* **Decision**: Injected prompt memory is capped at the last 10 messages (5 user turns, 5 AI turns).
* **Rationale**: Capping history balances context recall, cost efficiency, and response latency. In support chats, recent context is sufficient for single-session inquiries. Including hundreds of historical messages increases token counts, adds latency, and increases cost without significantly improving support quality.

### 3. Client-Side Session Storage Cache
* **Decision**: Storing session IDs locally in the browser (`localStorage`) instead of server-side session tracking.
* **Rationale**: Avoids database calls to track guest sessions on every page request, keeping the backend stateless. The frontend can query the database for message details only when a conversation widget is expanded.

### 4. Server-Sent Events (SSE) for Real-Time Streaming
* **Decision**: Implemented streaming responses using Server-Sent Events (SSE) rather than standard JSON REST responses.
* **Rationale**: Streaming answers token-by-token significantly reduces perceived latency and matches modern conversational patterns. Users start seeing response segments within milliseconds, instead of waiting for the model to finish generating the full text (which can take several seconds).

### 5. OpenRouter API Gateway
* **Decision**: Integrated OpenRouter instead of coupling directly with a provider-specific SDK (like OpenAI or Gemini SDK).
* **Rationale**: OpenRouter serves as an API gateway, enabling prompt processing across a massive catalog of models (Gemini-2.5-Flash, Claude 3.5 Sonnet, GPT-4o, Llama, etc.). This avoids vendor lock-in and permits changing default models (e.g., dynamically falling back to another provider if Gemini is down) purely through environment variable config adjustments without rewriting backend code.

---

## 🛡️ Centralized Error Handling

The backend features robust, centralized error handling middleware (`src/middleware/errorHandler.middleware.ts`) that guarantees clean error envelopes and prevents sensitive stack traces from leaking to clients in production:

- **Input Validation Errors**: Returns detailed `400 Bad Request` payloads pointing to missing or malformed fields verified by Zod.
- **API Rate Limiting**: Responds with `429 Too Many Requests` when clients exceed the Express Rate Limit threshold.
- **Database Failures**: Catches Prisma query errors and translates them to generic internal server errors, maintaining DB isolation.
- **LLM/Gateway Failures**: Gracefully catches OpenRouter timeouts, client abort signals, or API errors, returning standard fallback messages to the client.
- **Client Disconnects**: Listens for connection termination during Server-Sent Events streams, aborting the downstream OpenRouter fetch call immediately to conserve API tokens and socket resources.

---

## 🔒 Security Practices

The platform implements defense-in-depth practices to secure both the application data and underlying services:

- **Environment Isolation**: Kept all database URLs, cors origins, API keys, and model selections secured in environment variables.
- **Schema Enforcement**: Zod schemas act as a strict gatekeeper at endpoints, stripping out unvalidated inputs.
- **SQL Injection Prevention**: Prisma ORM executes parameterized queries under the hood, neutralizing database command injections.
- **Rate Limiting**: Defends endpoints against brute force, denial of service, and scraping attacks.
- **Safe Error Verbosity**: Stack traces are logged in Pino-pretty for debugging but sanitized out of client responses.
- **CORS Configuration**: Restricts API calls to approved origins (`FRONTEND_URL`), preventing unauthorized cross-origin requests.

---

## 📈 Scalability Considerations

While the current repository is optimized for ease of evaluation and light deployment, the architecture was structured to support horizontal and vertical scaling with minimal refactoring:

- **Distributed Rate Limiting**: Migrating the current in-memory rate limiter to a shared **Redis-backed rate limiter** to enforce API limits consistently across a load-balanced server pool.
- **Vector-Based Knowledge Base (RAG)**: Swapping the static local Markdown Knowledge Base for a vector search system utilizing **pgvector** or Pinecone, supporting automated semantic retrieval across large volumes of dynamic help documents.
- **Caching Layer**: Introducing **Redis** to store and serve persistent session records and message history, minimizing recurrent database roundtrips.
- **Background Worker Queues**: Offloading intensive LLM calls and telemetry logging to worker queues (e.g., **BullMQ**) to prevent API event loops from blocking under high concurrency.
- **Conversation Summarization**: Implementing a background scheduler to summarize old messages, preventing context window bloat while still keeping long-term memory.

---

## 🧪 Testing

Spurly backend API utilizes **Jest** and **Supertest** to execute integration test suites. The tests verify database updates, LLM provider mocks, route boundaries, and input validators.

To execute the integration tests:

```bash
cd backend
npm run test
```

The test suites manually cover and validate:
- **Session Lifecycle**: Creation of new sessions when no ID is provided, and session lookup.
- **History Retrieval**: Chronological order consistency for user and assistant messages.
- **Payload Validation**: Failures on empty requests, spaces-only strings, or missing inputs.
- **Rate Limiting & Errors**: Proper HTTP code responses for error boundaries.

---

## 🔮 Future Roadmap

* **RAG (Retrieval-Augmented Generation)**: Replace the static knowledge base with a vector database (e.g., Pinecone, pgvector) to dynamically query documents and support larger store catalogs.
* **Redis Cache Layer**: Implement Redis to cache historical conversation records, minimizing recurrent database roundtrips.
* **Multi-Agent Workflows**: Run distinct specialized agents (e.g., Sales Assistant, Technical troubleshooter, Escalations) that route requests based on intent classification.
* **Multi-Channel Integration**: Extend backend adapters to connect conversations from WhatsApp Business API, Facebook Messenger, and Instagram Direct Messages.
* **Human-in-the-Loop Escalation**: Add support to alert and hand off complex queries to human staff via a shared admin inbox.
* **Analytics Dashboard**: Collect performance and operation metrics, tracking resolution rates, average latency, and API token costs.

---

> *This implementation intentionally emphasizes clean architecture, maintainability, and extensibility over adding numerous features. The goal was to build a small but production-oriented foundation that could realistically evolve into a multi-channel customer engagement platform.*
