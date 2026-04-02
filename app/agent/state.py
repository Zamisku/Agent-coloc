from typing import Optional

from typing_extensions import TypedDict


class AgentState(TypedDict, total=False):
    session_id: str
    user_query: str
    chat_history: list[dict]
    intent: Optional[str]
    domain: Optional[str]
    rewritten_query: Optional[str]
    retrieved_docs: Optional[list[dict]]
    top_relevance_score: Optional[float]
    retrieval_quality: Optional[str]  # "sufficient" | "need_clarify" | "no_result"
    response: Optional[str]
    sources: list[str]
    need_clarification: bool
    # Tool calling support
    tool_calls: Optional[list[dict]]  # 待执行的工具调用
    tool_results: Optional[list[dict]]  # 工具执行结果
    messages: Optional[list[dict]]  # 对话消息历史（包含工具调用和结果）
    # User-specified intent
    user_intent: Optional[str]  # 用户指定的意图
    intent_mode: Optional[str]  # 'auto' | 'force' | 'suggest'
