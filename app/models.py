from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from .database import Base


    
    

class WorkOrder(Base):
    """
    对应数据库中的 work_order 表
    """
    __tablename__ = "work_order"

    # work_order_id 是主键
    work_order_id: Mapped[str] = mapped_column(String, primary_key=True)
    
    # 创建时间
    created_time: Mapped[str] = mapped_column(String)
    
    # 告警标准名称
    # GJ00008
    GJ00008 : Mapped[str] = mapped_column(String)

    # GJ00010 机房名称
    GJ00010 : Mapped[str] = mapped_column(String)

    # GJ00011 设备供应商
    GJ00011: Mapped[str] = mapped_column(String)

     # GJ00014 告警对象
    GJ00014: Mapped[str] = mapped_column(String)

    # GJ00017 网络2级分类
    GJ00017: Mapped[str] = mapped_column(String)

    # GJ00021-网管告警消除时间（主）
    GJ00021: Mapped[str] = mapped_column(String)

    # 订单主题
    order_subject : Mapped[str] = mapped_column(String)

    # 订单状态
    order_status : Mapped[str] = mapped_column(String)

    
    # 所属区域
    process_region : Mapped[str] = mapped_column(String)
    
    # 告警级别
    warning_level : Mapped[str] = mapped_column(String)

    # 网络层级 1
    network_level_1 : Mapped[str] = mapped_column(String)

    # 网络层级 3
    network_level_3: Mapped[str] = mapped_column(String)

    # 告警来源名称
    source_name : Mapped[str] = mapped_column(String)
    # 告警城市名称 1
    city_name_1 : Mapped[str] = mapped_column(String)

    # 告警城市名称 2
    city_name_2 : Mapped[str] = mapped_column(String)

    # 网元名称
    ne_name : Mapped[str] = mapped_column(String)

    # 网管告警ID
    nms_alarm_id : Mapped[str] = mapped_column(String)
    # 详情
    details: Mapped[str] = mapped_column(String)



    # 如果表里还有其他字段，但你不需要用到，可以不在这里定义。
    # 但如果有写入需求，建议定义完整。