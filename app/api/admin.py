from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from app.services.config_manager import config_manager, CONFIG_SCHEMA
from app.services.llm_client import llm_client
from app.services.stats_collector import stats_collector
from app.services.prompt_manager import prompt_manager
from app.agent.nodes.classifier import classify_intent
from app.agent.nodes.rewriter import rewrite_query
from app.agent.nodes.generator import generate_answer
from app.models.schemas import RequestLog
from datetime import datetime


router = APIRouter(prefix="/api", tags=["admin"])


MODELS = [
    {"id": "deepseek-chat", "name": "DeepSeek-V3 (非思考)", "provider": "deepseek", "description": "通用对话，支持 Tool Calls"},
    {"id": "deepseek-reasoner", "name": "DeepSeek-V3 (思考)", "provider": "deepseek", "description": "思考模式，支持复杂推理"},
    {"id": "MiniMax-M2.7", "name": "MiniMax-M2.7", "provider": "minimax", "description": "最强推理能力（约60TPS）"},
    {"id": "MiniMax-M2.7-highspeed", "name": "MiniMax-M2.7 极速版", "provider": "minimax", "description": "极速版，更快更敏捷（约100TPS）"},
    {"id": "MiniMax-M2.5", "name": "MiniMax-M2.5", "provider": "minimax", "description": "顶尖性能与极致性价比（约60TPS）"},
    {"id": "MiniMax-M2.5-highspeed", "name": "MiniMax-M2.5 极速版", "provider": "minimax", "description": "极速版，更快更敏捷（约100TPS）"},
    {"id": "MiniMax-M2.1", "name": "MiniMax-M2.1", "provider": "minimax", "description": "强大多语言编程能力（约60TPS）"},
    {"id": "MiniMax-M2.1-highspeed", "name": "MiniMax-M2.1 极速版", "provider": "minimax", "description": "极速版，更快更敏捷（约100TPS）"},
    {"id": "MiniMax-M2", "name": "MiniMax-M2", "provider": "minimax", "description": "专为高效编码与Agent工作流而生"},
]


def _validate_value(key: str, value: str) -> tuple[bool, str]:
    schema = CONFIG_SCHEMA.get(key)
    if not schema:
        return False, f"未知配置项: {key}"

    vtype = schema.get("type")
    if vtype == "boolean":
        if value.lower() not in ("true", "false", "1", "0", "yes", "no"):
            return False, f"{key} 需要布尔值"
    elif vtype == "number":
        try:
            num = float(value)
            mn = schema.get("min")
            mx = schema.get("max")
            if mn is not None and num < mn:
                return False, f"{key} 不能小于 {mn}"
            if mx is not None and num > mx:
                return False, f"{key} 不能大于 {mx}"
        except ValueError:
            return False, f"{key} 需要数值"
    return True, ""


@router.get("/settings/schema")
async def get_settings_schema():
    grouped = {}
    for key, schema in CONFIG_SCHEMA.items():
        group = schema["group"]
        if group not in grouped:
            grouped[group] = []
        grouped[group].append({"key": key, **schema})
    return {"schema": grouped}


@router.get("/settings")
async def get_settings():
    return {"settings": config_manager.get_all()}


@router.put("/settings")
async def batch_update_settings(body: dict):
    updates = {}
    restart_keys = []

    for key, value in body.items():
        if key not in CONFIG_SCHEMA:
            continue
        if "..." in value:
            continue

        valid, msg = _validate_value(key, value)
        if not valid:
            raise HTTPException(400, msg)

        updates[key] = value
        if CONFIG_SCHEMA[key].get("restart_required"):
            restart_keys.append(key)

    await config_manager.set_batch(updates)

    llm_keys = {"OPENAI_MODEL", "OPENAI_BASE_URL", "OPENAI_API_KEY"}
    if llm_keys & set(updates.keys()):
        await llm_client.close()
        llm_client._client = None

    return {
        "settings": config_manager.get_all(),
        "restart_required": restart_keys,
    }


@router.put("/settings/{key}")
async def update_setting(key: str, body: dict):
    if key not in CONFIG_SCHEMA:
        raise HTTPException(404, f"配置项 {key} 不存在")

    value = body.get("value", "")
    if "..." in value:
        return {"message": "脱敏值未更新", "setting": config_manager.get_all()}

    valid, msg = _validate_value(key, value)
    if not valid:
        raise HTTPException(400, msg)

    await config_manager.set(key, value)

    if key in {"OPENAI_MODEL", "OPENAI_BASE_URL", "OPENAI_API_KEY"}:
        await llm_client.close()
        llm_client._client = None

    restart_required = CONFIG_SCHEMA[key].get("restart_required", False)
    return {
        "setting": config_manager.get_all(),
        "restart_required": restart_required,
    }


