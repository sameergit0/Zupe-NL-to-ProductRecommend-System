import os
import torch
from dotenv import load_dotenv

load_dotenv()

# Shopify API Configuration
SHOPIFY_BASE_URL = os.environ.get("SHOPIFY_BASE_URL")
SHOPIFY_STOREFRONT_ACCESS_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN")
SHOPIFY_API_VERSION = os.environ.get("SHOPIFY_API_VERSION", "2026-01")

# Construct API Endpoint
SHOPIFY_ENDPOINT = f"{SHOPIFY_BASE_URL.rstrip('/')}/api/{SHOPIFY_API_VERSION}/graphql.json"

# LLM Model Name
GROQ_LLM_MODEL = os.environ.get("GROQ_LLM_MODEL")

# Embedding Model Name
HUGGINGFACE_EMBEDDING_MODEL = os.environ.get("HUGGINGFACE_EMBEDDING_MODEL")
HUGGINGFACE_CROSS_ENCODER_MODEL = os.environ.get("HUGGINGFACE_CROSS_ENCODER_MODEL")
MODEL_KWARGS = {'device': 'cuda'} if torch.cuda.is_available() else {'device': 'cpu'}
ENCODE_KWARGS = {'normalize_embeddings': True}

# Vector DB Index 
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME")