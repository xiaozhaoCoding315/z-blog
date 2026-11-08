import { NextResponse } from "next/server";
import { connection } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { loginCodes } from "@/db/schema";
import {
  HOURLY_EMAIL_LIMIT,
  RESEND_COOLDOWN_MS,
  codeExpiry,
  generateCode,
  hashCode,
  isValidEmail,
  normalizeEmail,
} from "@/lib/email-code";
import { mailConfig, sendLoginCode } from "@/lib/mailer";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sessionSecret } from "@/lib/auth";

/** POST /api/auth/email/request —— 发一封验证码 */
export async function POST(request: Request) {
  await connection();

  const cfg = mailConfig();
  const secret = sessionSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "登录暂未开放：服务器还没配置密钥" },
      { status: 503 }
    );
  }
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "登录暂未开放：服务器还没配置发信" },
      { status: 503 }
    );
  }

  let body: { email?: string } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // `JSON.parse("null")` 也会成功，body 可能是 null；不拦住会在取属性时抛成 500
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // 非字符串会在 normalizeEmail 的 .trim() 里抛成 500，先按类型收窄
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "邮箱看起来不对" }, { status: 400 });
  }

  // 按 IP 的桶可以被伪造的 X-Forwarded-For 绕过，真正兜底的是这条进程级全局限额：
  // 单实例一小时最多发 60 封，超出就拒绝，避免 SMTP 配额和发信信誉被刷穿。
  if (!rateLimit("email-code:global", 60, 3_600_000)) {
    return NextResponse.json(
      { error: "请求太频繁了，过会儿再试" },
      { status: 429 }
    );
  }

  // 按 IP 限频只作尽力而为——compose 里应用直接暴露 80 端口、没有可信反代改写 XFF，
  // 客户端可伪造 X-Forwarded-For 换桶，或干脆不带而所有人共用 "local" 桶；
  // 真正防刷的是上面的全局限额和下面的按邮箱数据库限额。
  if (!rateLimit(`${getClientIp(request)}:email-code`, 20, 3_600_000)) {
    return NextResponse.json(
      { error: "请求太频繁了，过会儿再试" },
      { status: 429 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库暂时不可用" }, { status: 503 });
  }

  const now = Date.now();

  // 顺手清掉一天前就过期的记录，避免这张表只长不消
  try {
    await db.execute(
      sql`DELETE FROM login_codes WHERE expires_at < now() - interval '1 day'`
    );
  } catch {
    // 清理失败不影响发码
  }

  // 下面的冷却与小时限额都是先查后写：并发请求可能同时通过，按邮箱的上限只是尽力而为。
  const [latest] = await db
    .select({ createdAt: loginCodes.createdAt })
    .from(loginCodes)
    .where(eq(loginCodes.email, email))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  if (latest && now - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "刚发过一封，60 秒后再来" },
      { status: 429 }
    );
  }

  const [hourly] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginCodes)
    .where(
      and(
        eq(loginCodes.email, email),
        gte(loginCodes.createdAt, new Date(now - 3_600_000))
      )
    );
  if ((hourly?.count ?? 0) >= HOURLY_EMAIL_LIMIT) {
    return NextResponse.json(
      { error: "这个邮箱一小时内申请太多次了" },
      { status: 429 }
    );
  }

  const code = generateCode();
  let codeId: number;
  try {
    const [inserted] = await db
      .insert(loginCodes)
      .values({
        email,
        codeHash: hashCode(code, secret),
        expiresAt: codeExpiry(now),
      })
      .returning({ id: loginCodes.id });
    codeId = inserted.id;
  } catch {
    return NextResponse.json({ error: "保存验证码失败" }, { status: 500 });
  }

  const sent = await sendLoginCode(email, code);
  if (!sent) {
    // 发信失败就删掉刚插入的码：否则用户没收到的码会白占 60 秒冷却和一小时额度
    try {
      await db.delete(loginCodes).where(eq(loginCodes.id, codeId));
    } catch {
      // 删不掉也无妨：这条码没人收到，过期后会被清理
    }
    return NextResponse.json(
      { error: "验证码没发出去，请稍后再试" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
