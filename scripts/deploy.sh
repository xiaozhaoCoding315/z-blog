#!/usr/bin/env sh
# 一键发布：本地构建不可变镜像 → 上传 → 发布前备份 → 健康检查 → 保留回滚记录。
# 需用户明确授权后执行；DEPLOY_HOST / DEPLOY_SITE_URL / DEPLOY_RELEASE_AUTHORIZED 均须显式设置。
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:?发布必须显式设置 DEPLOY_HOST，且需用户授权}"
DIR="${DEPLOY_DIR:-/opt/blog}"
BASE_COMPOSE_FILE="$ROOT/docker-compose.yml"
PROD_COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
BASE_COMPOSE_BASENAME="docker-compose.yml"
PROD_COMPOSE_BASENAME="docker-compose.prod.yml"
HEALTH_RETRIES="${DEPLOY_HEALTH_RETRIES:-30}"
# 发布记录与镜像的保留数量。每次发布会新建一个不可变 release 镜像，并把上一版
# 再打一个 rollback 标签；不清理的话两个标签一天就能堆出十来个（每个约 350MB）。
KEEP_RELEASES="${DEPLOY_KEEP_RELEASES:-5}"
REMOTE_SHELL="${DEPLOY_REMOTE_SHELL:-ssh}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-}"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "$ROOT" rev-parse --short=12 HEAD 2>/dev/null || printf 'uncommitted')"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/blog-deploy-XXXXXX")"
APP_PACKAGE="$WORK/blog-app-image-$RELEASE_ID.tar.gz"
SRC_PACKAGE="$WORK/blog-src-$RELEASE_ID.tar.gz"
MANIFEST="$WORK/source-manifest"
ROLLBACK_SCRIPT="$WORK/rollback-README-$RELEASE_ID.sh"
REMOTE_RELEASE_DIR="$DIR/releases/$RELEASE_ID"
REMOTE_ROLLBACK_SCRIPT="$REMOTE_RELEASE_DIR/rollback-README.sh"
REMOTE_BACKUP_DIR="$DIR/backups/$RELEASE_ID"

