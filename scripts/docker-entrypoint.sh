#!/bin/sh
# 容器入口：启动 Next.js → 等就绪 → 触发内容同步（幂等增量）→ 等待主进程
set -e

echo "[entrypoint] starting next.js..."
node server.js &
SERVER_PID=$!

echo "[entrypoint] waiting for server to be ready..."
ready=0
i=0
while [ $i -lt 60 ]; do
  if node -e "fetch('http://127.0.0.1:3000/api/chat').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 1
done

if [ "$ready" = "1" ]; then
  echo "[entrypoint] server ready, syncing blog content..."
  SYNC_RESULT=$(node -e "
    fetch('http://127.0.0.1:3000/api/sync', {
      method: 'POST',
      headers: process.env.SYNC_SECRET ? { 'x-sync-secret': process.env.SYNC_SECRET } : {}
    }).then(r => r.text()).then(t => { console.log(t); }).catch(e => { console.error(e.message); process.exit(1); })
  ") || echo "[entrypoint] sync failed (blog still runs, retry by restarting)"
  echo "[entrypoint] sync: $SYNC_RESULT"
else
  echo "[entrypoint] server not ready in 60s, skipping sync"
fi

wait $SERVER_PID
