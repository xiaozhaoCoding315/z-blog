import { NextResponse } from "next/server";
import { syncPosts } from "@/lib/sync";
import { getClientIp } from "@/lib/rate-limit";

export const maxDuration = 300;

/**
 * 触发内容同步（容器启动时由 entrypoint 调用，也可手动调用）。
 * 配置 SYNC_SECRET 后必须携带请求头 x-sync-secret。
 */
export async function POST(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    if (request.headers.get("x-sync-secret") !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (getClientIp(request) !== "local") {
    // 未配置密钥时仅放行容器内部调用（entrypoint），公网直接拒绝
    return NextResponse.json(
      { error: "未配置 SYNC_SECRET，公网调用已拒绝" },
      { status: 401 }
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL 未配置" },
      { status: 503 }
    );
  }

  try {
    const force = new URL(request.url).searchParams.get("force") === "1";
    const result = await syncPosts({ force });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/sync] 同步失败：", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 }
    );
  }
}
