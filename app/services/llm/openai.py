from app.services.llm.base import BaseProvider


class OpenAIProvider(BaseProvider):
    name = "openai"
    display_name = "OpenAI"
    models = [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
    ]
    default_model = "gpt-4o"

    def __init__(
        self,
        api_key: str = "",
        model: str = "gpt-4o",
        base_url: str = "https://api.openai.com/v1",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ):
        super().__init__(api_key, model, base_url, temperature, max_tokens)
