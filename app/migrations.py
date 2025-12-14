from sqlalchemy import text
from .database import engine

def ensure_work_order_extra_columns() -> None:
    """
    在 PostgreSQL 中为 `work_order` 表安全添加新列。
    若列已存在则跳过，保证幂等执行。
    """
    sqls = [
        "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS rule_index INTEGER",
        "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS err_index INTEGER",
        "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS probability INTEGER",
        "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS evidence VARCHAR",
    ]
    with engine.begin() as conn:
        for s in sqls:
            conn.execute(text(s))

