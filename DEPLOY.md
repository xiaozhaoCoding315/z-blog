# 部署指南：从裸服务器到博客上线

目标：在一台云服务器（Ubuntu/Debian）上，用 Docker Compose 把博客跑在 80 端口，数据持久化，更新只需 `git pull`。

> 部署前请先把仓库推送到 GitHub（建议公开仓库，便于版本管理与更新）。

## 0. 端口与资源规划（先看这里）

以 2 核 2G 的阿里云 ECS（Ubuntu 22.04）为例：

| 端口 | 用途 | 说明 |
| --- | --- | --- |
| 80 | **本博客** | compose 默认映射，HTTP 入口 |
| 8000 | 已有项目（如 Nova Agent） | 互不影响，各走各的容器 |
| 5432 | 博客数据库 | 只在 compose 内部网络通信，**不对外暴露** |

- 已有项目不受影响：博客的 compose 项目名是 `blog`，容器/网络/卷与其它项目完全隔离。
- **2G 内存必做**：首次构建 Next.js 较吃内存，先加 2G swap 防止 OOM：

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # 确认 Swap 一行为 2.0Gi
```

- **阿里云安全组**：控制台 → ECS → 安全组 → 入方向添加规则：协议 TCP、端口 80、授权对象 0.0.0.0/0。

## 1. 服务器初始化（首次登录做一次）

```bash
ssh root@服务器IP

# 系统更新
apt update && apt upgrade -y

# （推荐）创建普通用户跑服务
adduser deploy && usermod -aG sudo deploy

# SSH 加固：密钥登录后再禁用密码
# ⚠️ 先在本地执行 ssh-copy-id deploy@服务器IP 确认能免密登录，再执行下面两行
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 防火墙：只放行 SSH 与 HTTP
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable

# 安装 Docker
curl -fsSL https://get.docker.com | sh
```

> 如果 Docker Hub 拉不动镜像：`docker pull docker.m.daocloud.io/pgvector/pgvector:pg17 && docker tag docker.m.daocloud.io/pgvector/pgvector:pg17 pgvector/pgvector:pg17`（基础镜像 node:20-alpine 同理，`docker.m.daocloud.io/library/node:20-alpine`）。

## 2. 首次部署

**方式 A：服务器直接构建（内存 ≥ 4G 推荐）**

```bash
# 用普通用户登录
ssh deploy@服务器IP

# 拉代码
sudo git clone https://github.com/你的用户名/你的仓库.git blog
cd blog
sudo chown -R $USER:$USER .

# 配置环境变量
cp .env.example .env
nano .env
```

`.env` 必改项：

```ini
DB_PASSWORD=一个强密码
AI_API_KEY=你的智谱key             # 聊天/摘要（https://open.bigmodel.cn）
EMBEDDING_API_KEY=你的百炼key       # 向量化（https://bailian.console.aliyun.com）
SYNC_SECRET=一串随机字符           # openssl rand -hex 16
NEXT_PUBLIC_SITE_URL=https://你的域名   # 构建期内联；没有 HTTPS 时登录 cookie 不会带 Secure
```

```bash
# 构建并启动（首次构建 3-5 分钟；2G 内存请确认已完成上面的 swap 步骤）
docker compose up -d --build

# 观察启动日志：应看到 entrypoint 自动完成内容同步与向量化
docker compose logs -f app
```

**方式 B：本地构建镜像上传（2C2G 服务器必用，实测有效）**

2G 内存即使加了 swap，`next build` 也会把整台服务器拖进 swap 风暴（SSH 失联、其它服务卡死）。**在小内存服务器上永远不要执行 `--build`**。日常更新直接跑仓库里的 `scripts/deploy.sh`（本地构建 → 打包源码 → 上传 → 远端滚动更新）；下面的手工命令用于首次部署或排障：

```bash
# 1. 本地（开发机）构建并导出镜像
docker compose build app
docker save blog-app:latest | gzip > /tmp/blog-app.tar.gz   # 约 74MB

# 2. 上传（5Mbps 带宽约 2-3 分钟）
scp /tmp/blog-app.tar.gz root@服务器IP:/tmp/

# 3. 服务器导入并启动（不构建）
ssh root@服务器IP
cd /opt/blog   # 源码目录，.env 已按上面说明配好
docker load < /tmp/blog-app.tar.gz && rm /tmp/blog-app.tar.gz
docker compose up -d --no-build
```

> 注意：`/tmp` 重启会清空，镜像包别长期放那里；服务器上已 `docker load` 过的镜像不受影响。

浏览器打开 `http://服务器IP` —— 完成 🎉

