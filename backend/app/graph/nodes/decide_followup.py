from ..state import StoreState
from ...models.llm_client import llm
from langchain_core.prompts import ChatPromptTemplate
from ...utils.chat_utils import format_chat_history


prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are the classification assistant for Zupe Sage, the wellness and longevity advisor.\n"
        "Your goal is to analyze the conversation and determine if we now have enough specific details (goals, product types, dietary restrictions, or preferences) to search the product catalog effectively, or if we still need to ask a second clarifying question.\n\n"
        "Answer 'no' (we do NOT need another follow-up, proceed to search directly) if:\n"
        "1. The user has now provided specific details (e.g., brand, flavor, ingredient, dietary restriction like vegan/gluten-free, price range, or target use case).\n"
        "2. The user has answered our first clarifying question and narrowed down their need sufficiently.\n"
        "3. The combined context of the query and history is specific enough to run an effective search.\n\n"
        "Answer 'yes' (we need to ask a second follow-up question) if:\n"
        "1. The user's response to our first clarifying question is still extremely broad or vague (e.g., they just said 'anything is fine' or 'show products' without clarifying their preferences when asked).\n"
        "2. The query and history describe only a vague goal without any narrowing criteria (e.g., just 'I want to be healthy').\n\n"
        "IMPORTANT: We only ask a maximum of 2 clarifying questions. If the context is specific enough after 1 question, respond 'no'.\n"
        "Respond strictly with either 'yes' or 'no'."
    ),
    (
        "human",
        "Latest User Query: {query}\n\nChat History:\n{messages}"
    )
])


async def decide_followup_node(state: StoreState):
    """
    Decide if a followup question is needed.
    """
    followup_count = state.get("followup_count", 0)

    # 1. If we haven't asked any follow-up questions yet, always force at least one clarifying question.
    if followup_count == 0:
        return {"needs_followup": True}

    # 2. If we've already asked 2 or more clarifying questions, stop asking and proceed to search.
    if followup_count >= 2:
        return {"needs_followup": False}

    # 3. If we've asked exactly 1 clarifying question, use the classifier LLM to see if we need a second one.
    user_query = state["cleaned_query"]
    num_history = (followup_count * 2) + 1
    messages = state["messages"][-(num_history + 1):-1]

    formatted_prompt = prompt.format_messages(
        query=user_query,
        messages=format_chat_history(messages)
    )
    decision = await llm.ainvoke(formatted_prompt)

    decision = decision.content.strip().lower()
    needs_followup = "yes" in decision

    return {"needs_followup": needs_followup}



