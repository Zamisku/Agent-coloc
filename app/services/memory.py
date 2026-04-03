import json

import redis.asyncio as redis

from app.config import settings
from app.services.config_manager import config_manager


class MemoryService:
    def __init__(self) -> None:
        self._client: redis.Redis | None = None
        self._url = settings.REDIS_URL

    async def _get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(self._url, decode_responses=True)
        return self._client

    def _key(self, session_id: str) -> str:
        return f"memory:{session_id}"

    def _slot_key(self, session_id: str) -> str:
        return f"pending_slot:{session_id}"

    async def get_history(self, session_id: str) -> list[dict]:
        client = await self._get_client()
        data = await client.get(self._key(session_id))
        if not data:
            return []
        return json.loads(data)

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: dict | None = None,
    ) -> None:
        client = await self._get_client()
        history = await self.get_history(session_id)

        msg = {"role": role, "content": content}
        if metadata:
            msg["metadata"] = metadata
        history.append(msg)

        max_rounds = config_manager.get_int("MEMORY_MAX_ROUNDS")
        max_messages = max_rounds * 2
        if len(history) > max_messages:
            history = history[-max_messages:]

        ttl = config_manager.get_int("MEMORY_TTL")
        await client.setex(
            self._key(session_id),
            ttl,
            json.dumps(history, ensure_ascii=False),
        )

    async def get_pending_slot(self, session_id: str) -> dict | None:
        client = await self._get_client()
        data = await client.get(self._slot_key(session_id))
        if not data:
            return None
        return json.loads(data)

    async def set_pending_slot(self, session_id: str, slot: dict | None) -> None:
        client = await self._get_client()
        ttl = config_manager.get_int("MEMORY_TTL")
        if slot:
            await client.setex(self._slot_key(session_id), ttl, json.dumps(slot, ensure_ascii=False))
        else:
            await client.delete(self._slot_key(session_id))

    async def clear_history(self, session_id: str) -> None:
        client = await self._get_client()
        await client.delete(self._key(session_id))
        await client.delete(self._slot_key(session_id))

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None


memory_service = MemoryService()
