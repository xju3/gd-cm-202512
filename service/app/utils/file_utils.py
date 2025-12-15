from pathlib import Path

def sanitize_text(text: str) -> str:
    """
    清理文本中的不可打印控制字符并标准化换行，避免前端渲染或序列化异常。
    """
    s = text.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(ch for ch in s if (ch >= " " or ch in ("\n", "\t")))

def read_text_file_safe(file_path: Path) -> str:
    """
    读取文本文件的健壮实现：
    1) 以字节方式读取，避免因错误编码导致的异常
    2) 依次尝试常见编码：utf-8、utf-8-sig、gb18030、gbk
    3) 若均失败，使用 utf-8 并替换非法字节，确保不抛错
    4) 对结果进行 sanitize，统一换行并去除控制字符
    """
    if not file_path.exists():
        return ""
    raw = file_path.read_bytes()
    content = None
    for enc in ("utf-8", "utf-8-sig", "gb18030", "gbk"):
        try:
            content = raw.decode(enc)
            break
        except Exception:
            continue
    if content is None:
        content = raw.decode("utf-8", errors="replace")
    return sanitize_text(content)

