import os
import json
from langchain_core.documents import Document

from ..state import StoreState
from ...utils.intent_utils import normalize_intent
from app.models.embedding_client import get_embedding_model
from app.utils.pinecone_client import get_index

async def vector_search_node(state: StoreState):
    """
    Retrieves matching products from Pinecone vector store using the normalized_intent.
    Returns up to 20 products formatted as langchain_core.documents.Document objects.
    """
    intent = state.get("intent_analysis", {})
    normalized_intent = normalize_intent(intent)

    # Access model from pre-loaded global variable in the module, or fallback if not initialized yet
    model = get_embedding_model()

    query_vector = model.embed_query(normalized_intent)
    
    products = []
                
    index = get_index()
    results = index.query(vector=query_vector, top_k=10, include_metadata=True)
                
    filtered_count = 0
    for match in results.get("matches", []):
        metadata = match.get("metadata", {})
        
        # Ignore articles in the product search flow
        if metadata.get("dataType") == "article":
            continue
                    
        # Filter out out-of-stock products
        available_for_sale = metadata.get("availableForSale", True)
        if isinstance(available_for_sale, str):
            available_for_sale = available_for_sale.lower() == "true"
        
        if not available_for_sale:
            filtered_count += 1
            continue

        p_title = metadata.get("title", "")
        p_vendor = metadata.get("vendor", "")
        p_type = metadata.get("productType", "")
        p_category = metadata.get("category", "")
        p_desc = metadata.get("description", "")
                    
        # Reconstruct semantic page content containing only the fields required for the final answer
        page_content = (
            f"Title: {p_title}\n"
            f"Vendor: {p_vendor}\n"
            f"Type: {p_type}\n"
            f"Category: {p_category}\n"
            f"Description: {p_desc}"
        )
                    
        # Parse variants metadata
        variants_raw = metadata.get("variants", "[]")
        try:
            variants = json.loads(variants_raw)
        except Exception:
            variants = []
                        
        doc_metadata = {
            "title": p_title,
            "handle": metadata.get("handle", ""),
            "vendor": p_vendor,
            "productType": p_type,
            "category": p_category,
            "collections": metadata.get("collections", []),
            "tags": metadata.get("tags", []),
            "price": metadata.get("price", 0.0),
            "currency": metadata.get("currency"),
            "imageUrl": metadata.get("imageUrl", ""),
            "onlineStoreUrl": metadata.get("onlineStoreUrl", ""),
            "availableForSale": available_for_sale,
            "variants": variants,
            "score": match.get("score", 0.0)
        }
        
        products.append(Document(page_content=page_content, metadata=doc_metadata, id=match.get("id")))

    if filtered_count > 0:
        print(f"[Vector Search] Filtered {filtered_count} out-of-stock products", flush=True)

    return {
        "products": products
    }