cleanup() {
  status=$?
  trap - EXIT INT TERM
  rm -rf "$WORK"
  if [ "$status" -ne 0 ]; then
    echo "==> 发布失败：服务器上的备份/发布记录未自动清理，回滚材料仍保留。" >&2
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

fail() {
  echo "❌ $1" >&2
  exit 1
}

# NEXT_PUBLIC_* 在构建期内联；服务器上的 .env 不能补救构建值。
ENV_FILE="$ROOT/.env"
if [ -z "$SITE_URL" ] && [ -f "$ENV_FILE" ]; then
  SITE_URL=$(sed -n 's/^[[:space:]]*NEXT_PUBLIC_SITE_URL[[:space:]]*=[[:space:]]*//p' "$ENV_FILE" \
    | tail -n 1 | tr -d '\r' \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
fi

[ -n "$SITE_URL" ] || fail "NEXT_PUBLIC_SITE_URL 未设置；上线必须是最终 https:// 域名。"
node -e 'const u = new URL(process.argv[1]); if (u.protocol !== "https:" || !u.hostname.includes(".") || u.pathname !== "/" || u.search || u.hash) process.exit(1)' "$SITE_URL" 2>/dev/null \
  || fail "NEXT_PUBLIC_SITE_URL 不是有效的 https:// 域名；该值在构建期内联，拒绝发布。"

# 只确认最终公网地址由用户显式提供，不把机器上任意 https URL 当作生产域名。
[ -n "${DEPLOY_SITE_URL:-}" ] || fail "缺少 DEPLOY_SITE_URL：请先确认 B1 的最终公网 HTTPS 地址，再显式传入该值。"
[ "$DEPLOY_SITE_URL" = "$SITE_URL" ] || fail "DEPLOY_SITE_URL 与构建期 NEXT_PUBLIC_SITE_URL 不一致，拒绝发布。"
[ "${DEPLOY_RELEASE_AUTHORIZED:-0}" = "yes" ] \
  || fail "缺少 DEPLOY_RELEASE_AUTHORIZED=yes：最终发布需用户明确授权。"

command -v docker >/dev/null 2>&1 || fail "Docker CLI 不可用；无法本地构建或导出镜像。"
docker info >/dev/null 2>&1 || fail "Docker engine 不可用；先启动 Docker Desktop/WSL engine。"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum 不可用；无法校验发布包。"

# 本地 Docker engine 不可用，无法解析并锁定基础镜像 digest。
# 默认拒绝发布；DEPLOY_TEST_STUBS=1 仅供 scripts/deploy-preflight.test.mjs 本地 stub 回归使用。
if grep -q 'NODE_IMAGE_DIGEST_REQUIRED' "$ROOT/Dockerfile"; then
  if [ "${DEPLOY_TEST_STUBS:-0}" = "1" ] && [ "$HOST" = "deploy-test@example.invalid" ]; then
    echo "==> 本地 stub 回归：基础镜像 digest 未锁定；不能用于真实发布。"
  else
    fail "基础镜像 digest 未锁定；请在 Dockerfile 固定三个 FROM 的 node digest 后发布。"
  fi
fi
if grep -q 'DB_IMAGE_DIGEST_REQUIRED' "$ROOT/docker-compose.yml"; then
  if [ "${DEPLOY_TEST_STUBS:-0}" = "1" ] && [ "$HOST" = "deploy-test@example.invalid" ]; then
    echo "==> 本地 stub 回归：数据库镜像 digest 未锁定；不能用于真实发布。"
  else
    fail "数据库镜像 digest 未锁定；请在 docker-compose.yml 固定 pgvector digest 后发布。"
  fi
fi

echo "==> [1/8] 生成受控源码包并计算内容指纹..."
# 源码包使用明确路径清单：包含未提交的第三轮改动，排除密钥、派生 .env、
# 本地审计产物、构建缓存、上传数据和归档 MDX。文件名模式包括
# .env.*、tsconfig.tsbuildinfo、hosts.bak.*、docs/design-research。
(
  cd "$ROOT"
  {
    git ls-files -z --cached --others --exclude-standard 2>/dev/null || true
  } | grep -zEv \
    '(^|/)(\.env($|\..*)|\.ssh($|/)|\.playwright-mcp($|/)|\.superpowers($|/)|\.claude($|/)|\.zcode($|/)|\.vscode($|/)|\.idea($|/)|\.next($|/)|\.git($|/)|node_modules($|/)|out($|/)|build($|/)|coverage($|/)|uploads($|/)|drizzle($|/)|docs($|/)|content/posts($|/)|content/interview($|/)|\.vercel($|/)|\.github($|/)|\.difficulty-cache\.json$|\.dockerignore$|.*\.tsbuildinfo$|.*\.log$|.*\.pem$|.*\.key$|id_ed25519.*$|npm-debug\.log.*$|hosts\.bak\..*$|tsconfig\.tsbuildinfo$|scripts/enable-dsh-lan\.ps1$|docker-compose\.dev\.yml$|docs/design-research($|/)|OPTIMIZATION\.md$|README\.md$|DEPLOY\.md$|AGENTS\.md$)' \
    | grep -zv '^hosts\.bak\.' \
    | tr '\0' '\n' > "$MANIFEST"
)
for required in Dockerfile docker-compose.yml docker-compose.prod.yml .dockerignore package.json package-lock.json scripts/docker-entrypoint.sh scripts/deploy.sh; do
  [ -f "$ROOT/$required" ] || fail "缺少发布文件：$required"
  grep -qxF "$required" "$MANIFEST" || printf '%s\n' "$required" >> "$MANIFEST"
done
printf '%s\n' '.env.example' >> "$MANIFEST"
tar czf "$SRC_PACKAGE" -C "$ROOT" -T "$MANIFEST"
SRC_SHA="$(sha256sum "$SRC_PACKAGE" | cut -d' ' -f1)"
SOURCE_FINGERPRINT="$(printf '%s' "$SRC_SHA" | cut -c1-12)"
IMAGE="blog-app:release-$RELEASE_ID-$SOURCE_FINGERPRINT"
IMAGE_TAG="${IMAGE#blog-app:}"

echo "==> [2/8] 本地构建不可变镜像：$IMAGE"
BLOG_IMAGE="$IMAGE" NEXT_PUBLIC_SITE_URL="$SITE_URL" \
  docker compose -f "$BASE_COMPOSE_FILE" -f "$PROD_COMPOSE_FILE" build app
IMAGE_ID="$(docker image inspect "$IMAGE" --format '{{.Id}}')"
case "$IMAGE_ID" in
  sha256:*) ;;
  *) fail "无法解析新镜像 ID；拒绝发布。" ;;
