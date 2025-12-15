FROM nginx:latest

# 维护者信息（可选）
LABEL maintainer="xianzhen_cui <xianzhen_cui@dmten.com>"

WORKDIR /usr/share/nginx/html

COPY . .

# 复制Nginx配置文件（可选，根据实际情况修改）
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 7180

# 以服务模式启动Nginx（默认已由官方镜像配置为前台运行，无需额外参数）
CMD ["nginx"]
