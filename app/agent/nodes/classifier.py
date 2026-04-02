from app.models.schemas import IntentType, DomainType, INTENT_TO_DOMAIN
from app.services.llm_client import llm_client
from app.services.prompt_manager import prompt_manager


def _format_history(history: list[dict], max_rounds: int = 3) -> str:
    if not history:
        return "（无历史对话）"
    recent = history[-max_rounds * 2 :]
    lines = []
    for msg in recent:
        role = "用户" if msg.get("role") == "user" else "助手"
        lines.append(f"{role}：{msg.get('content', '')}")
    return "\n".join(lines)


async def classify_intent(state: dict) -> dict:
    user_query = state.get("user_query", "")
    chat_history = state.get("chat_history", [])

    history_str = _format_history(chat_history)
    messages = [
        {"role": "system", "content": prompt_manager.get_current_system_prompt("classifier")},
        {"role": "user", "content": prompt_manager.get_current_user_template("classifier").format(
            query=user_query,
            chat_history=history_str
        )},
    ]

    result = await llm_client.generate(messages, temperature=0.1)
    intent_str = result.strip().lower()

    try:
        intent = IntentType(intent_str).value
    except ValueError:
        intent = IntentType.unclear.value

    domain = INTENT_TO_DOMAIN.get(IntentType(intent), DomainType.general).value

    return {"intent": intent, "domain": domain}
