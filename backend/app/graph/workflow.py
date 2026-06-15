from .state import StoreState
from ..memory.stm import get_checkpointer
from .nodes.clean_query import clean_query_node
from .nodes.decide_retrieval import decide_retrieval_node
from .nodes.general_qa import general_qa_node
from .nodes.decide_followup import decide_followup_node
from .nodes.ask_followup import ask_followup_node
from .nodes.extract_intent import extract_intent_node
from .nodes.vector_search import vector_search_node
from .nodes.rerank_products import rerank_products_node
from .nodes.recommend_products import recommend_products_node
from .routers import decide_retrieval_router, decide_followup_router
from langgraph.graph import StateGraph, START, END

# 1. Initialize the graph
graph = StateGraph(state_schema=StoreState)

# 2. Add Nodes
graph.add_node("clean_query", clean_query_node)
graph.add_node("decide_retrieval", decide_retrieval_node)
graph.add_node("general_qa", general_qa_node)
graph.add_node("decide_followup", decide_followup_node)
graph.add_node("ask_followup", ask_followup_node)
graph.add_node("extract_intent", extract_intent_node)
graph.add_node("vector_search", vector_search_node)
graph.add_node("rerank_products", rerank_products_node)
graph.add_node("recommend_products", recommend_products_node)

# 3. Define Edges (Workflow Flow)
graph.add_edge(START, "clean_query")
graph.add_edge("clean_query", "decide_retrieval")
graph.add_conditional_edges(
    "decide_retrieval",
    decide_retrieval_router,
    {
        "generate_direct": "general_qa",
        "search_required": "decide_followup"
    }
)
graph.add_conditional_edges(
    "decide_followup",
    decide_followup_router,
    {
        "followup_required": "ask_followup",
        "no_followup_required": "extract_intent"
    }
)
graph.add_edge("extract_intent", "vector_search")
graph.add_edge("vector_search", "rerank_products")
graph.add_edge("rerank_products", "recommend_products")
graph.add_edge("recommend_products", END)

graph.add_edge("general_qa", END)
graph.add_edge("ask_followup", END)

_workflow = None

def get_workflow():
    global _workflow
    if _workflow is None:
        _workflow = graph.compile(checkpointer=get_checkpointer())
    return _workflow