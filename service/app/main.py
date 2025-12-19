from fastapi import FastAPI
from fastapi import Request
from starlette.responses import Response
from .config import settings
from .routers import api
from .migrations import ensure_work_order_extra_columns

def create_app() -> FastAPI:
    """工厂函数：创建并配置 App"""
    app = FastAPI(
        title=settings.app_title,
        description="API 接口文档",
        version="1.0.0"
    )
    app.include_router(api.router)

    # @app.on_event("startup")
    # def on_startup() -> None:
        # ensure_work_order_extra_columns()

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
