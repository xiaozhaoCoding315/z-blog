"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/desktop/icons";
import { UserAvatar } from "@/components/site/user-avatar";
import { profileDisplayName, profileHref } from "@/lib/profile-core";

export interface EntryUser {
  id: number;
  login: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "owner" | "visitor";
}

function nextSuffix(pathname: string, mode?: "register"): string {
  const params = new URLSearchParams();
  if (pathname && pathname !== "/" && pathname !== "/login") {
    params.set("next", pathname);
  }
  if (mode) params.set("mode", mode);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * 顶栏与首页的账号入口。
 *
 * 未登录时永远是「登录 + 注册」两个可见按钮——注册和登录共用邮箱验证码，
 * 第一次验证成功就会自动建号，所以注册按钮只需要切到同一张表单并说清楚。
 * 已登录时是头像 + 昵称的菜单；`<button>` 而不是 `<details>`，这样能保证
 * 点击外部与 Esc 都能收起，键盘焦点也可控。
 */
export function AccountEntryView({
  user,
  loginReady,
  variant,
}: {
  user: EntryUser | null;
  loginReady: boolean;
  variant: "bar" | "dock";
}) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState({ path: pathname, open: false });
  const open = menu.path === pathname && menu.open;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenu((current) => ({ ...current, open: false }));
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu((current) => ({ ...current, open: false }));
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (variant === "dock") {
    if (!user) {
      return (
        <Link
          href={`/login${nextSuffix(pathname)}`}
          className="os-mobile-dock-link"
          aria-label="登录或注册"
        >
          <AppIcon name="login" />
          <span>登录</span>
        </Link>
      );
    }
    const name = profileDisplayName(user.displayName, user.login);
    return (
      <Link
        href={profileHref(user.id) ?? "/profile"}
        className="os-mobile-dock-link os-mobile-dock-account"
        aria-label={`${name} 的主页`}
      >
        <UserAvatar name={name} avatarUrl={user.avatarUrl} size="sm" />
        <span>我的</span>
      </Link>
    );
  }

  if (!user) {
    return (
      <div className="account-auth" aria-label="账号入口">
        <Link
          href={`/login${nextSuffix(pathname)}`}
          className="account-auth-login"
        >
          登录
        </Link>
        {loginReady && (
          <Link
            href={`/login${nextSuffix(pathname, "register")}`}
            className="account-auth-register"
          >
            注册
          </Link>
        )}
      </div>
    );
  }

  const name = profileDisplayName(user.displayName, user.login);
  const href = profileHref(user.id);
  const close = () => setMenu({ path: pathname, open: false });

  return (
    <div ref={rootRef} className="account-entry" data-open={open ? "true" : "false"}>
      <button
        type="button"
        className="account-entry-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`账号菜单：${name}`}
        onClick={() =>
          setMenu({ path: pathname, open: !open })
        }
      >
        <UserAvatar name={name} avatarUrl={user.avatarUrl} size="sm" />
        <span className="account-entry-name">{name}</span>
        <span className="account-entry-role" aria-hidden="true">
          {user.role === "owner" ? "站长" : "访客"}
        </span>
        <span className="account-entry-caret" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="account-menu" role="menu" aria-label="账号菜单">
          <div className="account-menu-head">
            <UserAvatar name={name} avatarUrl={user.avatarUrl} size="md" />
            <div className="account-menu-identity">
              <p>{name}</p>
              <span>
                @{user.login} · {user.role === "owner" ? "站长" : "访客"}
              </span>
            </div>
          </div>
          <nav className="account-menu-links">
            {href && (
              <Link href={href} role="menuitem" onClick={close}>
                个人主页
                <span aria-hidden="true">↗</span>
              </Link>
            )}
            <Link href="/profile" role="menuitem" onClick={close}>
              资料设置
            </Link>
            <Link href="/playlist#mine" role="menuitem" onClick={close}>
              我的推荐
            </Link>
            {user.role === "owner" && (
              <>
                <Link href="/playlist/import" role="menuitem" onClick={close}>
                  导入歌单
                </Link>
                <Link href="/write" role="menuitem" onClick={close}>
                  写一条
                </Link>
                <Link href="/admin" role="menuitem" onClick={close}>
                  管理后台
                </Link>
              </>
            )}
          </nav>
          <form
            action="/api/auth/email/logout"
            method="post"
            className="account-menu-logout"
          >
            <button type="submit" role="menuitem">
              退出登录
            </button>
          </form>
        </div>
      )}
    </div>
  );
}