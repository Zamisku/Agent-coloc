from app.prompts.generator import FALLBACK_TEMPLATE


async def fallback_response(state: dict) -> dict:
    user_query = state.get("user_query", "")
    intent_rejected = state.get("intent_rejected", False)

    if intent_rejected:
        # 强制意图无效时，生成友好回复
        response = f"您选择的意图类型暂不支持或不在有效范围内，请尝试使用「Auto」模式让我自动为您分类。"
        return {
            "response": response,
            "need_clarification": False,
            "sources": [],
        }

    response = FALLBACK_TEMPLATE.format(query=user_query)

    return {
        "response": response,
        "need_clarification": False,
        "sources": [],
    }
