import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { siteConfig } from "@/config/site";

/** POST /api/auth/email/logout —— 清掉会话 cookie 后回首页 */
export async function POST() {
  const res = NextResponse.redirect(new URL("/", siteConfig.url), {
    status: 303,
  });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
