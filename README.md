# 🍃 Zupe — Natural Language to Product Recommendation System

Welcome to **Zupe**, a full-stack personalized wellness guide and product recommendation assistant integrated with Shopify. The project is structured as a monorepo with a FastAPI backend service and a standalone React chat widget frontend.

---

## 🎬 Demo

<!-- 
  VIDEO EMBED PLACEHOLDER
  To embed the demo video, upload demo.mp4 to any GitHub Issue comment (drag & drop),
  copy the generated https://github.com/user-attachments/... URL, and paste it below.
-->

[![Watch the Demo](https://img.shields.io/badge/▶%20Watch%20Demo-Click%20Here-black?style=for-the-badge)](demo.mp4)

---

## 🌳 Project Structure

```
zupe-personal/
├── backend/          # FastAPI service (LangGraph agent, Pinecone RAG, PostgreSQL, Shopify)
├── frontend/         # Vite + React + TypeScript embeddable chatbot widget
├── deployment_guide.txt  # Step-by-step production URL migration guide
└── README.md
```

- 📂 **[backend](./backend)** — High-performance **FastAPI** service powered by a custom **LangGraph** chatbot agent. Handles context retrieval (RAG) via Pinecone, conversation history checkpointing in PostgreSQL, Shopify Storefront API integrations, and a daily cron sync job.
- 📂 **[frontend](./frontend)** — Glassmorphic, standalone **Vite + React + TypeScript** chatbot widget designed to be embedded in any Shopify theme or custom web environment via a single `<script>` tag.

---

## 🚀 Quick Start

To get the entire stack running locally, follow the steps below.

### Prerequisites

| Tool | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) (≥ 18) | Frontend widget dev server |
| [uv](https://github.com/astral-sh/uv) | Blazing-fast Python package manager |
| [Docker](https://www.docker.com/) | Optional — run full stack with Compose |
| PostgreSQL (local or Docker) | Conversation checkpointer DB |

---

### 1. Backend Setup

```bash
cd backend
```

1. **Sync Python dependencies** using `uv`:
   ```bash
   uv sync
   ```

2. **Configure environment variables** — copy the template and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables in `backend/.env`:
   ```env
   # Groq LLM
   GROQ_API_KEY=gsk_...

   # Pinecone Vector Database
   PINECONE_API_KEY=pcsk_...
   PINECONE_INDEX_NAME=zupe

   # Shopify Storefront API
   SHOPIFY_BASE_URL=https://your-store-name.myshopify.com
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=...
   SHOPIFY_API_VERSION=2026-01

   # PostgreSQL (LangGraph conversation checkpointer)
   STM_DB_URI=postgresql://zupe_store:zupe123@localhost:5442/zupe_db

   # CORS (comma-separated allowed origins)
   CORS_ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5173
   ```

3. **Start the development server**:
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```
   API runs at `http://localhost:8000`.

---

### 2. Frontend Setup

```bash
cd frontend
```

1. **Configure environment variables** — create `frontend/.env.local`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_SHOPIFY_BASE_URL=https://your-store-name.myshopify.com
   VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
   VITE_SHOPIFY_API_VERSION=2026-01
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the Vite dev server** (runs on port `5174`):
   ```bash
   npm run dev
   ```
   Widget available at `http://localhost:5174`.

---

### 3. Full Stack with Docker Compose (Recommended)

From the `backend/` directory, spin up the backend, PostgreSQL DB, and the cron sync container in one command:

```bash
cd backend
docker compose up --build -d
```

- Backend API → `http://localhost:8000`
- PostgreSQL → `localhost:5442`

---

## 🛠️ Tech Stack

### Backend
| Technology | Role |
|---|---|
| **FastAPI & Uvicorn** | High-performance ASGI HTTP server & REST API |
| **LangGraph** | Stateful agent / workflow orchestrator |
| **Groq (LLM)** | Language model provider (fast inference) |
| **Sentence Transformers** | Local embedding & cross-encoder reranking models |
| **Pinecone** | Managed vector database for product & article embeddings |
| **PostgreSQL + psycopg** | Async connection pool & persistent conversation checkpointing |
| **Shopify Storefront API** | Real-time product catalog queries via GraphQL |
| **uv** | Fast Python dependency and virtual environment manager |

### Frontend
| Technology | Role |
|---|---|
| **React 19 & TypeScript** | Interactive component-based UI |
| **Vite** | Fast development server & production bundler |
| **Vanilla CSS** | Glassmorphic styles, gradients, and micro-animations |
| **SSE Streaming** | Chunk-by-chunk token streaming from the backend |

---

## 🤖 LangGraph Workflow

The backend processes each query through an event-driven **LangGraph** state machine:

```
START
  └── clean_query
        └── decide_retrieval
              ├── [general Q&A]    → general_qa → END
              └── [product search] → decide_followup
                    ├── [needs clarification] → ask_followup → END
                    └── [ready to search]    → extract_intent
                                                  └── vector_search
                                                        └── rerank_products
                                                              └── recommend_products → END
```

---

## 📡 API Reference

### `GET /`
Health check.
```json
{ "message": "Welcome to the Zupe Backend API!" }
```

### `POST /chat`
Streams a chat response as **Server-Sent Events (SSE)**.

**Request body:**
```json
{
  "query": "What supplements help with sleep?",
  "thread_id": "thread_abc123"
}
```

**SSE Event Types:**

| Type | Payload | Description |
|---|---|---|
| `start` | `{ "thread_id": "..." }` | Session established |
| `status` | `{ "status": "thinking" \| "searching" }` | Typing indicator state |
| `node` | `{ "node": "vector_search" }` | Current LangGraph node |
| `answer` | `{ "content": "token..." }` | Streamed response token |
| `done` | _(empty)_ | Workflow complete |
| `error` | `{ "content": "error message" }` | Workflow error |

> Pass the `thread_id` from the `start` event back on subsequent requests to maintain conversation memory.

---

## 🌐 Production Deployment

For a full step-by-step walkthrough on moving from localhost to production (backend URL, CORS origins, widget CDN URL, embed script), see the **[Deployment Guide](./deployment_guide.txt)**.

Key changes required at deploy time:
1. Update `STM_DB_URI` in `backend/.env` to your production PostgreSQL instance.
2. Update `CORS_ALLOWED_ORIGINS` to your production domain(s).
3. Set `VITE_API_URL` to your deployed FastAPI URL in the frontend build config.
4. Embed `<script src="https://widget.yourdomain.com/widget.js" defer></script>` in your storefront.
