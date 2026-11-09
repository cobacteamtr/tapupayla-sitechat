"""
SiteChat - FastAPI Application

A production-ready RAG chatbot platform with configurable providers.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from typing import Optional
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger
import sys
import os

from app.config import settings
from app.database import get_mongodb, get_vector_store
from app.core.security import (
    SecurityHeadersMiddleware,
    RequestValidationMiddleware,
    log_security_warnings,
    get_client_ip
)
from app.routes import chat_router, crawl_router, admin_router, analytics_router, conversations_router, triggers_router, handoff_router, platform_router
from app.routes.embed import router as embed_router, get_widget_sri_hash
from app.public_html import apply_public_html_placeholders
from app.routes.sites import router as sites_router
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.schedule import router as schedule_router
from app.routes.qa import router as qa_router
from app.routes.leads import router as leads_router
from app.services.auth import AuthService
from app.services.scheduler import get_scheduler


# Custom StaticFiles class to inject CORS headers for embeddable widget files
class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response


# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG"
)


# Rate limiter - use get_client_ip for proper proxy support
limiter = Limiter(key_func=get_client_ip)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info("=" * 50)
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug Mode: {settings.DEBUG}")
    logger.info("=" * 50)
    
    log_security_warnings()
    
    logger.info("Provider Configuration:")
    logger.info(f"  LLM Provider: {settings.LLM_PROVIDER} ({settings.LLM_MODEL})")
    logger.info(f"  Embeddings Provider: {settings.EMBEDDINGS_PROVIDER} ({settings.EMBEDDINGS_MODEL})")
    logger.info(f"  Vector Store Provider: {settings.VECTOR_STORE_PROVIDER}")
    logger.info(f"  Database Provider: {settings.DATABASE_PROVIDER}")
    logger.info(f"  Storage Provider: {settings.STORAGE_PROVIDER}")
    logger.info(f"  Cache Provider: {settings.CACHE_PROVIDER}")
    logger.info("=" * 50)
    
    try:
        mongodb = await get_mongodb()
        logger.info("MongoDB connected")
        
        get_vector_store()
        logger.info("Vector store initialized")
        
        auth_service = AuthService(mongodb)
        await auth_service.ensure_admin_exists()
        
        from app.routes.schedule import _execute_crawl_job
        scheduler = get_scheduler()
        scheduler.set_dependencies(mongodb, _execute_crawl_job)
        await scheduler.start()
        logger.info("Crawl scheduler started")
        
        logger.info(f"{settings.APP_NAME} started successfully!")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise
    
    yield
    
    logger.info(f"Shutting down {settings.APP_NAME}...")
    
    try:
        scheduler = get_scheduler()
        scheduler.shutdown()
        logger.info("Crawl scheduler stopped")
        
        mongodb = await get_mongodb()
        await mongodb.disconnect()
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="A production-ready RAG chatbot for your website",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestValidationMiddleware)

if settings.is_production and settings.TRUSTED_HOSTS != "*":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.trusted_hosts_list
    )

# CORS middleware - allowing all origins for widget compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"],
)

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(crawl_router)
app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(conversations_router)
app.include_router(triggers_router)
app.include_router(handoff_router)
app.include_router(platform_router)
app.include_router(embed_router)
app.include_router(sites_router)
app.include_router(documents_router)
app.include_router(schedule_router)
app.include_router(qa_router)
app.include_router(leads_router)

# Serve static files (frontend)
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.dirname(backend_dir)
frontend_path = os.path.join(project_root, "frontend")

logger.info(f"Frontend path: {frontend_path}")

def _html_file_response(filename: str, *, widget_sri: Optional[str] = None) -> HTMLResponse:
    path = os.path.join(frontend_path, filename)
    with open(path, "r", encoding="utf-8") as f:
        body = apply_public_html_placeholders(f.read(), widget_sri=widget_sri)
    return HTMLResponse(content=body, media_type="text/html; charset=utf-8")


if os.path.exists(frontend_path):
    css_path = os.path.join(frontend_path, "css")
    js_path = os.path.join(frontend_path, "js")
    widget_path = os.path.join(frontend_path, "widget")
    
    if os.path.exists(css_path):
        app.mount("/css", StaticFiles(directory=css_path), name="css")
    if os.path.exists(js_path):
        app.mount("/js", StaticFiles(directory=js_path), name="js")
    if os.path.exists(widget_path):
        # Use CORSStaticFiles to allow external/sandboxed domains to fetch chatbot.js
        app.mount("/widget", CORSStaticFiles(directory=widget_path), name="widget")


@app.get("/")
async def root():
    landing_path = os.path.join(frontend_path, "landing.html")
    if os.path.exists(landing_path):
        return _html_file_response("landing.html", widget_sri=get_widget_sri_hash())

    frontend_index = os.path.join(frontend_path, "index.html")
    logger.info(f"Looking for index.html at: {frontend_index}")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)

    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
        "frontend_path": frontend_path,
        "exists": os.path.exists(frontend_path),
    }


@app.get("/app")
@app.get("/dashboard")
async def dashboard_app():
    frontend_index = os.path.join(frontend_path, "index.html")
    if os.path.exists(frontend_index):
        return _html_file_response("index.html")
    return {"error": "Dashboard not found"}


@app.get("/demo")
async def demo_page():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/#live-demo", status_code=301)


@app.get("/landing-neo")
async def landing_neo_page():
    path = os.path.join(frontend_path, "landing-neo.html")
    if os.path.exists(path):
        return FileResponse(path)
    return {"error": "Page not found"}


@app.get("/login")
async def login_page():
    login_path = os.path.join(frontend_path, "login.html")
    if os.path.exists(login_path):
        return _html_file_response("login.html")
    return {"error": "Login page not found"}


@app.get("/api")
async def api_info():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "stream": "/api/chat/stream",
            "crawl": "/api/crawl",
            "admin": "/api/admin",
            "embed": "/api/embed/setup",
            "docs": "/api/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
