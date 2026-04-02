"""MCP Server 实现"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator

from app.services.mcp.protocol import MCPProtocol
from app.services.mcp.types import (
    MCPTool,
    MCPResource,
    MCPPrompt,
    MCPMethod,
    MCPCode,
)
from app.services.skills.init import get_all_tools, execute_tool
from app.services.prompt_manager import prompt_manager
from app.services.config_manager import config_manager

logger = logging.getLogger(__name__)


class MCPServer:
    """MCP Server - 提供 Tools、Resources、Prompts 能力"""

    def __init__(self):
        self.protocol = MCPProtocol()
        self._tools: list[MCPTool] = []
        self._resources: list[MCPResource] = []
        self._prompts: list[MCPPrompt] = []
        self._initialized = False

    async def initialize(self) -> None:
        """初始化 MCP Server"""
        # 从 Skills 获取工具
        skill_tools = get_all_tools()
        self._tools = [
            {
                "name": t["name"],
                "description": t["description"],
                "inputSchema": t["parameters"],
            }
            for t in skill_tools
        ]
        logger.info("mcp_tools_loaded", count=len(self._tools))

    async def handle_request(self, request: dict) -> dict:
        """处理 JSON-RPC 请求"""
        method = request.get("method", "")
        req_id = request.get("id")
        params = request.get("params") or {}

        # 初始化
        if method == MCPMethod.INITIALIZE:
            return self.protocol.create_response(req_id, {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": True},
                    "resources": {"subscribe": True, "listChanged": True},
                    "prompts": {"listChanged": True},
                },
                "serverInfo": {
                    "name": "school-agent-mcp",
                    "version": "1.0.0",
                },
            })

        # Tools
        if method == MCPMethod.TOOLS_LIST:
            return self.protocol.create_response(req_id, {
                "tools": self._tools,
            })

        if method == MCPMethod.TOOLS_CALL:
            return await self._handle_tool_call(req_id, params)

        # Resources
        if method == MCPMethod.RESOURCES_LIST:
            return self.protocol.create_response(req_id, {
                "resources": self._resources,
            })

        # Prompts
        if method == MCPMethod.PROMPTS_LIST:
            prompts = prompt_manager.list_prompts()
            self._prompts = [
                {
                    "name": p["name"],
                    "description": p.get("description", ""),
                    "arguments": [],
                }
                for p in prompts
            ]
            return self.protocol.create_response(req_id, {
                "prompts": self._prompts,
            })

        # 未知方法
        return self.protocol.create_error(
            req_id,
            MCPCode.METHOD_NOT_FOUND,
            f"Method '{method}' not found",
        )

    async def _handle_tool_call(self, req_id: int | str | None, params: dict) -> dict:
        """处理工具调用"""
        tool_name = params.get("name", "")
        arguments = params.get("arguments", {})

        # 查找工具
        tool = None
        for t in self._tools:
            if t["name"] == tool_name:
                tool = t
                break

        if not tool:
            return self.protocol.create_error(
                req_id,
                MCPCode.TOOL_NOT_FOUND,
                f"Tool '{tool_name}' not found",
            )

        # 执行工具
        try:
            result = await execute_tool(tool_name, arguments)
            return self.protocol.create_response(req_id, {
                "content": [
                    {
                        "type": "text",
                        "text": result.get("result", "") if result.get("success") else f"Error: {result.get('error')}",
                    }
                ],
                "isError": not result.get("success", False),
            })
        except Exception as e:
            logger.error("tool_execution_error", tool=tool_name, error=str(e))
            return self.protocol.create_error(
                req_id,
                MCPCode.TOOL_EXECUTION_ERROR,
                f"Tool execution failed: {str(e)}",
            )

    async def handle_stdio(self, input_stream: AsyncIterator[bytes]) -> AsyncIterator[bytes]:
        """处理 stdio 输入流"""
        buffer = ""

        async for chunk in input_stream:
            buffer += chunk.decode("utf-8")

            # 按行处理
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue

                # 解析请求
                request = self.protocol.parse_request(line)
                if "error" in request and request["error"]:
                    yield self.protocol.serialize(request["error"]).encode("utf-8")
                    continue

                # 处理请求并返回响应
                response = await self.handle_request(request)
                yield self.protocol.serialize(response).encode("utf-8")


# 全局 MCP Server 实例
_mcp_server: MCPServer | None = None


async def get_mcp_server() -> MCPServer:
    """获取或创建 MCP Server 实例"""
    global _mcp_server
    if _mcp_server is None:
        _mcp_server = MCPServer()
        await _mcp_server.initialize()
    return _mcp_server
