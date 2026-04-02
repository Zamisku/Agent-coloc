from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.nodes.classifier import classify_intent
from app.agent.nodes.rewriter import rewrite_query
from app.agent.nodes.retriever import retrieve_docs
from app.agent.nodes.evaluator import evaluate_results
from app.agent.nodes.generator import generate_answer
from app.agent.nodes.clarify import ask_clarification
from app.agent.nodes.fallback import fallback_response
from app.agent.nodes.tool_caller import call_tools


def _route_by_quality(state: AgentState) -> str:
    quality = state.get("retrieval_quality", "no_result")
    if quality == "sufficient":
        return "generate"
    elif quality == "need_clarify":
        return "clarify"
    else:
        return "fallback"


def _route_after_generate(state: AgentState) -> str:
    """根据生成结果决定下一步"""
    tool_calls = state.get("tool_calls")
    if tool_calls:
        return "tool_call"
    return "final"


def build_agent_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("classify", classify_intent)
    graph.add_node("rewrite", rewrite_query)
    graph.add_node("retrieve", retrieve_docs)
    graph.add_node("evaluate", evaluate_results)
    graph.add_node("generate", generate_answer)
    graph.add_node("tool_call", call_tools)
    graph.add_node("clarify", ask_clarification)
    graph.add_node("fallback", fallback_response)

    graph.set_entry_point("classify")

    graph.add_edge("classify", "rewrite")
    graph.add_edge("rewrite", "retrieve")
    graph.add_edge("retrieve", "evaluate")

    graph.add_conditional_edges(
        "evaluate",
        _route_by_quality,
        {
            "generate": "generate",
            "clarify": "clarify",
            "fallback": "fallback",
        },
    )

    # 条件边：如果 generate 返回了 tool_calls，转到 tool_call
    graph.add_conditional_edges(
        "generate",
        _route_after_generate,
        {
            "tool_call": "tool_call",
            "final": END,
        },
    )

    # tool_call 执行完后回到 generate 继续生成
    graph.add_edge("tool_call", "generate")

    graph.add_edge("clarify", END)
    graph.add_edge("fallback", END)

    return graph.compile()


agent_graph = build_agent_graph()


async def run_agent(
    session_id: str,
    user_query: str,
    chat_history: list[dict],
) -> AgentState:
    initial_state: AgentState = {
        "session_id": session_id,
        "user_query": user_query,
        "chat_history": chat_history,
        "intent": None,
        "domain": None,
        "rewritten_query": None,
        "retrieved_docs": None,
        "top_relevance_score": None,
        "retrieval_quality": None,
        "response": None,
        "sources": [],
        "need_clarification": False,
        "tool_calls": None,
        "tool_results": None,
        "messages": None,
    }
    result = await agent_graph.ainvoke(initial_state)
    return result
