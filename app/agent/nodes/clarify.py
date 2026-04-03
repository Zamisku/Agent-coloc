from app.prompts.generator import CLARIFICATION_TEMPLATE
from app.services.llm_client import llm_client
from app.services.memory import memory_service


def _extract_slot_type(intent: str, question: str) -> str:
    """根据意图和问题内容提取槽位类型"""
    if any(k in question for k in ["省份", "省"]):
        return "province"
    elif any(k in question for k in ["文科", "理科", "科类"]):
        return "subject"
    elif any(k in question for k in ["批次"]):
        return "batch"
    elif any(k in question for k in ["专业", "院系"]):
        return "major"
    return "info"


async def ask_clarification(state: dict) -> dict:
    user_query = state.get("user_query", "")
    intent = state.get("intent", "unknown")
    rewritten_query = state.get("rewritten_query", "")
    session_id = state.get("session_id", "")

    messages = [
        {"role": "user", "content": CLARIFICATION_TEMPLATE.format(
            query=user_query,
            intent=intent
        )},
    ]

    question = await llm_client.generate(messages, temperature=0.3)
    question = question.strip()

    # 提取槽位类型
    slot_name = _extract_slot_type(intent, question)

    pending_slot = {
        "slot_name": slot_name,
        "original_query": rewritten_query or user_query,
        "original_intent": intent,
        "question": question,
    }

    # 保存 pending_slot 到 Redis
    if session_id:
        await memory_service.set_pending_slot(session_id, pending_slot)

    return {
        "response": question,
        "need_clarification": True,
        "sources": [],
        "pending_slot": pending_slot,
    }
