from ..state import StoreState
from ...models.llm_client import llm
from langchain_core.prompts import ChatPromptTemplate
from ...schemas.intent_schema import SearchIntent
import json
from ...utils.chat_utils import format_chat_history

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a Shopify Store shopping assistant translating user queries into catalog search intent parameters.\n\n"
        "Extract the following search intent fields:\n"
        "1. semantic_query: Key search terms or product description to search the catalog (e.g., 'protein bar', 'creatine electrolytes', 'zinc liquid'). MUST be a single plain text string, NEVER a list/array of strings (e.g. return \"wireless headphones\" and NOT [\"wireless headphones\"]).\n"
        "2. hard_filters: Criteria products must satisfy, such as category (e.g., 'Functional Food', 'Supplements', 'Chocolate', 'Powdered Beverage Mixes'), brand/vendor name (e.g., 'Zupe', 'SUPERnatural+', 'Humansa'), or strict constraints (e.g., pack size).\n"
        "3. soft_preferences: Flexible guidelines or desired features/benefits (e.g., flavor/taste like 'peanut butter chocolate', 'toasted graham', price/budget preferences).\n"
        "4. excluded_filters: Explicitly mentioned attributes, ingredients, or brands to avoid (e.g., 'avoid peanut', 'sugar-free', 'no artificial flavors').\n\n"
        "Rules:\n"
        "- Base your extraction strictly on the user query and context of the chat history.\n"
        "- Focus strictly on the active/latest topic in the conversation, ignoring details from older, unrelated topics if the user has switched context.\n"
        "- If the user describes a symptom, problem, or health goal (e.g., 'gain weight', 'feeling stressed', 'sleep better'), do NOT just copy the user's words for the semantic_query. Instead, translate it into relevant product types, ingredients, or search terms (e.g. translate 'gain weight' into 'protein powder, creatine, muscle recovery'; translate 'feeling stressed' into 'magnesium, vitamins, relaxation').\n"
        "- If the user corrects, updates, or overrides any of their previous preferences in their latest query (e.g., changing category, flavor, brand, or removing budget constraints like saying 'any price'), you MUST extract the updated preferences and discard the old/conflicting ones.\n"
        "- Respond in valid JSON format matching the schema.\n"
        "- semantic_query MUST be a single string, NEVER a list or array of strings under any circumstances.\n"
        "- If any of hard_filters, soft_preferences, or excluded_filters are empty, you MUST return them strictly as an empty object/dictionary (e.g. {{}}) and never as an empty list/array (e.g. [])."
    ),
    (
        "human",
        "Chat History (including the latest user query):\n{messages}"
    )
])

structured_intent_llm = llm.with_structured_output(schema=SearchIntent, method="json_mode")

async def extract_intent_node(state: StoreState):
    """
    Extract the intent of the user's query and collected info
    """
    followup_count = state.get("followup_count", 0)
    num_messages = (followup_count * 2) + 3
    session_messages = state["messages"][-num_messages:]

    formatted_prompt = prompt.format_messages(
        messages=format_chat_history(session_messages)
    )
    intent_result = await structured_intent_llm.ainvoke(formatted_prompt)

    intent_dict = intent_result.model_dump()
    return {"intent_analysis": intent_dict}