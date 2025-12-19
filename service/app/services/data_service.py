import re
import json
import os
from sqlalchemy.orm import Session
from sqlalchemy import select, func  # 👈 别忘了导入 func
from pathlib import Path
from langchain.tools import tool
from typing import List, Dict, Any
from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import HumanMessage

from ..services.mock_service import mock_numerical_value, mock_string_value
from ..models import WorkOrder
from ..schemas import Inference, RuleContent
from ..config import settings
from ..llm.agent import inference

# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent

print(f"project_root: {project_root}")

pattern = r'(?<![A-Z0-9])(?:GJ|JT)\d{5}(?![A-Z0-9])'

path_rule_json = project_root / "files" / "rules" / "rules.json"
path_mock_json = project_root / "files" / "data" / "mml_str.json"

def exec(
    work_order_id: str, db: Session
) -> List[Inference]:
    """
    执行故障诊断，使用 AI 自动判断 rule_index 和 err_index。
    """
    stmt = select(WorkOrder).where(WorkOrder.work_order_id == work_order_id)
    item = db.execute(stmt).scalar_one_or_none()
    if item is None:
        return []

    # 如果工单中已有推理结果，直接使用
    if item.rule_index is None or item.err_index is None:
        # 调用 AI 推理
        result = ai_diagnosis(item)
        norm = normalize_inference_result(result)
        item.rule_index = norm["rule_index"]
        item.err_index = norm["error_index"]
        item.probability = norm["probability"]
        item.evidence = norm["evidence"]
        db.commit()

    rule_name = None
    if "小区" in item.GJ00008:
        rule_name = "TF-002"
    if "基站" in item.GJ00008:
        rule_name = "TF-001"
    
    # 调用 digonisis，传入工单中的 rule_index 和 err_index
    try:
        err_index_float = float(item.err_index) if item.err_index else 1.0
    except (ValueError, TypeError):
        err_index_float = 1.0
    rule_index_int = item.rule_index if item.rule_index else 1
    return digonisis(item, rule_index_int, err_index_float, rule_name)

def get_deepseek_api_key() -> str | None:
    """
    获取 DeepSeek API Key，兼容环境变量 `DEEPSEEK_API_KEY` 与 `DEEPSEEK_API_KEY_CUI`。
    """
    return os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("DEEPSEEK_API_KEY_CUI")

def normalize_inference_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    规范化 AI 推理结果为数据库可写的类型：
    - rule_index: int，缺省为 1
    - error_index: int，缺省为 1
    - probability: int，支持将小数或百分比字符串转换为 0~100 的整数
    - evidence: str，缺省为空字符串
    """
    def to_int(value: Any, default: int = 0) -> int:
        try:
            if isinstance(value, bool):
                return int(value)
            if isinstance(value, (int,)):
                return int(value)
            if isinstance(value, (float,)):
                return int(round(value))
            if isinstance(value, str):
                v = value.strip()
                if v.endswith("%"):
                    v = v[:-1]
                return int(round(float(v)))
            return default
        except Exception:
            return default

    rule_index = to_int(result.get("rule_index", 1), 1)
    error_index = to_int(result.get("error_index", 1), 1)
    probability_raw = result.get("probability", 0)
    probability = to_int(probability_raw, 0)
    if probability < 0:
        probability = 0
    if probability > 100:
        probability = 100
    evidence = result.get("evidence", "") or ""
    if not isinstance(evidence, str):
        evidence = str(evidence)

    return {
        "rule_index": rule_index,
        "error_index": error_index,
        "probability": probability,
        "evidence": evidence,
    }

def ai_diagnosis(work_order: WorkOrder) -> Dict[str, Any]:
    """
    使用 AI 推理工单，返回 rule_index, error_index, probability, evidence。
    """
    # 加载规则和 mock 数据
    with open(path_rule_json, 'r', encoding='utf-8') as f:
        rule_json = json.load(f)
    with open(path_mock_json, 'r', encoding='utf-8') as f:
        mock_json = json.load(f)
    
    # 构建工单 JSON
    work_order_dict = {
        "work_order_id": work_order.work_order_id,
        "GJ00008": work_order.GJ00008,
        "GJ00010": work_order.GJ00010,
        "GJ00011": work_order.GJ00011,
        "GJ00014": work_order.GJ00014,
        "GJ00017": work_order.GJ00017,
        "GJ00021": work_order.GJ00021,
        "created_time": work_order.created_time,
        "order_subject": work_order.order_subject,
        "order_status": work_order.order_status,
        "process_region": work_order.process_region,
        "warning_level": work_order.warning_level,
        "network_level_1": work_order.network_level_1,
        "network_level_3": work_order.network_level_3,
        "source_name": work_order.source_name,
        "city_name_1": work_order.city_name_1,
        "city_name_2": work_order.city_name_2,
        "ne_name": work_order.ne_name,
        "nms_alarm_id": work_order.nms_alarm_id,
        "details": work_order.details,
        # "rule_index": work_order.rule_index,
        # "err_index": work_order.err_index,
        # "probability": work_order.probability,
    }
    
    # 构建提示词（根据用户描述）
    prompt = f"""
