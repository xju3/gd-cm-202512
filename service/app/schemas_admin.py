from typing import Any, Dict, List, Literal

from pydantic import BaseModel, Field


KnowledgeBaseType = Literal["alert", "experience", "solution"]


class AdminLoginRequest(BaseModel):
    """
    管理员登录请求体。
    """

    username: str = Field(..., description="管理员账号")
    password: str = Field(..., description="管理员密码")


class AdminLoginResponse(BaseModel):
    """
    管理员登录响应体。
    """

    success: bool = Field(..., description="是否登录成功")
    token: str = Field(default="", description="登录令牌")
    username: str = Field(default="", description="管理员账号")


class KnowledgeBaseRecord(BaseModel):
    """
    通用知识库记录结构。
    """

    id: str = Field(..., description="记录唯一标识")
    title: str = Field(..., description="知识标题")
    category: str = Field(default="", description="知识分类")
    summary: str = Field(default="", description="知识摘要")
    content: str = Field(default="", description="知识正文")
    tags: List[str] = Field(default_factory=list, description="标签集合")
    source: str = Field(default="", description="来源说明")
    references: List[str] = Field(default_factory=list, description="关联引用")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="扩展元数据")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")


class KnowledgeBasePayload(BaseModel):
    """
    知识库新增或更新时的请求体。
    """

    title: str = Field(..., description="知识标题")
    category: str = Field(default="", description="知识分类")
    summary: str = Field(default="", description="知识摘要")
    content: str = Field(default="", description="知识正文")
    tags: List[str] = Field(default_factory=list, description="标签集合")
    source: str = Field(default="", description="来源说明")
    references: List[str] = Field(default_factory=list, description="关联引用")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="扩展元数据")


class KnowledgeBaseListResponse(BaseModel):
    """
    知识库列表响应体。
    """

    type: KnowledgeBaseType = Field(..., description="知识库类型")
    source_summary: str = Field(..., description="初始化来源说明")
    items: List[KnowledgeBaseRecord] = Field(default_factory=list, description="知识条目")


class KnowledgeBaseOverviewItem(BaseModel):
    """
    单个知识库统计信息。
    """

    type: KnowledgeBaseType = Field(..., description="知识库类型")
    label: str = Field(..., description="知识库名称")
    count: int = Field(..., description="条目数量")


class KnowledgeBaseOverviewResponse(BaseModel):
    """
    知识库总览响应体。
    """

    source_summary: str = Field(..., description="初始化来源说明")
    items: List[KnowledgeBaseOverviewItem] = Field(
        default_factory=list,
        description="知识库统计列表",
    )