@router.get("/settings/history")
async def get_settings_history():
    history = await config_manager.get_history(limit=100)
    return {"history": history}


@router.post("/settings/reset")
async def reset_settings(body: dict):
    if not body.get("confirm"):
        raise HTTPException(400, "需要确认重置")

    for key, schema in CONFIG_SCHEMA.items():
        default = schema.get("default")
        if default is not None:
            await config_manager.set(key, str(default))

    return {"message": "已重置为默认值", "settings": config_manager.get_all()}


@router.get("/models")
async def list_models():
    return {"models": MODELS}


@router.get("/models/current")
async def get_current_model():
    model_id = config_manager.get("OPENAI_MODEL") or "gpt-4o"
    return {"current": model_id}


@router.put("/models/current")
async def set_current_model(body: dict):
    model_id = body.get("model_id")
    if not model_id:
        raise HTTPException(400, "需要 model_id")

    await config_manager.set("OPENAI_MODEL", model_id)
    await llm_client.close()
    llm_client._client = None
    return {"current": model_id}


@router.get("/monitor/stats")
async def get_stats():
    return {"stats": stats_collector.get_stats()}


@router.get("/monitor/logs")
async def get_logs(limit: int = 50, intent: Optional[str] = None):
    logs = stats_collector.get_logs(limit=limit, intent_filter=intent)
    return {
        "logs": [
            {
                "session_id": log.session_id,
                "user_query": log.user_query,
                "intent": log.intent,
                "domain": log.domain,
                "response_text": log.response_text[:200],
                "total_latency_ms": log.total_latency_ms,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ]
    }


@router.get("/monitor/health")
async def get_health():
    status = {"redis": "unknown", "openai": "unknown"}

    try:
        await stats_collector.get_stats()
        status["redis"] = "ok"
    except Exception:
        status["redis"] = "error"

    try:
        client = llm_client._ensure_client()
        from openai import AsyncOpenAI
        test_client = AsyncOpenAI(
            api_key=config_manager.get("OPENAI_API_KEY") or "",
            base_url=config_manager.get("OPENAI_BASE_URL") or "https://api.openai.com/v1",
        )
        await test_client.models.list()
        status["openai"] = "ok"
    except Exception as e:
        status["openai"] = f"error: {str(e)[:50]}"

    overall = "ok" if status["redis"] == "ok" and status["openai"] == "ok" else "degraded"
    return {"status": overall, "components": status}


@router.get("/prompts")
async def list_prompts():
    return {"prompts": prompt_manager.get_all()}


@router.get("/prompts/{name}")
async def get_prompt(name: str):
    prompt = prompt_manager.get_prompt(name)
    if not prompt:
        raise HTTPException(404, f"Prompt '{name}' 不存在")
    return {"prompt": prompt}


@router.put("/prompts/{name}")
async def update_prompt(name: str, body: dict):
    prompt = prompt_manager.update_prompt(
        name,
        system_prompt=body.get("system_prompt"),
        user_template=body.get("user_template"),
    )
    if not prompt:
        raise HTTPException(404, f"Prompt '{name}' 不存在")
    return {"prompt": prompt}


@router.get("/prompts/history/{name}")
async def get_prompt_history(name: str):
    history = prompt_manager.get_history(name)
    return {"history": history}


@router.post("/prompts/{name}/test")
async def test_prompt(name: str, body: dict):
    test_input = body.get("test_input", "")
    if not test_input:
        raise HTTPException(400, "需要 test_input")

    if name == "classifier":
        result = await classify_intent({
            "user_query": test_input,
            "chat_history": [],
        })
        return {"result": {"intent": result.get("intent"), "domain": result.get("domain")}}

    elif name == "rewriter":
        result = await rewrite_query({
            "user_query": test_input,
            "chat_history": [],
            "intent": "score_query",
        })
        return {"result": {"rewritten_query": result.get("rewritten_query")}}

    elif name == "generator":
        result = await generate_answer({
            "user_query": test_input,
            "retrieved_docs": [
                {"content": "【测试文档】这是一条用于测试的参考文档内容。", "score": 0.9, "source": "测试来源"}
            ],
            "chat_history": [],
        })
        return {"result": {"response": result.get("response"), "sources": result.get("sources")}}

    else:
        raise HTTPException(404, f"Prompt '{name}' 不支持测试")
