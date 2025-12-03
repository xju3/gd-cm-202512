from langchain.tools import tool
from ..schemas import MmlContent
from ..config import settings

from pathlib import Path

# 获取当前文件的绝对路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent


# @tool(description="mock numerical data based on item name and status")
def mock_numerical_value(item_name: str, status: float) -> MmlContent:
    """
    模拟数字数据
    """

    items = next(
        setting for setting in settings.mml_num_list if setting.key == item_name
    )
    if len(items) == 0:
        return None
    item = items[0]


    solution = "FA00001"
    value = "光模块、尾纤、传输故障"
    if status == 0:
        solution = "FA00007"
        value = "RRU端故障"
    return MmlContent(id=1, value=value, solution=solution)


# @tool(description="Generate string data based on item name and status")
def mock_string_value(item_name: str, status: int) -> MmlContent:
    """
    模拟字符串
    """
    try:
        if status == 0:
            return MmlContent(id=1, val="正常", solution="无需处理")
    except Exception as e:
        return MmlContent(id=1, val="", solution="模拟数据异常：" + str(e))

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
