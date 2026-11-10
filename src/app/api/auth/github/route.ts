import { NextResponse } from "next/server";
import {
  GITHUB_AUTHORIZE_URL,
  OAUTH_COOKIE_PATH,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  callbackUrl,
  encodeOauthNext,
  oauthConfig,
  sanitizeNext,
} from "@/lib/auth";
import { siteConfig } from "@/config/site";

/**
 * GET /api/auth/github —— 跳到 GitHub 授权页。
 * @param next 登录成功后回到哪（只允许站内相对路径）
 */
export async function GET(request: Request) {
  const { clientId, enabled } = oauthConfig();
  if (!enabled) {
    return NextResponse.json(
      { error: "GitHub 登录未配置：需要 GITHUB_OAUTH_CLIENT_ID / _SECRET" },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const next = sanitizeNext(url.searchParams.get("next"));

  // state 必须是不可猜的 nonce，并与浏览器 cookie 绑定；
  // 只把「回到哪」放进 state 无法阻止登录 CSRF。
  const nonce = crypto.randomUUID();

  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl(siteConfig.url));
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", nonce);

  const res = NextResponse.redirect(authorize.toString());
  const secure = siteConfig.url.startsWith("https://");
  // 回调地址与授权地址同属 /api/auth/github，path 收窄到这里即可
  res.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  res.cookies.set(OAUTH_NEXT_COOKIE, encodeOauthNext(next), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return res;
}
