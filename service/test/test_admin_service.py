import json
from pathlib import Path

from app.services import admin_service
from app.schemas_admin import KnowledgeBasePayload


def _write_json(path: Path, data) -> None:
    """
    向测试目录写入 JSON 样例数据。
    """

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _prepare_fixture(tmp_path: Path, monkeypatch) -> None:
    """
    构造后台知识库初始化所需的最小测试数据。
    """

    rules_path = tmp_path / "rules.json"
    rule_types_path = tmp_path / "rules_type.json"
    mml_str_path = tmp_path / "mml_str.json"
    work_orders_path = tmp_path / "work_orders.json"
    solutions_dir = tmp_path / "solutions"
    admin_dir = tmp_path / "admin"
    knowledge_path = admin_dir / "knowledge_bases.json"

    _write_json(
        rule_types_path,
        [
          {
            "id": "TF-001",
            "name": "基站退服",
            "description": "基站退服算法",
            "match": ["基站退服"],
          }
        ],
    )
    _write_json(
        rules_path,
        [
          {
            "name": "TF-001",
            "rules": [
              {
                "id": 1,
                "name": "规则一",
                "curr_rules": ["存在退服类告警"],
                "descriptions": "当前存在基站退服告警",
                "mock": {"type": "str", "name": "DT00008"},
              }
            ],
          }
        ],
    )
    _write_json(
        mml_str_path,
        [
          {
            "key": "DT00008",
            "contents": [
              {
                "id": 1,
                "conclusion": "RRU端故障",
                "solution": "FA00001",
                "process_id": 2,
                "process_message": "BBU与RRU光路异常",
              }
            ],
          }
        ],
    )
    _write_json(
        work_orders_path,
        [
          {
            "worker_order_id": "WO-001",
            "diagnosis": {
              "process_message": ["电压正常", "光路异常"],
              "conclusion": "RRU端故障",
              "fault_impact_range": "影响单站覆盖",
              "alarm_level": "三级告警",
              "solution": "FA00001",
            },
          }
        ],
    )

    solutions_dir.mkdir(parents=True, exist_ok=True)
    (solutions_dir / "FA00001.md").write_text(
        "# 更换RRU\n\n1. 到站排查\n2. 更换设备",
        encoding="utf-8",
    )

    monkeypatch.setattr(admin_service, "RULES_PATH", rules_path)
    monkeypatch.setattr(admin_service, "RULE_TYPES_PATH", rule_types_path)
    monkeypatch.setattr(admin_service, "MML_STR_PATH", mml_str_path)
    monkeypatch.setattr(admin_service, "WORK_ORDERS_PATH", work_orders_path)
    monkeypatch.setattr(admin_service, "SOLUTIONS_DIR", solutions_dir)
    monkeypatch.setattr(admin_service, "ADMIN_DATA_DIR", admin_dir)
    monkeypatch.setattr(admin_service, "KNOWLEDGE_BASE_PATH", knowledge_path)


def test_ensure_knowledge_base_data_creates_seed(monkeypatch, tmp_path: Path):
    """
    首次初始化时应自动生成三类知识库数据文件。
    """

    _prepare_fixture(tmp_path, monkeypatch)

    data = admin_service.ensure_knowledge_base_data()

    assert admin_service.KNOWLEDGE_BASE_PATH.exists()
    assert len(data["knowledge_bases"]["alert"]) == 1
    assert len(data["knowledge_bases"]["experience"]) == 1
    assert len(data["knowledge_bases"]["solution"]) == 1


def test_create_and_update_record(monkeypatch, tmp_path: Path):
    """
    应支持新增并更新知识库记录。
    """

    _prepare_fixture(tmp_path, monkeypatch)
    admin_service.ensure_knowledge_base_data()

    payload = KnowledgeBasePayload(
        title="新增经验案例",
        category="案例经验",
        summary="用于补充人工经验",
        content="先核查传输，再确认设备状态。",
        tags=["人工录入", "经验"],
        source="测试录入",
        references=["FA00001"],
        metadata={"work_order_id": "WO-002"},
    )

    created = admin_service.create_record("experience", payload)
    updated = admin_service.update_record(
        "experience",
        created["id"],
        payload.model_copy(update={"title": "更新后的经验案例"}),
    )

    assert created["title"] == "新增经验案例"
    assert updated is not None
    assert updated["title"] == "更新后的经验案例"
