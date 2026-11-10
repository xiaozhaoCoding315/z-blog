import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { mailConfig } from "@/lib/mailer";
import { sanitizeNext, sessionSecret } from "@/lib/auth";
import { profileDisplayName, profileHref } from "@/lib/profile-core";
import { LoginForm } from "@/components/auth/login-form";
import { UserAvatar } from "@/components/site/user-avatar";

export const metadata: Metadata = { title: "登录 / 注册" };

// 读会话与 SMTP 配置，每次请求现算；预渲染停在 connection()，静态壳校验随之关掉
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; mode?: string | string[] }>;
}) {
  await connection();
  const user = await getSessionUser();
  const query = await searchParams;
  const next = sanitizeNext(
    typeof query.next === "string" ? query.next : null
  );
  const register =
    query.mode === "register" ||
    (Array.isArray(query.mode) && query.mode.includes("register"));
  const mail = mailConfig();
  const secret = sessionSecret();
  // 和两个路由的实际条件保持一致：签发会话要密钥，发信要 SMTP，缺一不可
  const loginReady = Boolean(secret) && mail.enabled;
  const ownerConfigured = Boolean(process.env.OWNER_EMAIL?.trim());
  const displayName = user
    ? profileDisplayName(user.displayName, user.login)
    : "";

  return (
    <div className="account-page">
      <section className="account-hero" aria-labelledby="account-title">
        <p className="account-eyebrow">
          {register ? "CREATE ACCOUNT · 第一次来" : "SIGN IN · 回到站内"}
        </p>
        <h1 id="account-title" className="account-title">
          {user
            ? `你好，${displayName}`
            : register
              ? "注册一个站内身份"
              : "登录，或者现在就注册"}
        </h1>
        <p className="account-lede">
          这个站正在长成一块公共留言板：登录后可以留言、评论、推荐歌，
          也能有一张自己的公开资料页。邮箱验证码就是全部凭证，不用记密码。
        </p>

        <ul className="account-benefits">
          <li>
            <span aria-hidden="true">01</span>
            <p>留言与回信，站长看过后公开挂出。</p>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <p>在笔记和动态下评论，所有人都能看到。</p>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <p>推荐一首歌，或者把歌单里的一首分享给别人。</p>
          </li>
          <li>
            <span aria-hidden="true">04</span>
            <p>填昵称、签名、生日与性别，生成自己的主页。</p>
          </li>
        </ul>
      </section>

      <section className="account-panel" aria-label="账号操作">
        {user ? (
          <div className="account-signed">
            <div className="account-signed-head">
              <UserAvatar
                name={displayName}
                avatarUrl={user.avatarUrl}
                size="lg"
              />
              <div>
                <p className="account-signed-name">{displayName}</p>
                <p className="account-signed-meta">
                  @{user.login} · {user.role === "owner" ? "站长" : "访客"}
                </p>
              </div>
            </div>
            <div className="account-signed-links">
              {profileHref(user.id) && (
                <Link href={profileHref(user.id)!}>个人主页 ↗</Link>
              )}
              <Link href="/profile">编辑资料</Link>
              <Link href="/playlist#mine">我的推荐</Link>
              {user.role === "owner" && <Link href="/admin">管理后台</Link>}
            </div>
            <p className="account-signed-note">
              已经登录，不需要再验证一次。右上角的头像菜单随时可以退出。
            </p>
            <form action="/api/auth/email/logout" method="post">
              <button type="submit" className="account-logout">
                退出登录
              </button>
            </form>
          </div>
        ) : !loginReady ? (
          <div className="account-unavailable">
            <p className="account-unavailable-code">503 / NOT AVAILABLE</p>
            <h2>登录暂未开放</h2>
            <p>
              {!secret
                ? "服务器还没配置会话密钥（AUTH_SECRET / SYNC_SECRET），登录签不出会话。浏览不受影响。"
                : "服务器还没配置发信账号（SMTP_USER / SMTP_PASS），验证码发不出去。浏览不受影响。"}
            </p>
          </div>
        ) : (
          <div className="account-form-wrap">
            <div className="account-form-head">
              <h2>{register ? "用邮箱注册" : "用邮箱登录"}</h2>
              <p>
                没有账号也没关系：验证码通过后会自动创建。已有账号会直接登录。
              </p>
            </div>
            <LoginForm
              ownerConfigured={ownerConfigured}
              mode={register ? "register" : "login"}
              next={next}
            />
            <p className="account-switch">
              {register ? (
                <>
                  已经有账号？
                  <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>
                    直接登录
                  </Link>
                </>
              ) : (
                <>
                  第一次来？
                  <Link
                    href={`/login?mode=register${
                      next !== "/" ? `&next=${encodeURIComponent(next)}` : ""
                    }`}
                  >
                    注册一个
                  </Link>
                </>
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}