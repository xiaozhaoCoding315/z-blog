#!/usr/bin/env sh
# 一键发布：本地构建镜像 → 上传服务器 → 滚动更新（2C2G 服务器禁止构建，全程本地构建）
# 用法：npm run deploy
# 可用环境变量覆盖：DEPLOY_HOST（默认 root@60.205.0.224）、DEPLOY_DIR（默认 /opt/blog）
set -e

HOST="${DEPLOY_HOST:-root@60.205.0.224}"
DIR="${DEPLOY_DIR:-/opt/blog}"
IMAGE="blog-app:latest"

# 构建前预检：NEXT_PUBLIC_* 在构建期内联，服务器上的 .env 不参与本地构建。
# 生效值优先取 shell 环境变量，其次取本地 .env；非 https:// 只警告，不中断发布。
ENV_FILE="$(dirname "$0")/../.env"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-}"
if [ -z "$SITE_URL" ] && [ -f "$ENV_FILE" ]; then
  SITE_URL=$(sed -n 's/^[[:space:]]*NEXT_PUBLIC_SITE_URL[[:space:]]*=[[:space:]]*//p' "$ENV_FILE" \
    | tail -n 1 | tr -d '\r' \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
fi

echo "==> 本次构建将内联的站点地址：${SITE_URL:-（未设置）}"
case "$SITE_URL" in
  https://*) ;;
  *)
    echo "⚠️  警告：NEXT_PUBLIC_SITE_URL 不是 https:// 地址。"
    echo "    上线门槛要求 HTTPS；该值在构建期内联进镜像，构建完成后无法用运行期环境变量补救。"
    echo "    请在本地 .env 或命令行设置 https://你的域名 后重新构建。"
    ;;
esac

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
