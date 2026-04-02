import uuid
from datetime import datetime

from app.adapters.base import BaseAdapter
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    UnifiedMessage,
    UnifiedResponse,
    ChannelType,
    RetrievedDoc,
)


class WebAdapter(BaseAdapter):
    def to_unified(self, raw_message: dict) -> UnifiedMessage:
        request = ChatRequest(**raw_message)
        session_id = request.session_id or str(uuid.uuid4())
        metadata = {}
        if request.intent:
            metadata['user_intent'] = request.intent
            metadata['intent_mode'] = request.intent_mode or 'auto'
        return UnifiedMessage(
            session_id=session_id,
            user_id=request.user_id,
            channel=ChannelType.web,
            content=request.message,
            timestamp=datetime.now(),
            metadata=metadata,
        )

    def from_unified(self, response: UnifiedResponse) -> dict:
        chat_response = ChatResponse(
            session_id=response.session_id,
            reply=response.content,
            sources=response.sources,
            intent=response.intent,
        )
        return chat_response.model_dump()
