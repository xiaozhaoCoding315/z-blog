import type { ReactNode } from "react";
import { publicApps } from "@/config/apps";
import { Wallpaper } from "./wallpaper";
import { Taskbar } from "./taskbar";

export function DesktopShell({
  accountMenu,
  hasFriends,
  children,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
  children: ReactNode;
}) {
  return (
    <div className="os-shell">
      <Wallpaper />
      <main className="os-main">{children}</main>
      <Taskbar accountMenu={accountMenu} hasFriends={hasFriends} />
      <noscript>
        <nav className="os-noscript" aria-label="站点导航">
          <p>Personal Dev OS · 无脚本模式</p>
          {publicApps.map((app) => (
            <a key={app.id} href={app.path}>
              {app.title}
            </a>
          ))}
          <a href="/login">登录</a>
          <a href="/feed.xml">RSS</a>
        </nav>
      </noscript>
    </div>
  );
}
