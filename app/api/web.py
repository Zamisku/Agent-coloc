import asyncio
import time
from typing import AsyncIterator
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.adapters.web import WebAdapter
from app.agent.graph import agent_graph
from app.agent.state import AgentState
from app.agent.nodes.generator import generate_answer
from app.agent.nodes.clarify import ask_clarification
from app.agent.nodes.fallback import fallback_response
from app.models.schemas import ChatRequest, ChatResponse, RetrievedDoc, RequestLog
from app.services.memory import memory_service
from app.services.llm_client import llm_client
from app.services.stats_collector import stats_collector
from app.services.prompt_manager import prompt_manager


router = APIRouter(prefix="/api", tags=["chat"])
adapter = WebAdapter()


async def _run_planning_phase(state: AgentState) -> AgentState:
    """运行规划阶段: classify → rewrite → retrieve → evaluate"""
    result = await agent_graph.ainvoke(state, stream_mode="values")
    return result


async def _stream_generate(state: AgentState) -> AsyncIterator[str]:
    """流式生成回答"""
    user_query = state.get("user_query", "")
    retrieved_docs = state.get("retrieved_docs") or []
    chat_history = state.get("chat_history", [])

    if not retrieved_docs:
        context = "（无相关参考资料）"
    else:
        parts = []
        for doc in retrieved_docs:
            source = doc.get("source", "未知来源")
            content = doc.get("content", "")
            parts.append(f"[来源：{source}] {content}")
        context = "\n\n".join(parts)

    if not chat_history:
        history_str = "（无历史对话）"
    else:
        recent = chat_history[-6:]
        lines = []
        for msg in recent:
            role = "用户" if msg.get("role") == "user" else "助手"
            lines.append(f"{role}：{msg.get('content', '')}")
        history_str = "\n".join(lines)

    messages = [
        {
            "role": "system",
            "content": prompt_manager.get_current_system_prompt("generator"),
        },
        {
            "role": "user",
            "content": prompt_manager.get_current_user_template("generator").format(
                query=user_query, context=context, chat_history=history_str
            ),
        },
    ]

    async for token in llm_client.generate_stream(messages):
        yield token


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    start_time = time.time()

    unified = adapter.to_unified(request.model_dump())
    session_id = unified.session_id

    history = await memory_service.get_history(session_id)
    pending_slot = await memory_service.get_pending_slot(session_id)

    initial_state: AgentState = {
        "session_id": session_id,
        "user_query": unified.content,
        "chat_history": history,
        "intent": None,
        "domain": None,
        "rewritten_query": None,
        "retrieved_docs": None,
        "top_relevance_score": None,
        "retrieval_quality": None,
        "response": None,
        "sources": [],
        "need_clarification": False,
        "user_intent": unified.metadata.get('user_intent'),
        "intent_mode": unified.metadata.get('intent_mode'),
        "intent_rejected": False,
        "pending_slot": pending_slot,
    }

    result = await _run_planning_phase(initial_state)

    latency_ms = int((time.time() - start_time) * 1000)

    await memory_service.add_message(session_id, "user", unified.content)
    await memory_service.add_message(
        session_id, "assistant", result.get("response", "")
    )

    log = RequestLog(
        session_id=session_id,
        user_query=unified.content,
        intent=result.get("intent"),
        domain=result.get("domain"),
        rewritten_query=result.get("rewritten_query"),
        retrieval_scores=[
            doc.get("score", 0) for doc in (result.get("retrieved_docs") or [])
        ],
        response_text=result.get("response", ""),
        total_latency_ms=latency_ms,
        llm_calls=1,
        timestamp=datetime.now(),
    )
    stats_collector.record_request(log)

    sources = []
    for doc in result.get("retrieved_docs") or []:
        sources.append(
            RetrievedDoc(
                content=doc.get("content", ""),
                score=doc.get("score", 0.0),
                source=doc.get("source", ""),
                metadata=doc.get("metadata", {}),
            )
        )

    return ChatResponse(
        session_id=session_id,
        reply=result.get("response", ""),
        sources=sources,
        intent=result.get("intent"),
        debug={
            "intent": result.get("intent"),
            "domain": result.get("domain"),
            "rewritten_query": result.get("rewritten_query"),
            "retrieval_quality": result.get("retrieval_quality"),
            "top_relevance_score": result.get("top_relevance_score"),
            "latency_ms": latency_ms,
        },
    )


async def chat_stream_generator(request: ChatRequest) -> AsyncIterator[dict]:
    start_time = time.time()

    unified = adapter.to_unified(request.model_dump())
    session_id = unified.session_id

    yield {"event": "session_id", "data": session_id}

    history = await memory_service.get_history(session_id)
    pending_slot = await memory_service.get_pending_slot(session_id)

    initial_state: AgentState = {
        "session_id": session_id,
        "user_query": unified.content,
        "chat_history": history,
        "intent": None,
        "domain": None,
        "rewritten_query": None,
        "retrieved_docs": None,
        "top_relevance_score": None,
        "retrieval_quality": None,
        "response": None,
        "sources": [],
        "need_clarification": False,
        "user_intent": unified.metadata.get('user_intent'),
        "intent_mode": unified.metadata.get('intent_mode'),
        "intent_rejected": False,
        "pending_slot": pending_slot,
    }

    result = await _run_planning_phase(initial_state)

    quality = result.get("retrieval_quality", "no_result")
    response_text = ""

    if quality == "sufficient":
        async for token in _stream_generate(result):
            response_text += token
            yield {"event": "message", "data": token}
    elif quality == "need_clarify":
        clarification_result = await ask_clarification(result)
        response_text = clarification_result.get("response", "")
        yield {"event": "message", "data": response_text}
    else:
        fallback_result = await fallback_response(result)
        response_text = fallback_result.get("response", "")
        yield {"event": "message", "data": response_text}

    await memory_service.add_message(session_id, "user", unified.content)
    await memory_service.add_message(session_id, "assistant", response_text)

    latency_ms = int((time.time() - start_time) * 1000)

    log = RequestLog(
        session_id=session_id,
        user_query=unified.content,
        intent=result.get("intent"),
        domain=result.get("domain"),
        rewritten_query=result.get("rewritten_query"),
        retrieval_scores=[
            doc.get("score", 0) for doc in (result.get("retrieved_docs") or [])
        ],
        response_text=response_text,
        total_latency_ms=latency_ms,
        llm_calls=1,
        timestamp=datetime.now(),
    )
    stats_collector.record_request(log)

    debug_data = {
        "intent": result.get("intent"),
        "domain": result.get("domain"),
        "rewritten_query": result.get("rewritten_query"),
        "retrieval_quality": quality,
        "top_relevance_score": result.get("top_relevance_score"),
        "latency_ms": latency_ms,
    }
    yield {"event": "debug", "data": debug_data}
    yield {"event": "done", "data": ""}


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> EventSourceResponse:
    return EventSourceResponse(chat_stream_generator(request))


