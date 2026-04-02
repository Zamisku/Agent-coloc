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


def _build_context(retrieved_docs: list[dict]) -> str:
    if not retrieved_docs:
        return "（无相关参考资料）"
    parts = []
    for doc in retrieved_docs:
        source = doc.get("source", "未知来源")
        content = doc.get("content", "")
        parts.append(f"[来源：{source}] {content}")
    return "\n\n".join(parts)


async def generate_answer(state: dict) -> dict:
    user_query = state.get("user_query", "")
    retrieved_docs = state.get("retrieved_docs") or []
    chat_history = state.get("chat_history", [])

    context = _build_context(retrieved_docs)
    history_str = _format_history(chat_history)

    messages = [
        {"role": "system", "content": prompt_manager.get_current_system_prompt("generator")},
        {"role": "user", "content": prompt_manager.get_current_user_template("generator").format(
            query=user_query,
            context=context,
            chat_history=history_str
        )},
    ]

    response = await llm_client.generate(messages, temperature=0.3)

    sources = [doc.get("source", "") for doc in retrieved_docs if doc.get("source")]
    sources = list(dict.fromkeys(sources))

    return {
        "response": response,
        "sources": sources,
        "need_clarification": False,
    }
