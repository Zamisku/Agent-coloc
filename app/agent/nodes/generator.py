from app.agent.state import AgentState
from app.services.llm_client import llm_client
from app.services.prompt_manager import prompt_manager
from app.services.skills.init import get_all_tools


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


def _format_tool_results(tool_results: list[dict]) -> str:
    """格式化工具执行结果"""
    if not tool_results:
        return ""
    lines = ["（工具执行结果）"]
    for tr in tool_results:
        name = tr.get("name", "unknown")
        if tr.get("success"):
            result = tr.get("result", "")
            lines.append(f"【{name}】{result}")
        else:
            error = tr.get("error", "执行失败")
            lines.append(f"【{name}】错误: {error}")
    return "\n".join(lines)


async def generate_answer(state: AgentState) -> AgentState:
    user_query = state.get("user_query", "")
    retrieved_docs = state.get("retrieved_docs") or []
    chat_history = state.get("chat_history", [])
    tool_results = state.get("tool_results")
    existing_messages = state.get("messages") or []

    # 构建上下文
    context = _build_context(retrieved_docs)
    history_str = _format_history(chat_history)

    # 构建消息
    messages = [
        {"role": "system", "content": prompt_manager.get_current_system_prompt("generator")},
        {"role": "user", "content": prompt_manager.get_current_user_template("generator").format(
            query=user_query,
            context=context,
            chat_history=history_str
        )},
    ]

    # 如果有之前的消息历史（包含工具调用），追加到消息中
    if existing_messages:
        messages.extend(existing_messages)

    # 如果有工具执行结果，添加到消息中
    if tool_results:
        tool_result_text = _format_tool_results(tool_results)
        if tool_result_text:
            messages.append({"role": "system", "content": tool_result_text})

    # 获取可用的工具
    tools = get_all_tools()

    # 调用 LLM
    result = await llm_client.generate(messages, temperature=0.3, tools=tools if tools else None)

    # 检查是否有工具调用
    if isinstance(result, dict) and result.get("tool_calls"):
        tool_calls = result["tool_calls"]
        # 转换为 OpenAI API 格式
        openai_tool_calls = [
            {
                "id": tc.get("id", ""),
                "type": "function",
                "function": {
                    "name": tc.get("name", ""),
                    "arguments": tc.get("arguments", ""),
                }
            }
            for tc in tool_calls
        ]
        # 构建带 tool_calls 的 assistant 消息
        assistant_message = {
            "role": "assistant",
            "content": result.get("content", ""),
            "tool_calls": openai_tool_calls,
        }

        # 只有在没有 existing_messages 时才追加新的 assistant 消息
        if not existing_messages:
            messages.append(assistant_message)
        # else: existing_messages 已经包含了之前的对话历史，直接使用

        return {
            "response": None,  # 还没有最终回复，需要执行工具后再生成
            "sources": [],
            "need_clarification": False,
            "tool_calls": openai_tool_calls,
            "messages": messages + [assistant_message] if existing_messages else messages,
        }
    else:
        # 普通回复
        response_text = result if isinstance(result, str) else ""

        sources = [doc.get("source", "") for doc in retrieved_docs if doc.get("source")]
        sources = list(dict.fromkeys(sources))

        return {
            "response": response_text,
            "sources": sources,
            "need_clarification": False,
            "tool_calls": None,
            "messages": None,
        }
