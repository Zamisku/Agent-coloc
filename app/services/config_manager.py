from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

import redis.asyncio as redis

from app.config import settings


CONFIG_SCHEMA = {
    "OPENAI_API_KEY": {
        "group": "LLM 配置",
        "label": "OpenAI API Key",
        "type": "secret",
        "description": "OpenAI API 密钥",
        "required": True,
    },
    "OPENAI_MODEL": {
        "group": "LLM 配置",
        "label": "模型名称",
        "type": "select",
        "options": ["deepseek-chat", "deepseek-reasoner", "MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M2.1", "MiniMax-M2.1-highspeed", "MiniMax-M2"],
        "description": "当前使用的 LLM 模型",
        "default": "deepseek-chat",
    },
    "OPENAI_BASE_URL": {
        "group": "LLM 配置",
        "label": "API 地址",
        "type": "url",
        "description": "OpenAI 兼容的 API 地址",
        "default": "https://api.deepseek.com",
    },
    "LLM_TEMPERATURE": {
        "group": "LLM 配置",
        "label": "生成温度",
        "type": "number",
        "min": 0,
        "max": 1,
        "step": 0.1,
        "description": "越低越稳定，MiniMax推荐1.0",
        "default": "1.0",
    },
    "LLM_MAX_TOKENS": {
        "group": "LLM 配置",
        "label": "最大 Token 数",
        "type": "number",
        "min": 256,
        "max": 8192,
        "step": 256,
        "description": "单次回答的最大长度",
        "default": "2048",
    },
    "RAG_MOCK_ENABLED": {
        "group": "RAG 配置",
        "label": "Mock 模式",
        "type": "boolean",
        "description": "开启后使用模拟数据，关闭后调用真实 RAG 服务",
        "default": "true",
    },
    "RAG_BASE_URL": {
        "group": "RAG 配置",
        "label": "RAG 服务地址",
        "type": "url",
        "description": "RAG 检索服务的 HTTP 地址",
        "default": "http://localhost:8081/api",
    },
    "RAG_TOP_K": {
        "group": "RAG 配置",
        "label": "检索数量",
        "type": "number",
        "min": 1,
        "max": 20,
        "step": 1,
        "description": "每次检索返回的文档数量",
        "default": "5",
    },
    "RAG_RELEVANCE_THRESHOLD": {
        "group": "RAG 配置",
        "label": "相关性阈值",
        "type": "number",
        "min": 0,
        "max": 1,
        "step": 0.05,
        "description": "低于此阈值的检索结果视为不相关",
        "default": "0.6",
    },
    "RAG_TIMEOUT": {
        "group": "RAG 配置",
        "label": "检索超时(秒)",
        "type": "number",
        "min": 1,
        "max": 60,
        "step": 1,
        "description": "RAG 服务调用超时时间",
        "default": "10",
    },
    "MEMORY_MAX_ROUNDS": {
        "group": "对话配置",
        "label": "最大对话轮数",
        "type": "number",
        "min": 1,
        "max": 50,
        "step": 1,
        "description": "保留最近 N 轮对话历史",
        "default": "10",
    },
    "MEMORY_TTL": {
        "group": "对话配置",
        "label": "会话过期时间(秒)",
        "type": "number",
        "min": 300,
        "max": 86400,
        "step": 300,
        "description": "会话超时自动清除",
        "default": "3600",
    },
    "MAX_QUERY_LENGTH": {
        "group": "对话配置",
        "label": "最大输入长度",
        "type": "number",
        "min": 50,
        "max": 2000,
        "step": 50,
        "description": "用户单次输入的最大字符数",
        "default": "500",
    },
    "MAX_AGENT_STEPS": {
        "group": "对话配置",
        "label": "最大推理步数",
        "type": "number",
        "min": 1,
        "max": 10,
        "step": 1,
        "description": "Agent 单次请求的最大推理循环次数",
        "default": "3",
    },
    "REDIS_URL": {
        "group": "基础设施",
        "label": "Redis 地址",
        "type": "url",
        "description": "Redis 连接地址",
        "default": "redis://localhost:6379/0",
        "restart_required": True,
    },
    "APP_ENV": {
        "group": "系统配置",
        "label": "运行环境",
        "type": "select",
        "options": ["dev", "staging", "prod"],
        "description": "当前运行环境",
        "default": "dev",
    },
    "DEBUG": {
        "group": "系统配置",
        "label": "调试模式",
        "type": "boolean",
        "description": "开启后输出详细日志",
        "default": "true",
    },
    "ENABLED_DOMAINS": {
        "group": "系统配置",
        "label": "启用的业务域",
        "type": "text",
        "description": "逗号分隔，如: admission,academic,career",
        "default": "admission",
    },
}


