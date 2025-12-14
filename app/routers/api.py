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

@router.api_route("/diagnosis", methods=["GET", "POST"], response_model=InferenceResponse, description="执行故障诊断")
def diagnosis(
    work_order_id: str = Query(description="工单号", default="CMCC-GD-GZCL-20250429-009158"),
    db: Session = Depends(get_db),
) -> InferenceResponse:
    """
    执行推理，使用 AI 自动判断故障规则和错误索引。
    
    :param work_order_id: 工单号, 如GZ2023092100001
    :type work_order_id: str
    :param db: 数据库连接
    :type db: Session
    :return: 推理结果
    :rtype: InferenceResponse
    """
    try:
        inference_list = data_service.exec(
            work_order_id=work_order_id,
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

@router.api_route("/pre-diagnosis", methods=["GET", "POST"], response_model=dict, description="批量预诊断工单")
def trigger_pre_diagnosis(
    batch_size: int = Query(default=100, ge=1, le=1000, description="每批处理数量"),
    db: Session = Depends(get_db),
) -> dict:
    """
    触发批量预诊断，使用 AI 推理工单并更新数据库。
    
    :param batch_size: 每批处理数量
    :type batch_size: int
    :param db: 数据库连接
    :type db: Session
    :return: 处理结果
    :rtype: dict
    """
    try:
        data_service.pre_diagnosis(db, batch_size=batch_size)
        return {"success": True, "message": "预诊断完成"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预诊断失败: {str(e)}")
