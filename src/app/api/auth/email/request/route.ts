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
  if (!cfg.enabled || !secret) {
    return NextResponse.json(
      { error: "登录暂未开放：服务器还没配置发信" },
      { status: 503 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "邮箱看起来不对" }, { status: 400 });
  }

  // 按 IP 限频：单实例内存桶够用（容器重启清零，可接受）
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
  try {
    await db.insert(loginCodes).values({
      email,
      codeHash: hashCode(code, secret),
      expiresAt: codeExpiry(now),
    });
  } catch {
    return NextResponse.json({ error: "保存验证码失败" }, { status: 500 });
  }

  const sent = await sendLoginCode(email, code);
  if (!sent) {
    return NextResponse.json(
      { error: "验证码没发出去，请稍后再试" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
