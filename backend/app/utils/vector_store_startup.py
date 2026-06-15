import os
import sys

# Ensure project root (backend/) is in the python path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from pinecone import Pinecone, ServerlessSpec
from app.core.config import PINECONE_INDEX_NAME

def setup_vector_store():
    """
    Initializes Pinecone and makes sure the product vector index exists.
    Created as serverless index with 384 dimensions for bge-small-en-v1.5.
    """
    api_key = os.environ.get("PINECONE_API_KEY")
    if not api_key:
        print("Warning: PINECONE_API_KEY is not set in environment. Skipping vector store setup.")
        return

    # Initialize Pinecone Client
    pc = Pinecone(api_key=api_key)

    index_name = PINECONE_INDEX_NAME or "zupe"

    try:
        # Check if index already exists
        existing_indexes = pc.list_indexes()
        existing_names = [idx.name for idx in existing_indexes]
        
        target_dimension = 384  # BAAI/bge-small-en-v1.5 embedding size
        
        if index_name in existing_names:
            # Find the existing index and verify its dimension
            index_desc = next(idx for idx in existing_indexes if idx.name == index_name)
            if index_desc.dimension != target_dimension:
                print(f"Dimension mismatch: Index '{index_name}' has dimension {index_desc.dimension}, but model expects {target_dimension}.")
                print(f"Deleting existing index '{index_name}' to recreate with correct dimension...")
                pc.delete_index(index_name)
                
                # Wait for deletion to complete (Pinecone takes a few seconds)
                import time
                while index_name in [idx.name for idx in pc.list_indexes()]:
                    print("Waiting for index deletion to complete...")
                    time.sleep(2)
                print("Index deleted successfully.")
                existing_names.remove(index_name)

        if index_name not in existing_names:
            print(f"Creating serverless Pinecone index '{index_name}' (dim={target_dimension}, metric=cosine)...")
            pc.create_index(
                name=index_name,
                dimension=target_dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"  # Default AWS free/serverless region
                )
            )
            # Wait for creation to complete
            import time
            while not pc.describe_index(index_name).status.ready:
                print("Waiting for index to become ready...")
                time.sleep(2)
            print(f"Pinecone index '{index_name}' created and ready successfully.")
        else:
            print(f"Pinecone index '{index_name}' already exists with correct dimension {target_dimension}.")

        # Check if index is empty
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        total_vectors = getattr(stats, "total_vector_count", 0)
        if hasattr(stats, "total_vector_count"):
            total_vectors = stats.total_vector_count
        elif isinstance(stats, dict) and "total_vector_count" in stats:
            total_vectors = stats["total_vector_count"]
            
        if total_vectors == 0:
            print("Index is empty. Triggering initial product synchronization...")
            from app.utils.vector_store_sync import sync_products
            sync_products()
    except Exception as e:
        print(f"Error during Pinecone vector store setup: {e}")

if __name__ == "__main__":
    setup_vector_store()
