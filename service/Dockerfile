# 基础镜像：指定Python Alpine版本
FROM python:3.13.3-alpine3.21

# 维护者信息（可选）
LABEL maintainer="xianzhen_cui <xianzhen_cui@dmten.com>"

# 设置工作目录（容器内）
WORKDIR /app

# 安装Alpine依赖（可选，根据应用需求添加）
# Alpine默认缺少gcc等编译工具，如需安装依赖（如psycopg2/pillow），需先装构建依赖
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    && rm -rf /var/cache/apk/*  # 清理缓存，减小镜像体积

# 方式1：全局配置pip清华源（推荐，后续所有pip命令均生效）
RUN mkdir -p /root/.config/pip \
    && echo "[global]" > /root/.config/pip/pip.conf \
    && echo "index-url = https://pypi.tuna.tsinghua.edu.cn/simple" >> /root/.config/pip/pip.conf \
    && echo "trusted-host = pypi.tuna.tsinghua.edu.cn" >> /root/.config/pip/pip.conf

# 复制依赖文件到容器（优先复制requirements.txt，利用Docker缓存）
COPY requirements.txt .

# 方式2：临时指定清华源（仅本次安装生效，可替换方式1）
# RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 安装Python依赖（Alpine推荐使用pip --no-cache-dir减少缓存）
RUN pip install --no-cache-dir -r requirements.txt

# 复制当前目录所有应用代码到容器工作目录
COPY . .

# 暴露端口（如应用是Web服务，如Flask/Django，需指定端口，可选）
EXPOSE 7190

# 设置容器启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7190", "--reload"]
