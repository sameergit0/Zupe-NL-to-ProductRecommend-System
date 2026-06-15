from typing import Any, Dict, List, Union

def format_intent_filters(filter_data: Union[Dict[str, Any], str, None], prefix: str = "") -> List[str]:
    """
    Formats a filter dictionary or string into a list of formatted filter strings.
    Handles list values by joining them with commas and skips empty/None values.
    """
    parts = []
    if not filter_data:
        return parts

    if isinstance(filter_data, dict):
        for k, v in filter_data.items():
            if v:  # Skip empty values or None
                # Join lists into comma-separated strings (e.g., ["A", "B"] -> "A, B")
                val_str = ", ".join(map(str, v)) if isinstance(v, list) else str(v)
                parts.append(f"{prefix}{k}: {val_str}")
    else:
        parts.append(f"{prefix}{filter_data}")

    return parts


def normalize_intent(intent: dict) -> str:
    """
    Normalizes the intent dictionary into a single query string.
    """
    parts = []

    # 1. Add the main search query
    semantic_query = intent.get("semantic_query")
    if semantic_query:
        parts.append(str(semantic_query))

    # 2. Process all the filters using the helper
    parts.extend(format_intent_filters(intent.get("hard_filters")))
    parts.extend(format_intent_filters(intent.get("soft_preferences")))
    parts.extend(format_intent_filters(intent.get("excluded_filters"), prefix="exclude"))

    # 3. Deduplicate and join with " | "
    unique_parts = list(dict.fromkeys(parts))
    normalized_text = " | ".join(unique_parts).strip()
    
    return normalized_text

