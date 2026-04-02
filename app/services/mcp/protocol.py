"""MCP JSON-RPC 协议处理器"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

from app.services.mcp.types import (
    MCPJsonRpcRequest,
    MCPJsonRpcResponse,
    MCPError,
    MCPCode,
)


class MCPProtocol:
    """MCP JSON-RPC 协议处理器"""

    @staticmethod
    def parse_request(data: str | bytes) -> MCPJsonRpcRequest | MCPError:
        """解析 JSON-RPC 请求"""
        try:
            if isinstance(data, bytes):
                data = data.decode("utf-8")
            parsed = json.loads(data)
        except json.JSONDecodeError:
            return {
                "jsonrpc": "2.0",
                "id": None,
                "result": None,
                "error": {
                    "code": MCPCode.PARSE_ERROR,
                    "message": "Invalid JSON",
                    "data": None,
                },
            }

        if not isinstance(parsed, dict):
            return {
                "jsonrpc": "2.0",
                "id": None,
                "result": None,
                "error": {
                    "code": MCPCode.INVALID_REQUEST,
                    "message": "Request must be an object",
                    "data": None,
                },
            }

        if parsed.get("jsonrpc") != "2.0":
            return {
                "jsonrpc": "2.0",
                "id": parsed.get("id"),
                "result": None,
                "error": {
                    "code": MCPCode.INVALID_REQUEST,
                    "message": "Invalid JSON-RPC version",
                    "data": None,
                },
            }

        return {
            "jsonrpc": "2.0",
            "id": parsed.get("id"),
            "method": parsed.get("method", ""),
            "params": parsed.get("params"),
        }

    @staticmethod
    def create_response(id: int | str | None, result: dict) -> MCPJsonRpcResponse:
        """创建成功响应"""
        return {
            "jsonrpc": "2.0",
            "id": id,
            "result": result,
            "error": None,
        }

    @staticmethod
    def create_error(id: int | str | None, code: int, message: str, data: Any = None) -> MCPJsonRpcResponse:
        """创建错误响应"""
        return {
            "jsonrpc": "2.0",
            "id": id,
            "result": None,
            "error": {
                "code": code,
                "message": message,
                "data": data,
            },
        }

    @staticmethod
    def serialize(response: MCPJsonRpcResponse) -> str:
        """序列化响应为 JSON 字符串"""
        return json.dumps(response, ensure_ascii=False)

    @staticmethod
    def serialize_event(event: str, data: dict) -> str:
        """序列化 SSE 事件"""
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

    @staticmethod
    def serialize_message(message: str) -> str:
        """序列化普通消息"""
        return f"data: {json.dumps(message, ensure_ascii=False)}\n\n"
