from langchain_huggingface import HuggingFaceEmbeddings
from ..core.config import HUGGINGFACE_EMBEDDING_MODEL, MODEL_KWARGS, ENCODE_KWARGS
from dotenv import load_dotenv

load_dotenv()

class EmbeddingModelProxy:
    def __init__(self):
        self._model = None

    def _get_active_model(self) -> HuggingFaceEmbeddings:
        if self._model is None:
            self._model = HuggingFaceEmbeddings(
                model_name=HUGGINGFACE_EMBEDDING_MODEL,
                model_kwargs=MODEL_KWARGS,
                encode_kwargs=ENCODE_KWARGS 
            )
        return self._model

    def embed_query(self, text: str):
        return self._get_active_model().embed_query(text)

    def embed_documents(self, texts: list[str]):
        return self._get_active_model().embed_documents(texts)

# Instantiated once at module import time
embedding_model = EmbeddingModelProxy()

def get_embedding_model() -> EmbeddingModelProxy:
    # Trigger model loading/caching
    embedding_model._get_active_model()
    return embedding_model