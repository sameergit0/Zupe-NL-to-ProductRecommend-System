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
from app.services.shopify import ShopifyStorefrontClient
from app.models.embedding_client import get_embedding_model

def get_semantic_text(product: dict) -> str:
    """
    Compiles product fields into a clean text block for embedding.
    """
    title = product.get("title", "")
    vendor = product.get("vendor", "")
    product_type = product.get("productType", "")
    
    # Extract category name
    category_name = ""
    category_obj = product.get("category")
    if isinstance(category_obj, dict):
        category_name = category_obj.get("name", "")
        
    # Extract collections
    collections_list = []
    collections_obj = product.get("collections")
    if isinstance(collections_obj, dict):
        nodes = collections_obj.get("nodes", [])
        for node in nodes:
            title_val = node.get("title", "")
            if title_val:
                collections_list.append(title_val)
    collections_str = ", ".join(collections_list)
    
    # Extract tags
    tags_str = ", ".join(product.get("tags", []))
    
    # Extract options and their values
    options_list = []
    options_obj = product.get("options", [])
    for o in options_obj:
        if isinstance(o, dict):
            name = o.get("name", "")
            vals = o.get("optionValues", [])
            val_strings = []
            for val in vals:
                if isinstance(val, dict):
                    val_strings.append(val.get("name", ""))
                else:
                    val_strings.append(str(val))
            if name and val_strings:
                options_list.append(f"{name}: {', '.join(val_strings)}")
    options_str = "; ".join(options_list)
    
    description = product.get("description", "")
    
    text = (
        f"Title: {title}\n"
        f"Vendor: {vendor}\n"
        f"Type: {product_type}\n"
        f"Category: {category_name}\n"
        f"Collections: {collections_str}\n"
        f"Tags: {tags_str}\n"
        f"Options: {options_str}\n"
        f"Description: {description}"
    )
    return text

def get_metadata(product: dict) -> dict:
    """
    Creates the metadata dictionary to store in Pinecone.
    """
    # Extract category
    category_name = ""
    category_obj = product.get("category")
    if isinstance(category_obj, dict):
        category_name = category_obj.get("name", "")

    # Extract collections (handles)
    collections_handles = []
    collections_obj = product.get("collections")
    if isinstance(collections_obj, dict):
        nodes = collections_obj.get("nodes", [])
        for node in nodes:
            handle = node.get("handle", "")
            if handle:
                collections_handles.append(handle)

    # Extract price
    price = 0.0
    currency = "HKD"
    price_range = product.get("priceRange", {})
    min_price_obj = price_range.get("minVariantPrice", {})
    if min_price_obj:
        try:
            price = float(min_price_obj.get("amount", 0.0))
            currency = min_price_obj.get("currencyCode", "HKD")
        except ValueError:
            pass

    # Extract featured image
    image_url = ""
    featured_img = product.get("featuredImage")
    if isinstance(featured_img, dict):
        image_url = featured_img.get("url", "")

    # Extract variants and serialize them
    variants_list = []
    variants_nodes = product.get("variants", {}).get("nodes", [])
    for var in variants_nodes:
        if isinstance(var, dict):
            v_id = var.get("id", "").split("/")[-1]
            v_title = var.get("title", "")
            v_sku = var.get("sku", "")
            
            price_obj = var.get("price")
            v_price = "0.0"
            if isinstance(price_obj, dict):
                v_price = price_obj.get("amount", "0.0")
            elif price_obj is not None:
                v_price = str(price_obj)
                
            v_available = bool(var.get("availableForSale", True))
            variants_list.append({
                "id": v_id,
                "title": v_title,
                "sku": v_sku,
                "price": v_price,
                "available": v_available
            })

    # Extract options and their values
    options_list = []
    options_obj = product.get("options", [])
    for o in options_obj:
        if isinstance(o, dict):
            name = o.get("name", "")
            vals = o.get("optionValues", [])
            val_strings = []
            for val in vals:
                if isinstance(val, dict):
                    val_strings.append(val.get("name", ""))
                else:
                    val_strings.append(str(val))
            if name and val_strings:
                options_list.append(f"{name}: {', '.join(val_strings)}")
    options_str = "; ".join(options_list)

    metadata = {
        "id": product.get("id", ""),
        "title": product.get("title", ""),
        "handle": product.get("handle", ""),
        "vendor": product.get("vendor", ""),
        "productType": product.get("productType", ""),
        "category": category_name,
        "collections": collections_handles,
        "tags": product.get("tags", []),
        "options": options_str,
        "description": product.get("description", ""),
        "price": price,
        "currency": currency,
        "imageUrl": image_url,
        "onlineStoreUrl": product.get("onlineStoreUrl", ""),
        "updatedAt": product.get("updatedAt", ""),
        "availableForSale": bool(product.get("availableForSale", True)),
        "variants": json.dumps(variants_list)
    }
    return metadata

