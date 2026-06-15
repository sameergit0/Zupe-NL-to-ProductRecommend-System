from .state import StoreState
from typing import Literal

def decide_retrieval_router(state: StoreState) -> Literal["generate_direct", "search_required"]:
    """
    Routes the flow based on whether retrieval is needed.
    """
    if state['needs_retrieval']:
        return "search_required"
    else:
        return "generate_direct"


def decide_followup_router(state: StoreState) -> Literal["followup_required", "no_followup_required"]:
    """
    Routes the flow based on whether a followup question is needed.
    """
    if state['needs_followup']:
        return "followup_required"
    else:
        return "no_followup_required"