from ..state import StoreState
from ...models.llm_client import llm
from langchain_core.prompts import ChatPromptTemplate
from ...utils.chat_utils import format_chat_history


prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a classifier. Decide if the user query requires searching the product catalog.\n\n"
        "Answer 'yes' ONLY if the user is:\n"
        "- Explicitly asking for product recommendations or suggestions\n"
        "- Searching for a specific type of product\n"
        "- Describing a health goal, symptom, or problem they want a product for\n"
        "- Answering or responding (e.g., answering 'yes', 'no', 'vegan', 'chocolate', providing preferences/dietary choices) to the assistant's previous clarifying questions.\n"
        "- Confirming or agreeing (e.g., 'yes', 'sure', 'please do', 'yep', 'ok', 'go ahead') to the assistant's previous proposal/question to search the catalog or recommend products.\n\n"
        "Answer 'no' if the user is:\n"
        "- Greeting or making small talk (e.g., 'how are you?', 'hi', 'thanks', 'ok', 'great')\n"
        "- Asking about existing recommended products (e.g., 'tell me more about this', 'what is the price?')\n"
        "- Asking general store questions (shipping, returns, policies)\n"
        "- Asking general wellness, longevity, scientific, or informational questions (e.g., 'how does sleep affect longevity?', 'tell me about caloric restriction', 'what factors affect longevity?', 'why is cognitive function important?')\n"
        "- Saying anything unrelated to finding new products\n\n"
        "IMPORTANT: Social/casual messages and general informational/longevity queries MUST return 'no'.\n"
        "Respond strictly with either 'yes' or 'no'."
    ),
    (
        "human",
        "User Query:\n{query}\n\nChat History:\n{messages}"
    )
])


async def decide_retrieval_node(state: StoreState):
    """
    Decides whether to retrieve products from the store.
    """
    query = state["cleaned_query"]
    followup_count = state.get("followup_count", 0)
    num_history = (followup_count * 2) + 1
    messages = state["messages"][-(num_history + 1):-1]

    formatted_prompt = prompt.format_messages(
        query=query,
        messages=format_chat_history(messages)
    )

    decision = await llm.ainvoke(formatted_prompt)

    decision = decision.content.strip().lower()
    needs_retrieval = "yes" in decision

    # If retrieval is not needed, clear intent_analysis in the state
    return {
        "needs_retrieval": needs_retrieval,
        "intent_analysis": {} if not needs_retrieval else state.get("intent_analysis", {})
    }