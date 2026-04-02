from datetime import datetime

from app.services.skills.base import BaseSkill, SkillResult
from app.services.skills.registry import register_skill


@register_skill
class DateTimeSkill(BaseSkill):
    """日期时间 Skill"""

    name = "get_datetime"
    description = "获取当前日期和时间。适用于询问当前日期、时间、今天是星期几等问题。"
    parameters = [
        {
            "name": "format",
            "description": "日期时间格式，如 '%Y-%m-%d %H:%M:%S'。留空返回可读格式。",
            "type": "string",
            "required": False,
            "default": None,
        },
        {
            "name": "timezone",
            "description": "时区，如 'Asia/Shanghai'。留空使用服务器本地时区。",
            "type": "string",
            "required": False,
            "default": None,
        },
    ]

    async def execute(self, **kwargs) -> SkillResult:
        format_str = kwargs.get("format")
        timezone = kwargs.get("timezone")

        try:
            now = datetime.now()

            if timezone:
                import pytz
                tz = pytz.timezone(timezone)
                now = now.astimezone(tz)

            if format_str:
                result = now.strftime(format_str)
            else:
                weekday_names = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
                weekday = weekday_names[now.weekday()]
                result = f"{now.strftime('%Y年%m月%d日')} {now.strftime('%H:%M:%S')} {weekday}"

            return {
                "success": True,
                "result": result,
                "error": None,
            }
        except Exception as e:
            return {
                "success": False,
                "result": None,
                "error": str(e),
            }
