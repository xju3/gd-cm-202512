#!/bin/bash

# 检查参数数量
if [ $# -lt 2 ]; then
    echo "Usage: $0 <conda_env> <script_path> [script_args...]"
    exit 1
fi

ENV_NAME="$1"
SCRIPT_PATH="$2"
shift 2  # 移除前两个参数，剩余参数传递给脚本

# 验证Conda是否安装
if ! command -v conda &> /dev/null; then
    echo "Error: Conda not found. Please ensure Conda is installed and in your PATH."
    exit 1
fi

# 验证环境是否存在
if ! conda env list | grep -qE "\b${ENV_NAME}\b"; then
    echo "Error: Conda environment '$ENV_NAME' not found."
    echo "Available environments:"
    conda env list
    exit 1
fi

# 验证脚本是否存在
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: Script '$SCRIPT_PATH' not found."
    exit 1
fi

# 激活Conda环境并运行脚本
# 注意：这里使用 'source' 是为了在当前shell中激活环境
source "$(conda info --base)/etc/profile.d/conda.sh" || exit 1
conda activate "$ENV_NAME" || exit 1

# 执行目标脚本（保留参数传递）
echo "Running [$SCRIPT_PATH] in Conda env: $ENV_NAME"
exec "$SCRIPT_PATH" "$@"