from ..state import StoreState
from langchain_core.messages import HumanMessage
import re

def clean_query_node(state: StoreState):
    """
    Cleans and normalizes the user query.
    """
    user_query = state['user_query']

    cleaned_query = user_query.lower()
    cleaned_query = re.sub(r"[^a-z0-9\s\-\?]", "", cleaned_query)
    cleaned_query = re.sub(r"\s+", " ", cleaned_query).strip()

    return {"cleaned_query": cleaned_query, "messages": [HumanMessage(content=cleaned_query)]}