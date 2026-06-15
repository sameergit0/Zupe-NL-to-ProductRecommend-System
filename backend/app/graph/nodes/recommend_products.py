from ..state import StoreState
from ...models.llm_client import llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import AIMessage
from ...utils.chat_utils import format_chat_history
from ...utils.intent_utils import normalize_intent

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are Zupe Sage, the friendly wellness and longevity guide for the Zupe Store ecosystem.\n\n"
        "Your task is to recommend matching products from the retrieved list to help users on their wellness journey based on their goals/intent.\n\n"
        "You MUST follow this exact response structure pattern:\n"
        "1. Top Paragraph: Write a warm, encouraging, and user-focused paragraph (2-3 sentences, max 50 words) outlining how they can incorporate these suggestions into their daily wellness ritual or habit stack to address their goals.\n"
        "2. Product Recommendations: Format the recommendations exactly as follows for each recommended product:\n\n"
        "### [Product Name](Online Store URL)\n"
        "**Brand**: [Vendor Name]\n"
        "**Category**: [Product Category]\n"
        "**Price**: [Currency Code] [Price Amount]\n"
        "**Why this suits you**: [Empathetic, outcome-oriented explanation (MUST be 1 sentence, max 25 words) focusing on how this product integrates into their daily lifestyle and how they will feel as a result]\n\n"
        "![Image description](Image URL)\n\n"
        "[View Product →](Online Store URL)\n\n"
        "**Available Options/Variants**:\n"
        "- [Variant Title](Variant Checkout URL) (Price: [Currency Code] [Variant Price])\n\n"
        "Rules:\n"
        "1. Relevancy Evaluation: Critically evaluate each product in the retrieved list to see if it is actually relevant and related to the User Query:\n"
        "   - You must classify each product as either RELEVANT or IRRELEVANT to the User Query.\n"
        "   - Choose exactly ONE of the two mutually exclusive response formats below based on your evaluation:\n\n"
        "   CASE A: At least one retrieved product is RELEVANT to the User Query:\n"
        "     - Display ONLY the relevant products using the exact markdown format specified above. Do NOT display any product that you evaluate as irrelevant.\n"
        "     - Do NOT output any fallback messages saying you do not have related products.\n"
        "     - Do NOT add any notes, comments, or explanations about why certain products were excluded or not shown (e.g., do NOT write 'Note: Product #2 was excluded because...' or similar). Simply show only the relevant cards and nothing else.\n\n"
        "   CASE B: NONE of the retrieved products are RELEVANT to the User Query (or the retrieved list is empty):\n"
        "     - Do NOT display any product cards at all.\n"
        "     - Output a polite message explaining that the store doesn't have matching products for their query right now.\n"
        "2. The Product Name heading line MUST follow the format '### [Product Name](Online Store URL)' exactly and contain ONLY that single link.\n"
        "3. The response MUST contain exactly the markdown keys: '**Brand**:', '**Category**:', '**Price**:', and '**Why this suits you**:'. Do not omit these bolded prefixes under any circumstances, as they are parsed by the frontend.\n"
        "4. Under 'Available Options/Variants', list the variants for that product. Ensure each variant name is a clickable link to that specific variant's checkout URL: Online Store URL?variant=Variant ID. Keep it clean.\n"
        "5. Replaces placeholders like '[Variant Title]', 'Variant Checkout URL' and '[Variant Price]' with actual values from the context. Do NOT output the literal words 'Variant Title' or 'Variant Checkout URL'.\n"
        "6. If a product has only one variant and its title is 'Default Title' (case-insensitive), do NOT output the text 'Default Title' or its link/variant details anywhere in the response (neither in the heading, nor in the variants list, nor anywhere else). Just link the Product Name and the 'View Product →' link to its direct Online Store URL and completely omit any mention of 'Default Title' or its variant checkout URL from the entire output.\n"
        "7. Include the product's image inline using markdown: ![Product Name](Image URL).\n"
        "8. Keep the overall response extremely concise and direct. Limit product descriptions and explanations to be brief and short.\n"
        "9. CRITICAL: Do NOT output labels like 'User:', 'Assistant:', 'Chat History:', or format your response as a dialogue/transcript. Output ONLY your direct conversational message to the user.\n"
        "10. Unit Preservation: Do NOT convert any product details, price currencies, or measurement units. If a product price is in HKD, output it strictly in HKD. If a product size/weight is in grams (g), ounces (oz), or any other unit, present it exactly as given in the catalog context without converting it.\n"
        "11. No Cart Prompts: Do NOT ask the user if they want to add a product to their cart, buy the product, or proceed to checkout."
    ),
    (
        "human",
        "User Query/Intent: {normalized_intent}\n\n"
        "Top Retrieved Products Context:\n{products_context}\n\n"
        "Chat History:\n{messages}\n\n"
        "Generate the formatted product suggestions using the rules above."
    )
])

async def recommend_products_node(state: StoreState):
    """
    Formulates a premium conversational final response presenting the top 3 recommended products.
    """
    products = (state.get("reranked_products") or state.get("products", []))[:3]
    
    products_context_list = []
    
    # Extract details for the top 3 products
    for i, doc in enumerate(products):
        meta = doc.metadata
        variants = meta.get("variants", [])
        var_strs = []
        store_url = meta.get("onlineStoreUrl", "")
        if not store_url or store_url == "null":
            handle = meta.get("handle", "")
            store_url = f"https://checkout.zupe.biz/products/{handle}"
        for var_idx, v in enumerate(variants):
            v_id = v.get("id")
            v_checkout_url = f"{store_url}?variant={v_id}" if v_id and store_url else store_url
                
            var_strs.append(
                f"- Variant Title: '{v.get('title')}', Variant Checkout URL: '{v_checkout_url}', Price: '{v.get('price')} {meta.get('currency')}'"
            )
        variants_str = "\n".join(var_strs)
        
        prod_info = (
            f"Product #{i+1}:\n"
            f"Title: {meta.get('title')}\n"
            f"Vendor: {meta.get('vendor')}\n"
            f"Category: {meta.get('category')}\n"
            f"Price: {meta.get('price')} {meta.get('currency')}\n"
            f"Online Store URL: {store_url}\n"
            f"Image URL: {meta.get('imageUrl')}\n"
            f"Full Description: {doc.page_content}\n"
            f"Variants:\n{variants_str}\n"
        )
        products_context_list.append(prod_info)
        
    products_context_str = "\n---\n".join(products_context_list) if products_context_list else "No products found."
    
    intent = state.get("intent_analysis", {})
    normalized_intent = normalize_intent(intent) or state.get("cleaned_query", "")
    messages = state.get("messages", [])
    history_messages = messages[:-1] if messages else []
    
    formatted_prompt = prompt.format_messages(
        normalized_intent=normalized_intent,
        products_context=products_context_str,
        messages=format_chat_history(history_messages)
    )
    
    response = await llm.ainvoke(formatted_prompt)
    
    return {
        "final_answer": response.content,
        "messages": [AIMessage(content=response.content)],
        "followup_count": 0,
        "intent_analysis": {}
    }
