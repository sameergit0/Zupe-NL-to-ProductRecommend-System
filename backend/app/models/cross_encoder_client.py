from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from ..core.config import HUGGINGFACE_CROSS_ENCODER_MODEL, MODEL_KWARGS

class CrossEncoderModelProxy:
    def __init__(self):
        self._model = None

    def _get_active_model(self) -> HuggingFaceCrossEncoder:
        if self._model is None:
            model_name = HUGGINGFACE_CROSS_ENCODER_MODEL or "BAAI/bge-reranker-base"
            self._model = HuggingFaceCrossEncoder(
                model_name=model_name,
                model_kwargs=MODEL_KWARGS
            )
        return self._model

    def score(self, text_pairs: list) -> list:
        return self._get_active_model().score(text_pairs)

# Instantiated once at module import time
cross_encoder_model = CrossEncoderModelProxy()

def get_cross_encoder_model() -> CrossEncoderModelProxy:
    # Trigger model loading/caching
    cross_encoder_model._get_active_model()
    return cross_encoder_model
