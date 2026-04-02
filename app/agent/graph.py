from langgraph.graph import StateGraph, END

from app.agent.state import AgentState
from app.agent.nodes.classifier import classify_intent
from app.agent.nodes.rewriter import rewrite_query
from app.agent.nodes.retriever import retrieve_docs
from app.agent.nodes.evaluator import evaluate_results
from app.agent.nodes.generator import generate_answer
from app.agent.nodes.clarify import ask_clarification
from app.agent.nodes.fallback import fallback_response


def _route_by_quality(state: AgentState) -> str:
    quality = state.get("retrieval_quality", "no_result")
    if quality == "sufficient":
        return "generate"
    elif quality == "need_clarify":
        return "clarify"
    else:
        return "fallback"


def build_agent_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("classify", classify_intent)
    graph.add_node("rewrite", rewrite_query)
    graph.add_node("retrieve", retrieve_docs)
    graph.add_node("evaluate", evaluate_results)
    graph.add_node("generate", generate_answer)
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

    graph.add_edge("generate", END)
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
    }
    result = await agent_graph.ainvoke(initial_state)
    return result
