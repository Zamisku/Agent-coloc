from app.models.schemas import IntentType
from app.services.rag_client import rag_client


SKIP_RETRIEVE_INTENTS = {IntentType.chitchat.value, IntentType.out_of_scope.value}


async def retrieve_docs(state: dict) -> dict:
    intent = state.get("intent")
    rewritten_query = state.get("rewritten_query", "")
    domain = state.get("domain", "admission")

    if intent in SKIP_RETRIEVE_INTENTS:
        return {"retrieved_docs": [], "sources": []}

    result = await rag_client.retrieve(rewritten_query, domain)

    docs = [
        {
            "content": doc.content,
            "score": doc.score,
            "source": doc.source,
            "metadata": doc.metadata,
        }
        for doc in result.documents
    ]

    return {"retrieved_docs": docs}
