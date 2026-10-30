import { NextResponse } from "next/server";
import {
  GITHUB_AUTHORIZE_URL,
  callbackUrl,
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

  const authorize = new URL(GITHUB_AUTHORIZE_URL);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl(siteConfig.url));
  authorize.searchParams.set("scope", "read:user");
  // state 承载「回到哪」，回调时用它跳回原页面
  authorize.searchParams.set("state", next);

  return NextResponse.redirect(authorize.toString());
}
