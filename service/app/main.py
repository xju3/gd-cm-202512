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

    @app.middleware("http")
    async def enforce_utf8_middleware(request: Request, call_next):
        """
        全局中间件：为文本与 JSON 响应强制设置 UTF-8 编码。
        """
        response: Response = await call_next(request)
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type and "charset" not in content_type:
            response.headers["content-type"] = "application/json; charset=utf-8"
        elif content_type.startswith("text/") and "charset" not in content_type:
            response.headers["content-type"] = content_type.split(";")[0] + "; charset=utf-8"
        return response

    @app.on_event("startup")
    def on_startup() -> None:
        """
        应用启动钩子：确保数据库包含所需的扩展列。
        """
        ensure_work_order_extra_columns()

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
