from langchain.tools import tool
from typing import List
from sqlalchemy import select, func  # 👈 别忘了导入 func
from ..schemas import MmlContent
from ..config import settings
from ..models import WorkOrder, OpticalPower
from ..database import get_db

from pathlib import Path

# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent

# @tool(description="mock numerical data based on item name and status")
def mock_numerical_value(item_name: str, status: float, work_order : WorkOrder) -> MmlContent:
    """
    模拟数字数据
    """
    
    if item_name == "DT00008":
        return _get_optical_power(work_order, status)

    items = next(
        setting for setting in settings.mml_num_list if setting.key == item_name
    )
    if len(items) == 0:
        return None
    item = items[0]


    


# @tool(description="Generate string data based on item name and status")
def mock_string_value(item_name: str, status: int, work_order : WorkOrder) -> MmlContent:
    """
    模拟字符串
    """
    try:
        status = int(round(status))
        if status == 0:
            return MmlContent(id=1, conclusion="", solution="", process_id=0, process_message="")
    except Exception as e:
        return MmlContent(id=1, conclusion="", process_id=0, process_message="", solution="模拟数据异常：" + str(e))

    item = next(
        setting for setting in settings.mml_str_list if setting.key == item_name
    )

    if item is None or len(item.contents) == 0:
        return MmlContent(id=1, value="", solution="模拟数据未设置")

    contents = item.contents

    if status > len(contents):
        status = len(contents)

    if status < 1:
        status = 1
    return contents[status - 1]


def _get_optical_power(work_order: WorkOrder, status : float) -> MmlContent:
    """
    获取光模块的光功率值
    """

    if status == -1:
        return MmlContent(id=1, conclusion="", solution="")
    db = get_db()
    stmt = select(OpticalPower).where(OpticalPower.ne_name == work_order.ne_name)
    result = db.execute(stmt).scalar()
    
    # if the return value is None, then use the default rules
    if result is None or len(result) == 0:
        solution = "FA00001"
        value = "光模块、尾纤、传输故障"
        if status == 0:
            solution = "FA00007"
            value = "RRU端故障"
        return MmlContent(id=1, conclusion=value, solution=solution)
    
    hit = False
    input_theshold = -1400
    output_threshold = -800

    messages = List[str]()
    
    # loop through all the items to find if any value is out of normal range
    for item in result:
        input_power = item.input_power
        output_power = item.output_power

        if input_power is not None:
            try:
                val = float(input_power)
                if val < input_theshold:
                    messages.append(item.port + item.board_name + item.slot_id  + "> 输入光功率过低" + str(val) + "dBm")
            except:
                pass

        
        if output_power is not None:
            try:
                val = float(output_power)
                if val < output_threshold:
                    messages.append(item.port + item.board_name + item.slot_id  + "> 输出光功率过低" + str(val) + "dBm")
            except:
                pass
        
    if len(messages) > 0:
        solution = "FA00001"
        value = "光模块、尾纤、传输故障"
        value += "(" + ",".join(messages) + ")"
        return MmlContent(id=1, conclusion=value, solution=solution)
    else:
        solution = "FA00007"
        value = "RRU端故障"
        return MmlContent(id=1, conclusion=value, solution=solution)
        