esac

echo "==> [3/8] 导出镜像并记录校验值..."
docker save "$IMAGE" > "$WORK/blog-app-image.tar"
gzip -c "$WORK/blog-app-image.tar" > "$APP_PACKAGE"
APP_SHA="$(sha256sum "$APP_PACKAGE" | cut -d' ' -f1)"

# 回滚脚本只记录旧镜像 tag/ID、备份位置和显式人工步骤；不自动恢复数据库或上传卷，
# 数据恢复需要用户按 B8/B13 确认备份标识与数据丢失窗口。
cat > "$ROLLBACK_SCRIPT" <<'ROLLBACK'
#!/bin/sh
set -eu
release_dir="$(dirname "$0")"
. "$release_dir/rollback.env"
echo "回滚锚点：$PREVIOUS_IMAGE_ID / $PREVIOUS_IMAGE_TAG"
echo "数据库备份：$DB_BACKUP"
echo "上传卷备份：$UPLOADS_BACKUP"
echo "源码快照：$SOURCE_SNAPSHOT"
echo "应用回退：cd $DEPLOY_DIR && BLOG_IMAGE=$PREVIOUS_IMAGE_TAG docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build app"
echo "数据回退：由负责人按 $DB_BACKUP / $UPLOADS_BACKUP 确认版本后再恢复；脚本不会自动覆盖数据库。"
echo "最后执行健康检查并记录 RTO、数据丢失窗口与结果。"
ROLLBACK
chmod +x "$ROLLBACK_SCRIPT"

echo "==> [4/8] 上传镜像、源码与回滚记录..."
scp -q "$APP_PACKAGE" "$SRC_PACKAGE" "$ROLLBACK_SCRIPT" "$HOST:/tmp/"

echo "==> [5/8] 远端发布前备份（数据库、上传卷、源码与旧镜像 ID）..."
REMOTE_SCRIPT="set -eu
cd '$DIR'
COMPOSE=\"docker compose -f $BASE_COMPOSE_BASENAME -f $PROD_COMPOSE_BASENAME\"
mkdir -p '$REMOTE_RELEASE_DIR' '$REMOTE_BACKUP_DIR'
if \$COMPOSE ps --status running -q db >/dev/null 2>&1; then
  \$COMPOSE exec -T db pg_dump -U blog -Fc blog > '$REMOTE_BACKUP_DIR/blog.dump' || exit 1
  [ -s '$REMOTE_BACKUP_DIR/blog.dump' ] || { echo '数据库备份为空' >&2; exit 1; }
else
  echo '数据库容器未运行，拒绝无备份发布' >&2; exit 1
fi
if docker volume inspect blog_uploads >/dev/null 2>&1; then
  DB_IMAGE_ID=\"\$(\$COMPOSE images -q db 2>/dev/null | head -n 1)\"
  [ -n \"\$DB_IMAGE_ID\" ] || { echo '无法定位数据库镜像，拒绝无备份发布' >&2; exit 1; }
  docker run --rm -v blog_uploads:/data:ro -v '$REMOTE_BACKUP_DIR':/backup --entrypoint tar \"\$DB_IMAGE_ID\" czf /backup/uploads.tar.gz -C /data . || exit 1
  [ -s '$REMOTE_BACKUP_DIR/uploads.tar.gz' ] || { echo '上传卷备份为空' >&2; exit 1; }
else
  echo 'blog_uploads 卷不存在，拒绝无备份发布' >&2; exit 1
fi
tar czf '$REMOTE_BACKUP_DIR/source-before.tar.gz' --exclude=.env --exclude='.env.*' --exclude=releases --exclude=backups . || exit 1
PREVIOUS_IMAGE_ID=\"\$(\$COMPOSE images -q app 2>/dev/null | head -n 1)\"
[ -n \"\$PREVIOUS_IMAGE_ID\" ] || { echo '缺少旧镜像 ID，无法建立回滚锚点' >&2; exit 1; }
# 记录时统一带 sha256: 前缀（compose 不带、inspect 带，混着写回滚时容易对不上）
case \"\$PREVIOUS_IMAGE_ID\" in
  sha256:*) ;;
  *) PREVIOUS_IMAGE_ID=\"sha256:\$PREVIOUS_IMAGE_ID\" ;;
