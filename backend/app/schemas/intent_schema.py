from typing import Dict, Any
from pydantic import BaseModel, Field

class SearchIntent(BaseModel):
    semantic_query: str = Field(
        default="", 
        description="A single text string representing the key search terms or product descriptions to look up (e.g. 'protein bar', 'zinc liquid'). MUST be a string, NEVER a list/array."
    )
    hard_filters: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Attributes that the products must match (e.g., brand, category, dietary restrictions). MUST be a JSON object/dictionary, NEVER a list/array."
    )
    soft_preferences: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Preferences or nice-to-have features (e.g., flavor, target benefit, budget/price range). MUST be a JSON object/dictionary, NEVER a list/array."
    )
    excluded_filters: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Attributes, ingredients, or features to explicitly exclude (e.g., no sugar, no caffeine). MUST be a JSON object/dictionary, NEVER a list/array."
    )


