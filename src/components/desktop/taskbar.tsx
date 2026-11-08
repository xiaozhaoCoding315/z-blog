"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { findAppByPath, launcherApps, type LinkedApp } from "@/config/apps";
import { AppIcon } from "./icons";
import { Clock } from "./clock";
import { Launcher } from "./launcher";
import { SystemMenu } from "./system-menu";
import { TaskbarPanelsContext } from "./taskbar-panels";

export function Taskbar({
  accountMenu,
  hasFriends,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
}) {
  const pathname = usePathname();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const current = findAppByPath(pathname);
  // 过渡期：窗口型应用尚未接入运行时，启动器先只列有路径的项。
  const linkedLauncherApps = launcherApps.filter(
    (app): app is LinkedApp => typeof app.path === "string"
  );

  // 回到桌面或切换应用时，外层滚动容器与移动端 window 都立即回到顶部
  useEffect(() => {
    document
      .querySelector<HTMLElement>(".os-main")
      ?.scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  // 浏览器前进/后退时收起面板；面板内链接、任务栏入口和遮罩各自负责关闭，
  // 所以不需要监听 pathname 变化（在 effect 里同步 setState 会触发级联渲染）。
  useEffect(() => {
    const close = () => {
      setLauncherOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  useEffect(() => {
    if (!launcherOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLauncherOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launcherOpen, menuOpen]);

  const closePanels = () => {
    setLauncherOpen(false);
    setMenuOpen(false);
  };

  return (
    <TaskbarPanelsContext.Provider value={closePanels}>
      <footer className="os-taskbar">
        {(launcherOpen || menuOpen) && (
          <button
            type="button"
            className="os-menu-backdrop"
            aria-label="关闭面板"
            tabIndex={-1}
            onClick={closePanels}
          />
        )}

        <button
          type="button"
          className="os-launcher-button"
          aria-label="打开启动器"
          aria-expanded={launcherOpen}
          onClick={() => {
            setLauncherOpen((open) => !open);
            setMenuOpen(false);
          }}
        >
          Z
        </button>

        <div className="os-taskbar-apps">
          {current?.path && (
            <Link
              href={current.path}
              className="os-taskbar-item is-active"
              aria-current="page"
              onClick={closePanels}
            >
              <AppIcon name={current.icon} className="size-3.5" />
              <span>{current.title}</span>
            </Link>
          )}
        </div>

        <div className="os-taskbar-right">
          <span className="os-taskbar-clock">
            <Clock withSeconds={false} />
          </span>
          <button
            type="button"
            className="os-taskbar-menu-button"
            aria-label="系统菜单"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setLauncherOpen(false);
            }}
          >
            ≡
          </button>
        </div>

        {launcherOpen && <Launcher apps={linkedLauncherApps} />}
        {menuOpen && (
          <SystemMenu accountMenu={accountMenu} hasFriends={hasFriends} />
        )}
      </footer>
    </TaskbarPanelsContext.Provider>
  );
}
