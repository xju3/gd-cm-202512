from sqlalchemy import text
from .database import engine
import time
from typing import List

def ensure_work_order_extra_columns() -> None:
    """
    在 PostgreSQL 中为 `work_order` 表安全添加新列。
    若列已存在则跳过，保证幂等执行。
    """
    cols = ["rule_index", "err_index", "probability", "evidence"]
    ddl = {
        "rule_index": "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS rule_index INTEGER",
        "err_index": "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS err_index INTEGER",
        "probability": "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS probability INTEGER",
        "evidence": "ALTER TABLE work_order ADD COLUMN IF NOT EXISTS evidence VARCHAR",
    }
    attempts = 10
    for i in range(attempts):
        try:
            with engine.begin() as conn:
                existing: List[str] = []
                rs = conn.execute(
                    text(
                        "SELECT column_name FROM information_schema.columns WHERE table_name='work_order'"
                    )
                )
                existing = [row[0] for row in rs]
                for c in cols:
                    if c not in existing:
                        conn.execute(text(ddl[c]))
                # evidence 类型校验与修正为 TEXT
                dt_rs = conn.execute(
                    text(
                        "SELECT data_type FROM information_schema.columns WHERE table_name='work_order' AND column_name='evidence'"
                    )
                ).fetchone()
                if dt_rs is not None:
                    curr_type = dt_rs[0]
                    if curr_type is None or curr_type.lower() != "text":
                        conn.execute(
                            text(
                                "ALTER TABLE work_order ALTER COLUMN evidence TYPE TEXT USING evidence::text"
                            )
                        )
            break
        except Exception as e:
            time.sleep(2)

