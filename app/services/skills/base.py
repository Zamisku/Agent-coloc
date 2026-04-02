from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, TypedDict


class SkillParameter(TypedDict, total=False):
    """Skill 参数定义"""
    name: str
    description: str
    type: str
    required: bool
    default: Any | None


class SkillResult(TypedDict):
    """Skill 执行结果"""
    success: bool
    result: str | None
    error: str | None


class BaseSkill(ABC):
    """Skill 基类"""

    name: str = ""
    description: str = ""
    parameters: list[SkillParameter] = []

    @abstractmethod
    async def execute(self, **kwargs) -> SkillResult:
        """
        执行 Skill

        Returns:
            SkillResult: 包含 success, result, error 的字典
        """
        pass

    def get_schema(self) -> dict:
        """获取 JSON Schema 格式的参数定义"""
        properties = {}
        required = []
        for param in self.parameters:
            properties[param["name"]] = {
                "type": param["type"],
                "description": param["description"],
            }
            if param.get("default") is not None:
                properties[param["name"]]["default"] = param["default"]
            if param.get("required"):
                required.append(param["name"])

        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        }
