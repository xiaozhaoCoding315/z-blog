# 多阶段构建：deps → builder → runner（standalone 产物，最终镜像不含源码与 node_modules）

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 国内服务器走 npmmirror 加速；海外环境可构建时覆盖：--build-arg NPM_REGISTRY=https://registry.npmjs.org
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm ci --registry=$NPM_REGISTRY

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 在构建时内联进产物，必须在此注入正确的公网地址
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
# 「关于」页的联系邮箱同样是构建期内联，留空则不显示邮箱入口
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 产物 + 静态资源 + 内容目录（/api/sync 运行时要读 MDX）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
# 分享卡片的中文字体：OG 路由运行时读这个文件，不进 public（不必公开）
COPY --from=builder --chown=nextjs:nodejs /app/assets ./assets
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# 上传目录：镜像里只建空目录并交给运行用户，实际内容由 volume 覆盖
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
