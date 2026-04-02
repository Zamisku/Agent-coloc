from __future__ import annotations

from typing import Callable

from app.services.skills.base import BaseSkill, SkillResult


class SkillRegistry:
    """Skill 注册表"""

    def __init__(self):
        self._skills: dict[str, BaseSkill] = {}

    def register(self, skill: BaseSkill) -> None:
        """注册一个 Skill"""
        if not skill.name:
            raise ValueError("Skill name cannot be empty")
        self._skills[skill.name] = skill

    def get(self, name: str) -> BaseSkill | None:
        """获取指定名称的 Skill"""
        return self._skills.get(name)

    def list_skills(self) -> list[dict]:
        """列出所有已注册的 Skills"""
        return [
            {
                "name": skill.name,
                "description": skill.description,
                "parameters": skill.parameters,
            }
            for skill in self._skills.values()
        ]

    def get_tools(self) -> list[dict]:
        """获取所有 Skills 的 MCP Tools 格式"""
        return [skill.get_schema() for skill in self._skills.values()]

    async def execute(self, name: str, **kwargs) -> SkillResult:
        """执行指定名称的 Skill"""
        skill = self.get(name)
        if not skill:
            return {
                "success": False,
                "result": None,
                "error": f"Skill '{name}' not found",
            }
        try:
            result = await skill.execute(**kwargs)
            return result
        except Exception as e:
            return {
                "success": False,
                "result": None,
                "error": str(e),
            }

    def clear(self) -> None:
        """清空所有注册的 Skills"""
        self._skills.clear()


# 全局注册表实例
skill_registry = SkillRegistry()


def register_skill(skill: BaseSkill) -> Callable:
    """装饰器：注册 Skill"""
    skill_registry.register(skill)
    return skill
