import re
from sqlalchemy.orm import Session
from sqlalchemy import select, func  # 👈 别忘了导入 func
from pathlib import Path
from langchain.tools import tool
from typing import List
from ..services.mock_service import mock_numerical_data, mock_string_data
from ..models import WorkOrder
from ..schemas import Inference, RuleContent
from ..config import settings

# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent


def exec(
    work_order_id: str, rule_index, err_index: float, db: Session
) -> List[Inference]:

    stmt = select(WorkOrder).where(WorkOrder.work_order_id == work_order_id)
    item = db.execute(stmt).scalar_one_or_none()

    if item is None or "小区" not in item.GJ00008:
        return []

    return exec_tf002(item, rule_index, err_index)

def exec_tf002(item: WorkOrder, rule_index, err_index: float) -> List[Inference]:
    result : List[Inference] = []
    rule_contents : List[RuleContent] = []
    for item in settings.diagnosis_rule_list:
        if item.name ==  "TF-002":
            rule_contents = item.rules
            break 

    for rule in rule_contents:
        if rule.id > rule_index:
            break
        inference = Inference(
            descriptions="", conclusion="", solution="", error=""
        )
        description = replace_rule_description(item, rule.descriptions)
        status = 0
        if rule.id == rule_index:
            status = err_index

        mock = rule.mock
        content = None
        if mock.type == "num":
            content = mock_numerical_data(mock.name, status)
        else:
            content = mock_string_data(mock.name, status)
        inference.conclusion = content.value
        inference.solution = content.solution
        inference.descriptions = description
        result.append(inference)
    return result

def replace_rule_description(work_order: WorkOrder, description: str) -> str:
    """
    Replace placeholders in the description with values from the work order.
    - Replaces DT prefixed placeholders (e.g., {DT00001}) with corresponding work_order attributes.
    - Identifies JT prefixed placeholders for future use.
    """
    # Find all placeholders like {DTxxxxx} or {JTxxxxx} where x is a digit, and the whole DT/JT code is 7 characters
    pattern = r'\b(?:GJ|JT)\d{5}\b'
    placeholders = re.findall(pattern, description)

    for placeholder in placeholders:
        if placeholder.startswith("DT"):
            # The attribute name on WorkOrder is assumed to be the placeholder itself
            value = getattr(work_order, placeholder, f"{{{placeholder}}}")
            description = description.replace(f"{{{placeholder}}}", str(value))    
    return description


def get_work_orders(db: Session, skip: int = 0, limit: int = 10, keyword: str = ""):




    count_stmt = (
        select(func.count())
        .select_from(WorkOrder)
        .where(WorkOrder.GJ00008.contains("退服"))
    )

    if keyword != "":
        count_stmt = count_stmt.where(WorkOrder.GJ00008.contains(keyword))

    total = db.execute(count_stmt).scalar()
    if total is None:
        total = 0

    stmt = select(WorkOrder).where(WorkOrder.GJ00008.contains("退服"))
    if keyword != "":
        stmt = stmt.where(WorkOrder.GJ00008.contains(keyword))
    stmt = stmt.offset(skip).limit(limit)
    items = db.execute(stmt).scalars().all()
    return total, items


@tool(description="Fetch static data based on item name and status")
def fetch_static_data(item_name: str, param: str):

    # 机房编码
    if item_name == "JT00012":
        return {"room_id": "002017032644148100001082", "room_name": "南头机房"}

    # 站点编码
    if item_name == "JT00013":
        return {"station_id": "440106040010002750", "station_name": "南头站"}
