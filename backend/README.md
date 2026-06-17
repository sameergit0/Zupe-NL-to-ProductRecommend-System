# Zupe Backend Service

The backend is a high-performance **FastAPI** service powered by a custom **LangGraph** chatbot workflow, orchestrating context retrieval, vector database lookups, chat session checkpointers, and direct Shopify integrations.

---

## 🛠️ Tech Stack & Dependencies

The backend uses modern Python tooling managed by `uv`:

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | ≥0.136.3 | HTTP server & REST API framework |
| `uvicorn` | ≥0.48.0 | ASGI server |
| `langgraph` | ≥1.2.2 | Workflow orchestration & state graph |
| `langgraph-checkpoint-postgres` | ≥3.1.0 | Persistent conversation checkpointing via PostgreSQL |
| `langchain` | ≥1.3.2 | LLM client wrappers & structured prompts |
| `langchain-groq` | ≥1.1.2 | Groq LLM integration |
| `langchain-huggingface` | ≥1.2.2 | HuggingFace embedding model integration |
| `langchain-community` | ≥0.4.2 | Community tools & loaders |
| `pinecone` | ≥9.0.1 | Vector database for product & article embeddings |
| `sentence-transformers` | ≥5.5.1 | Local embedding & cross-encoder reranking models |
| `torch` | ≥2.12.0 | ML runtime for sentence-transformers |
| `psycopg[binary]` | ≥3.3.4 | PostgreSQL async driver |
| `psycopg-pool` | ≥3.3.1 | Async connection pooling |
| `requests` | ≥2.34.2 | Shopify GraphQL API calls |
| `python-dotenv` | ≥1.2.2 | `.env` file loading |

---

## 🌳 App Directory Structure

```
backend/
├── app/
│   ├── core/                 # App configuration (settings, environment bindings)
│   ├── graph/                # LangGraph state graph, routers, and nodes
│   │   ├── nodes/            # Individual workflow step implementations
│   │   │   ├── clean_query.py
│   │   │   ├── decide_retrieval.py
│   │   │   ├── decide_followup.py
│   │   │   ├── extract_intent.py
│   │   │   ├── vector_search.py
│   │   │   ├── rerank_products.py
│   │   │   ├── recommend_products.py
│   │   │   ├── general_qa.py
│   │   │   └── ask_followup.py
│   │   ├── state.py          # LangGraph state schema (StoreState)
│   │   ├── routers.py        # Conditional routing logic between nodes
│   │   ├── workflow.py       # Graph compilation & singleton accessor
│   │   └── workflow.png      # Auto-generated Mermaid graph diagram (on startup)
│   ├── graphql/              # Shopify GraphQL query definitions
│   ├── memory/               # PostgreSQL async connection pool & checkpointer (stm.py)
│   ├── models/               # LLM client (Groq), embedding client, cross-encoder client
│   ├── schemas/              # Pydantic request/response schemas (chat_schema.py)
│   ├── services/             # Shopify Storefront API operations
│   └── utils/                # Pinecone client, vector store sync & startup helpers
├── data/                     # Local data files used for vector store seeding
├── main.py                   # FastAPI app entry point, lifespan hooks, /chat endpoint
├── pyproject.toml            # Project metadata & dependencies (uv managed)
├── crontab-docker            # Cron schedule for Docker container
├── crontab.txt               # Cron schedule for Windows local development
├── Dockerfile                # Multi-stage optimized Docker image
└── docker-compose.yml        # Orchestrates Backend + PostgreSQL + Cron containers
```

---

## 🤖 LangGraph Workflow Nodes

The backend processes each chat query through an event-driven **LangGraph** workflow:

```
START
  └── clean_query
        └── decide_retrieval
              ├── [general Q&A path] → general_qa → END
              └── [product search path] → decide_followup
                    ├── [needs clarification] → ask_followup → END
                    └── [ready to search]  → extract_intent
                                                └── vector_search
                                                      └── rerank_products
                                                            └── recommend_products → END
```

