from app.models.schemas import IntentType
from app.services.llm_client import llm_client
from app.services.prompt_manager import prompt_manager


SKIP_REWRITE_INTENTS = {IntentType.chitchat.value, IntentType.out_of_scope.value}


def _format_history(history: list[dict], max_rounds: int = 3) -> str:
    if not history:
        return "（无历史对话）"
    recent = history[-max_rounds * 2 :]
    lines = []
    for msg in recent:
        role = "用户" if msg.get("role") == "user" else "助手"
        lines.append(f"{role}：{msg.get('content', '')}")
    return "\n".join(lines)


async def rewrite_query(state: dict) -> dict:
    intent = state.get("intent")
    user_query = state.get("user_query", "")
    chat_history = state.get("chat_history", [])

    if intent in SKIP_REWRITE_INTENTS:
        return {"rewritten_query": user_query}

    history_str = _format_history(chat_history)
    messages = [
        {"role": "system", "content": prompt_manager.get_current_system_prompt("rewriter")},
        {"role": "user", "content": prompt_manager.get_current_user_template("rewriter").format(
            query=user_query,
            intent=intent or "unknown",
            chat_history=history_str
        )},
    ]

    rewritten = await llm_client.generate(messages, temperature=0.1)
    return {"rewritten_query": rewritten.strip()}
