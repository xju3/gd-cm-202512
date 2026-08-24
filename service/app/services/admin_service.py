import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from ..schemas_admin import KnowledgeBasePayload, KnowledgeBaseRecord, KnowledgeBaseType
from ..utils.file_utils import read_text_file_safe


ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "123456"
ADMIN_TOKEN = "admin-static-token"

CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parent.parent
RULES_PATH = PROJECT_ROOT / "files" / "rules" / "rules.json"
RULE_TYPES_PATH = PROJECT_ROOT / "files" / "rules" / "rules_type.json"
MML_STR_PATH = PROJECT_ROOT / "files" / "data" / "mml_str.json"
WORK_ORDERS_PATH = PROJECT_ROOT / "files" / "data" / "work_orders.json"
SOLUTIONS_DIR = PROJECT_ROOT / "files" / "solutions"
ADMIN_DATA_DIR = PROJECT_ROOT / "files" / "admin"
KNOWLEDGE_BASE_PATH = ADMIN_DATA_DIR / "knowledge_bases.json"

KB_LABELS: Dict[KnowledgeBaseType, str] = {
    "alert": "告警知识库",
    "experience": "经验知识库",
    "solution": "解决方案知识库",
}

SOURCE_SUMMARY = (
    " "
)


def _read_json_file(path: Path) -> Any:
    """
    以兼容编码的方式读取 JSON 文件。
    """

    raw = path.read_bytes()
    for encoding in ("utf-8", "utf-8-sig", "gb18030", "gbk"):
        try:
            return json.loads(raw.decode(encoding))
        except Exception:
            continue
    return json.loads(raw.decode("utf-8", errors="replace"))


def _write_json_file(path: Path, data: Dict[str, Any]) -> None:
    """
    将知识库数据写回本地 JSON 文件。
    """

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _now_text() -> str:
    """
    生成统一格式的时间字符串。
    """

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _extract_solution_title(content: str, fallback: str) -> str:
    """
    从 Markdown 内容中提取首个一级标题作为方案标题。
    """

    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return fallback


def _build_solution_relation_map(mml_items: List[Dict[str, Any]], work_orders: List[Dict[str, Any]]) -> Dict[str, Dict[str, List[str]]]:
    """
    建立解决方案与结论、工单之间的关系索引。
    """

    relation_map: Dict[str, Dict[str, List[str]]] = {}

    for item in mml_items:
        for content in item.get("contents", []):
            code = str(content.get("solution", "")).strip()
            if not code:
                continue
            relation = relation_map.setdefault(code, {"conclusions": [], "work_orders": []})
            conclusion = str(content.get("conclusion", "")).strip()
            if conclusion and conclusion not in relation["conclusions"]:
                relation["conclusions"].append(conclusion)

    for work_order in work_orders:
        diagnosis = work_order.get("diagnosis", {})
        code = str(diagnosis.get("solution", "")).strip()
        if not code:
            continue
        relation = relation_map.setdefault(code, {"conclusions": [], "work_orders": []})
        conclusion = str(diagnosis.get("conclusion", "")).strip()
        if conclusion and conclusion not in relation["conclusions"]:
            relation["conclusions"].append(conclusion)
        work_order_id = str(work_order.get("worker_order_id", "")).strip()
        if work_order_id and work_order_id not in relation["work_orders"]:
            relation["work_orders"].append(work_order_id)

    return relation_map


