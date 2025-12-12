from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from .schemas import DiagnosisRule, MmlStrSetting, MmlNumSetting
from typing import List, Dict, Any
import json

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

    # 读取根目录下的 .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    # 过渡数据，用于构建其他列表
    json_rules: List[Dict[str, Any]] = json.load(open(project_root / "app" / 'files' / 'rules' / 'rules.json', 'r', encoding='utf-8')) 
    json_mml_num: List[Dict[str, Any]] = json.load(open(project_root / "app" / 'files' / 'data' / 'mml_num.json', 'r', encoding='utf-8'))
    json_mml_str: List[Dict[str, Any]] = json.load(open(project_root / "app" / 'files' / 'data' /'mml_str.json', 'r', encoding='utf-8'))
    
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

settings = Settings()
