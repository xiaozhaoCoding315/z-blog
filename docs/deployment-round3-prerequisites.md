# 第三轮改版部署前置条件清单（本地准备后复核）

> 更新日期：2026-11-10。范围：`D:\claudecode_project\Z-Blog`，分支 `redesign/dev-os`，HEAD `3fe2f05`，59 项未提交改动（原有 40 项改版 + 本轮本地部署准备）。
> 本文件不是部署许可。本次**未连接、探测或修改**服务器 `60.205.0.224`，未提交、推送、合并、创建第二个 PR，未读取或输出密钥值，未运行 `npm run deploy`。上一轮只读审计见共享笔记 `DEPLOY-PREREQS-ROUND3.md`。

## 1. 本轮已完成的本地项

| 项目 | 结果 | 文件/依据 |
| --- | --- | --- |
| B9 源码包排除 | 源码 tar 改为受控清单，包含未提交改动但排除 `.env`/`.env.*`、`.ssh`、`.playwright-mcp`、`.superpowers`、`.claude`、`*.tsbuildinfo`、`hosts.bak.*`、`uploads`、`drizzle`、`docs/`、归档 MDX、日志/密钥/本地脚本；实测清单 268 项、tar 3.5 MB，未发现禁用路径 | [scripts/deploy.sh](../scripts/deploy.sh)、[.dockerignore](../.dockerignore) |
| B9 Docker 上下文 | `.dockerignore` 同步排除本地产物、派生 `.env`、上传数据、构建缓存与审计目录；`.env.example` 仍保留 | [.dockerignore](../.dockerignore) |
| B10 失败即停 | `set -eu`、预检失败直接退出；非 HTTPS/未确认域名/URL 不一致/无 Docker/无发布授权/基础镜像或数据库镜像 digest 未锁定均在连接服务器前失败；远端备份、导入、启动、健康检查失败均停止 | [scripts/deploy.sh](../scripts/deploy.sh) |
| B10 不可变 tag | 发布 tag 为 `blog-app:release-<UTC 时间>-<HEAD>-<源码包 SHA256 前 12 位>`；Compose 通过 `BLOG_IMAGE` 注入；不再使用 `blog-app:latest` | [scripts/deploy.sh](../scripts/deploy.sh)、[docker-compose.yml](../docker-compose.yml)、[docker-compose.prod.yml](../docker-compose.prod.yml) |
| B10 备份/回滚 | 远端发布前备份数据库、上传卷、源码快照与旧镜像 ID/tag；写入 `rollback.env`、`SHA256SUMS`、`rollback-README.sh`；失败时打印人工回滚路径。脚本不会自动覆盖数据库或上传卷 | [scripts/deploy.sh](../scripts/deploy.sh) |
| B10 健康检查 | `up -d --no-build` 后轮询容器内 `/api/chat`，最多 30 次、每次间隔 2 秒；启动或健康检查失败触发回滚提示 | [scripts/deploy.sh](../scripts/deploy.sh) |
| B10 发布门槛 | 新增 `DEPLOY_SITE_URL`、`DEPLOY_RELEASE_AUTHORIZED=yes` 显式确认；真实发布还要求 `NODE_IMAGE_DIGEST_REQUIRED`/`DB_IMAGE_DIGEST_REQUIRED` 标记已从配置中移除 | [scripts/deploy.sh](../scripts/deploy.sh) |
| 回归 | 新增 `scripts/deploy-preflight.test.mjs`，仅用本地 `docker`/`ssh`/`scp` stub；8/8 通过。`npm test` 222/222、`npm run type-check`、`npm run lint`、`git diff --check`、两个 shell 语法检查均通过 | [scripts/deploy-preflight.test.mjs](../scripts/deploy-preflight.test.mjs)、[package.json](../package.json) |

### 本地只读状态

