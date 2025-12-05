from typing import List # 导入 List
from typing import Optional # 导入 Optional
from datetime import datetime
from typing import Optional, Any, Dict, Union
from pydantic import BaseModel, ConfigDict, field_validator, Field 
from typing import Optional, Any, Dict, Union
import json

class MmlContent(BaseModel):
    """
        MML 内容结构
    """
    id: int
    conclusion: str
    solution: str

class MmlNumSetting(BaseModel):
    key: str
    low: int
    high: int
    normal: str
    err: str
    

class MockData(BaseModel):
    type: str
    name: str


class MmlStrSetting(BaseModel):
    key: str
    contents: List[MmlContent]

    
class RuleContent(BaseModel):
    id: int
    name: str
    descriptions: str
    mock: MockData

class DiagnosisRule(BaseModel):
    name: str
    rules: List[RuleContent]

class InferenceResponse(BaseModel):
    success: bool = Field(
        ..., 
        description="是否成功执行", 
    )
    error : str = Field(
        ..., 
        description="错误标识", 
    ),
    data: List['Inference'] = Field(
        ..., 
        description="推理结果数据", 
    )   


class Inference(BaseModel):
    """推理结果数据"""
    descriptions: str = Field(
        ..., 
        description="问题描述", 
    )
    conclusion: str = Field(
        ..., 
        description="故障名称", 
    )
    solution: str = Field(
        ..., 
        description="解决方案", 
    ),

    