容器启动时自动执行：建表（幂等）→ 按 SHA-256 哈希增量同步文章 → 向量化 + AI 摘要。

**别忘了安全组**：阿里云控制台 → ECS → 安全组 → 入方向添加：自定义 TCP / 80 / 0.0.0.0/0。

## 3. 日常更新

**方式 A（服务器内存充足）：**

```bash
cd ~/blog
git pull
docker compose up -d --build
```

**方式 B（2C2G，配合上面的本地构建流程）：**

```bash
# 本地
git push && docker compose build app && docker save blog-app:latest | gzip > /tmp/blog-app.tar.gz
scp /tmp/blog-app.tar.gz root@服务器IP:/tmp/
# 服务器
cd /opt/blog && git pull && docker load < /tmp/blog-app.tar.gz && docker compose up -d --no-build
```

写了新文章 → 部署新镜像 → 容器重启时入口脚本自动向量化新增文章（未变更的文章按哈希跳过，秒级）。

## 4. 数据备份

```bash
# 手动备份（建议加到 crontab 每日执行）
docker compose exec db pg_dump -U blog blog | gzip > ~/backup_$(date +%F).sql.gz

# 恢复
gunzip -c ~/backup_2026-10-25.sql.gz | docker compose exec -T db psql -U blog blog
```

## 5. 以后买了域名怎么加 HTTPS

1. 域名 A 记录指向服务器 IP（国内服务器需备案）
2. 在 compose 中加一个 Caddy 服务并删掉 app 的 80 端口映射：

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - app
```

`Caddyfile`（两行搞定自动 HTTPS）：

```
你的域名.com {
    reverse_proxy app:3000
}
```

3. `.env` 中把 `NEXT_PUBLIC_SITE_URL` 改为 `https://你的域名.com`，重新构建镜像（`docker compose up -d --build`；2C2G 服务器改用本地 `scripts/deploy.sh`，不要在服务器上构建）。

## 6. 上线前检查清单

上线前逐条确认，任何一条没验证都不算部署完成：

1. **HTTPS 与 `NEXT_PUBLIC_SITE_URL=https://…`**
   站点必须通过 HTTPS 访问，`.env` 里的 `NEXT_PUBLIC_SITE_URL` 必须写成 `https://你的域名`。该变量在构建期内联进产物，改完必须重新 `docker compose build`（2C2G 用本地 `scripts/deploy.sh`）；只 `restart` 或只改运行期环境变量都不生效。没有 HTTPS 时登录 cookie 不会带 `Secure`。
2. **反向代理传可信 `X-Forwarded-For`**
   登录验证码与互动的限频按客户端 IP 计数，依赖反向代理传真实 IP。Caddy 默认会透传；nginx 需配置 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`。只信任自己这一层代理写入的值，否则所有访客会共用代理 IP，限频会误伤。
3. **真实 SMTP 发信测试**
   用 QQ 邮箱授权码（不是登录密码）分别验证 465 与 587 端口，从前端走一遍邮箱验证码登录，确认验证码能实际收到；收不到时先查垃圾箱与 `docker compose logs app` 里的 SMTP 报错。
4. **`uploads` 命名卷可写、重启后图片仍在**
   发布一条图文动态，确认图片能正常显示；`docker compose restart app` 后再次访问，图片仍在。`docker volume inspect blog_uploads` 应能看到挂载点，重建容器不会清空卷。
5. **2C2G 服务器不构建镜像**
   始终在本地构建并用 `scripts/deploy.sh` 上传，服务器只 `docker load` + `docker compose up -d --no-build`。上线前清理 Docker 构建缓存（服务器当前剩余 16G，缓存约 7.7G）：`docker system df` 查看占用，`docker builder prune -af` 清理后再次确认磁盘余量。

## 常见问题

**Q：改了 `.env` 不生效？** 环境变量在构建期（NEXT_PUBLIC_*）和运行期都会用到，改完执行 `docker compose up -d --build`。

**Q：AI 问答报「AI 功能未启用」？** 检查 `.env` 的 `AI_API_KEY`（智谱）和 `EMBEDDING_API_KEY`（百炼），然后 `docker compose restart app`。

**Q：想全量重建向量？** `curl -X POST -H "x-sync-secret: 你的密钥" http://服务器IP/api/sync?force=1`。

**Q：80 端口被占用？** `lsof -i :80` 查占用（常见是 nginx/apache），停掉或改 compose 中 `app.ports` 为 `"8080:3000"`（记得安全组同步放行）。

**Q：构建时内存不足被 OOM kill？** 确认 swap 已开启（`free -h`）；仍失败可在本地构建镜像推送到镜像仓库，服务器只 `docker pull`。
