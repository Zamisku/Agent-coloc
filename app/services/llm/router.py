from __future__ import annotations

import asyncio
from typing import AsyncIterator

from app.services.llm.config import (
    get_llm_mode,
    get_active_provider,
    get_multi_providers,
    create_provider,
)


class LLMRouter:
    """LLM 路由：支持单源和多源并发"""

    def __init__(self):
        self._providers: dict[str, object] = {}

    def _get_provider(self, name: str):
        """获取或创建 provider 实例"""
        if name not in self._providers:
            self._providers[name] = create_provider(name)
        return self._providers[name]

    async def generate(self, messages: list[dict], temperature: float | None = None, max_tokens: int | None = None) -> str | list[dict]:
        """生成回复"""
        mode = get_llm_mode()

        if mode == "multi":
            return await self._multi_generate(messages, temperature, max_tokens)
        else:
            return await self._single_generate(messages, temperature, max_tokens)

    async def _single_generate(self, messages: list[dict], temperature: float | None = None, max_tokens: int | None = None) -> str:
        """单源生成"""
        provider_name = get_active_provider()
        if not provider_name:
            raise ValueError("未配置激活的 LLM Provider")

        provider = self._get_provider(provider_name)
        if provider is None:
            raise ValueError(f"Provider {provider_name} 不存在")

        return await provider.generate(messages, temperature, max_tokens)

    async def _multi_generate(self, messages: list[dict], temperature: float | None = None, max_tokens: int | None = None) -> list[dict]:
        """多源并发生成，返回所有结果"""
        provider_names = get_multi_providers()
        if not provider_names:
            raise ValueError("未配置多源 LLM Providers")

        tasks = []
        for name in provider_names:
            provider = self._get_provider(name)
            if provider:
                tasks.append(self._call_provider(provider, messages, temperature, max_tokens, name))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = []
        for name, result in zip(provider_names, results):
            if isinstance(result, Exception):
                valid_results.append({
                    "provider": name,
                    "error": str(result),
                })
            else:
                valid_results.append({
                    "provider": name,
                    "response": result,
                })

        return valid_results

    async def _call_provider(self, provider, messages: list[dict], temperature: float | None, max_tokens: int | None, name: str):
        """调用单个 provider"""
        try:
            return await provider.generate(messages, temperature, max_tokens)
        except Exception as e:
            return e

    async def generate_stream(self, messages: list[dict], temperature: float | None = None) -> AsyncIterator[str]:
        """流式生成（仅支持单源模式）"""
        mode = get_llm_mode()

        if mode == "multi":
            raise ValueError("多源模式不支持流式生成，请使用单源模式")

        provider_name = get_active_provider()
        if not provider_name:
            raise ValueError("未配置激活的 LLM Provider")

        provider = self._get_provider(provider_name)
        if provider is None:
            raise ValueError(f"Provider {provider_name} 不存在")

        async for token in provider.generate_stream(messages, temperature):
            yield token

    async def health_check(self, provider_name: str | None = None) -> dict:
        """健康检查"""
        if provider_name:
            provider = self._get_provider(provider_name)
            if provider is None:
                return {"provider": provider_name, "status": "not_found"}
            ok = await provider.health_check()
            return {"provider": provider_name, "status": "ok" if ok else "error"}

        # 检查所有 provider
        results = {}
        for name in ["deepseek", "minimax", "openai"]:
            provider = self._get_provider(name)
            if provider:
                ok = await provider.health_check()
                results[name] = "ok" if ok else "error"
            else:
                results[name] = "not_configured"
        return results

    def reset_providers(self) -> None:
        """重置所有 provider 实例"""
        self._providers.clear()


llm_router = LLMRouter()
