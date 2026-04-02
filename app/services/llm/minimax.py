from app.services.llm.base import BaseProvider


class MiniMaxProvider(BaseProvider):
    name = "minimax"
    display_name = "MiniMax"
    models = [
        "MiniMax-M2.7",
        "MiniMax-M2.7-highspeed",
        "MiniMax-M2.5",
        "MiniMax-M2.5-highspeed",
        "MiniMax-M2.1",
        "MiniMax-M2.1-highspeed",
        "MiniMax-M2",
    ]
    default_model = "MiniMax-M2.7"

    def __init__(
        self,
        api_key: str = "",
        model: str = "MiniMax-M2.7",
        base_url: str = "https://api.minimaxi.com/v1",
        temperature: float = 1.0,
        max_tokens: int = 2048,
    ):
        super().__init__(api_key, model, base_url, temperature, max_tokens)
