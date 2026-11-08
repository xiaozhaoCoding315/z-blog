"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { publicApps } from "@/config/apps";
import type {
  TerminalNote,
  TerminalSnippet,
} from "@/components/terminal/commands";
import { DesktopRuntimeContext } from "./desktop-runtime";
import { GlobalWindows } from "./global-windows";
import { Taskbar } from "./taskbar";
import { useDesktopSettings } from "./use-desktop-settings";
import { useWindowManager } from "./use-window-manager";
import { Wallpaper } from "./wallpaper";

/**
 * 桌面外壳：窗口系统与桌面预设的唯一状态源。
 *
 * 客户端运行时只属于外壳；`children` 仍是服务端渲染的页面，
 * 因此应用页不会因为窗口系统而整体变成客户端组件。
 * 窗口动作统一放进 `DesktopRuntimeContext`，Taskbar / Window / Launcher
 * 都不接收函数 props。
 */
export function DesktopShell({
  accountMenu,
  hasFriends,
  aiEnabled,
  notes,
  snippets,
  uptimeDays,
  children,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
  aiEnabled: boolean;
  /** 终端 `apps`/`posts`/`open` 与 Spotlight（Task 5）共用的笔记索引 */
  notes: TerminalNote[];
  /** Phase 3 才有片段数据模型；当前由 layout 传入空数组 */
  snippets: TerminalSnippet[];
  uptimeDays: number | null;
  children: ReactNode;
}) {
  const windows = useWindowManager();
  const settings = useDesktopSettings();
  const { openApp } = windows;

  const openTerminal = useCallback(() => openApp("terminal"), [openApp]);
  const openAssistant = useCallback(() => openApp("assistant"), [openApp]);
  // Spotlight 在 Task 5 重写：本任务只广播事件，不挂载旧面板。
  const openSpotlight = useCallback(() => {
    window.dispatchEvent(new Event("blog:open-search"));
  }, []);
  // Phase 2 没有独立设置面板：让任务栏把系统菜单打开；Phase 4 再换成完整面板。
  const openSettings = useCallback(() => {
    window.dispatchEvent(new Event("z-os:open-settings"));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "`" && !typing) {
        event.preventDefault();
        openTerminal();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSpotlight();
      }
    };
    const onOpenTerminal = () => openTerminal();
    window.addEventListener("keydown", onKey);
    window.addEventListener("blog:open-terminal", onOpenTerminal);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blog:open-terminal", onOpenTerminal);
    };
  }, [openSpotlight, openTerminal]);

  const runtime = useMemo(
    () => ({
      windows,
      settings,
      openSpotlight,
      openSettings,
      openTerminal,
      openAssistant,
    }),
    [
      windows,
      settings,
      openSpotlight,
      openSettings,
      openTerminal,
      openAssistant,
    ]
  );

  return (
    <DesktopRuntimeContext.Provider value={runtime}>
      <div className="os-shell">
        <Wallpaper />
        <main className="os-main">{children}</main>
        <GlobalWindows
          aiEnabled={aiEnabled}
          notes={notes}
          snippets={snippets}
          uptimeDays={uptimeDays}
        />
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
    </DesktopRuntimeContext.Provider>
  );
}
