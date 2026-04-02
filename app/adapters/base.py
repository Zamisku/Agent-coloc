from abc import ABC, abstractmethod

from app.models.schemas import UnifiedMessage, UnifiedResponse


class BaseAdapter(ABC):
    @abstractmethod
    def to_unified(self, raw_message: dict) -> UnifiedMessage:
        raise NotImplementedError

    @abstractmethod
    def from_unified(self, response: UnifiedResponse) -> dict:
        raise NotImplementedError
