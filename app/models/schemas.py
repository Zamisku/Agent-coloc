from datetime import datetime
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, Field, field_validator


class ChannelType(str, Enum):
    web = "web"
    wechat = "wechat"
    app = "app"


class IntentType(str, Enum):
    score_query = "score_query"
    major_info = "major_info"
    admission_policy = "admission_policy"
    campus_life = "campus_life"
    process_guide = "process_guide"
    chitchat = "chitchat"
    out_of_scope = "out_of_scope"
    unclear = "unclear"


class DomainType(str, Enum):
    admission = "admission"
    academic = "academic"
    career = "career"
    general = "general"


INTENT_TO_DOMAIN: dict[IntentType, DomainType] = {
    IntentType.score_query: DomainType.admission,
    IntentType.major_info: DomainType.admission,
    IntentType.admission_policy: DomainType.admission,
    IntentType.campus_life: DomainType.admission,
    IntentType.process_guide: DomainType.admission,
    IntentType.chitchat: DomainType.general,
    IntentType.out_of_scope: DomainType.general,
    IntentType.unclear: DomainType.general,
}


class UnifiedMessage(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    channel: ChannelType
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: dict = Field(default_factory=dict)


class UnifiedResponse(BaseModel):
    session_id: str
    content: str
    sources: list["RetrievedDoc"] = Field(default_factory=list)
    intent: Optional[IntentType] = None
    domain: Optional[DomainType] = None
    need_clarification: bool = False
    metadata: dict = Field(default_factory=dict)


class RetrievedDoc(BaseModel):
    content: str
    score: float
    source: str
    metadata: dict = Field(default_factory=dict)


class RetrievalResult(BaseModel):
    query: str
    documents: list[RetrievedDoc] = Field(default_factory=list)
    domain: DomainType


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: Annotated[str, Field(min_length=1, max_length=500)]
    user_id: Optional[str] = None

    @field_validator("message")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return v.strip()


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    sources: list[RetrievedDoc] = Field(default_factory=list)
    intent: Optional[IntentType] = None
    debug: Optional[dict] = None


class RequestLog(BaseModel):
    session_id: str
    user_query: str
    intent: Optional[IntentType] = None
    domain: Optional[DomainType] = None
    rewritten_query: Optional[str] = None
    retrieval_scores: list[float] = Field(default_factory=list)
    response_text: str
    total_latency_ms: int
    llm_calls: int
    timestamp: datetime = Field(default_factory=datetime.now)
