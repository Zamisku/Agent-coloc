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