# === Workflow 路由 ===

@router.post("/workflow/stream")
async def workflow_stream(request: ChatRequest) -> EventSourceResponse:
    """工作流实时流式输出，包含每个节点的执行状态"""

    async def workflow_generator(request: ChatRequest) -> AsyncIterator[dict]:
        from app.agent.nodes import (
            classify_intent,
            rewrite_query,
            retrieve_docs,
            evaluate_results,
            generate_answer,
            ask_clarification,
            fallback_response,
            call_tools,
        )
        from app.agent.graph import _route_after_classify, _route_by_quality, _route_after_generate
        from app.models.schemas import END

        start_time = time.time()

        unified = adapter.to_unified(request.model_dump())
        session_id = unified.session_id

        yield {"event": "session_id", "data": session_id}
        yield {"event": "node", "data": "classify", "status": "active"}

        history = await memory_service.get_history(session_id)
        pending_slot = await memory_service.get_pending_slot(session_id)

        state: AgentState = {
            "session_id": session_id,
            "user_query": unified.content,
            "chat_history": history,
            "intent": None,
            "domain": None,
            "rewritten_query": None,
            "retrieved_docs": None,
            "top_relevance_score": None,
            "retrieval_quality": None,
            "response": None,
            "sources": [],
            "need_clarification": False,
            "user_intent": unified.metadata.get('user_intent'),
            "intent_mode": unified.metadata.get('intent_mode'),
            "intent_rejected": False,
            "pending_slot": pending_slot,
        }

        try:
            # Classify
            state = await classify_intent(state)
            yield {"event": "node", "data": "classify", "status": "completed", "state": _safe_state(state)}

            # Route
            next_node = _route_after_classify(state)
            if next_node == "fallback":
                yield {"event": "node", "data": "fallback", "status": "active"}
                state = await fallback_response(state)
                yield {"event": "node", "data": "fallback", "status": "completed", "state": _safe_state(state)}
            else:
                # Rewrite
                yield {"event": "node", "data": "rewrite", "status": "active"}
                state = await rewrite_query(state)
                yield {"event": "node", "data": "rewrite", "status": "completed", "state": _safe_state(state)}

                # Retrieve
                yield {"event": "node", "data": "retrieve", "status": "active"}
                state = await retrieve_docs(state)
                yield {"event": "node", "data": "retrieve", "status": "completed", "state": _safe_state(state)}

                # Evaluate
                yield {"event": "node", "data": "evaluate", "status": "active"}
                state = await evaluate_results(state)
                yield {"event": "node", "data": "evaluate", "status": "completed", "state": _safe_state(state)}

                # Route by quality
                quality = state.get("retrieval_quality", "no_result")
                next_node = _route_by_quality(state)

                if next_node == "generate":
                    # 可能多轮 tool_call
                    while True:
                        yield {"event": "node", "data": "generate", "status": "active"}
                        state = await generate_answer(state)
                        yield {"event": "node", "data": "generate", "status": "completed", "state": _safe_state(state)}

                        tool_calls = state.get("tool_calls")
                        if tool_calls:
                            yield {"event": "node", "data": "tool_call", "status": "active"}
                            state = await call_tools(state)
                            yield {"event": "node", "data": "tool_call", "status": "completed", "state": _safe_state(state)}
                        else:
                            break

                elif next_node == "clarify":
                    yield {"event": "node", "data": "clarify", "status": "active"}
                    state = await ask_clarification(state)
                    yield {"event": "node", "data": "clarify", "status": "completed", "state": _safe_state(state)}

                else:
                    yield {"event": "node", "data": "fallback", "status": "active"}
                    state = await fallback_response(state)
                    yield {"event": "node", "data": "fallback", "status": "completed", "state": _safe_state(state)}

            latency_ms = int((time.time() - start_time) * 1000)
            yield {
                "event": "done",
                "data": "",
                "latency_ms": latency_ms,
                "response": state.get("response", ""),
            }

            # 保存对话记忆
            await memory_service.add_message(session_id, "user", unified.content)
            await memory_service.add_message(session_id, "assistant", state.get("response", ""))

        except Exception as e:
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(workflow_generator(request))


def _safe_state(state: AgentState) -> dict:
    """提取可用于调试的状态信息"""
    return {
        "intent": state.get("intent"),
        "domain": state.get("domain"),
        "rewritten_query": state.get("rewritten_query"),
        "retrieval_quality": state.get("retrieval_quality"),
        "top_relevance_score": state.get("top_relevance_score"),
        "tool_calls": state.get("tool_calls"),
    }
