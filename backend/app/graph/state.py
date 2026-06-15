from typing import TypedDict, List, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class StoreState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]

    user_query: str

    cleaned_query: str

    needs_retrieval: bool

    needs_followup: bool

    followup_count: int

    intent_analysis: dict
    
    products: list
    
    reranked_products: list
    
    final_answer: str