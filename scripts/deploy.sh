#!/usr/bin/env sh
# 一键发布：本地构建镜像 → 上传服务器 → 滚动更新（2C2G 服务器禁止构建，全程本地构建）
# 用法：npm run deploy
# 可用环境变量覆盖：DEPLOY_HOST（默认 root@60.205.0.224）、DEPLOY_DIR（默认 /opt/blog）
set -e

HOST="${DEPLOY_HOST:-root@60.205.0.224}"
DIR="${DEPLOY_DIR:-/opt/blog}"
IMAGE="blog-app:latest"

echo "==> [1/5] 本地构建镜像..."
docker compose build app

echo "==> [2/5] 打包镜像与源码..."
docker save "$IMAGE" | gzip > /tmp/blog-app.tar.gz
tar czf /tmp/blog-src.tar.gz \
  --exclude=node_modules --exclude=.next --exclude=.git \
  --exclude=.env --exclude=.zcode --exclude="*.log" .

echo "==> [3/5] 上传到服务器..."
scp -q /tmp/blog-app.tar.gz /tmp/blog-src.tar.gz "$HOST":/tmp/

echo "==> [4/5] 服务器滚动更新（容器启动时自动同步/向量化新文章）..."
ssh "$HOST" "cd $DIR && tar xzf /tmp/blog-src.tar.gz && rm /tmp/blog-src.tar.gz && \
  docker load < /tmp/blog-app.tar.gz | tail -1 && rm /tmp/blog-app.tar.gz && \
  docker compose up -d --no-build"

rm -f /tmp/blog-app.tar.gz /tmp/blog-src.tar.gz

echo "==> [5/5] 发布完成 ✅  http://60.205.0.224"
echo "    新文章会出现在列表顶部；AI 摘要/向量化在容器启动时自动完成（docker logs blog-app-1 可查看）"
