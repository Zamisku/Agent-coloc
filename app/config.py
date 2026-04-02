from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    REDIS_URL: str = "redis://localhost:6379/0"
    MEMORY_MAX_ROUNDS: int = 10
    MEMORY_TTL: int = 3600
    RAG_MOCK_ENABLED: bool = True
    RAG_BASE_URL: str = "http://localhost:8081/api"
    RAG_TOP_K: int = 5
    RAG_TIMEOUT: int = 10
    RAG_RELEVANCE_THRESHOLD: float = 0.6
    MAX_QUERY_LENGTH: int = 500
    MAX_AGENT_STEPS: int = 3
    ENABLED_DOMAINS: list[str] = ["admission"]
    APP_ENV: str = "dev"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000


settings = Settings()