esac
PREVIOUS_IMAGE_TAG=\"blog-app:rollback-$RELEASE_ID\"
docker tag \"\$PREVIOUS_IMAGE_ID\" \"\$PREVIOUS_IMAGE_TAG\" || exit 1
cat > '$REMOTE_RELEASE_DIR/rollback.env' <<EOF
RELEASE_ID=$RELEASE_ID
DEPLOY_DIR=$DIR
NEW_IMAGE=$IMAGE
NEW_IMAGE_ID=$IMAGE_ID
PREVIOUS_IMAGE_ID=\$PREVIOUS_IMAGE_ID
PREVIOUS_IMAGE_TAG=\$PREVIOUS_IMAGE_TAG
DB_BACKUP=$REMOTE_BACKUP_DIR/blog.dump
UPLOADS_BACKUP=$REMOTE_BACKUP_DIR/uploads.tar.gz
SOURCE_SNAPSHOT=$REMOTE_BACKUP_DIR/source-before.tar.gz
APP_PACKAGE_SHA256=$APP_SHA
SRC_PACKAGE_SHA256=$SRC_SHA
SITE_URL_CONFIRMED_BY_USER=yes
EOF
printf '%s  %s\\n%s  %s\\n' '$APP_SHA' '/tmp/$(basename "$APP_PACKAGE")' '$SRC_SHA' '/tmp/$(basename "$SRC_PACKAGE")' > '$REMOTE_RELEASE_DIR/SHA256SUMS'
sha256sum -c '$REMOTE_RELEASE_DIR/SHA256SUMS' || exit 1
"

echo "==> [6/8] 远端导入镜像并在独立发布目录解包源码..."
REMOTE_SCRIPT="$REMOTE_SCRIPT
docker load < /tmp/$(basename "$APP_PACKAGE") || exit 1
mkdir -p '$REMOTE_RELEASE_DIR/src'
tar xzf /tmp/$(basename "$SRC_PACKAGE") -C '$REMOTE_RELEASE_DIR/src' || exit 1
cp '$REMOTE_RELEASE_DIR/src/docker-compose.yml' '$REMOTE_RELEASE_DIR/src/docker-compose.prod.yml' '$REMOTE_RELEASE_DIR/src/Dockerfile' '$REMOTE_RELEASE_DIR/src/.dockerignore' '$DIR/' || exit 1
cp /tmp/$(basename "$ROLLBACK_SCRIPT") '$REMOTE_ROLLBACK_SCRIPT' || exit 1
chmod +x '$REMOTE_ROLLBACK_SCRIPT'
"

echo "==> [7/8] 远端切换不可变镜像（禁止 --build）、健康检查与清理旧版本..."
REMOTE_SCRIPT="$REMOTE_SCRIPT
if ! BLOG_IMAGE='$IMAGE' \$COMPOSE up -d --no-build app; then
  echo '容器启动失败，执行 rollback' >&2
  sh '$REMOTE_ROLLBACK_SCRIPT' >&2 || true
  exit 1
fi
tries=0
while [ \$tries -lt $HEALTH_RETRIES ]; do
  if \$COMPOSE exec -T app node -e \"fetch('http://127.0.0.1:3000/api/chat').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\" >/dev/null 2>&1; then
    printf 'healthy\\n'
    break
  fi
  tries=\$((tries + 1))
  sleep 2
done
if [ \$tries -ge $HEALTH_RETRIES ]; then
  echo '健康检查失败，执行 rollback' >&2
  sh '$REMOTE_ROLLBACK_SCRIPT' >&2 || true
  exit 1
fi
printf 'NEW_IMAGE_ID=%s\\n' '$IMAGE_ID'