def sync_products():
    """
    Synchronizes Shopify storefront products incrementally to Pinecone.
    """
    api_key = os.environ.get("PINECONE_API_KEY")
    if not api_key:
        print("Error: PINECONE_API_KEY is not set. Cannot run sync.")
        return

    index_name = PINECONE_INDEX_NAME or "zupe"
    pc = Pinecone(api_key=api_key)
    
    # Verify index exists
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    if index_name not in existing_indexes:
        print("Index does not exist. Running startup script to recreate index...")
        from app.utils.vector_store_startup import setup_vector_store
        setup_vector_store()
        return
        
    index = pc.Index(index_name)

    # 1. Fetch live products from Shopify storefront
    print("Fetching live products from Shopify storefront API...")
    shopify_client = ShopifyStorefrontClient()
    live_products = shopify_client.fetch_all_products()
    print(f"Fetched {len(live_products)} products from Shopify.")

    live_ids = {p["id"] for p in live_products}

    # 2. Deletions check (prune stale products)
    print("Listing existing product IDs in Pinecone...")
    pinecone_ids = []
    try:
        for ids_batch in index.list(namespace=""):
            pinecone_ids.extend([item.id for item in ids_batch])
        print(f"Found {len(pinecone_ids)} products in Pinecone index.")
    except Exception as e:
        print(f"Warning: Could not list Pinecone IDs: {e}")

    product_pinecone_ids = [pid for pid in pinecone_ids if not pid.startswith("article-")]
    deleted_ids = list(set(product_pinecone_ids) - live_ids)
    if deleted_ids:
        print(f"Deleting {len(deleted_ids)} stale products from Pinecone...")
        for i in range(0, len(deleted_ids), 100):
            batch = deleted_ids[i:i+100]
            index.delete(ids=batch)
        print("Deletions completed successfully.")
    else:
        print("No stale products to delete.")

    # 3. Updates and Insertions check (incremental sync)
    print("Fetching existing vector metadata from Pinecone...")
    pinecone_metadata = {}
    live_products_list = list(live_products)
    
    for i in range(0, len(live_products_list), 100):
        batch = live_products_list[i:i+100]
        batch_ids = [p["id"] for p in batch]
        try:
            fetch_response = index.fetch(ids=batch_ids)
            vectors = fetch_response.get("vectors", {})
            for vid, vdata in vectors.items():
                meta = vdata.get("metadata", {})
                pinecone_metadata[vid] = meta
        except Exception as e:
            print(f"Error fetching metadata for batch: {e}")

    to_upsert = []
    for product in live_products_list:
        pid = product["id"]
        shopify_updated = product.get("updatedAt", "")
        
        # If product doesn't exist in Pinecone, or Shopify updatedAt is newer
        pinecone_updated = ""
        if pid in pinecone_metadata:
            pinecone_updated = pinecone_metadata[pid].get("updatedAt", "")
            
        # Update if it doesn't exist, if Shopify updatedAt is newer, or if it doesn't have "variants", "description", or "options" in Pinecone metadata
        if (not pinecone_updated 
            or shopify_updated > pinecone_updated 
            or (pid in pinecone_metadata and "variants" not in pinecone_metadata[pid])
            or (pid in pinecone_metadata and "description" not in pinecone_metadata[pid])
            or (pid in pinecone_metadata and "options" not in pinecone_metadata[pid])):
            to_upsert.append(product)

    print(f"Found {len(to_upsert)} products requiring update or insertion.")

    # 4. Generate embeddings and upsert
    if to_upsert:
        print(f"Loading embedding model BAAI/bge-small-en-v1.5...")
        model = get_embedding_model()
        
        print(f"Embedding and upserting {len(to_upsert)} products in batches of 100...")
        for i in range(0, len(to_upsert), 100):
            batch = to_upsert[i:i+100]
            texts = [get_semantic_text(p) for p in batch]
            
            # Embed documents
            embeddings = model.embed_documents(texts)
            
            # Prepare vectors payload
            vectors = []
            for product, emb in zip(batch, embeddings):
                vectors.append({
                    "id": product["id"],
                    "values": emb,
                    "metadata": get_metadata(product)
                })
                
            # Upsert into Pinecone
            index.upsert(vectors=vectors)
            print(f"Upserted batch {i // 100 + 1}/{(len(to_upsert) - 1) // 100 + 1}")
        print("Vector sync completed successfully!")
    else:
        print("All products are already up to date in Pinecone.")

    # Trigger knowledge base sync automatically
    print("\nStarting knowledge base sync...")
    try:
        from app.utils.knowledge_store_sync import sync_knowledge
        sync_knowledge()
    except Exception as e:
        print(f"Warning: Failed to run knowledge base sync: {e}")

if __name__ == "__main__":
    sync_products()
