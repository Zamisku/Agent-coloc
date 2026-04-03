import httpx

from app.services.skills.base import BaseSkill, SkillResult
from app.services.skills.registry import register_skill
from app.services.config_manager import config_manager


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
            api_key = config_manager.get("PROVIDER_MINIMAX_API_KEY")
            if not api_key or api_key == "...":
                return {
                    "success": False,
                    "result": None,
                    "error": "MiniMax API Key 未配置，请在系统设置中配置",
                }

            base_url = config_manager.get("PROVIDER_MINIMAX_BASE_URL") or "https://api.minimaxi.com"
            model = config_manager.get("PROVIDER_MINIMAX_MODEL") or "MiniMax-M2.7"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/mcp/web_search",
                    json={"query": query},
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                data = response.json()

                # 解析搜索结果
                results = data.get("results", [])
                if not results:
                    return {
                        "success": True,
                        "result": "未找到相关搜索结果",
                        "error": None,
                    }

                formatted_results = []
                for i, item in enumerate(results[:5], 1):
                    title = item.get("title", "")
                    url = item.get("url", "")
                    snippet = item.get("snippet", "")
                    formatted_results.append(f"[{i}] {title}\n{snippet}\n来源：{url}")

                return {
                    "success": True,
                    "result": "\n\n".join(formatted_results),
                    "error": None,
                }
        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "result": None,
                "error": f"搜索请求失败: HTTP {e.response.status_code}",
            }
        except Exception as e:
            return {
                "success": False,
                "result": None,
                "error": f"搜索失败: {str(e)}",
            }
