import { NextResponse } from "next/server";
import { connection } from "next/server";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { loginCodes, users } from "@/db/schema";
import {
  MAX_ATTEMPTS,
  codeMatches,
  isValidEmail,
  normalizeEmail,
} from "@/lib/email-code";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sanitizeNext,
  sessionSecret,
  signSession,
} from "@/lib/auth";
import { siteConfig } from "@/config/site";

/** POST /api/auth/email/verify —— 校验验证码，签发会话 */
export async function POST(request: Request) {
  await connection();

  const secret = sessionSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "登录暂未开放：服务器还没配置密钥" },
      { status: 503 }
    );
  }

  let body: { email?: string; code?: string; next?: string } | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  // `JSON.parse("null")` 也会成功，body 可能是 null；不拦住会在取属性时抛成 500
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const code = (body.code ?? "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "邮箱或验证码不对" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库暂时不可用" }, { status: 503 });
  }

  const [record] = await db
    .select()
    .from(loginCodes)
    .where(eq(loginCodes.email, email))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "请先申请验证码" }, { status: 400 });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "验证码过期了，重新申请一封" },
      { status: 400 }
    );
  }
  // 比对前先原子扣一次尝试次数：条件 UPDATE 只有 attempts < MAX_ATTEMPTS 才成功，
  // 并发请求也绕不过去；成功的那次同样占一格，所以第 6 次尝试一律拒绝。
  // 必须计数：六位数只有一百万种，不限制次数就能慢慢试出来。
  const [consumed] = await db
    .update(loginCodes)
    .set({ attempts: sql`${loginCodes.attempts} + 1` })
    .where(
      and(eq(loginCodes.id, record.id), lt(loginCodes.attempts, MAX_ATTEMPTS))
    )
    .returning({ attempts: loginCodes.attempts });

  if (!consumed) {
    return NextResponse.json(
      { error: "这条验证码试太多次了，重新申请一封" },
      { status: 400 }
    );
  }

  if (!codeMatches(code, record.codeHash, secret)) {
    return NextResponse.json({ error: "验证码不对" }, { status: 400 });
  }

  // 用完即焚：同一个邮箱的旧码全部清掉
  await db.delete(loginCodes).where(eq(loginCodes.email, email));

  const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL ?? "");
  const role = ownerEmail && email === ownerEmail ? "owner" : "visitor";

  const [user] = await db
    .insert(users)
    .values({ email, login: email.split("@")[0], role })
    .onConflictDoUpdate({
      target: users.email,
      // 站长邮箱可能后来才配进环境变量，所以每次登录都按当前配置重算角色
      set: { role, lastSeenAt: new Date() },
    })
    .returning({ id: users.id, role: users.role });

  if (!user) {
    return NextResponse.json({ error: "写入用户失败" }, { status: 500 });
  }

  const session = await signSession(user.id, secret);
  const res = NextResponse.json({
    ok: true,
    role: user.role,
    next: sanitizeNext(body.next ?? null),
  });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: siteConfig.url.startsWith("https://"),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
