from app.services.skills.base import BaseSkill, SkillResult
from app.services.skills.registry import register_skill
from app.services.mcp.client import get_minimax_client


@register_skill
class WebSearchSkill(BaseSkill):
    """MiniMax 联网搜索 Skill"""

    name = "web_search"
    description = "执行网络搜索。当用户询问需要最新信息、实时数据或超出本地知识库范围的问题时使用此工具进行联网搜索。"
    parameters = [
        {
            "name": "query",
            "description": "搜索查询词",
            "type": "string",
            "required": True,
        },
    ]

    async def execute(self, **kwargs) -> SkillResult:
        query = kwargs.get("query", "")

        if not query:
            return {
                "success": False,
                "result": None,
                "error": "query parameter is required",
            }

        try:
            client = await get_minimax_client()
            result = await client.call_tool("web_search", {"query": query})

            # 解析 MCP 返回结果
            content = result.get("content", [])
            if not content:
                return {
                    "success": True,
                    "result": "未找到相关搜索结果",
                    "error": None,
                }

            # 提取文本内容
            text = ""
            for item in content:
                if item.get("type") == "text":
                    text += item.get("text", "")

            if not text:
                return {
                    "success": True,
                    "result": "未找到相关搜索结果",
                    "error": None,
                }

            return {
                "success": True,
                "result": text,
                "error": None,
            }
        except Exception as e:
            return {
                "success": False,
                "result": None,
                "error": f"搜索失败: {str(e)}",
            }
