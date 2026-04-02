"""MCP 协议类型定义"""

from __future__ import annotations

from typing import Any, TypedDict, Literal


class MCPJsonRpcRequest(TypedDict):
    """JSON-RPC 请求"""
    jsonrpc: Literal["2.0"]
    id: int | str | None
    method: str
    params: dict | None


class MCPJsonRpcResponse(TypedDict):
    """JSON-RPC 响应"""
    jsonrpc: Literal["2.0"]
    id: int | str | None
    result: dict | None
    error: dict | None


class MCPError(TypedDict):
    """JSON-RPC 错误"""
    code: int
    message: str
    data: Any | None


class MCPMessage(TypedDict):
    """MCP 消息基类"""
    method: str
    params: dict | None


class MCPTool(TypedDict):
    """MCP Tool 定义"""
    name: str
    description: str
    inputSchema: dict


class MCPResource(TypedDict):
    """MCP Resource 定义"""
    uri: str
    name: str
    description: str | None
    mimeType: str | None


class MCPPrompt(TypedDict):
    """MCP Prompt 定义"""
    name: str
    description: str | None
    arguments: list[dict] | None


# MCP 错误码
class MCPCode:
    """MCP 错误码"""
    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    INTERNAL_ERROR = -32603
    TOOL_NOT_FOUND = -32001
    TOOL_EXECUTION_ERROR = -32002


# MCP 方法名
class MCPMethod:
    """MCP 方法名"""
    INITIALIZE = "initialize"
    TOOLS_LIST = "tools/list"
    TOOLS_CALL = "tools/call"
    RESOURCES_LIST = "resources/list"
    RESOURCES_READ = "resources/read"
    PROMPTS_LIST = "prompts/list"
    PROMPTS_GET = "prompts/get"
