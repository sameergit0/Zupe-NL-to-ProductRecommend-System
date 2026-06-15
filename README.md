# 🍃 Zupe - Natural Language to Product Recommendation System

Welcome to **Zupe**, a full-stack personalized wellness guide and product recommendation assistant integrated with Shopify. This project is structured as a monorepo consisting of a FastAPI backend service and a standalone React chat widget frontend.

---

## 🌳 Project Structure

The workspace is organized into two main components:

*   📂 **[backend](./backend)**: A high-performance **FastAPI** service powered by a custom **LangGraph** chatbot agent that handles context retrieval (RAG) using Pinecone, conversational history checkpointers in PostgreSQL, and Shopify storefront integrations.
*   📂 **[frontend](./frontend)**: A glassmorphic, standalone **Vite + React + TypeScript** chatbot widget designed to be embedded into any Shopify theme or custom web environment.

---

## 🚀 Quick Start Guide

To get the entire stack running locally, follow the steps below.

### 1. Prerequisites
Ensure you have the following installed on your system:
*   [Node.js](https://nodejs.org/) (for the frontend widget)
*   [uv](https://github.com/astral-sh/uv) (blazing-fast Python package manager)
*   [Docker](https://www.docker.com/) (optional, for running with compose)

---

### 2. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Initialize the environment and sync packages using `uv`:
    ```bash
    uv sync
    ```
3.  Configure your environment variables in `backend/.env` (use `backend/.env.example` as a template):
    ```env
    GROQ_API_KEY=gsk_...
    PINECONE_API_KEY=pcsk_...
    PINECONE_INDEX_NAME=zupe
    SHOPIFY_ENDPOINT=https://zupe-stage.myshopify.com/api/2024-01/graphql.json
    SHOPIFY_STOREFRONT_ACCESS_TOKEN=...
    STM_DB_URI=postgresql://zupe_store:zupe123@postgres:5432/zupe_db
    ```
4.  Start the development server:
    ```bash
    uv run uvicorn main:app --reload --port 8000
    ```

---

### 3. Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the Vite development server:
    ```bash
    npm run dev
    ```
    The application will typically start running at `http://localhost:5173`.

---

## 🛠️ Tech Stack Overview

### Backend
*   **FastAPI & Uvicorn**: High-performance HTTP application framework.
*   **LangGraph**: Stateful agent/workflow orchestrator.
*   **Pinecone**: Managed vector database.
*   **PostgreSQL**: Connection pool providing persistent conversational session checkpointers.
*   **Groq (LLM)** & **Sentence Transformers (Embeddings)**.

### Frontend
*   **React & TypeScript**: Interactive component-based UI.
*   **Vite**: Fast dev server and build tool.
*   **Vanilla CSS**: Glassmorphic elements, modern gradients, and micro-animations.

---

## 🌐 Production Deployment Guide

This section outlines the configurations required to transition the chatbot widget and FastAPI backend from a local environment to production servers.

### 1. FastAPI Backend Configuration
*   **File**: [backend/.env](./backend/.env)
    *   **Database Connection**: Update `STM_DB_URI` to point to your production PostgreSQL instance (e.g., `postgresql://user:password@prod-db-host:5432/zupe_db`).
    *   **CORS Configuration**: Change `CORS_ALLOWED_ORIGINS` to contain your production storefront URL and deployed widget URL instead of local hosts (e.g., `CORS_ALLOWED_ORIGINS=https://yourstore.com,https://widget.yourdomain.com`).

### 2. Standalone Chatbot Widget Code
*   **File**: [chatService.ts](./frontend/src/services/chatService.ts)
    *   **API Base URL**: Update `API_BASE_URL` to point to your deployed FastAPI backend URL, or define `VITE_API_URL` in your hosting service's environment variables (e.g., `https://api.yourdomain.com`).

### 3. Chatbot Widget Loader Script (Storefront Embedding)
*   **File**: [widget.js](./frontend/public/widget.js)
    *   **Widget Origin**: Update `widgetOrigin` variable (around line 4) to match the URL where the frontend widget is deployed (e.g., `https://widget.yourdomain.com`).
    *   **Origin Security**: (Optional) For production environments, consider removing local testing exclusions in the message event listener (around line 110) to only accept events from your production widget origin.

### 4. Embedding Code on Client Storefront HTML
*   To load the widget on your live store frontends, inject the widget loader script before the closing `</body>` tag (e.g. in your Shopify theme's `theme.liquid` layout):
    ```html
    <script src="https://widget.yourdomain.com/widget.js" defer></script>
    ```

