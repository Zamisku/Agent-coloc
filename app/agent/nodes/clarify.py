from app.prompts.generator import CLARIFICATION_TEMPLATE
from app.services.llm_client import llm_client


async def ask_clarification(state: dict) -> dict:
    user_query = state.get("user_query", "")
    intent = state.get("intent", "unknown")

    messages = [
        {"role": "user", "content": CLARIFICATION_TEMPLATE.format(
            query=user_query,
            intent=intent
        )},
    ]

    response = await llm_client.generate(messages, temperature=0.3)

    return {
        "response": response.strip(),
        "need_clarification": True,
        "sources": [],
    }