class WorkOrderDTO(BaseModel):
    """单条工单数据 (保持不变)"""
    work_order_id: str = Field(
        ..., 
        description="工单唯一标识ID", 
        examples=["CMCC-GD-GZCL-20250628-000781"]
    )
        
    GJ00008: Optional[str] = Field(
        default=None, 
        description="GJ00008-告警标准名", 
        examples=["机框风扇故障", "天馈驻波比异常"]
    )
    
    GJ00010: Optional[str] = Field(
        default=None, 
        description="GJ00010-所属机房", 
        examples=["深圳龙岗区10号线禾花站负一楼机房无线1"]
    )
     
    # device_supplier 
    GJ00011: Optional[str] = Field(
        default=None, 
        description="GJ00011-设备厂家", 
        examples=["华为", "中兴"]
    )
    
    
    GJ00014: Optional[str] = Field(
        default=None, 
        description="GJ00014-告警对象", 
        examples=["深圳10号线禾花站皮飞DE-HLW"]
    )


    GJ00017: Optional[str] = Field(
        default=None, 
        description="GJ00017-网络2级分类", 
        examples=["华为", "中兴"]
    )
    
    GJ00021: Optional[str] = Field(
        default=None, 
        description="GJ00021-网管告警消除时间（主）", 
        examples=["2025/7/2 0:10"]
    )
    
    
    created_time: Optional[str] = Field(
        default=None, 
        description="工单创建时间", 
        examples=["2025-06-28 08:11:58"]
    )
    
    source_name: Optional[str] = Field(
        default=None, 
        description="告警来源/网管系统名称", 
        examples=["FMC"]
    )
    
    order_subject: Optional[str] = Field(
        default=None, 
        description="工单主题", 
        examples=["小区退服处理"]
    )
    
    order_status: Optional[str] = Field(
        default=None, 
        description="工单当前处理状态", 
        examples=["处理中", "已归档"]
    )
    
    city_name_1: Optional[str] = Field(
        default=None, 
        description="一级地市/省份", 
        examples=["广东省"]
    )
    
    city_name_2: Optional[str] = Field(
        default=None, 
        description="二级地市/城市", 
        examples=["深圳市"]
    )
    
    ne_name: Optional[str] = Field(
        default=None, 
        description="网元名称", 
        examples=["深圳10号线禾花站皮飞DE-HLW"]
    )
    
    nms_alarm_id: Optional[str] = Field(
        default=None, 
        description="网管侧原始告警ID", 
        examples=["250205592"]
    )
    
    # 这是一个联合类型，描述需要写清楚
    details: Optional[Union[Dict[str, Any], str]] = Field(
        default=None, 
        description="告警详情 (会自动解析为JSON对象，如果解析失败则返回原始字符串)",
        examples=[{
            "告警网管": "FMC",
            "告警名称": "BBU风扇堵转告警",
            "告警原文": {"alarmId": "123", "addInfo": {"Cause": "307"}}
        }]
    )
  

    model_config = ConfigDict(from_attributes=True)
   
    @field_validator('details', mode='before')
    @classmethod
    def parse_details_to_json(cls, v):
        """
        主解析逻辑：尽最大努力解析，失败则回退到原始值
        """
        # 如果本身不是字符串（已经是字典或None），直接返回
        if not v or not isinstance(v, str):
            return v
        
        try:
            # === 第一层：解析外部的 Key: Value 换行结构 ===
            parsed_data = {}
            lines = v.split('\n')
            current_key = None
            
            for line in lines:
                line = line.strip()
                if not line: continue
                
                # 判断是否为新 Key
                separator = "：" if "：" in line else ":"
                is_new_key = False
                if separator in line:
                    potential_key, _ = line.split(separator, 1)
                    potential_key = potential_key.strip()
                    # 简单的启发式规则：Key 不太可能包含引号或大括号，且长度通常有限
                    if '"' not in potential_key and '{' not in potential_key and len(potential_key) < 30:
                        is_new_key = True

                if is_new_key:
                    key, value = line.split(separator, 1)
                    current_key = key.strip()
                    parsed_data[current_key] = value.strip()
                else:
                    # 拼接断行
                    if current_key:
                        parsed_data[current_key] += "\n" + line
            
            # 如果第一层解析结果为空（说明格式完全不对），直接返回原始字符串 v
            if not parsed_data:
                return v

            # === 第二层：解析 "告警原文" JSON ===
            if "告警原文" in parsed_data:
                try:
                    # 尝试解析 JSON
                    alarm_content = json.loads(parsed_data["告警原文"], strict=False)
                    
                    # 只有解析成功且是字典时，才继续处理 deeper logic
                    if isinstance(alarm_content, dict):
                        
                        # === 第三层：解析 "addInfo" 分号结构 ===
                        if "addInfo" in alarm_content:
                            original_add_info = alarm_content["addInfo"]
                            if isinstance(original_add_info, str):
                                # 调用辅助函数
                                parsed_add_info = cls._parse_semicolon_string(original_add_info)
                                # 【关键逻辑】只有解析出了有效内容，才替换；否则保留原字符串
                                if parsed_add_info:
                                    alarm_content["addInfo"] = parsed_add_info
                        
                        # 将处理过的对象赋值回去
                        parsed_data["告警原文"] = alarm_content
                        
                except Exception:
                    # json.loads 失败，或者后续处理出错
                    # 捕获所有异常，不做任何修改，保留 "告警原文" 为原始字符串
                    pass

            return parsed_data

        except Exception:
            # 如果最外层的分割逻辑都崩了，直接返回原始字符串
            return v

    @staticmethod
    def _parse_semicolon_string(text: str) -> Optional[Dict[str, str]]:
        """
        解析分号分隔的字符串。
        如果无法解析或解析为空，返回 None (表示保留原文)。
        """
        if not text:
            return None
        
        try:
            # 1. 保护转义字符
            temp_semi = "§§SEMI§§"
            temp_colon = "§§COLON§§"
            safe_text = text.replace(r"\;", temp_semi).replace(r"\:", temp_colon)
            
            # 2. 分割
            items = safe_text.split(';')
            result = {}
            
            valid_item_count = 0
            for item in items:
                item = item.strip()
                if not item: continue
                
                if ':' in item:
                    k, v = item.split(':', 1)
                    clean_val = v.replace(temp_semi, ";").replace(temp_colon, ":").strip()
                    result[k.strip()] = clean_val
                    valid_item_count += 1
                else:
                    # 如果只有 key 没有 value (如 "deployment:LTE;someFlag")
                    # 我们也把它存下来，或者你可以选择忽略
                    result[item.replace(temp_semi, ";")] = ""
            
            # 如果完全没有解析出任何有效键值对（比如就是一个纯文本描述），返回 None
            if not result:
                return None
                
            return result
            
        except Exception:
            return None
    
class PaginatedResponse(BaseModel):
    """
    [新增] 分页响应结构
    """
    total: int          # 总记录数
    page: int           # 当前页码
    size: int           # 每页大小
    total_pages: int    # 总页数
    items: List[WorkOrderDTO] # 数据列表