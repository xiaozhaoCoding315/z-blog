import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  callbackUrl,
  exchangeCode,
  fetchGithubUser,
  oauthConfig,
  sanitizeNext,
  sessionSecret,
  signSession,
} from "@/lib/auth";
import { siteConfig } from "@/config/site";

/**
 * GET /api/auth/github/callback —— GitHub 回跳。
 * 换 token → 取用户 → upsert → 签发会话 cookie → 跳回原页面。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("state"));

  const { clientId, clientSecret, enabled } = oauthConfig();
  const secret = sessionSecret();
  if (!enabled || !secret) {
    return redirectWithError(next, "login-unconfigured");
  }
  if (!code) return redirectWithError(next, "no-code");

  const db = getDb();
  if (!db) return redirectWithError(next, "db-unavailable");

  try {
    const token = await exchangeCode(
      code,
      callbackUrl(siteConfig.url),
      clientId,
      clientSecret
    );
    if (!token) return redirectWithError(next, "token-exchange-failed");

    const gh = await fetchGithubUser(token);
    if (!gh) return redirectWithError(next, "user-fetch-failed");

    // upsert：同一个 GitHub 账号永远映射到同一条记录
    const [row] = await db
      .insert(users)
      .values({
        githubId: String(gh.id),
        login: gh.login,
        avatarUrl: gh.avatar_url,
      })
      .onConflictDoUpdate({
        target: users.githubId,
        set: { login: gh.login, avatarUrl: gh.avatar_url },
      })
      .returning({ id: users.id });

    if (!row) return redirectWithError(next, "user-upsert-failed");

    const session = await signSession(row.id, secret);
    const res = NextResponse.redirect(
      new URL(next, siteConfig.url).toString()
    );
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      // 站点上 HTTPS 之后应打开；http 下置 true 浏览器会直接丢弃 cookie
      secure: siteConfig.url.startsWith("https://"),
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[auth] GitHub 回调失败：", err);
    return redirectWithError(next, "callback-failed");
  }
}

function redirectWithError(next: string, reason: string) {
  const target = new URL(next, siteConfig.url);
  target.searchParams.set("login_error", reason);
  return NextResponse.redirect(target.toString());
}
