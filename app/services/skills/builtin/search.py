from datetime import datetime

from app.services.skills.base import BaseSkill, SkillResult
from app.services.skills.registry import register_skill


@register_skill
class SearchDocsSkill(BaseSkill):
    """搜索文档 Skill（封装 RAG 检索）"""

    name = "search_docs"
    description = "搜索相关文档资料。当用户询问招生政策、专业信息、录取分数等问题时使用此工具检索相关文档。"
    parameters = [
        {
            "name": "query",
            "description": "搜索关键词或问题",
            "type": "string",
            "required": True,
        },
        {
            "name": "domain",
            "description": "领域类型（admission/academic/career/general），留空则自动判断",
            "type": "string",
            "required": False,
            "default": None,
        },
        {
            "name": "top_k",
            "description": "返回结果数量",
            "type": "integer",
            "required": False,
            "default": 3,
        },
    ]

    def __init__(self):
        super().__init__()
        self._rag_client = None

    @property
    def rag_client(self):
        """延迟加载 RAG 客户端"""
        if self._rag_client is None:
            from app.services.rag_client import rag_client
            self._rag_client = rag_client
        return self._rag_client

    async def execute(self, **kwargs) -> SkillResult:
        query = kwargs.get("query", "")
        domain = kwargs.get("domain")
        top_k = kwargs.get("top_k", 3)

        if not query:
            return {
                "success": False,
                "result": None,
                "error": "query parameter is required",
            }

        try:
            docs = await self.rag_client.retrieve(query, domain, top_k=top_k)
            if not docs:
                return {
                    "success": True,
                    "result": "未找到相关文档",
                    "error": None,
                }

            results = []
            for i, doc in enumerate(docs, 1):
                content = doc.get("content", "")
                source = doc.get("source", "未知来源")
                score = doc.get("score", 0)
                results.append(f"[{i}] {content}\n来源：{source} (相关度：{score:.2f})")

            return {
                "success": True,
                "result": "\n\n".join(results),
                "error": None,
            }
        except Exception as e:
            return {
                "success": False,
                "result": None,
                "error": f"检索失败: {str(e)}",
            }
