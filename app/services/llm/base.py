from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator

from openai import AsyncOpenAI


class BaseProvider(ABC):
    """LLM Provider 基类"""

    name: str = ""
    display_name: str = ""
    models: list[str] = []
    default_model: str = ""

    def __init__(self, api_key: str, model: str, base_url: str, temperature: float = 1.0, max_tokens: int = 2048):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def generate(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        temp = temperature if temperature is not None else self.temperature
        maxt = max_tokens if max_tokens is not None else self.max_tokens

        client = self._get_client()
        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temp,
            max_tokens=maxt,
        )
        return response.choices[0].message.content or ""

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        temp = temperature if temperature is not None else self.temperature

        client = self._get_client()
        stream = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temp,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def health_check(self) -> bool:
        try:
            client = self._get_client()
            await client.models.list()
            return True
        except Exception:
            return False

    def update_config(self, api_key: str | None = None, model: str | None = None, base_url: str | None = None) -> None:
        if api_key is not None:
            self.api_key = api_key
        if model is not None:
            self.model = model
        if base_url is not None:
            self.base_url = base_url
        # 重置客户端，下次使用时重建
        self._client = None

    @property
    def current_model(self) -> str:
        return self.model

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "models": self.models,
            "default_model": self.default_model,
            "current_model": self.model,
            "base_url": self.base_url,
        }
