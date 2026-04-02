from app.services.llm.base import BaseProvider


class DeepSeekProvider(BaseProvider):
    name = "deepseek"
    display_name = "DeepSeek"
    models = ["deepseek-chat", "deepseek-reasoner"]
    default_model = "deepseek-chat"

    def __init__(
        self,
        api_key: str = "",
        model: str = "deepseek-chat",
        base_url: str = "https://api.deepseek.com",
        temperature: float = 1.0,
        max_tokens: int = 2048,
    ):
        super().__init__(api_key, model, base_url, temperature, max_tokens)
