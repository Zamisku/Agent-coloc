from app.models.schemas import IntentType
from app.services.llm_client import llm_client
from app.services.prompt_manager import prompt_manager
from app.services.memory import memory_service


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
    pending_slot = state.get("pending_slot")

    if intent in SKIP_REWRITE_INTENTS:
        return {"rewritten_query": user_query}

    # Slot 填充场景: 将用户回复与原始 query 合并
    if pending_slot and pending_slot.get("slot_name"):
        original_query = pending_slot.get("original_query", "")
        slot_name = pending_slot.get("slot_name")
        slot_value = user_query.strip()
        session_id = state.get("session_id", "")

        # 根据槽位类型合并
        if slot_name == "province":
            # 合并省份信息
            if any(k in original_query for k in ["省", "省份", "录取"]):
                # 保持省份在前
                rewritten = f"{slot_value} {original_query}"
            else:
                rewritten = f"{slot_value}{original_query}"
        elif slot_name == "subject":
            rewritten = f"{original_query} {slot_value}"
        elif slot_name == "batch":
            rewritten = f"{original_query} {slot_value}"
        else:
            rewritten = f"{original_query} {slot_value}"

        # 清除 pending_slot
        if session_id:
            await memory_service.set_pending_slot(session_id, None)

        return {"rewritten_query": rewritten.strip(), "pending_slot": None}

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
