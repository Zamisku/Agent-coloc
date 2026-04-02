from datetime import datetime
from typing import Any, Optional

from app.prompts.classifier import (
    CLASSIFIER_SYSTEM_PROMPT,
    CLASSIFIER_USER_TEMPLATE,
)
from app.prompts.rewriter import (
    REWRITER_SYSTEM_PROMPT,
    REWRITER_USER_TEMPLATE,
)
from app.prompts.generator import (
    GENERATOR_SYSTEM_PROMPT,
    GENERATOR_USER_TEMPLATE,
    CLARIFICATION_TEMPLATE,
    FALLBACK_TEMPLATE,
)


class PromptManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self) -> None:
        self._prompts: dict[str, dict] = {}
        self._load_prompts()

    def _load_prompts(self) -> None:
        self._prompts = {
            "classifier": {
                "name": "classifier",
                "description": "意图分类器 - 识别用户问题类型",
                "system_prompt": CLASSIFIER_SYSTEM_PROMPT,
                "user_template": CLASSIFIER_USER_TEMPLATE,
                "version": 1,
                "history": [],
            },
            "rewriter": {
                "name": "rewriter",
                "description": "Query 改写器 - 优化搜索语句",
                "system_prompt": REWRITER_SYSTEM_PROMPT,
                "user_template": REWRITER_USER_TEMPLATE,
                "version": 1,
                "history": [],
            },
            "generator": {
                "name": "generator",
                "description": "回答生成器 - 基于上下文生成回答",
                "system_prompt": GENERATOR_SYSTEM_PROMPT,
                "user_template": GENERATOR_USER_TEMPLATE,
                "version": 1,
                "history": [],
            },
            "clarification": {
                "name": "clarification",
                "description": "追问生成器 - 信息不足时追问用户",
                "system_prompt": "",
                "user_template": CLARIFICATION_TEMPLATE,
                "version": 1,
                "history": [],
            },
            "fallback": {
                "name": "fallback",
                "description": "兜底回复 - 无法回答时的引导",
                "system_prompt": "",
                "user_template": FALLBACK_TEMPLATE,
                "version": 1,
                "history": [],
            },
        }

    def get_all(self) -> list[dict]:
        return [
            {
                "name": p["name"],
                "description": p["description"],
                "version": p["version"],
            }
            for p in self._prompts.values()
        ]

    def get_prompt(self, name: str) -> Optional[dict]:
        prompt = self._prompts.get(name)
        if not prompt:
            return None
        return {
            "name": prompt["name"],
            "description": prompt["description"],
            "system_prompt": prompt["system_prompt"],
            "user_template": prompt["user_template"],
            "version": prompt["version"],
        }

    def update_prompt(
        self,
        name: str,
        system_prompt: Optional[str] = None,
        user_template: Optional[str] = None,
    ) -> Optional[dict]:
        prompt = self._prompts.get(name)
        if not prompt:
            return None

        changes = {}
        if system_prompt is not None and system_prompt != prompt["system_prompt"]:
            changes["system_prompt"] = {
                "old": prompt["system_prompt"],
                "new": system_prompt,
                "updated_at": datetime.now().isoformat(),
            }
            prompt["system_prompt"] = system_prompt

        if user_template is not None and user_template != prompt["user_template"]:
            changes["user_template"] = {
                "old": prompt["user_template"],
                "new": user_template,
                "updated_at": datetime.now().isoformat(),
            }
            prompt["user_template"] = user_template

        if changes:
            prompt["history"].append({
                "version": prompt["version"],
                "changes": changes,
                "updated_at": datetime.now().isoformat(),
            })
            prompt["version"] += 1

        return self.get_prompt(name)

    def get_history(self, name: str) -> list:
        prompt = self._prompts.get(name)
        if not prompt:
            return []
        return prompt["history"]

    def get_current_system_prompt(self, name: str) -> str:
        prompt = self._prompts.get(name)
        if not prompt:
            raise ValueError(f"Prompt '{name}' not found")
        return prompt["system_prompt"]

    def get_current_user_template(self, name: str) -> str:
        prompt = self._prompts.get(name)
        if not prompt:
            raise ValueError(f"Prompt '{name}' not found")
        return prompt["user_template"]


prompt_manager = PromptManager()
