from fastapi import FastAPI
from .config import settings
from .routers import api

def create_app() -> FastAPI:
    """工厂函数：创建并配置 App"""
    app = FastAPI(
        title=settings.app_title,
        description="Word Order 查询服务 API 文档",
        version="1.0.0"
    )
    app.include_router(api.router)

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)