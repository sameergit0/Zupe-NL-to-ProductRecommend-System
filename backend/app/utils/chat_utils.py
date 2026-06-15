import re
from typing import List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

def clean_assistant_message(content: str) -> str:
    """
    Strips details of recommended products to prevent LLM context distraction,
    leaving only a summary of the recommended product titles.
    """
    product_titles = re.findall(r'^###\s+\[?([^\]\(\n]+)\]?', content, flags=re.MULTILINE)
    if product_titles:
        cleaned_titles = [t.split('](')[0].strip() for t in product_titles]
        return f"[Recommended products: {', '.join(cleaned_titles)}]"
    return content

def format_chat_history(messages: List[BaseMessage]) -> str:
    """
    Formats a list of LangChain messages into a clean, readable string 
    for LLM prompt context, reducing token usage and eliminating metadata bloat.
    """
    if not messages:
        return "[Empty]"
    formatted = []
    for msg in messages:
        role = "User" if msg.type == "human" else "Assistant"
        content = msg.content
        if role == "Assistant" and isinstance(content, str):
            content = clean_assistant_message(content)
        formatted.append(f"{role}: {content}")
    return "\n".join(formatted)

def get_cleaned_chat_history_messages(messages: List[BaseMessage]) -> List[BaseMessage]:
    """
    Returns a list of message objects with assistant message content cleaned
    to remove verbose product details.
    """
    cleaned_messages = []
    for msg in messages:
        content = msg.content
        if msg.type == "ai" and isinstance(content, str):
            content = clean_assistant_message(content)
            cleaned_messages.append(AIMessage(content=content))
        elif msg.type == "human" and isinstance(content, str):
            cleaned_messages.append(HumanMessage(content=content))
        else:
            cleaned_messages.append(msg)
    return cleaned_messages