def _seed_alert_records(
    rule_types: List[Dict[str, Any]],
    rules: List[Dict[str, Any]],
    mml_items: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    根据规则类型与规则节点生成告警知识库初始数据。
    """

    rule_type_map = {item["id"]: item for item in rule_types}
    solution_map = {
        item.get("key", ""): [
            str(content.get("solution", "")).strip()
            for content in item.get("contents", [])
            if str(content.get("solution", "")).strip()
        ]
        for item in mml_items
    }
    records: List[Dict[str, Any]] = []
    now_text = _now_text()

    for rule_group in rules:
        rule_type = rule_type_map.get(rule_group.get("name", ""), {})
        match_examples = rule_type.get("match", [])[:5]
        for rule in rule_group.get("rules", []):
            mock_name = str(rule.get("mock", {}).get("name", "")).strip()
            related_codes = solution_map.get(mock_name, [])
            record_id = f"alert-{rule_group.get('name', 'unknown').lower()}-{rule.get('id', 0)}"
            content_lines = [str(item).strip() for item in rule.get("curr_rules", []) if str(item).strip()]
            records.append(
                KnowledgeBaseRecord(
                    id=record_id,
                    title=f"{rule_type.get('name', rule_group.get('name', '未知规则'))}-{rule.get('name', '规则节点')}",
                    category=rule_type.get("name", "未分类"),
                    summary=str(rule.get("descriptions", "")).strip(),
                    content="\n".join(content_lines) if content_lines else "该规则节点暂无附加判断条件。",
                    tags=[
                        str(rule_group.get("name", "")).strip(),
                        mock_name,
                    ],
                    source="rules.json / rules_type.json",
                    references=related_codes,
                    metadata={
                        "rule_type_id": str(rule_group.get("name", "")).strip(),
                        "rule_type_description": str(rule_type.get("description", "")).strip(),
                        "rule_id": rule.get("id"),
                        "issue": str(rule.get("issue", "")).strip(),
                        "match_examples": match_examples,
                        "mock_type": str(rule.get("mock", {}).get("type", "")).strip(),
                        "mock_name": mock_name,
                    },
                    created_at=now_text,
                    updated_at=now_text,
                ).model_dump()
            )

    return records


def _seed_experience_records(work_orders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    根据已有工单诊断结果生成经验知识库初始数据。
    """

    records: List[Dict[str, Any]] = []
    now_text = _now_text()

    for index, work_order in enumerate(work_orders, start=1):
        diagnosis = work_order.get("diagnosis", {})
        process_message = diagnosis.get("process_message", [])
        conclusion = str(diagnosis.get("conclusion", "")).strip()
        fault_impact_range = str(diagnosis.get("fault_impact_range", "")).strip()
        if not conclusion and not process_message:
            continue
        records.append(
            KnowledgeBaseRecord(
                id=f"experience-{index:03d}",
                title=conclusion or f"经验案例-{index:03d}",
                category=str(diagnosis.get("alarm_level", "案例经验")).strip() or "案例经验",
                summary=fault_impact_range or (process_message[0] if process_message else ""),
                content="\n".join(str(item).strip() for item in process_message if str(item).strip()),
                tags=[
                    str(diagnosis.get("alarm_level", "")).strip(),
                    str(diagnosis.get("solution", "")).strip(),
                ],
                source="work_orders.json",
                references=[str(diagnosis.get("solution", "")).strip()],
                metadata={
                    "work_order_id": str(work_order.get("worker_order_id", "")).strip(),
                    "fault_impact_range": fault_impact_range,
                    "solution_code": str(diagnosis.get("solution", "")).strip(),
                    "process_message": process_message,
                },
                created_at=now_text,
                updated_at=now_text,
            ).model_dump()
        )

    return records


def _seed_solution_records(
    relation_map: Dict[str, Dict[str, List[str]]],
) -> List[Dict[str, Any]]:
    """
    根据解决方案 Markdown 文件生成解决方案知识库初始数据。
    """

    records: List[Dict[str, Any]] = []
    now_text = _now_text()

    for solution_file in sorted(SOLUTIONS_DIR.glob("FA*.md")):
        code = solution_file.stem
        content = read_text_file_safe(solution_file)
        relation = relation_map.get(code, {"conclusions": [], "work_orders": []})
        records.append(
            KnowledgeBaseRecord(
                id=f"solution-{code.lower()}",
                title=_extract_solution_title(content, code),
                category="标准解决方案",
                summary="；".join(relation["conclusions"][:3]) or f"{code} 标准处置方案",
                content=content,
                tags=[code, "markdown"],
                source=f"solutions/{solution_file.name}",
                references=relation["work_orders"][:5],
                metadata={
                    "solution_code": code,
                    "related_conclusions": relation["conclusions"],
                    "related_work_orders": relation["work_orders"],
                    "file_name": solution_file.name,
                },
                created_at=now_text,
                updated_at=now_text,
            ).model_dump()
        )

    return records


def _build_seed_data() -> Dict[str, Any]:
    """
    基于现有项目规则、工单与方案生成后台知识库初始化数据。
    """

    rule_types = _read_json_file(RULE_TYPES_PATH)
    rules = _read_json_file(RULES_PATH)
    mml_items = _read_json_file(MML_STR_PATH)
    work_orders = _read_json_file(WORK_ORDERS_PATH)
    relation_map = _build_solution_relation_map(mml_items, work_orders)

    return {
        "source_summary": SOURCE_SUMMARY,
        "knowledge_bases": {
            "alert": _seed_alert_records(rule_types, rules, mml_items),
            "experience": _seed_experience_records(work_orders),
            "solution": _seed_solution_records(relation_map),
        },
    }


def ensure_knowledge_base_data() -> Dict[str, Any]:
    """
    确保后台知识库数据文件存在，不存在时按现有逻辑自动初始化。
    """

    if not KNOWLEDGE_BASE_PATH.exists():
        data = _build_seed_data()
        _write_json_file(KNOWLEDGE_BASE_PATH, data)
        return data
    return _read_json_file(KNOWLEDGE_BASE_PATH)


def verify_admin(username: str, password: str) -> bool:
    """
    校验管理员账号密码。
    """

    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD


def verify_token(token: str) -> bool:
    """
    校验管理员访问令牌。
    """

    return token == ADMIN_TOKEN


def list_records(kb_type: KnowledgeBaseType, keyword: str = "") -> Dict[str, Any]:
    """
    按知识库类型读取记录，并支持关键字过滤。
    """

    data = ensure_knowledge_base_data()
    items = data.get("knowledge_bases", {}).get(kb_type, [])
    normalized_keyword = keyword.strip().lower()
    if normalized_keyword:
        filtered_items = []
        for item in items:
            search_text = json.dumps(item, ensure_ascii=False).lower()
            if normalized_keyword in search_text:
                filtered_items.append(item)
        items = filtered_items

    items = sorted(items, key=lambda item: item.get("updated_at", ""), reverse=True)
    return {
        "type": kb_type,
        "source_summary": data.get("source_summary", SOURCE_SUMMARY),
        "items": items,
    }


def get_overview() -> Dict[str, Any]:
    """
    返回三类知识库的条目总数概览。
    """

    data = ensure_knowledge_base_data()
    knowledge_bases = data.get("knowledge_bases", {})
    items = [
        {
            "type": kb_type,
            "label": label,
            "count": len(knowledge_bases.get(kb_type, [])),
        }
        for kb_type, label in KB_LABELS.items()
    ]
    return {
        "source_summary": data.get("source_summary", SOURCE_SUMMARY),
        "items": items,
    }


def create_record(kb_type: KnowledgeBaseType, payload: KnowledgeBasePayload) -> Dict[str, Any]:
    """
    创建新的知识库记录并写回数据文件。
    """

    data = ensure_knowledge_base_data()
    now_text = _now_text()
    record = KnowledgeBaseRecord(
        id=f"{kb_type}-{uuid.uuid4().hex[:8]}",
        title=payload.title.strip(),
        category=payload.category.strip(),
        summary=payload.summary.strip(),
        content=payload.content.strip(),
        tags=[str(item).strip() for item in payload.tags if str(item).strip()],
        source=payload.source.strip(),
        references=[str(item).strip() for item in payload.references if str(item).strip()],
        metadata=payload.metadata,
        created_at=now_text,
        updated_at=now_text,
    ).model_dump()
    data["knowledge_bases"][kb_type].insert(0, record)
    _write_json_file(KNOWLEDGE_BASE_PATH, data)
    return record


def update_record(kb_type: KnowledgeBaseType, record_id: str, payload: KnowledgeBasePayload) -> Dict[str, Any] | None:
    """
    更新指定知识库记录，不存在时返回 None。
    """

    data = ensure_knowledge_base_data()
    items = data.get("knowledge_bases", {}).get(kb_type, [])
    for index, item in enumerate(items):
        if item.get("id") != record_id:
            continue
        updated_item = KnowledgeBaseRecord(
            id=item["id"],
            title=payload.title.strip(),
            category=payload.category.strip(),
            summary=payload.summary.strip(),
            content=payload.content.strip(),
            tags=[str(tag).strip() for tag in payload.tags if str(tag).strip()],
            source=payload.source.strip(),
            references=[str(ref).strip() for ref in payload.references if str(ref).strip()],
            metadata=payload.metadata,
            created_at=item.get("created_at", _now_text()),
            updated_at=_now_text(),
        ).model_dump()
        items[index] = updated_item
        _write_json_file(KNOWLEDGE_BASE_PATH, data)
        return updated_item
    return None
