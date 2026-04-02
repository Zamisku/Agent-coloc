"""工具调用节点"""

from app.agent.state import AgentState
from app.services.skills.init import execute_tool


async def call_tools(state: AgentState) -> AgentState:
    """执行工具调用"""
    tool_calls = state.get("tool_calls") or []
    tool_results = []

    for tc in tool_calls:
        tool_name = tc.get("name", "")
        try:
            # 解析参数（可能是 JSON 字符串）
            arguments_str = tc.get("arguments", "{}")
            try:
                arguments = eval(arguments_str) if isinstance(arguments_str, str) else arguments_str
            except Exception:
                arguments = {}

            result = await execute_tool(tool_name, arguments)

            tool_results.append({
                "tool_call_id": tc.get("id", ""),
                "name": tool_name,
                "result": result.get("result") if result.get("success") else None,
                "error": result.get("error") if not result.get("success") else None,
                "success": result.get("success", False),
            })
        except Exception as e:
            tool_results.append({
                "tool_call_id": tc.get("id", ""),
                "name": tool_name,
                "result": None,
                "error": str(e),
                "success": False,
            })

    return {
        "tool_results": tool_results,
    }