- `NEXT_PUBLIC_SITE_URL`：shell 未覆盖，`.env` 键非空，生效值 scheme=`http`，`https_gate=FAIL`，最终域名确认=`NO`；未输出值。`.env.example` 仍为本地 `http://localhost:3000`，并明确注明上线必须替换及 `DEPLOY_SITE_URL` 一致性要求。
- Docker：`docker` CLI=`NOT_FOUND`，engine 未验证；本地无法构建、导出或校验镜像，因此未执行任何真实 Docker 命令。
- 基础镜像：Dockerfile 仍为 `node:20-alpine`，`NODE_IMAGE_DIGEST_REQUIRED` 标记未移除；数据库镜像仍为 `pgvector/pgvector:pg17`，`DB_IMAGE_DIGEST_REQUIRED` 标记未移除。两者 digest 待可用 Docker 环境解析后锁定。
- 工作区：59 项未提交改动完整保留；没有 commit、push、merge、第二个 PR 或 `npm run deploy`。
- 发布脚本不再内置 `root@60.205.0.224` 默认值；真实发布必须显式提供 `DEPLOY_HOST`。本轮 stub 测试只使用 `deploy-test@example.invalid`。

## 2. 用户需要确认或提供的信息（只确认状态，不粘贴密钥值）

| 类别 | 需要用户确认或提供 |
| --- | --- |
| 目标与域名 B1 | 生产域名、备案状态、DNS 指向、最终 `https://…` 公网 URL；是否继续用 `60.205.0.224`、`/opt/blog`；明确 `DEPLOY_HOST` |
| HTTPS / 代理 B2 | Caddy/nginx/云负载均衡类型与配置位置、证书续期、80/443 端口拓扑、现有 8000 端口项目是否受影响；XFF 覆盖写入可信客户端 IP、CDN 回源网段、`Host`/`X-Forwarded-Proto` 传递 |
| SSH B6 | `~/.ssh/id_ed25519` 是否匹配目标账号、是否需要 passphrase、known_hosts 指纹是否正确；由用户自行验证非交互 `scp`/`ssh` |
| 服务器基线 B7 | `/opt/blog` 状态、`.env` 是否存在且权限安全（只报状态）、当前线上镜像 ID/tag、容器健康、端口、磁盘余量、Docker/Compose 版本 |
| 数据 B8 | `blog_pgdata`、`blog_uploads` 卷存在/可写/余量；最近备份时间与恢复演练；数据库与上传文件版本对应关系 |
| 密钥/运行期配置 B4 | 只确认服务器 `.env` 的 `DB_PASSWORD` 与既有卷一致，`SYNC_SECRET`、`AUTH_SECRET`、SMTP、`OWNER_EMAIL`、AI/Embedding key 已配置；历史 GitHub OAuth 是否不需要。不要读取/传输值 |
| 本地构建 B5 | 可用 Docker CLI/engine 路径或安装授权；允许在有 Docker 的构建机解析并锁定 Node/pgvector digest；最终 HTTPS 值重新跑生产构建 |
| 验收 B12 | 真实 SMTP 收信、上传图片重启后仍可访问、HTTPS 登录 cookie 带 `Secure`、登录/评论/限频在可信代理后正常、`/api/sync` 成功 |
| 回滚 B13 | 书面确认停新容器 → 恢复旧镜像 → 按备份恢复数据库/上传卷 → 恢复对应源码 → 健康检查；注明 RTO、数据丢失窗口、负责人 |
| 发布决策 B11/B14 | 是否允许未来提交/推送；目标分支与 PR #1 策略；备份与维护窗口；失败联系人；最终部署需新的明确授权 |

## 3. B1–B14 当前状态

