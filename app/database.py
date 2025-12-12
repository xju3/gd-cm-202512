from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings


def create_db_engine(url: str, echo: bool = False):
    """
    创建数据库引擎，自动兼容 MySQL 与 PostgreSQL。
    - 当检测到 `mysql+` 方言时，为连接添加 `pool_pre_ping=True` 并保持 SQLAlchemy 2.0 默认设置；
    - 其他方言（如 `postgresql+psycopg`）保持原样。
    """
    engine_kwargs = {
        "echo": echo,
        "pool_pre_ping": True,
    }
    return create_engine(url, **engine_kwargs)


engine = create_db_engine(settings.get_active_database_url(), echo=settings.debug_mode)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy 基类，用于声明 ORM 模型。"""
    pass


def get_db():
    """获取数据库会话，自动管理连接的创建与关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
