from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks, Header
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Dict, Any
import math

from ..database import get_db, SessionLocal
from ..services import data_service
from ..services import admin_service
from ..schemas import PaginatedResponse, InferenceResponse, WorkOrderDTO
from ..models import WorkOrder
from ..config import settings
from ..migrations import ensure_work_order_extra_columns
from ..schemas_admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    KnowledgeBaseListResponse,
    KnowledgeBaseOverviewResponse,
    KnowledgeBasePayload,
    KnowledgeBaseRecord,
    KnowledgeBaseType,
)
from ..utils.file_utils import read_text_file_safe
from starlette.responses import PlainTextResponse
from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import HumanMessage, SystemMessage
# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent

router = APIRouter(prefix="/api/v1")


def require_admin(authorization: str = Header(default="", alias="Authorization")) -> str:
    """
    校验管理员访问令牌，未通过时抛出 401。
    """

    token = authorization.replace("Bearer ", "").strip()
    if not admin_service.verify_token(token):
        raise HTTPException(status_code=401, detail="管理员认证失败")
    return token

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
    file_path = project_root  / "files" / "solutions" / (code + ".md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="解决方案文件未找到")
    content = read_text_file_safe(file_path)
    return PlainTextResponse(content=content, media_type="text/markdown; charset=utf-8")


@router.post("/admin/login", response_model=AdminLoginResponse, description="管理员登录")
def admin_login(payload: AdminLoginRequest) -> AdminLoginResponse:
    """
    校验固定管理员账号并返回访问令牌。
    """

    if not admin_service.verify_admin(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    admin_service.ensure_knowledge_base_data()
    return AdminLoginResponse(
        success=True,
        token=admin_service.ADMIN_TOKEN,
        username=payload.username,
    )


@router.get(
    "/admin/overview",
    response_model=KnowledgeBaseOverviewResponse,
    description="获取后台知识库概览",
)
def admin_overview(_: str = Depends(require_admin)) -> Dict[str, Any]:
    """
    获取三类知识库的数量概览。
    """

    return admin_service.get_overview()


@router.get(
    "/admin/knowledge-bases/{kb_type}",
    response_model=KnowledgeBaseListResponse,
    description="获取指定知识库列表",
)
def get_knowledge_base(
    kb_type: KnowledgeBaseType,
    keyword: str = Query(default="", description="知识库关键字搜索"),
    _: str = Depends(require_admin),
) -> Dict[str, Any]:
    """
    获取指定类型的知识库列表。
    """

    return admin_service.list_records(kb_type, keyword)


@router.post(
    "/admin/knowledge-bases/{kb_type}",
    response_model=KnowledgeBaseRecord,
    description="新增知识库记录",
)
def create_knowledge_base_record(
    kb_type: KnowledgeBaseType,
    payload: KnowledgeBasePayload,
    _: str = Depends(require_admin),
) -> Dict[str, Any]:
    """
    新增一条知识库记录。
    """

    return admin_service.create_record(kb_type, payload)


@router.put(
    "/admin/knowledge-bases/{kb_type}/{record_id}",
    response_model=KnowledgeBaseRecord,
    description="更新知识库记录",
)
def update_knowledge_base_record(
    kb_type: KnowledgeBaseType,
    record_id: str,
    payload: KnowledgeBasePayload,
    _: str = Depends(require_admin),
) -> Dict[str, Any]:
    """
    更新指定知识库记录。
    """

    record = admin_service.update_record(kb_type, record_id, payload)
    if record is None:
        raise HTTPException(status_code=404, detail="知识库记录不存在")
    return record

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
        ensure_work_order_extra_columns()
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
        ensure_work_order_extra_columns()
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


@router.get("/information", response_model=Dict[str, Any], description="获取工单 information 字段")
def get_work_order_information(
    work_order_id: str = Query(..., description="工单号"),
) -> Dict[str, Any]:
    """
    获取工单 information 字段
    
    :param work_order_id: 工单号
    :type work_order_id: str
    :return: information 字段内容
    :rtype: Dict[str, Any]
    """
    info = data_service.get_work_order_information(work_order_id)
    if info is None:
        raise HTTPException(status_code=404, detail="未找到该工单信息")
    return info

def run_pre_diagnosis_task(batch_size: int):
    """
    后台任务：执行预诊断
    """
    db = SessionLocal()
    try:
        data_service.pre_diagnosis(db, batch_size=batch_size)
    finally:
        db.close()

@router.api_route("/pre-diagnosis", methods=["GET", "POST"], response_model=dict, description="批量预诊断工单")
def trigger_pre_diagnosis(
    background_tasks: BackgroundTasks,
    batch_size: int = Query(default=100, ge=1, le=1000, description="每批处理数量"),
    db: Session = Depends(get_db),
) -> dict:
    """
    触发批量预诊断，使用 AI 推理工单并更新数据库。
    
    :param background_tasks: 后台任务管理器
    :type background_tasks: BackgroundTasks
    :param batch_size: 每批处理数量
    :type batch_size: int
    :param db: 数据库连接
    :type db: Session
    :return: 处理结果
    :rtype: dict
    """
    try:
        ensure_work_order_extra_columns()
        # 使用后台任务执行，避免阻塞 API
        background_tasks.add_task(run_pre_diagnosis_task, batch_size=batch_size)
        return {"success": True, "message": "预诊断任务已在后台启动"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预诊断启动失败: {str(e)}")

@router.api_route("/qa", methods=["GET", "POST"], response_model=dict, description="DeepSeek 运维问答")
def operations_qa(
    question: str = Query(..., description="问题描述"),
    work_order_id: str | None = Query(default=None, description="可选工单号，用于提供上下文"),
    concise: bool = Query(default=True, description="是否简洁输出（最多6条要点，单条≤120字）"),
    max_tokens: int = Query(default=800, ge=100, le=4000, description="最大生成 tokens"),
    char_limit: int | None = Query(default=2000, description="字符上限，超出将裁剪"),
) -> dict:
    """
    接入 DeepSeek，实现专业运维工程师问答。
    可选地根据工单号注入 work_order.json 的 information 上下文，提高回答准确性。
    支持控制输出简洁性与最大生成长度。
    
    :param question: 问题描述
    :type question: str
    :param work_order_id: 可选工单号
    :type work_order_id: str | None
    :param concise: 是否简洁输出
    :type concise: bool
    :param max_tokens: 最大生成 tokens
    :type max_tokens: int
    :param char_limit: 字符上限，超出将裁剪
    :type char_limit: int | None
    :return: 问答结果
    :rtype: dict
    """
    api_key = settings.get_deepseek_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="DeepSeek API Key 未配置")
    context_info = None
    if work_order_id:
        context_info = data_service.get_work_order_information(work_order_id)
    system_prompt = (
        "你是一名资深的通信运维工程师，熟悉4G/5G无线设备、传输设备、供电系统、天馈系统及告警处理流程。"
        "请用专业但可执行的步骤提供解决方案，包含：故障定位思路、关键排查项、可能原因、处置步骤、风险与回滚建议。"
        "若需要到站操作或跨专业配合，请明确说明。"
    )
    user_prompt = f"问题：{question}"
    if context_info:
        user_prompt += f"\n\n工单上下文（information）：\n{context_info}"
    if concise:
        user_prompt += (
            "\n\n输出要求："
            "以最多6条要点返回，每条不超过120字；"
            "优先给出可执行步骤与关键参数；"
            "如需命令或脚本，给出简洁版本；"
            "无需额外客套或背景描述。"
        )
    llm = ChatDeepSeek(
        model="deepseek-chat",
        api_key=api_key,
        temperature=0,
        max_tokens=max_tokens,
        timeout=None,
        max_retries=2,
    )
    try:
        resp = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        answer = resp.content.strip()
        if isinstance(char_limit, int) and char_limit > 0 and len(answer) > char_limit:
            answer = answer[:char_limit].rstrip() + "..."
        return {"success": True, "error": "", "answer": answer}
    except Exception as e:
        return {"success": False, "error": str(e), "answer": ""}
