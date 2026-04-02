from __future__ import annotations

from typing import AsyncIterator

from app.services.llm import llm_router


class LLMClient:
    """LLM 客户端（兼容层），委托给 llm_router 处理"""

    def __init__(self):
        self._client = None  # 兼容旧代码

    async def generate(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        result = await llm_router.generate(messages, temperature, max_tokens)
        # 单源模式返回 str，多源模式返回 list
        if isinstance(result, list):
            # 多源模式：取第一个成功的响应
            for r in result:
                if "response" in r:
                    return r["response"]
            return ""
        return result

    async def generate_stream(
        self,
        messages: list[dict],
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        async for token in llm_router.generate_stream(messages, temperature):
            yield token

    async def switch_model(self, model_id: str, base_url: str | None = None) -> None:
        # 兼容旧代码，实际切换在 llm_router 中处理
        pass

    async def close(self) -> None:
        llm_router.reset_providers()


llm_client = LLMClient()
