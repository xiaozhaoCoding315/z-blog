"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { findAppById, findAppByPath, launcherApps } from "@/config/apps";
import { AppIcon } from "./icons";
import { Clock } from "./clock";
import { Launcher } from "./launcher";
import { SystemMenu } from "./system-menu";
import { TaskbarPanelsContext } from "./taskbar-panels";
import { useDesktopRuntime } from "./desktop-runtime";

/**
 * 底部任务栏：当前路由应用 + 所有打开的窗口。
 *
 * 窗口动作全部来自运行时上下文，任务栏不接收函数 props。
 * 窗口项点击后先回到桌面再恢复/聚焦——窗口状态保存在外壳里，
 * 路由切换不会丢掉已经打开的窗口。
 */
export function Taskbar({
  accountMenu,
  hasFriends,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { windows } = useDesktopRuntime();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const current = findAppByPath(pathname);
  const openWindows = Object.values(windows.store.windows);
  const launcherVisibleApps = launcherApps.filter(
    (app) => app.id !== "friends" || hasFriends
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

  // Phase 2 的“设置”就是系统菜单：任何地方调用 runtime.openSettings()
  // 都通过这个事件落到这里，避免把回调函数跨组件传递。
  useEffect(() => {
    const onOpenSettings = () => {
      setMenuOpen(true);
      setLauncherOpen(false);
    };
    window.addEventListener("z-os:open-settings", onOpenSettings);
    return () =>
      window.removeEventListener("z-os:open-settings", onOpenSettings);
  }, []);

  const closePanels = () => {
    setLauncherOpen(false);
    setMenuOpen(false);
  };

  const activateWindow = (id: string) => {
    closePanels();
    if (pathname !== "/") router.push("/");
    if (windows.store.windows[id]?.minimized) {
      windows.restore(id);
    } else {
      windows.focus(id);
    }
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

          {openWindows.map((state) => {
            // 当前路由已经以 Link 形式出现时，不重复渲染同一个应用。
            if (state.id === current?.id) return null;
            const app = findAppById(state.id);
            if (!app) return null;
            const focused =
              !state.minimized && state.z === windows.store.zCounter;

            return (
              <button
                key={state.id}
                type="button"
                className="os-taskbar-item os-taskbar-window"
                data-focused={focused ? "true" : "false"}
                data-minimized={state.minimized ? "true" : "false"}
                title={app.description}
                onClick={() => activateWindow(state.id)}
              >
                <AppIcon name={app.icon} className="size-3.5" />
                <span>{app.title}</span>
              </button>
            );
          })}
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

        {launcherOpen && <Launcher apps={launcherVisibleApps} />}
        {menuOpen && (
          <SystemMenu accountMenu={accountMenu} hasFriends={hasFriends} />
        )}
      </footer>
    </TaskbarPanelsContext.Provider>
  );
}
