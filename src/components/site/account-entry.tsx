import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import { AccountEntryView } from "@/components/site/account-entry-view";

/**
 * 登录 / 注册 / 账号菜单的服务端入口。
 *
 * 会话读取会读 cookie，必须在请求期完成；调用方用 Suspense 包住它，
 * 静态外壳不会被这一个动态洞拖成整页动态。
 */
export async function AccountEntry({
  variant = "bar",
}: {
  variant?: "bar" | "dock";
}) {
  await connection();
  const user = await getSessionUser();

  return (
    <AccountEntryView
      variant={variant}
      loginReady={loginReady()}
      user={
        user
          ? {
              id: user.id,
              login: user.login,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              role: user.role,
            }
          : null
      }
    />
  );
}