import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { mailConfig } from "@/lib/mailer";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "登录" };

// 读会话与 SMTP 配置，每次请求现算；预渲染停在 connection()，静态壳校验随之关掉
export const instant = false;

export default async function LoginPage() {
  await connection();
  const user = await getSessionUser();
  const mail = mailConfig();
  const ownerConfigured = Boolean(process.env.OWNER_EMAIL?.trim());

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">登录</h1>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        邮箱验证码 · 不需要密码
      </p>

      {user ? (
        <div className="mt-8 divide-y divide-rule border-y border-rule">
          <div className="flex items-baseline justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="truncate font-heading text-[16px] font-bold">
                {user.login}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {user.role === "owner" ? "站长" : "访客"}
              </p>
            </div>
            {user.role === "owner" && (
              <Link
                href="/write"
                className="shrink-0 border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                写一条
              </Link>
            )}
          </div>
          <form action="/api/auth/email/logout" method="post" className="py-4">
            <button
              type="submit"
              className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              退出登录
            </button>
          </form>
        </div>
      ) : !mail.enabled ? (
        <div className="mt-8 border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[19px] font-bold">
            登录暂未开放
          </h2>
          <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
            服务器还没配置发信账号（SMTP_USER / SMTP_PASS），验证码发不出去。浏览不受影响。
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <LoginForm ownerConfigured={ownerConfigured} />
        </div>
      )}
    </div>
  );
}