class ConfigManager:
    _instance = None
    _redis_key = "agent:config"
    _history_key = "agent:config:history"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self) -> None:
        self._cache: dict[str, str] = {}
        self._client: redis.Redis | None = None
        self._initialized = False

    async def _get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._client

    def _get_default(self, key: str) -> Optional[str]:
        schema = CONFIG_SCHEMA.get(key)
        if schema:
            return schema.get("default")
        return None

    def _mask_secret(self, key: str, value: str) -> str:
        if len(value) <= 8:
            return "****"
        return f"{value[:4]}...{value[-4:]}"

    async def initialize(self) -> None:
        client = await self._get_client()

        existing = await client.hgetall(self._redis_key)

        if existing:
            self._cache = dict(existing)
        else:
            for key, schema in CONFIG_SCHEMA.items():
                if schema.get("required", False) or schema.get("default") is not None:
                    value = getattr(settings, key, None)
                    if value is None:
                        value = schema.get("default", "")
                    self._cache[key] = str(value)
                    await client.hset(self._redis_key, key, str(value))

        self._initialized = True

    def get(self, key: str) -> Optional[str]:
        return self._cache.get(key)

    def get_bool(self, key: str) -> bool:
        value = self.get(key)
        if value is None:
            return False
        return value.lower() in ("true", "1", "yes")

    def get_int(self, key: str) -> int:
        value = self.get(key)
        if value is None:
            return 0
        try:
            return int(value)
        except ValueError:
            return 0

    def get_float(self, key: str) -> float:
        value = self.get(key)
        if value is None:
            return 0.0
        try:
            return float(value)
        except ValueError:
            return 0.0

    async def set(self, key: str, value: str) -> None:
        if "..." in value:
            return

        old_value = self._cache.get(key)
        self._cache[key] = value

        client = await self._get_client()
        await client.hset(self._redis_key, key, value)

        if old_value != value:
            await self.record_change(key, old_value, value)

    async def set_batch(self, updates: dict[str, str]) -> None:
        for key, value in updates.items():
            if "..." not in value:
                await self.set(key, value)

    def get_all(self) -> dict[str, str]:
        result = {}
        for key, value in self._cache.items():
            schema = CONFIG_SCHEMA.get(key)
            if schema and schema.get("type") == "secret":
                result[key] = self._mask_secret(key, value)
            else:
                result[key] = value
        return result

    def get_schema(self) -> dict:
        return CONFIG_SCHEMA

    def get_grouped(self) -> dict[str, list[dict]]:
        grouped: dict[str, list[dict]] = {}
        for key, schema in CONFIG_SCHEMA.items():
            group = schema["group"]
            if group not in grouped:
                grouped[group] = []
            grouped[group].append({
                "key": key,
                **schema,
                "value": self._cache.get(key, schema.get("default", "")),
            })
        return grouped

    async def get_history(self, limit: int = 50) -> list[dict]:
        client = await self._get_client()
        history = await client.lrange(self._history_key, 0, limit - 1)
        return [json.loads(h) for h in history]

    async def record_change(
        self,
        key: str,
        old_value: Optional[str],
        new_value: str,
    ) -> None:
        entry = {
            "key": key,
            "old_value": old_value,
            "new_value": new_value,
            "timestamp": datetime.now().isoformat(),
        }
        client = await self._get_client()
        await client.lpush(self._history_key, json.dumps(entry, ensure_ascii=False))
        await client.ltrim(self._history_key, 0, 99)


config_manager = ConfigManager()
