from app.prompts.generator import FALLBACK_TEMPLATE


async def fallback_response(state: dict) -> dict:
    user_query = state.get("user_query", "")

    response = FALLBACK_TEMPLATE.format(query=user_query)

    return {
        "response": response,
        "need_clarification": False,
        "sources": [],
    }
