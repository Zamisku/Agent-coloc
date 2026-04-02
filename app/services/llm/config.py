from __future__ import annotations

import asyncio
from typing import Any

from app.services.config_manager import config_manager
from app.services.llm.deepseek import DeepSeekProvider
from app.services.llm.minimax import MiniMaxProvider
from app.services.llm.openai import OpenAIProvider


# Provider 配置前缀
PROVIDER_PREFIX = "PROVIDER_"
PROVIDER_NAMES = ["deepseek", "minimax", "openai"]


def _get_provider_config(provider: str) -> dict[str, Any]:
    """获取某个 provider 的配置"""
    prefix = f"{PROVIDER_PREFIX}{provider.upper()}_"
    return {
        "api_key": config_manager.get(f"{prefix}API_KEY") or "",
        "model": config_manager.get(f"{prefix}MODEL") or "",
        "base_url": config_manager.get(f"{prefix}BASE_URL") or "",
    }


def _get_provider_defaults(provider: str) -> dict[str, Any]:
    """获取 provider 的默认值"""
    defaults = {
        "deepseek": {
            "model": "deepseek-chat",
            "base_url": "https://api.deepseek.com",
        },
        "minimax": {
            "model": "MiniMax-M2.7",
            "base_url": "https://api.minimaxi.com/v1",
        },
        "openai": {
            "model": "gpt-4o",
            "base_url": "https://api.openai.com/v1",
        },
    }
    return defaults.get(provider, {})


def create_provider(provider: str, **overrides) -> DeepSeekProvider | MiniMaxProvider | OpenAIProvider | None:
    """创建 provider 实例"""
    config = _get_provider_config(provider)
    defaults = _get_provider_defaults(provider)

    api_key = overrides.get("api_key", config.get("api_key", ""))
    model = overrides.get("model", config.get("model", defaults.get("model", "")))
    base_url = overrides.get("base_url", config.get("base_url", defaults.get("base_url", "")))

    temperature = config_manager.get_float("LLM_TEMPERATURE")
    max_tokens = config_manager.get_int("LLM_MAX_TOKENS")

    if provider == "deepseek":
        return DeepSeekProvider(api_key=api_key, model=model, base_url=base_url, temperature=temperature, max_tokens=max_tokens)
    elif provider == "minimax":
        return MiniMaxProvider(api_key=api_key, model=model, base_url=base_url, temperature=temperature, max_tokens=max_tokens)
    elif provider == "openai":
        return OpenAIProvider(api_key=api_key, model=model, base_url=base_url, temperature=temperature, max_tokens=max_tokens)

    return None


def get_llm_mode() -> str:
    """获取当前 LLM 模式: single 或 multi"""
    return config_manager.get("LLM_MODE") or "single"


def get_active_provider() -> str | None:
    """获取当前激活的 provider（单源模式）"""
    return config_manager.get("LLM_PROVIDER")


def get_multi_providers() -> list[str]:
    """获取多源模式的 providers 列表"""
    providers_str = config_manager.get("MULTI_PROVIDERS") or ""
    if not providers_str:
        return []
    return [p.strip() for p in providers_str.split(",") if p.strip()]


def set_llm_mode(mode: str) -> None:
    """设置 LLM 模式"""
    config_manager.set("LLM_MODE", mode)


def set_active_provider(provider: str) -> None:
    """设置当前激活的 provider"""
    config_manager.set("LLM_PROVIDER", provider)


def set_multi_providers(providers: list[str]) -> None:
    """设置多源模式的 providers"""
    config_manager.set("MULTI_PROVIDERS", ",".join(providers))


def update_provider_config(provider: str, api_key: str | None = None, model: str | None = None, base_url: str | None = None) -> None:
    """更新 provider 配置"""
    prefix = f"{PROVIDER_PREFIX}{provider.upper()}_"
    if api_key is not None:
        config_manager.set(f"{prefix}API_KEY", api_key)
    if model is not None:
        config_manager.set(f"{prefix}MODEL", model)
    if base_url is not None:
        config_manager.set(f"{prefix}BASE_URL", base_url)


def get_all_providers_info() -> list[dict]:
    """获取所有 provider 的信息"""
    result = []
    for provider_name in PROVIDER_NAMES:
        provider = create_provider(provider_name)
        if provider:
            result.append(provider.to_dict())
    return result
