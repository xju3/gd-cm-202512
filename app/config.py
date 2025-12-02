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
    app_title: str = "Postgres 查询服务"
    default_limit: int = 10
    debug_mode: bool = False

    # 读取根目录下的 .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    # 过渡数据，用于构建其他列表
    json_rules: List[Dict[str, Any]] = json.load(open(project_root / "app" / 'files' / 'rules.json', 'r', encoding='utf-8')) 
    json_mml_num: List[Dict[str, Any]] = json.load(open(project_root / "app" / 'files' / 'mml_num.json', 'r', encoding='utf-8'))
    json_mml_str: List[Dict[str, Any]] = json.load(open(project_root / "app" / 'files' / 'mml_str.json', 'r', encoding='utf-8'))
    
    # 解析后的列表
    diagnosis_rule_list: List[DiagnosisRule] = [DiagnosisRule(**item) for item in json_rules]
    mml_num_list: List[MmlNumSetting] = [MmlNumSetting(**item) for item in json_mml_num]
    mml_str_list: List[MmlStrSetting] = [MmlStrSetting(**item) for item in json_mml_str]

settings = Settings()