- [ ] **B1 用户**：生产域名/备案/DNS/最终 HTTPS URL 未确认。
- [ ] **B2 用户**：HTTPS 代理、证书、80/443 拓扑、XFF 与可信回源网段未确认。
- [ ] **B3 待用户提供 B1**：本地 `NEXT_PUBLIC_SITE_URL` 仍非 HTTPS；只报告状态，未修改 `.env`。需设为最终 HTTPS 值并重新检查 `https_gate=PASS`。
- [ ] **B4 用户**：服务器 `.env` 存在性/权限/键齐全状态未确认；未读取值。
- [ ] **B5 本机阻塞**：Docker CLI/engine 不可用；Node/npm 测试通过，但 Docker 构建/导出与最终生产 HTTPS 构建未执行。
- [ ] **B6 用户**：SSH 匹配性、passphrase、known_hosts 与免密登录未验证；本任务未连接。
- [ ] **B7 用户**：`/opt/blog` 与当前线上镜像/容器/版本基线未确认。
- [ ] **B8 用户**：卷状态、可恢复备份与恢复演练未确认；脚本已写入备份步骤，但尚未在服务器运行。
- [x] **B9 本地**：源码包与 Docker 上下文排除规则已收紧并本地验证。
- [x] **B10 本地代码**：HTTPS 门槛、不可变 tag、失败即停、发布前备份、健康检查、旧镜像记录与人工回滚路径已写入并有 stub 回归；**digest 锁定仍阻塞真实发布**。
- [ ] **B11 用户**：59 项改动仍未提交；未来提交/推送/合并/PR 均需新授权。
- [ ] **B12 用户**：真实 SMTP、HTTPS cookie、登录/评论/限频与 `/api/sync` 验收未执行。
- [ ] **B13 用户**：RTO、数据丢失窗口、负责人和书面回滚确认未提供；脚本只保留材料与提示，不自动恢复数据。
- [ ] **B14 发布前最终核对**：B1–B13 未全通过；不得运行 `npm run deploy`。

## 4. 仍阻塞真实发布的事项

1. 生产 HTTPS 域名/证书/代理/XFF 未确认；本地 `NEXT_PUBLIC_SITE_URL` 仍为 `http`，最终值未确认。
2. 本地 Docker CLI/engine 不可用；镜像构建、导出、digest 解析与生产构建均未验证。
3. `node:20-alpine` 与 `pgvector/pgvector:pg17` 仍无已验证 digest，发布脚本会因对应 `*_DIGEST_REQUIRED` 标记拒绝真实发布。
4. 非交互 SSH、服务器 `.env` 状态、`/opt/blog`、数据库/上传卷、当前镜像、容器健康、端口和磁盘余量均未确认；按要求未连接或探测目标主机。
5. 服务器运行期密钥/登录配置和真实业务验收未确认；不索取、不输出密钥值。
6. 59 项改动未提交；发布授权不足。真实发布还需要 `DEPLOY_RELEASE_AUTHORIZED=yes`、显式 `DEPLOY_HOST` 和与构建值一致的 `DEPLOY_SITE_URL`。
7. 本轮备份/健康检查/回滚仅通过本地 stub 回归；未在真实 Docker/服务器上验证，不能宣称可恢复。

## 5. 逐项验证命令（本地/用户分别执行）

> 前 9 条只读或本地安全；带「用户/服务器」的命令只能在用户授权后由有权限者执行。不要把这些命令当成部署许可。

### 本地已完成项的复核

```bash
node --test scripts/deploy-preflight.test.mjs
npm test
npm run type-check
npm run lint
sh -n scripts/deploy.sh
sh -n scripts/docker-entrypoint.sh
git diff --check
git status --short
```

```bash
command -v docker || true
# CLI 可用后才执行：docker version && docker info
```

```bash
# 仅输出 scheme/状态，不输出值
node -e 'const fs=require("node:fs");const s=process.env.NEXT_PUBLIC_SITE_URL;let f;if(fs.existsSync(".env")){const a=fs.readFileSync(".env","utf8").split(/\r?\n/).filter(l=>/^\s*NEXT_PUBLIC_SITE_URL\s*=/.test(l));if(a.length)f=a[a.length-1].replace(/^\s*NEXT_PUBLIC_SITE_URL\s*=\s*/,"").trim().replace(/^[\x27"]|[\x27"]$/g,"")}const e=s!==undefined?s:f;let p="missing";if(e)try{p=new URL(e).protocol.replace(":","")}catch{p="invalid"}console.log({shell_override:s!==undefined,dotenv_key:f?"non-empty":"missing-or-empty",effective_scheme:p,https_gate:p==="https"?"PASS":"FAIL",final_domain_confirmed:"NO"})'
```

