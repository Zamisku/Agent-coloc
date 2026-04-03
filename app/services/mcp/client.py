"""MCP Client 实现 - 用于调用外部 MCP 服务器"""

import asyncio
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class MCPClient:
    """MCP Client - 调用外部 MCP 服务器"""

    def __init__(self, command: str, args: list[str], env: dict[str, str]):
        self.command = command
        self.args = args
        self.env = env
        self._process: Optional[asyncio.subprocess.Process] = None
        self._request_id = 0
        self._lock = asyncio.Lock()

    async def _start(self) -> None:
        """启动子进程"""
        if self._process is not None:
            return

        self._process = await asyncio.create_subprocess_exec(
            self.command,
            *self.args,
            env={**self.env},
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        logger.info("mcp_client_started", command=self.command)

    async def _send_request(self, method: str, params: Optional[dict] = None) -> dict:
        """发送 JSON-RPC 请求"""
        await self._start()

        self._request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params or {},
        }

        request_str = json.dumps(request) + "\n"
        self._process.stdin.write(request_str.encode())
        await self._process.stdin.drain()

        # 读取响应
        response_line = await self._process.stdout.readline()
        if not response_line:
            raise Exception("No response from MCP server")

        response = json.loads(response_line.decode())

        if "error" in response:
            raise Exception(f"MCP error: {response['error']}")

        return response.get("result", {})

    async def list_tools(self) -> list[dict]:
        """列出所有可用工具"""
        result = await self._send_request("tools/list")
        return result.get("tools", [])

    async def call_tool(self, name: str, arguments: dict) -> dict:
        """调用工具"""
        result = await self._send_request("tools/call", {
            "name": name,
            "arguments": arguments,
        })
        return result

    async def close(self) -> None:
        """关闭子进程"""
        if self._process:
            self._process.terminate()
            await self._process.wait()
            self._process = None
            logger.info("mcp_client_closed", command=self.command)


class MiniMaxMCPClient(MCPClient):
    """MiniMax MCP Client"""

    def __init__(self, api_key: str, base_path: str = "/tmp"):
        super().__init__(
            command="uvx",
            args=["minimax-coding-plan-mcp"],
            env={
                "MINIMAX_API_KEY": api_key,
                "MINIMAX_API_HOST": "https://api.minimaxi.com",
                "MINIMAX_MCP_BASE_PATH": base_path,
            },
        )


# 全局客户端实例
_minimax_client: Optional[MiniMaxMCPClient] = None


async def get_minimax_client() -> MiniMaxMCPClient:
    """获取 MiniMax MCP Client 实例"""
    global _minimax_client
    if _minimax_client is None:
        from app.services.config_manager import config_manager

        api_key = config_manager.get("PROVIDER_MINIMAX_API_KEY") or ""
        _minimax_client = MiniMaxMCPClient(api_key)
    return _minimax_client
