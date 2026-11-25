import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  OAUTH_COOKIE_PATH,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  callbackUrl,
  decodeOauthNext,
  exchangeCode,
  fetchGithubUser,
  oauthConfig,
  sessionSecret,
  signSession,
} from "@/lib/auth";
import { siteConfig } from "@/config/site";

/**
 * GET /api/auth/github/callback —— GitHub 回跳。
 * 换 token → 取用户 → upsert → 签发会话 cookie → 跳回原页面。
 *
 * GitHub 只把 state 原样带回来；必须与本浏览器出发时写下的一次性 nonce
 * 对上，否则攻击者可以把自己的 code 塞进受害者的回跳地址（登录 CSRF）。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";

  const jar = await cookies();
  const expected = jar.get(OAUTH_STATE_COOKIE)?.value ?? "";
  const next = decodeOauthNext(jar.get(OAUTH_NEXT_COOKIE)?.value);

  if (!state || !expected || state !== expected) {
    return clearOauth(redirectWithError(next, "state-mismatch"));
  }

  const { clientId, clientSecret, enabled } = oauthConfig();
  const secret = sessionSecret();
  if (!enabled || !secret) {
    return clearOauth(redirectWithError(next, "login-unconfigured"));
  }
  if (!code) return clearOauth(redirectWithError(next, "no-code"));

  const db = getDb();
  if (!db) return clearOauth(redirectWithError(next, "db-unavailable"));

  try {
    const token = await exchangeCode(
      code,
      callbackUrl(siteConfig.url),
      clientId,
      clientSecret
    );
    if (!token) return clearOauth(redirectWithError(next, "token-exchange-failed"));

    const gh = await fetchGithubUser(token);
    if (!gh) return clearOauth(redirectWithError(next, "user-fetch-failed"));

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

    if (!row) return clearOauth(redirectWithError(next, "user-upsert-failed"));

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
    return clearOauth(res);
  } catch (err) {
    console.error("[auth] GitHub 回调失败：", err);
    return clearOauth(redirectWithError(next, "callback-failed"));
  }
}

/** state 是一次性的：无论成功、失败还是校验不过，都立刻清掉 */
function clearOauth(res: NextResponse) {
  for (const name of [OAUTH_STATE_COOKIE, OAUTH_NEXT_COOKIE]) {
    res.cookies.set(name, "", { maxAge: 0, path: OAUTH_COOKIE_PATH });
  }
  return res;
}

function redirectWithError(next: string, reason: string) {
  const target = new URL(next, siteConfig.url);
  target.searchParams.set("login_error", reason);
  return NextResponse.redirect(target.toString());
}