| Node | Description |
|---|---|
| `clean_query` | Sanitizes and normalizes the raw user input |
| `decide_retrieval` | Routes to general Q&A or product search path |
| `general_qa` | Answers general wellness & longevity questions using RAG on blog articles |
| `decide_followup` | Determines if enough product context exists or clarification is needed |
| `ask_followup` | Asks the user a clarifying question to refine product search |
| `extract_intent` | Extracts key parameters: brand, category, symptoms, ingredients |
| `vector_search` | Cosine similarity search on the Pinecone product index |
| `rerank_products` | Cross-encoder reranking to maximize result relevance |
| `recommend_products` | Generates structured markdown response with product cards, images, variant options, and store URLs |

> [!NOTE]
> Direct Shopify cart pre-fetching and checkout URL creation has been removed to minimize recommendation latency. Product variants now link directly to the store checkout URL format (`store_url?variant=v_id`).

---

## 🗺️ Graph Flow Diagram

Generated automatically at startup from the compiled LangGraph workflow:

![LangGraph Flow Diagram](app/graph/workflow.png)

---

## 📡 API Endpoints

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
  "thread_id": "thread_abc123"   // optional — omit to start a new session
}
```

**SSE event stream format:**

| Event type | Payload | Description |
|---|---|---|
| `start` | `{ "thread_id": "..." }` | Session established; returns the thread ID |
| `status` | `{ "status": "thinking" \| "searching" }` | Typing indicator theme signal |
| `node` | `{ "node": "vector_search" }` | Current graph node executing |
| `answer` | `{ "content": "token..." }` | Streamed response token |
| `done` | _(empty)_ | Workflow complete |
| `error` | `{ "content": "error message" }` | Workflow error |

> [!TIP]
> Pass the `thread_id` returned in the `start` event back on subsequent requests to maintain conversation memory across turns.

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in this directory. Required variables:

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

# PostgreSQL (for LangGraph conversation checkpointer)
STM_DB_URI=postgresql://zupe_store:zupe123@postgres:5432/zupe_db

# CORS (comma-separated origins or * for all)
CORS_ALLOWED_ORIGINS=*
```

---

## 🚀 Running the Service

### Option 1: Docker Compose (Recommended)
Automatically provisions the backend, PostgreSQL checkpointer DB, and daily cron sync container:
```bash
docker compose up --build -d
```
Server starts at `http://localhost:8000`.

### Option 2: Local Development
Requires `uv` installed and a locally running PostgreSQL instance:
```bash
# Install dependencies into a virtual environment
uv sync

# Start the development server
uv run python main.py
# or with hot-reload:
uv run uvicorn main:app --reload --port 8000
```

---

## 🚦 Startup Sequence

On server startup the following initializations run in order:

1. **Workflow diagram** — compiles the LangGraph graph and exports `app/graph/workflow.png`
2. **PostgreSQL pool** — opens the async connection pool and sets up the checkpointer tables
3. **Embedding model** — loads the sentence-transformer embedding model into memory
4. **Cross-encoder model** — loads the reranking model into memory
5. **Pinecone index setup** — creates the index if it doesn't exist and seeds it if empty
6. **Pinecone connection** — pre-establishes the Pinecone client connection

---

## ⏰ Daily Vector Store Sync (Cron Job)

A dedicated cron job keeps the Pinecone index in sync with the Shopify catalog and wellness articles:

- **Task**: Fetches all Shopify products and blog articles → embeds them → upserts into Pinecone
- **Timing**: Daily at **6:50 PM IST** (18:50 Asia/Kolkata)
- **Docker**: Runs in a separate `cron` container defined in `docker-compose.yml`
- **Windows local**: Configured in `crontab.txt`, logs written to `Windows_cron.log`
- **Script**: `app/utils/vector_store_sync.py`
