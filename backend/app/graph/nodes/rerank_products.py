from ..state import StoreState
from ...utils.intent_utils import normalize_intent
from app.models.cross_encoder_client import get_cross_encoder_model

async def rerank_products_node(state: StoreState):
    """
    Reranks the retrieved products in state using HuggingFaceCrossEncoder.
    Reorders state["products"] based on cross encoder semantic similarity scores.
    """
    products = state.get("products", [])
    if not products:
        print("[Reranker Node] No products found to rerank.")
        return {"reranked_products": []}

    # Extract user query
    intent = state.get("intent_analysis", {})
    query = normalize_intent(intent) or state.get("cleaned_query", "") or state.get("user_query", "")

    if not query:
        print("[Reranker Node] No query context found. Skipping reranking.")
        return {"reranked_products": products}

    # Prepare text pairs for scoring: (query, document content)
    text_pairs = []
    for doc in products:
        text_pairs.append((query, doc.page_content))

    try:
        # Score pairs using preloaded cross encoder
        encoder = get_cross_encoder_model()
        scores = encoder.score(text_pairs)
        
        # Attach score to document metadata and collect scored documents
        scored_products = []
        for doc, score in zip(products, scores):
            doc.metadata["cross_encoder_score"] = float(score)
            scored_products.append((float(score), doc))

        # Sort descending by cross encoder score
        scored_products.sort(key=lambda x: x[0], reverse=True)

        reranked_products = [doc for _, doc in scored_products]

        return {
            "reranked_products": reranked_products
        }

    except Exception as e:
        print(f"[Reranker Node] Error during reranking: {e}. Falling back to original Pinecone results.")
        return {"reranked_products": products}
