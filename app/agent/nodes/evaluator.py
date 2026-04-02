from app.models.schemas import IntentType
from app.services.config_manager import config_manager


SKIP_EVALUATE_INTENTS = {IntentType.chitchat.value, IntentType.out_of_scope.value}


async def evaluate_results(state: dict) -> dict:
    intent = state.get("intent")
    retrieved_docs = state.get("retrieved_docs") or []
    threshold = config_manager.get_float("RAG_RELEVANCE_THRESHOLD")

    if intent == IntentType.unclear.value:
        return {"retrieval_quality": "need_clarify", "top_relevance_score": None}

    if intent in SKIP_EVALUATE_INTENTS:
        return {"retrieval_quality": "no_result", "top_relevance_score": None}

    if not retrieved_docs:
        return {"retrieval_quality": "no_result", "top_relevance_score": None}

    scores = [doc.get("score", 0) for doc in retrieved_docs]
    top_score = max(scores) if scores else 0

    if top_score >= threshold:
        return {"retrieval_quality": "sufficient", "top_relevance_score": top_score}
    else:
        return {"retrieval_quality": "no_result", "top_relevance_score": top_score}
