import re
from sqlalchemy.orm import Session
from sqlalchemy import select, func  # 👈 别忘了导入 func
from pathlib import Path
from langchain.tools import tool
from typing import List
from ..services.mock_service import mock_numerical_value, mock_string_value
from ..models import WorkOrder
from ..schemas import Inference, RuleContent
from ..config import settings

# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent
pattern = r'(?<![A-Z0-9])(?:GJ|JT)\d{5}(?![A-Z0-9])'

def exec(
    work_order_id: str, rule_index, err_index: float, db: Session
) -> List[Inference]:

    stmt = select(WorkOrder).where(WorkOrder.work_order_id == work_order_id)
    item = db.execute(stmt).scalar_one_or_none()

    rule_name = None

    if "小区" in item.GJ00008:
        rule_name = "TF-002"
        
    if "基站" in item.GJ00008:
        rule_name = "TF-001"
    
    return digonisis(item, rule_index, err_index, rule_name)


def digonisis(work_order: WorkOrder, rule_index, err_index: float, rule_name) -> List[Inference]: 
    
    if rule_name is None:
        return []
    
    result : List[Inference] = []
    rule_contents : List[RuleContent] = []
    for item in settings.diagnosis_rule_list:
        if item.name ==  rule_name:
            rule_contents = item.rules
            break 
    

    if rule_index < 1:
        rule_index = 1

    if rule_index > len(rule_contents):
        rule_index = len(rule_contents)
    
    for rule in rule_contents:
        if rule.id > rule_index:
            break
        inference = Inference(
            descriptions="", conclusion="", solution_code="", solution_content="", error="", curr_rules=[], name= ""
        )
    
        status = 0
        if rule.id == rule_index:
            status = err_index

        mock = rule.mock
        content = None
        if mock.type == "num":
            content = mock_numerical_value(mock.name, status, work_order)
        else:
            content = mock_string_value(mock.name, status, work_order)

        inference.conclusion = content.conclusion
        inference.name = mock.name
        inference.solution_code = content.solution
        inference.solution_content = get_solution(content.solution)
        inference.descriptions = replace_text_codes(work_order, rule.descriptions) 
        inference.curr_rules = replace_rules(work_order, rule.curr_rules)
        result.append(inference)
    return result


def get_solution(code: str) -> str:
    if not code.startswith("FA"):
        return code
    
    file_path = project_root / "files" / "solutions" / (code + ".md")
    if not file_path.exists():
        return ""
    with open(file_path, "r", encoding="utf-8") as file:
        content = file.read()
    return content

def replace_rules(work_order: WorkOrder, rules : List[str]) -> List[str]:
    replaced_rules = []
    for rule in rules:
        replaced_text = replace_text_codes(work_order, rule)
        replaced_rules.append(replaced_text)
    return replaced_rules

def replace_text_codes(work_order: WorkOrder, text: str) -> str:
    """
    Replace placeholders in the description with values from the work order.
    - Replaces DT prefixed placeholders (e.g., {DT00001}) with corresponding work_order attributes.
    - Identifies JT prefixed placeholders for future use.
    """

    placeholders = re.findall(pattern, text)

    for placeholder in placeholders:
        if placeholder.startswith("GJ"):
            value = getattr(work_order, placeholder, f"{{{placeholder}}}")
            text = text.replace(placeholder, str(value))    

    for placeholder in placeholders:
        if placeholder.startswith("JT"):
            # Future implementation for JT prefixed placeholders
            value = fetch_static_data(placeholder, "")
            text = text.replace(placeholder, str(value))

    return text

def get_work_orders(db: Session, skip: int = 0, limit: int = 10, keyword: str = ""):

    count_stmt = (
        select(func.count())
        .select_from(WorkOrder)
        .where(WorkOrder.GJ00008.contains("退服"))
    )

    if keyword is not None:
        count_stmt = count_stmt.where(WorkOrder.work_order_id.contains(keyword))

    total = db.execute(count_stmt).scalar()
    if total is None:
        total = 0

    stmt = select(WorkOrder).where(WorkOrder.GJ00008.contains("退服"))
    if keyword is not None:
        stmt = stmt.where(WorkOrder.work_order_id.contains(keyword))
    stmt = stmt.offset(skip).limit(limit)
    items = db.execute(stmt).scalars().all()
    return total, items


# @tool(description="Fetch static data based on item name and status")
def fetch_static_data(item_name: str, param: str):

    # 机房编码
    if item_name == "JT00012":
        return {"room_id": "002017032644148100001082", "room_name": "南头机房"}

    # 站点编码
    if item_name == "JT00013":
        return {"station_id": "440106040010002750", "station_name": "南头站"}
