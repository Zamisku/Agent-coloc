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
        tools: list[dict] | None = None,
    ) -> str | dict:
        temp = temperature if temperature is not None else self.temperature
        maxt = max_tokens if max_tokens is not None else self.max_tokens

        client = self._get_client()
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temp,
            "max_tokens": maxt,
        }
        if tools:
            kwargs["tools"] = tools

        response = await client.chat.completions.create(**kwargs)

        message = response.choices[0].message
        # 如果有工具调用，返回完整消息
        if message.tool_calls:
            return {
                "content": message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    }
                    for tc in message.tool_calls
                ],
            }
        return message.content or ""

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float | None = None,
        tools: list[dict] | None = None,
    ) -> AsyncIterator[str | dict]:
        temp = temperature if temperature is not None else self.temperature

        client = self._get_client()
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temp,
            "stream": True,
        }
        if tools:
            kwargs["tools"] = tools

        stream = await client.chat.completions.create(**kwargs)

        tool_calls_buffer: list[dict] = []
        current_tool_call: dict | None = None

        async for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta

            # 处理工具调用
            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    if tc_delta.index is not None:
                        # 继续之前的工具调用
                        if tc_delta.index < len(tool_calls_buffer):
                            tc = tool_calls_buffer[tc_delta.index]
                            if tc_delta.function:
                                if tc_delta.function.name:
                                    tc["name"] = tc_delta.function.name
                                if tc_delta.function.arguments:
                                    if "arguments" not in tc:
                                        tc["arguments"] = ""
                                    tc["arguments"] += tc_delta.function.arguments
                        else:
                            # 新的工具调用
                            tc = {
                                "id": tc_delta.id or "",
                                "name": tc_delta.function.name or "",
                                "arguments": tc_delta.function.arguments or "",
                            }
                            tool_calls_buffer.append(tc)
                continue

            # 处理普通文本内容
            if delta.content:
                if tool_calls_buffer:
                    # 如果有累积的工具调用，先返回工具调用
                    for tc in tool_calls_buffer:
                        yield tc
                    tool_calls_buffer = []
                yield delta.content

        # 如果还有剩余的工具调用
        if tool_calls_buffer:
            for tc in tool_calls_buffer:
                yield tc

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
