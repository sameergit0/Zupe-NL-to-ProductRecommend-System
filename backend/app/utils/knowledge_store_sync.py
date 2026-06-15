import os
import sys
import json
from dotenv import load_dotenv

# Ensure project root (backend/) is in the python path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

load_dotenv()

from pinecone import Pinecone
from app.core.config import PINECONE_INDEX_NAME
from app.models.embedding_client import get_embedding_model

def chunk_text(text: str, max_chars: int = 800, overlap: int = 100) -> list:
    if len(text) <= max_chars:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunks.append(text[start:end])
        start += max_chars - overlap
    return chunks

def sync_knowledge():
    """
    Synchronizes local wellness knowledge articles to Pinecone index.
    """
    api_key = os.environ.get("PINECONE_API_KEY")
    if not api_key:
        print("Error: PINECONE_API_KEY is not set. Cannot run knowledge sync.")
        return

    index_name = PINECONE_INDEX_NAME or "zupe"
    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    # Load local articles from Python data module
    from app.utils.knowledge_data import KNOWLEDGE_ARTICLES
    articles = KNOWLEDGE_ARTICLES

    print(f"Loaded {len(articles)} knowledge articles from Python dataset.")
    model = get_embedding_model()

    to_upsert = []
    for article in articles:
        content = article.get("content", "")
        chunks = chunk_text(content)
        print(f"Article '{article['title']}' split into {len(chunks)} chunk(s).")

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{article['id']}-chunk-{idx}"
            
            # Embed chunk text
            vector = model.embed_query(chunk)

            metadata = {
                "dataType": "article",
                "id": chunk_id,
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "description": chunk,
                "category": "article"
            }

            to_upsert.append({
                "id": chunk_id,
                "values": vector,
                "metadata": metadata
            })

    if to_upsert:
        print(f"Upserting {len(to_upsert)} article chunk(s) to Pinecone...")
        index.upsert(vectors=to_upsert)
        print("Knowledge base sync completed successfully!")
    else:
        print("No articles to sync.")

if __name__ == "__main__":
    sync_knowledge()
