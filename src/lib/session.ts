import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/auth";

export interface SessionUser {
  id: number;
  login: string;
  avatarUrl: string | null;
}

/**
 * 从请求 cookie 解出当前登录用户。
 * 未登录 / 未配置 / 用户已删除一律返回 null，调用方据此降级。
 *
 * 用 cookies() 会让调用它的路由进入动态渲染——这正是我们要的：
 * 掌握度接口本来就必须按请求识别身份。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token, secret);
  if (userId === null) return null;

  const db = getDb();
  if (!db) return null;

  try {
    const [row] = await db
      .select({
        id: users.id,
        login: users.login,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
