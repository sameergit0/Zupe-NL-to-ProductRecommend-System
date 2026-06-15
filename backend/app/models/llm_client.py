from langchain_groq import ChatGroq
from app.core.config import GROQ_LLM_MODEL
from dotenv import load_dotenv

load_dotenv()

llm = ChatGroq(model=GROQ_LLM_MODEL)