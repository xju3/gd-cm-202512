from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from .schemas import DiagnosisRule, MmlStrSetting, MmlNumSetting
from typing import List, Dict, Any
import json
import os

# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent 

class Settings(BaseSettings):
    database_url: str
    database_vendor: str = "postgres"
    postgres_url: str | None = None
    mysql_url: str | None = None
    app_title: str = "广州移动智能故障诊断系统"
    default_limit: int = 10
    debug_mode: bool = False
    deepseek_api_key: str | None = None
    deepseek_api_key_cui: str | None = None

    # 读取根目录下的 .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    # 过渡数据，用于构建其他列表（健壮读取，兼容不同编码）
    @staticmethod
    def _read_json_file_safe(p: Path) -> List[Dict[str, Any]]:
        """
        健壮读取 JSON 文件：
        1) 以字节方式读取，避免错误编码导致异常
        2) 依次尝试 utf-8/utf-8-sig/gb18030/gbk 解码
        3) 若均失败，使用 utf-8 并替换非法字节
        """
        raw = p.read_bytes()
        text = None
        for enc in ("utf-8", "utf-8-sig", "gb18030", "gbk"):
            try:
                text = raw.decode(enc)
                break
            except Exception:
                continue
        if text is None:
            text = raw.decode("utf-8", errors="replace")
        return json.loads(text)
    json_rules: List[Dict[str, Any]] = _read_json_file_safe(project_root / 'app'  / 'files' / 'rules' / 'rules.json') 
    json_mml_num: List[Dict[str, Any]] = _read_json_file_safe(project_root / 'app'  / 'files' / 'data' / 'mml_num.json')
    json_mml_str: List[Dict[str, Any]] = _read_json_file_safe(project_root / 'app'  / 'files' / 'data' /'mml_str.json')
    
    # 解析后的列表
    diagnosis_rule_list: List[DiagnosisRule] = [DiagnosisRule(**item) for item in json_rules]
    mml_num_list: List[MmlNumSetting] = [MmlNumSetting(**item) for item in json_mml_num]
    mml_str_list: List[MmlStrSetting] = [MmlStrSetting(**item) for item in json_mml_str]

    def get_active_database_url(self) -> str:
        """
        获取当前激活的数据库连接串。
        优先级：
        1) 当 `database_vendor` 指向 `mysql` 且存在 `mysql_url` 时，返回 `mysql_url`；
        2) 当 `database_vendor` 指向 `postgres` 且存在 `postgres_url` 时，返回 `postgres_url`；
        3) 以上都未配置时，回退到 `database_url`；
        若仍不可用，则抛出异常。
        """
        vendor = (self.database_vendor or "").lower()
        if vendor.startswith("mysql") and self.mysql_url:
            return self.mysql_url
        if vendor.startswith("postgres") and self.postgres_url:
            return self.postgres_url
        if self.database_url:
            return self.database_url
        raise ValueError("未找到有效的数据库配置，请检查 .env 中的数据库连接串设置")

    def get_deepseek_api_key(self) -> str | None:
        """
        获取 DeepSeek API Key，兼容 `deepseek_api_key` 与 `deepseek_api_key_cui` 字段。
        若字段为空，则回退读取环境变量。
        """
        return (
            self.deepseek_api_key
            or self.deepseek_api_key_cui
            or os.environ.get("DEEPSEEK_API_KEY")
            or os.environ.get("DEEPSEEK_API_KEY_CUI")
        )

settings = Settings()
