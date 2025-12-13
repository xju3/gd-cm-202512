from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import math

from ..database import get_db
from ..services import data_service
from ..schemas import PaginatedResponse, InferenceResponse, WorkOrderDTO
from ..models import WorkOrder
from ..config import settings
# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent

router = APIRouter(prefix="/api/v1")

@router.get("/health", response_model=dict, description="检查服务健康状态")
def health() -> dict:
    """
    检查服务健康状态
    
    :return: 健康状态
    :rtype: dict
    """
    return {"status": "healthy"}

@router.get("/solution", response_model=str, description="获取解决方案文件内容")
def solution(code: str = Query(description="解决方案代码", default="FA00006")) -> str:
    """
    获取解决方案文件内容
    
    :param code: Description
    :type code: str
    :return: Description
    :rtype: str
    """
    file_path = project_root / "files" / "solutions" / (code + ".md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="解决方案文件未找到")
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    return content

@router.get("/diagnosis", response_model=InferenceResponse, description="执行故障诊断")
def diagnosis(
    work_order_id: str = Query(description="工单号", default="CMCC-GD-GZCL-20250429-009158"),
    rule_index: int = Query(description="在哪一步呈现故障", default=3, gt=0),
    err_index: int = Query(description="错误索引", default=1, gt=0 ),
    db: Session = Depends(get_db),
) -> InferenceResponse:
    """
    执行推理
    
    :param work_order_id: 工单号, 如GZ2023092100001
    :type work_order_id: str
    :param rule_index: 在哪一步呈现故障
    :type rule_index: int
    :param err_index: 错误索引
    :type err_index: int
    :param db: 数据库连接
    :type db: Session
    :return: 推理结果
    :rtype: InferenceResponse
    """
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


@router.get("/work-orders", response_model=PaginatedResponse, description="获取工单列表")
def get_work_orders(
    # 接收 page 和 size，而不是原来的 limit
    page: int = Query(default=1, ge=1, description="页码，从1开始"),
    size: int = Query(default= settings.default_limit, ge=1, le=100, description="每页显示条数"),
    keyword: str = Query(default= None, description="关键字，用于模糊匹配工单标题和描述"),
    db: Session = Depends(get_db),
):
    """
    获取工单列表
    
    :param page: 页码，从1开始
    :type page: int
    :param size: 每页显示条数
    :type size: int
    :param keyword: 关键字，用于模糊匹配工单标题和描述
    :type keyword: str
    :param db: 数据库连接
    :type db: Session
    :return: 工单列表
    :rtype: PaginatedResponse
    """
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


@router.get("/work-order/{work_id}", response_model=WorkOrderDTO, description="获取指定工单详情")
def get_work_order(
    work_id: str,
    db: Session = Depends(get_db),
) -> WorkOrderDTO:
    """
    获取指定工单详情
    
    :param work_id: 工单号
    :type work_id: str
    :param db: 数据库连接
    :type db: Session
    :return: 单条工单数据
    :rtype: WorkOrderDTO
    """
    stmt = select(WorkOrder).where(WorkOrder.work_order_id == work_id)
    item = db.execute(stmt).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="未找到该工单")

    # 4. 返回符合 PaginatedResponse 结构的数据
    return item
