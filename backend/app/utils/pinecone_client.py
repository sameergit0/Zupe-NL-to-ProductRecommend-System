import os
from pinecone import Pinecone
from app.core.config import PINECONE_INDEX_NAME

_index = None

def initialize_index():
    """
    Establish connection to the Pinecone index at startup (lifespan).
    """
    global _index
    if _index is None:
        api_key = os.environ.get("PINECONE_API_KEY")
        if not api_key:
            print("Warning: PINECONE_API_KEY is not set. Skipping pre-establishment.")
            return None
        index_name = PINECONE_INDEX_NAME or "zupe"
        pc = Pinecone(api_key=api_key)
        _index = pc.Index(index_name)
    return _index

def get_index():
    """
    Getter function to retrieve the established Pinecone index.
    Fallback to lazy-initialization if not initialized yet.
    """
    global _index
    if _index is None:
        initialize_index()
    return _index
