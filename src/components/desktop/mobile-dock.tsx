"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { IconKey } from "@/config/apps";
import { AppIcon } from "./icons";

const DOCK_APPS: { href: string; label: string; icon: IconKey }[] = [
  { href: "/terminal", label: "终端", icon: "terminal" },
  { href: "/notes", label: "笔记", icon: "notes" },
  { href: "/assistant", label: "小元", icon: "assistant" },
  { href: "/letters", label: "社区", icon: "letters" },
];

/**
 * 移动端 56px dock：四条真实路由，等分四列，触控目标铺满整格。
 *
 * 只在首页渲染（由 DesktopShell 判断 pathname）；应用页沿用 AppFrame 的
 * 顶部返回栏。因此 aria-current 在首页不会命中，保留作防御性标记。
 */
export function MobileDock({ accountEntry }: { accountEntry?: ReactNode }) {
  const pathname = usePathname();

  return (
    <nav className="os-mobile-dock" aria-label="快捷入口">
      {DOCK_APPS.map((app) => (
        <Link
          key={app.href}
          href={app.href}
          className="os-mobile-dock-link"
          aria-current={pathname === app.href ? "page" : undefined}
        >
          <AppIcon name={app.icon} />
          <span>{app.label}</span>
        </Link>
      ))}
      {accountEntry ?? (
        <Link href="/login" className="os-mobile-dock-link">
          <AppIcon name="login" />
          <span>登录</span>
        </Link>
      )}
    </nav>
  );
}
