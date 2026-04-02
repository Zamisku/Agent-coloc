from __future__ import annotations

from typing import AsyncIterator, Optional

import openai
from openai import AsyncOpenAI

from app.services.config_manager import config_manager


class LLMClient:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None

    def _ensure_client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=config_manager.get("OPENAI_API_KEY") or "",
                base_url=config_manager.get("OPENAI_BASE_URL") or "https://api.openai.com/v1",
            )
        return self._client

    async def generate(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        if temperature is None:
            temperature = config_manager.get_float("LLM_TEMPERATURE")
        if max_tokens is None:
            max_tokens = config_manager.get_int("LLM_MAX_TOKENS")

        client = self._ensure_client()
        response = await client.chat.completions.create(
            model=config_manager.get("OPENAI_MODEL") or "gpt-4o",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        if temperature is None:
            temperature = config_manager.get_float("LLM_TEMPERATURE")

        client = self._ensure_client()
        stream = await client.chat.completions.create(
            model=config_manager.get("OPENAI_MODEL") or "gpt-4o",
            messages=messages,
            temperature=temperature,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def switch_model(self, model_id: str, base_url: Optional[str] = None) -> None:
        await config_manager.set("OPENAI_MODEL", model_id)
        if base_url is not None:
            await config_manager.set("OPENAI_BASE_URL", base_url)
        if self._client is not None:
            await self._client.close()
            self._client = None

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None


llm_client = LLMClient()
