import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * 页头账号菜单。原生 <details>，不引客户端状态：
 * 关 JS 也能展开，键盘焦点天然可达。
 */
export async function AccountMenu() {
  // 会话过期判断会读 Date.now()，属于预渲染时的不稳定值；
  // 必须先声明请求时渲染，菜单不进静态预渲染，布局里的 Suspense 边界保住站点外壳静态。
  await connection();

  const user = await getSessionUser();
  if (!user) {
    return (
      <Link
        href="/login"
        className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        登录
      </Link>
    );
  }

  const initial = [...user.login][0]?.toUpperCase() ?? "?";

  return (
    <details className="relative">
      <summary
        className="flex size-8 cursor-pointer list-none items-center justify-center border border-rule font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`账号菜单：${user.login}`}
      >
        {initial}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 border border-rule bg-panel p-2 shadow-none">
        <p className="truncate px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {user.login} · {user.role === "owner" ? "站长" : "访客"}
        </p>
        <Link
          href="/playlist#mine"
          className="block px-2 py-1.5 text-[13px] hover:text-data"
        >
          我的推荐
        </Link>
        {user.role === "owner" && (
          <>
            <Link
              href="/write"
              className="block px-2 py-1.5 text-[13px] hover:text-data"
            >
              写一条
            </Link>
            <Link
              href="/admin"
              className="block px-2 py-1.5 text-[13px] hover:text-data"
            >
              管理
            </Link>
          </>
        )}
        <form
          action="/api/auth/email/logout"
          method="post"
          className="border-t border-rule pt-1"
        >
          <button
            type="submit"
            className="w-full px-2 py-1.5 text-left text-[13px] text-muted-foreground hover:text-foreground"
          >
            退出登录
          </button>
        </form>
      </div>
    </details>
  );
}