# ---- 清理旧版本 ----
# 只保留最近 N 次发布。每次发布会新建一个不可变 release 镜像，并把上一版再打一个
# rollback 标签；两个都不清理的话，一天十次发布就是十来个 350MB 的镜像。
# 保留集由 releases/ 决定（它才是发布的权威记录），backups/ 跟着同一份名单走——
# 两个目录各自按 mtime 删会错位：可能出现「release 留着、它的备份被删了」，
# 那种状态下回滚等于没有数据可退。
# 清理失败不改变发布结果：磁盘清理不值得让一次成功的发布回滚。
echo '--- 清理旧发布 ---'
cd \"$DIR\"
keep=$KEEP_RELEASES
case \"\$keep\" in ''|*[!0-9]*) keep=5 ;; esac
[ \"\$keep\" -ge 1 ] || keep=5
# 注意 ID 前缀：compose images -q 返回 64 位十六进制，**不带** sha256:；
# 而 docker image inspect --format '{{.Id}}' 是带 sha256: 的。两边统一成
# 「不带前缀」再比，否则运行中版本永远匹配不上，保护等于没写。
CURRENT_IMAGE_ID=\"\$(\$COMPOSE images -q app 2>/dev/null | head -n 1 | sed 's/^sha256://')\"

# 当前运行版本：只有 releases/<id>/rollback.env 记着 NEW_IMAGE_ID，
# backups/<id>/ 下没有这个文件，所以先在这里把它的 RELEASE_ID 找出来。
# CURRENT_DIR 是**完整目录名**（线上带 release- 前缀），用来和 ls 的输出比较；
# CURRENT_RELEASE 是剥掉前缀的纯 ID，用来和镜像 tag 比较。两者不能混用。
CURRENT_DIR=\"\"
CURRENT_RELEASE=\"\"
if [ -n \"\$CURRENT_IMAGE_ID\" ]; then
  for env in releases/*/rollback.env; do
    [ -f \"\$env\" ] || continue
    env_id=\"\$(sed -n 's/^NEW_IMAGE_ID=//p' \"\$env\" 2>/dev/null | head -n 1 | sed 's/^sha256://')\"
    if [ -n \"\$env_id\" ] && [ \"\$env_id\" = \"\$CURRENT_IMAGE_ID\" ]; then
      CURRENT_DIR=\"\$(basename \"\$(dirname \"\$env\")\")\"
      CURRENT_RELEASE=\"\$(printf '%s' \"\$CURRENT_DIR\" | sed 's/^release-//')\"
      break
    fi
  done
fi

# 保留集：最新的 N 个 release 目录。注意 ls 返回的是**完整目录名**
# （线上带 release- 前缀，历史版本没有），所以比较时两边都用完整名，
# 绝不能只在一侧剥前缀——那样永远匹配不上，会把全部目录删光。
# 这段注释位于双引号字符串内：不要写反引号，它会被当成命令替换执行。
KEEP_DIRS=\"\$(ls -1t releases 2>/dev/null | head -n \"\$keep\")\"
if [ -n \"\$CURRENT_DIR\" ]; then
KEEP_DIRS=\"\$(printf '%s\n%s' \"\$KEEP_DIRS\" \"\$CURRENT_DIR\")\"
fi
# 空行会让 grep -qxF \"\" 匹配一切，保护逻辑直接失效；当前版本通常也在
# 窗口里，sort -u 顺手去重（否则后面按目录报告会重复打印）。
KEEP_DIRS=\"\$(printf '%s\n' \"\$KEEP_DIRS\" | sed '/^\$/d' | sort -u)\"

# fail-safe：保留集为空（或全都不存在）时一个都不删。
# 清理脚本宁可什么都不做，也不能因为比较写错就把回滚材料全清掉。
kept_existing=0
for d in \$KEEP_DIRS; do
  [ -d \"releases/\$d\" ] && kept_existing=\$((kept_existing + 1))
done
if [ \"\$kept_existing\" -eq 0 ]; then
  echo \"跳过清理：保留集为空（当前 \$CURRENT_IMAGE_ID 未匹配到任何发布目录）\"
else
  # backups/ 里可能有人工建的应急快照（如事故后的 restore 备份），它们没有
  # 对应的 releases/ 目录。只删「有发布记录可退」的那批：releases/ 里不存在的
  # 备份目录一律不动——多留几百 MB 远比删掉唯一一份数据备份划算。
  for old in \$(ls -1 releases 2>/dev/null); do
    if printf '%s\n' \"\$KEEP_DIRS\" | grep -qxF \"\$old\"; then
      continue
    fi
    rm -rf \"releases/\$old\" && echo \"删除：releases/\$old\"
    if [ -d \"backups/\$old\" ]; then
      rm -rf \"backups/\$old\" && echo \"删除：backups/\$old\"
    fi
  done
  for old in \$(ls -1 backups 2>/dev/null); do
    [ -d \"releases/\$old\" ] && continue
    echo \"保留备份：backups/\$old（没有对应的发布记录，可能是应急快照）\"
  done
  for d in \$KEEP_DIRS; do
    [ -d \"releases/\$d\" ] && [ -d \"backups/\$d\" ] || echo \"注意：\$d 缺 releases 或 backups 目录\"
  done
fi

# 镜像标签：按创建时间从新到旧保留最新 N 个 release 标签（完整 tag，含前缀）
KEEP_TAGS=\"\$(docker images --filter 'reference=blog-app:release-*' --format '{{.CreatedAt}}|{{.Tag}}' 2>/dev/null | sort -r | head -n \"\$keep\" | cut -d'|' -f2)\"
# 兜底：docker 输出为空时至少保住这次刚发布的标签，绝不把当前版本清掉。
# IMAGE_TAG 是本地变量，必须在这里就地展开，远端没有它。
[ -n \"\$KEEP_TAGS\" ] || KEEP_TAGS='$IMAGE_TAG'
# 当前运行版本的 release 标签必须留着，即使它已经超出保留窗口
if [ -n \"\$CURRENT_RELEASE\" ]; then
KEEP_TAGS=\"\$(printf '%s\n%s' \"\$KEEP_TAGS\" \"release-\$CURRENT_RELEASE\")\"
fi
KEEP_TAGS=\"\$(printf '%s\n' \"\$KEEP_TAGS\" | sed '/^\$/d')\"
# rollback 标签的历史命名有两种：rollback-<ID>（本脚本）与 rollback-release-<ID>
# （线上既有）。先把保留集归一到 ID，再把候选 tag 也归一到 ID 再比。
KEEP_IDS=\"\$(printf '%s\n' \"\$KEEP_TAGS\" | sed 's/^release-//')\"
if [ -n \"\$CURRENT_RELEASE\" ]; then
KEEP_IDS=\"\$(printf '%s\n%s' \"\$KEEP_IDS\" \"\$CURRENT_RELEASE\")\"
fi
KEEP_IDS=\"\$(printf '%s\n' \"\$KEEP_IDS\" | sed '/^\$/d')\"

if [ -z \"\$KEEP_TAGS\" ]; then
  echo \"跳过镜像清理：保留集为空\"
else
  for tag in \$(docker images --filter 'reference=blog-app:release-*' --format '{{.Tag}}' 2>/dev/null); do
    [ -n \"\$tag\" ] || continue
    printf '%s\n' \"\$KEEP_TAGS\" | grep -qxF \"\$tag\" && continue
    tag_id=\"\$(docker image inspect \"blog-app:\$tag\" --format '{{.Id}}' 2>/dev/null | sed 's/^sha256://' || true)\"
    if [ -n \"\$CURRENT_IMAGE_ID\" ] && [ \"\$tag_id\" = \"\$CURRENT_IMAGE_ID\" ]; then
      echo \"保留（运行中）：\$tag\"
      continue
    fi
    docker rmi \"blog-app:\$tag\" >/dev/null 2>&1 && echo \"删除镜像：\$tag\" || echo \"跳过（仍被引用）：\$tag\"
  done

  for tag in \$(docker images --filter 'reference=blog-app:rollback-*' --format '{{.Tag}}' 2>/dev/null); do
    [ -n \"\$tag\" ] || continue
    rid=\"\$(printf '%s' \"\$tag\" | sed -e 's/^rollback-//' -e 's/^release-//')\"
    printf '%s\n' \"\$KEEP_IDS\" | grep -qxF \"\$rid\" && continue
    docker rmi \"blog-app:\$tag\" >/dev/null 2>&1 && echo \"删除回滚标签：\$tag\" || true
  done
fi
docker image prune -f >/dev/null 2>&1 || true
echo '--- 清理完成 ---'
"

"$REMOTE_SHELL" "$HOST" "$REMOTE_SCRIPT" \
  || fail "远端发布或健康检查失败；按 $REMOTE_ROLLBACK_SCRIPT 和 B13 人工确认回滚。"

echo "==> [8/8] 本地预演/发布流程结束"
echo "    镜像：$IMAGE / $IMAGE_ID"
echo "    备份：$REMOTE_BACKUP_DIR（数据库、上传卷、源码）"
echo "    回滚：$REMOTE_ROLLBACK_SCRIPT（含旧镜像 ID；数据恢复需人工确认）"
echo "    站点地址由 DEPLOY_SITE_URL 与构建期 NEXT_PUBLIC_SITE_URL 一致确认；不回显 HTTP 地址。"
