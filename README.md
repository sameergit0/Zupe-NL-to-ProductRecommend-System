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

For a detailed step-by-step walkthrough on how to transition the Chatbot Widget (Iframe) and FastAPI Backend from localhost to your production servers, please refer to the **[Deployment Guide](./deployment_guide.txt)**.


