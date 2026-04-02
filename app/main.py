from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.web import router as web_router
from app.api.admin import router as admin_router
from app.config import settings
from app.logging_config import configure_logging, get_logger
from app.services.llm_client import llm_client
from app.services.rag_client import rag_client
from app.services.memory import memory_service
from app.services.config_manager import config_manager
from app.services.skills.init import init_skills


configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_starting", env=settings.APP_ENV, port=settings.PORT)

    await config_manager.initialize()
    logger.info("config_initialized")

    try:
        await memory_service.get_history("health-check")
        logger.info("redis_connected")
    except Exception as e:
        logger.warning("redis_connection_failed", error=str(e))

    # 初始化 Skills
    init_skills()
    logger.info("skills_initialized")

    yield

    logger.info("application_shutting_down")
    await llm_client.close()
    await memory_service.close()


app = FastAPI(
    title="招生 Agent 系统",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(web_router)
app.include_router(admin_router)

# 挂载前端静态文件
frontend_dist = Path("frontend/dist")
if frontend_dist.exists():
    app.mount("/console", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
    logger.info("frontend_static_mounted", path=str(frontend_dist))


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "服务暂时不可用，请稍后重试"},
    )
