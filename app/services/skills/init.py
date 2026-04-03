"""初始化内置 Skills"""

import logging

logger = logging.getLogger(__name__)


def init_skills():
    """初始化并注册所有内置 Skills"""
    from app.services.skills.registry import skill_registry
    from app.services.skills.builtin import SearchDocsSkill, DateTimeSkill, WebSearchSkill

    # 注册内置 Skills
    skill_registry.register(SearchDocsSkill())
    skill_registry.register(DateTimeSkill())
    skill_registry.register(WebSearchSkill())

    logger.info("skills_registered", count=len(skill_registry.list_skills()), tools=skill_registry.list_skills())


def get_all_tools() -> list[dict]:
    """获取所有可用的工具定义"""
    from app.services.skills.registry import skill_registry
    return skill_registry.get_tools()


async def execute_tool(name: str, arguments: dict) -> dict:
    """执行指定工具"""
    from app.services.skills.registry import skill_registry
    return await skill_registry.execute(name, **arguments)
