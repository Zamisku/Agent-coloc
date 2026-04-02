from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from app.logging_config import get_logger
from app.services.config_manager import config_manager, CONFIG_SCHEMA
from app.services.llm_client import llm_client
from app.services.llm import (
    llm_router,
    get_llm_mode,
    get_active_provider,
    get_multi_providers,
    set_llm_mode,
    set_active_provider,
    set_multi_providers,
    update_provider_config,
    get_all_providers_info,
)
from app.services.stats_collector import stats_collector
from app.services.prompt_manager import prompt_manager
from app.services.skills.init import get_all_tools, execute_tool
from app.services.mcp.server import get_mcp_server
from app.agent.nodes.classifier import classify_intent
from app.agent.nodes.rewriter import rewrite_query
from app.agent.nodes.generator import generate_answer
from app.models.schemas import RequestLog
from datetime import datetime


router = APIRouter(prefix="/api", tags=["admin"])


# === Provider 路由 ===

@router.get("/providers")
async def list_providers():
    """获取所有可用的 Provider"""
    providers = get_all_providers_info()
    return {
        "providers": providers,
        "mode": get_llm_mode(),
        "active": get_active_provider(),
        "multi": get_multi_providers(),
    }


@router.put("/llm-mode")
async def set_llm_mode_endpoint(body: dict):
    """切换 LLM 模式 (single/multi)"""
    mode = body.get("mode")
    if mode not in ("single", "multi"):
        raise HTTPException(400, "mode 必须是 single 或 multi")
    await set_llm_mode(mode)
    llm_router.reset_providers()
    return {"mode": mode}


@router.get("/providers/{name}/models")
async def get_provider_models(name: str):
    """获取某 Provider 的模型列表"""
    providers_info = get_all_providers_info()
    for p in providers_info:
        if p["name"] == name:
            return {"provider": name, "models": p["models"], "default": p["default_model"]}
    raise HTTPException(404, f"Provider {name} 不存在")


@router.put("/providers/{name}/config")
async def update_provider_config_endpoint(name: str, body: dict):
    """更新 Provider 配置"""
    if name not in ("deepseek", "minimax"):
        raise HTTPException(400, "无效的 Provider 名称")

    api_key = body.get("api_key")
    model = body.get("model")
    base_url = body.get("base_url")

    await update_provider_config(name, api_key=api_key, model=model, base_url=base_url)
    llm_router.reset_providers()

    return {"message": f"Provider {name} 配置已更新"}


@router.get("/providers/health")
async def providers_health():
    """检查所有 Provider 的健康状态"""
    health = await llm_router.health_check()
    return {"health": health}


# === Model 路由（兼容） ===

@router.get("/models")
async def list_models():
    """获取所有模型列表（按 Provider 分组）"""
    providers = get_all_providers_info()
    all_models = []
    for p in providers:
        for m in p["models"]:
            all_models.append({
                "id": m,
                "name": m,
                "provider": p["name"],
                "description": f"{p['display_name']} - {m}"
            })
    return {"models": all_models}


@router.get("/models/current")
async def get_current_model():
    """获取当前模型"""
    provider = get_active_provider()
    model = config_manager.get(f"PROVIDER_{provider.upper()}_MODEL") or ""
    # 返回 provider:model 格式
    current = f"{provider}:{model}" if model else provider
    return {"current": current, "provider": provider, "model": model}


@router.put("/models/current")
async def set_current_model(body: dict):
    """切换当前模型（单源模式）"""
    model_id = body.get("model_id")
    if not model_id:
        raise HTTPException(400, "需要 model_id")

    provider = body.get("provider", get_active_provider())
    if not provider:
        raise HTTPException(400, "需要 provider")

    logger = get_logger(__name__)
    logger.info("switch_model_request", provider=provider, model=model_id)

    await update_provider_config(provider, model=model_id)
    logger.info("update_provider_config_done", provider=provider, model=model_id)

    await set_active_provider(provider)
    logger.info("set_active_provider_done", provider=provider)

    llm_router.reset_providers()
    logger.info("providers_reset_done")

    # 验证更新
    new_provider = get_active_provider()
    new_model = config_manager.get(f"PROVIDER_{provider.upper()}_MODEL")
    logger.info("switch_model_verification", new_provider=new_provider, new_model=new_model)

    return {"current": f"{provider}:{model_id}", "provider": provider, "model": model_id}


# === Settings 路由 ===

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

    # 检查是否涉及 LLM 配置
    llm_keys = {"LLM_MODE", "LLM_PROVIDER", "MULTI_PROVIDERS",
                 "PROVIDER_DEEPSEEK_API_KEY", "PROVIDER_MINIMAX_API_KEY"}
    if llm_keys & set(updates.keys()):
        llm_router.reset_providers()

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

    if key.startswith("PROVIDER_") or key in {"LLM_MODE", "LLM_PROVIDER"}:
        llm_router.reset_providers()

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

    llm_router.reset_providers()
    return {"message": "已重置为默认值", "settings": config_manager.get_all()}


# === Monitor 路由 ===

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
    status = {"redis": "unknown", "llm": "unknown"}

    try:
        await stats_collector.get_stats()
        status["redis"] = "ok"
    except Exception:
        status["redis"] = "error"

    try:
        llm_health = await llm_router.health_check()
        provider_statuses = [v for v in llm_health.values() if v == "ok"]
        if provider_statuses:
            status["llm"] = "ok"
        else:
            status["llm"] = "no_provider_configured"
    except Exception as e:
        status["llm"] = f"error: {str(e)[:50]}"

    overall = "ok" if status["redis"] == "ok" else "degraded"
    return {"status": overall, "components": status}


# === Prompts 路由 ===

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
    history = await prompt_manager.get_history(name)
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


# === Skills 路由 ===

@router.get("/skills")
async def list_skills():
    """获取所有可用的 Skills"""
    from app.services.skills.registry import skill_registry
    return {
        "skills": skill_registry.list_skills(),
    }


@router.post("/skills/call")
async def call_skill(body: dict):
    """调用指定的 Skill"""
    skill_name = body.get("skill")
    params = body.get("params", {})

    if not skill_name:
        raise HTTPException(400, "需要 skill 参数")

    result = await execute_tool(skill_name, params)
    return result


# === MCP 路由 ===

@router.get("/mcp/tools")
async def list_mcp_tools():
    """获取 MCP Tools 列表"""
    mcp_server = await get_mcp_server()
    return {
        "tools": mcp_server._tools,
    }


@router.post("/mcp/call")
async def call_mcp_tool(body: dict):
    """调用 MCP Tool"""
    tool_name = body.get("name")
    arguments = body.get("arguments", {})

    if not tool_name:
        raise HTTPException(400, "需要 name 参数")

    mcp_server = await get_mcp_server()
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments,
        },
    }
    response = await mcp_server.handle_request(request)
    return response


# === RAG 路由 ===

@router.post("/rag/test")
async def test_rag(body: dict):
    """测试 RAG 检索功能"""
    from app.services.rag_client import rag_client

    query = body.get("query", "")
    domain = body.get("domain", "admission")
    top_k = body.get("top_k")

    if not query:
        raise HTTPException(400, "需要 query 参数")

    result = await rag_client.retrieve(query, domain, top_k)

    return {
        "query": result.query,
        "domain": result.domain,
        "documents": [
            {
                "content": doc.content,
                "score": doc.score,
                "source": doc.source,
                "metadata": doc.metadata,
            }
            for doc in result.documents
        ],
    }
