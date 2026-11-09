"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconKey } from "@/config/apps";
import { AppIcon } from "./icons";

const DOCK_APPS: { href: string; label: string; icon: IconKey }[] = [
  { href: "/life", label: "日志", icon: "life" },
  { href: "/projects", label: "项目", icon: "projects" },
  { href: "/gallery", label: "胶囊", icon: "gallery" },
  { href: "/snippets", label: "片段", icon: "snippets" },
];

/**
 * 移动端 56px dock：四条真实路由，等分四列，触控目标铺满整格。
 *
 * 只在首页渲染（由 DesktopShell 判断 pathname）；应用页沿用 AppFrame 的
 * 顶部返回栏。当前路由用 aria-current + 琥珀色标记。
 */
export function MobileDock() {
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
    </nav>
  );
}
