import os
import uvicorn
import uuid
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.graph.workflow import get_workflow
from app.schemas.chat_schema import ChatRequest
from app.memory.stm import pool, get_checkpointer
from app.models import embedding_client
from app.utils.vector_store_startup import setup_vector_store
from app.utils.pinecone_client import initialize_index
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Generate workflow diagram
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        png_path = os.path.join(current_dir, "app", "graph", "workflow.png")
        with open(png_path, "wb") as f:
            f.write(get_workflow().get_graph().draw_mermaid_png())
        print(f"Workflow diagram generated successfully at startup: {png_path}")
    except Exception as e:
        print(f"Warning: Failed to generate workflow.png on startup: {e}")

    # database connection pool
    print("Opening database connection pool...")
    await pool.open()
    await get_checkpointer().setup()
    print("Database connection pool and checkpointer setup complete")

    # Load embedding model on startup
    print("Loading embedding model...")
    embedding_client.get_embedding_model()
    print("Embedding model loaded")

    # Load cross encoder model on startup
    print("Loading cross encoder model...")
    from app.models.cross_encoder_client import get_cross_encoder_model
    get_cross_encoder_model()
    print("Cross encoder model loaded")

    # Setup Pinecone Vector Store Index
    print("Setting up Pinecone index...")
    setup_vector_store()
    print("Pinecone setup complete")

    # Safely pre-establish Pinecone index connection in lifespan
    try:
        print("Pre-establishing Pinecone connection...")
        initialize_index()
        print("Pinecone connection pre-established successfully.")
    except Exception as e:
        print(f"Warning: Failed to pre-establish Pinecone connection in lifespan: {e}")


    yield

    print("App shutting down")

    # Close database connection pool on shutdown
    print("Closing database connection pool...")
    await pool.close()
    print("Database connection pool closed")

app = FastAPI(
    title="Zupe Backend API",
    description="Backend API for Zupe powered by LangGraph workflows.",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS Middleware (auto-reloads on .env update)
cors_allowed = os.getenv("CORS_ALLOWED_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_allowed.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
async def home():
    return {"message": "Welcome to the Zupe Backend API!"}

@app.post("/chat")
async def run_query(chat_request: ChatRequest):
    # 1. Generate a new thread ID if not provided by the client
    thread_id = chat_request.thread_id
    if not thread_id:
        thread_id = f"thread_{uuid.uuid4().hex}"

    # 2. Define the LangGraph thread configuration
    config = {"configurable": {"thread_id": thread_id}}
    initial_state = {"user_query": chat_request.query}

    async def event_generator():
        yield f'data: {json.dumps({"type": "start", "thread_id": thread_id})}\n\n'
        yield f'data: {json.dumps({"type": "status", "status": "thinking"})}\n\n'
        
        seen_nodes = set()
        try:
            workflow = get_workflow()
            async for event in workflow.astream_events(initial_state, config=config, version="v2"):
                kind = event.get("event")
                name = event.get("name")
                node_name = event.get("metadata", {}).get("langgraph_node")

                # Send the executing node to the frontend
                if kind == "on_chain_start" and node_name:
                    if node_name not in seen_nodes:
                        seen_nodes.add(node_name)
                        print(node_name, flush=True)
                        yield f'data: {json.dumps({"type": "node", "node": node_name})}\n\n'

                # Update status dynamically based on decide_retrieval's decision
                elif kind == "on_chain_end" and node_name == "decide_retrieval":
                    # Keep status as thinking since we must run decide_followup next
                    yield f'data: {json.dumps({"type": "status", "status": "thinking"})}\n\n'

                # Update status dynamically based on decide_followup's decision
                elif kind == "on_chain_end" and node_name == "decide_followup":
                    output = event["data"].get("output", {})
                    needs_followup = output.get("needs_followup", False) if isinstance(output, dict) else False
                    status = "thinking" if needs_followup else "searching"
                    yield f'data: {json.dumps({"type": "status", "status": status})}\n\n'

                # Stream answer tokens from the final chat model nodes
                elif kind == "on_chat_model_stream" and node_name in ("general_qa", "ask_followup", "recommend_products"):
                    content = event["data"]["chunk"].content
                    if content:
                        yield f'data: {json.dumps({"type": "answer", "content": content})}\n\n'

                # Done event at the end
                elif kind == "on_chain_end" and name == "LangGraph":
                    yield f'data: {json.dumps({"type": "done"})}\n\n'
        except asyncio.CancelledError:
            print(f"[Chat API]: Connection cancelled/aborted for thread {thread_id}", flush=True)
            raise
        except Exception as e:
            print(f"[Error in Graph Stream]: {e}", flush=True)
            error_payload = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)