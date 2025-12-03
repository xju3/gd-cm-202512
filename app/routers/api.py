from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import List
import math

from ..database import get_db
from ..services import data_service
from ..schemas import PaginatedResponse, InferenceResponse
from ..config import settings

router = APIRouter(prefix="/api/v1")

@router.get("/exec", response_model=InferenceResponse)
def exec(
    work_order_id: str = Query(description="工单号, 如GZ2023092100001"),
    rule_index: int = Query(description="在哪一步呈现故障"),
    err_index: int = Query(description="错误索引"),
    db: Session = Depends(get_db),
) -> InferenceResponse:
    try:
        inference_list = data_service.exec(
            work_order_id=work_order_id,
            err_index=err_index,
            rule_index=rule_index,
            db=db,
        )
        return InferenceResponse(
            data=inference_list,
            success=True,
            error="",
        )
    except Exception as e:
        return InferenceResponse(
            data=[],
            success=False,
            error=str(e),
        )


@router.get("/work-orders", response_model=PaginatedResponse)
def get_work_orders(
    # 接收 page 和 size，而不是原来的 limit
    page: int = Query(1, ge=1, description="页码，从1开始"),
    size: int = Query(settings.default_limit, ge=1, le=100, description="每页显示条数"),
    keyword: str = Query(description="关键字，用于模糊匹配工单标题和描述"),
    db: Session = Depends(get_db),
):
    try:
        # 1. 计算数据库需要的 offset (跳过的条数)
        skip = (page - 1) * size

        # 2. 调用 Service 获取数据
        total, items = data_service.get_work_orders(
            db, skip=skip, limit=size, keyword=keyword
        )

        # 3. 计算总页数
        # 例如：total=21, size=10 -> total_pages=3
        total_pages = math.ceil(total / size)

        # 4. 返回符合 PaginatedResponse 结构的数据
        return {
            "total": total,
            "page": page,
            "size": size,
            "total_pages": total_pages,
            "items": items,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
