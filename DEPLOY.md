# 部署指南：从裸服务器到博客上线

目标：在一台云服务器（Ubuntu/Debian）上，用 Docker Compose 把博客跑在 80 端口，数据持久化，更新只需 `git pull`。

> 部署前请先把仓库推送到 GitHub（建议公开仓库，Giscus 评论依赖它）。

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
NEXT_PUBLIC_SITE_URL=http://服务器IP
```

```bash
# 构建并启动（首次构建 3-5 分钟；2G 内存请确认已完成上面的 swap 步骤）
docker compose up -d --build

# 观察启动日志：应看到 entrypoint 自动完成内容同步与向量化
docker compose logs -f app
```

浏览器打开 `http://服务器IP` —— 完成 🎉

容器启动时自动执行：建表（幂等）→ 按 SHA-256 哈希增量同步文章 → 向量化 + AI 摘要。

## 3. 日常更新

```bash
cd ~/blog
git pull
docker compose up -d --build   # 只重建变更的文章，秒级完成
```

写了新文章 → push → 服务器 pull + up，入口脚本自动向量化新文章。

## 4. Giscus 评论（可选）

1. 博客仓库需为**公开**仓库：Settings → General → Features → 勾选 **Discussions**
2. 打开 [giscus.app](https://giscus.app/zh-CN)，填入仓库名，选 `Announcements` 分类
3. 把页面生成的 `data-repo-id` 和 `data-category-id` 填进服务器 `.env`：

```ini
NEXT_PUBLIC_GISCUS_REPO=你的用户名/你的仓库
NEXT_PUBLIC_GISCUS_REPO_ID=R_xxxxxxx
NEXT_PUBLIC_GISCUS_CATEGORY=Announcements
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxxxxx
```

4. `docker compose up -d --build` 后文章页出现评论区。

## 5. 数据备份

```bash
# 手动备份（建议加到 crontab 每日执行）
docker compose exec db pg_dump -U blog blog | gzip > ~/backup_$(date +%F).sql.gz

# 恢复
gunzip -c ~/backup_2026-10-25.sql.gz | docker compose exec -T db psql -U blog blog
```

## 6. 以后买了域名怎么加 HTTPS

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

3. `.env` 中把 `NEXT_PUBLIC_SITE_URL` 改为 `https://你的域名.com`，`docker compose up -d --build`。

## 常见问题

**Q：改了 `.env` 不生效？** 环境变量在构建期（NEXT_PUBLIC_*）和运行期都会用到，改完执行 `docker compose up -d --build`。

**Q：AI 问答报「AI 功能未启用」？** 检查 `.env` 的 `AI_API_KEY`（智谱）和 `EMBEDDING_API_KEY`（百炼），然后 `docker compose restart app`。

**Q：想全量重建向量？** `curl -X POST -H "x-sync-secret: 你的密钥" http://服务器IP/api/sync?force=1`。

**Q：80 端口被占用？** `lsof -i :80` 查占用（常见是 nginx/apache），停掉或改 compose 中 `app.ports` 为 `"8080:3000"`（记得安全组同步放行）。

**Q：构建时内存不足被 OOM kill？** 确认 swap 已开启（`free -h`）；仍失败可在本地构建镜像推送到镜像仓库，服务器只 `docker pull`。