你是通讯行业4G,5G设备故障分析专家, 深刻了解此行业的设备所生的故障与原因, 请分析work_order.json的内容, 在规则列表(rules_json)中找到的最有可能发生的故障节点, 再根据例命中的节点, 找到对应的mock数据, 根据mock.name在mock数据(mml_str_json)中找到与工单(work_order.json)所对应有的内容编号, 注意,如果工单(work_order.json)的GJ00008=小区退服, 在rule_json中的name=TF-002中进行匹配, 如果工单(work_order.json)的GJ00008=基站退服, 在rule_json中的name=TF-001中进行匹配, 返回 {{"rule_index": number, error_index: number, probability: percentage, evidence: ""}},  rule_index取相应rule的Id, error_index取相应内容的Id, probability是你推理结果的可能性, evidence是的推理出结果所使用的依据, 如果不能推导出结果, 或Probabiliy低于50%, 则在定义的规则范围内随机取一个规则后, 再根据mock.name在Mock数据中随机取一个值,在随机状态与Probabiliy还是要提供给我们, evidence可以不提供

work_order.json:
{json.dumps(work_order_dict, ensure_ascii=False, indent=2)}

rules_json:
{json.dumps(rule_json, ensure_ascii=False, indent=2)}

mml_str_json:
{json.dumps(mock_json, ensure_ascii=False, indent=2)}
"""
    
    # 调用 DeepSeek
    llm = ChatDeepSeek(
        model="deepseek-chat",
        api_key=settings.get_deepseek_api_key(),
        temperature=0,
        max_tokens=None,
        timeout=None,
        max_retries=2,
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    content = response.content.strip()
    
    # 尝试解析 JSON
    try:
        # 提取 JSON 部分
        start = content.find('{')
        end = content.rfind('}') + 1
        if start >= 0 and end > start:
            json_str = content[start:end]
            result = json.loads(json_str)
        else:
            raise ValueError("未找到 JSON 对象")
    except Exception as e:
        # 如果解析失败，返回默认值
        result = {
            "rule_index": 1,
            "error_index": 1,
            "probability": 0,
            "evidence": "解析失败: " + str(e)
        }
    
    return result

def pre_diagnosis(db: Session, batch_size: int = 100):
    """
    批量处理工单，使用 AI 推理并更新数据库。
    """
    skip = 0
    while True:
        total, items = get_work_orders(db, skip=skip, limit=batch_size, keyword="")
        if not items:
            break
        for work_order in items:
            # 如果工单已有推理结果，可以跳过
            if work_order.rule_index is not None and work_order.err_index is not None:
                continue
            # 调用 AI 推理
            result = ai_diagnosis(work_order)
            # 更新工单字段（归一化，确保整数类型）
            norm = normalize_inference_result(result)
            work_order.rule_index = norm["rule_index"]
            work_order.err_index = norm["error_index"]
            work_order.probability = norm["probability"]
            work_order.evidence = norm["evidence"]
        db.commit()
        skip += batch_size
        if skip >= total:
            break

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
            content = mock_numerical_value(mock.name, float(status), work_order)
        else:
            content = mock_string_value(mock.name, int(round(status)), work_order)

        inference.conclusion = content.conclusion
        inference.name = mock.name
        norm_code = normalize_solution_code(content.solution)
        inference.solution_code = norm_code
        inference.solution_content = get_solution(norm_code)
        inference.descriptions = replace_text_codes(work_order, rule.descriptions) 
        inference.curr_rules = replace_rules(work_order, rule.curr_rules)
        result.append(inference)
    return result

def get_solution(code: str) -> str:
    from ..utils.file_utils import read_text_file_safe
    if not code.startswith("FA"):
        return code
    file_path = project_root / "files" / "solutions" / (code + ".md")
    if not file_path.exists():
        return ""
    content = read_text_file_safe(file_path)

    return content

def normalize_solution_code(code: str) -> str:
    """
    规范化方案编号，容错处理乱码或非ASCII字符：
    - 提取形如 FA + 数字 的片段作为有效编号
    - 若提取失败，返回原始值
    """
    try:
        import re
        m = re.search(r"(FA\d+)", str(code))
        if m:
            return m.group(1)
        return str(code)
    except Exception:
        return str(code)

def sanitize_text(text: str) -> str:
    """
    清理文本中的不可打印控制字符并标准化换行，避免前端渲染或序列化异常。
    """
    # 标准化换行
    s = text.replace("\r\n", "\n").replace("\r", "\n")
    # 去除除 \n、\t 以外的 C0 控制字符
    return "".join(ch for ch in s if (ch >= " " or ch in ("\n", "\t")))

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
            value = _exec_fetch_static_data(placeholder, "")
            text = text.replace(placeholder, str(value))

    return text

def _exec_fetch_static_data(item_name: str, param: str):
    """
    执行静态数据获取工具，兼容被 @tool 装饰成 StructuredTool 的调用方式。
    优先使用 .invoke(dict)；若不可用则尝试直接函数调用或 .run(dict)。
    """
    try:
        if hasattr(fetch_static_data, "invoke"):
            return fetch_static_data.invoke({"item_name": item_name, "param": param})
        return fetch_static_data(item_name, param)
    except TypeError:
        if hasattr(fetch_static_data, "run"):
            return fetch_static_data.run({"item_name": item_name, "param": param})
        return {}

def get_work_orders(db: Session, skip: int = 0, limit: int = 10, keyword: str = ""):

    count_stmt = (
        select(func.count())
        .select_from(WorkOrder)
       # .where(WorkOrder.GJ00008.contains("退服"))
    )

    if keyword is not None:
        count_stmt = count_stmt.where(WorkOrder.work_order_id.contains(keyword))

    total = db.execute(count_stmt).scalar()
    if total is None:
        total = 0

    stmt = select(WorkOrder) #.where(WorkOrder.GJ00008.contains("退服"))
    if keyword is not None:
        stmt = stmt.where(WorkOrder.work_order_id.contains(keyword))
    stmt = stmt.offset(skip).limit(limit)
    items = db.execute(stmt).scalars().all()
    return total, items


@tool(description="Fetch static data based on item name and status")
def fetch_static_data(item_name: str, param: str):
    """
    Fetch static data based on item name.
    """
    # 机房编码
    if item_name == "JT00012":
        return {"room_id": "002017032644148100001082", "room_name": "南头机房"}

    # 站点编码
    if item_name == "JT00013":
        return {"station_id": "440106040010002750", "station_name": "南头站"}
    return {}

@tool(description="Mock numerical data based on item name and status")
def numeric_mock(item_name: str, status: float):
    """
    Mock numerical data. This is a placeholder tool for AI inference.
    """
    # This tool is used by AI to request mock data, but we don't need to implement it
    # because we will handle mock data separately.
    return {"value": 0, "conclusion": "", "solution": ""}

@tool(description="Mock string data based on item name and status")
def string_mock(item_name: str, status: int):
    """
    Mock string data. This is a placeholder tool for AI inference.
    """
    # This tool is used by AI to request mock data, but we don't need to implement it
    # because we will handle mock data separately.
    return {"value": "", "conclusion": "", "solution": ""}
