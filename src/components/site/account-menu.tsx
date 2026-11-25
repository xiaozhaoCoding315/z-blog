import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * 系统菜单里的账号区。
 * 展开/收起由客户端的 SystemMenu 负责；这里只负责按会话渲染内容。
 */
export async function AccountMenu() {
  // 会话过期判断会读 Date.now()，必须先声明请求时渲染
  await connection();

  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/login" className="os-menu-link">
        登录
      </Link>
    );
  }

  return (
    <div className="os-account">
      <p className="px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {user.login} · {user.role === "owner" ? "站长" : "访客"}
      </p>
      <Link href="/playlist#mine" className="os-menu-link">
        我的推荐
      </Link>
      {user.role === "owner" && (
        <>
          <Link href="/write" className="os-menu-link">
            写一条
          </Link>
          <Link href="/admin" className="os-menu-link">
            管理
          </Link>
        </>
      )}
      <form
        action="/api/auth/email/logout"
        method="post"
        className="mt-1 border-t border-rule pt-1"
      >
        <button type="submit" className="os-menu-link">
          退出登录
        </button>
      </form>
    </div>
  );
}