```bash
# 受控源码清单：不包含密钥/本地审计产物，仍包含构建输入
git ls-files -z --cached --others --exclude-standard | grep -zEv '(^|/)(\.env($|\..*)|\.ssh($|/)|\.playwright-mcp($|/)|\.superpowers($|/)|\.claude($|/)|\.zcode($|/)|\.next($|/)|node_modules($|/)|uploads($|/)|drizzle($|/)|docs($|/)|content/posts($|/)|content/interview($|/)|.*\.tsbuildinfo$|hosts\.bak\..*$)' | tr '\0' '\n' | grep -E '^(Dockerfile|docker-compose\.yml|docker-compose\.prod\.yml|package\.json|package-lock\.json|next\.config\.ts|scripts/docker-entrypoint\.sh)$'
```

```bash
# 配置门槛静态复核
grep -nE 'set -eu|DEPLOY_SITE_URL|DEPLOY_RELEASE_AUTHORIZED|NODE_IMAGE_DIGEST_REQUIRED|DB_IMAGE_DIGEST_REQUIRED|blog-app:release|pg_dump|uploads\.tar\.gz|rollback-README|no-build' scripts/deploy.sh Dockerfile docker-compose.yml
grep -n 'BLOG_IMAGE' docker-compose.yml docker-compose.prod.yml
```

### 用户补齐条件后、发布前才执行

```bash
# B1/B3：先由用户确认最终 https://… 域名并配置本地构建机，再只检查状态
node -e 'const u=new URL(process.argv[1]);console.log({scheme:u.protocol.replace(":",""),https_gate:u.protocol==="https:"?"PASS":"FAIL",final_domain_confirmed:"USER_CONFIRMED"})' "$DEPLOY_SITE_URL"
```

```bash
# B5：有可用 Docker engine 后，解析 digest 并手工写入 Dockerfile / docker-compose.yml，
# 删除两个 *_DIGEST_REQUIRED 标记；随后验证
docker buildx imagetools inspect node:20-alpine
docker buildx imagetools inspect pgvector/pgvector:pg17
NEXT_PUBLIC_SITE_URL="$DEPLOY_SITE_URL" npm run build
BLOG_IMAGE=blog-app:local NEXT_PUBLIC_SITE_URL="$DEPLOY_SITE_URL" docker compose -f docker-compose.yml -f docker-compose.prod.yml build app
docker compose -f docker-compose.yml -f docker-compose.prod.yml config -q
```

```bash
# B6：由用户自行验证非交互 SSH，不在本任务中执行
ssh -o BatchMode=yes -o ConnectTimeout=10 "$DEPLOY_HOST" 'echo SSH_OK'
```

```bash
# B7/B8：用户/服务器侧只报告状态；以下命令仅为检查模板，本任务未执行
docker version && docker compose version && docker system df
test -f /opt/blog/.env && stat -c '%a %U:%G' /opt/blog/.env
docker compose -f /opt/blog/docker-compose.yml -f /opt/blog/docker-compose.prod.yml images
docker volume inspect blog_pgdata blog_uploads
```

```bash
# B14：只有 B1–B13 全通过、digest 已锁定、最终 HTTPS 构建与本地 Docker 构建均通过，
# 且用户明确授权后才可运行；本任务禁止执行。
DEPLOY_RELEASE_AUTHORIZED=yes DEPLOY_HOST='<用户确认的账号@主机>' DEPLOY_SITE_URL='<最终 https:// 域名>' npm run deploy
```

发布后仍须按 B15 验收 HTTPS 首页/七条整页路由、终端/助手交互、308 重定向、sitemap/canonical、登录 cookie、图片持久化、`/api/sync` 日志、容器健康与磁盘余量，并记录新镜像 ID、部署时间、备份路径与回滚锚点。
