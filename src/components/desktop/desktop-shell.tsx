"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { publicApps } from "@/config/apps";
import type {
  TerminalNote,
  TerminalSnippet,
} from "@/components/terminal/commands";
import type {
  SearchableNote,
  SearchableSnippet,
} from "@/components/search/search-local";
import { DesktopRuntimeContext } from "./desktop-runtime";
import { GlobalWindows } from "./global-windows";
import { MobileDock } from "./mobile-dock";
import { Taskbar } from "./taskbar";
import { useDesktopSettings } from "./use-desktop-settings";
import { useWindowManager } from "./use-window-manager";
import { Wallpaper } from "./wallpaper";

// cmdk 与 Spotlight 只在这个 chunk 里；首屏不加载。
const SearchPalette = dynamic(
  () =>
    import("@/components/search/search-palette").then(
      (mod) => mod.SearchPalette
    ),
  { ssr: false }
);

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
  /** 终端 `apps`/`posts`/`open` 与 Spotlight 共用的笔记索引 */
  notes: TerminalNote[];
  /** 终端 `snippets`/`open` 与 Spotlight 共用的片段索引 */
  snippets: TerminalSnippet[];
  uptimeDays: number | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const windows = useWindowManager();
  const settings = useDesktopSettings();
  const { openApp } = windows;
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  // 移动端 dock 只在首页出现；应用页沿用 AppFrame 的返回栏。
  const showDock = pathname === "/";

  const openTerminal = useCallback(() => openApp("terminal"), [openApp]);
  const openAssistant = useCallback(() => openApp("assistant"), [openApp]);
  const openSpotlight = useCallback(() => setSpotlightOpen(true), []);
  // 系统菜单就是设置面板：广播事件让任务栏打开它，不跨组件传回调。
  const openSettings = useCallback(() => {
    window.dispatchEvent(new Event("z-os:open-settings"));
  }, []);

  // 终端与 Spotlight 共用笔记/片段索引；Spotlight 需要非可选标签数组。
  const searchNotes = useMemo<SearchableNote[]>(
    () =>
      notes.map((note) => ({
        slug: note.slug,
        title: note.title,
        tags: note.tags ?? [],
      })),
    [notes]
  );
  const searchSnippets = useMemo<SearchableSnippet[]>(
    () =>
      snippets.map((snippet) => ({
        id: snippet.id,
        title: snippet.title,
        language: snippet.language,
        tags: snippet.tags ?? [],
      })),
    [snippets]
  );
  // 友链为空时不给无 JS 导航留一个空页入口；其余真实路由保持完整。
  const noScriptApps = useMemo(
    () => publicApps.filter((app) => app.id !== "friends" || hasFriends),
    [hasFriends]
  );

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
    // Phase 1 的旧入口仍广播 blog:open-search；Spotlight 自己关闭时广播
    // z-os:close-spotlight，本组件只负责挂载/卸载，不接收 onClose 函数 prop。
    const onOpenSearch = () => openSpotlight();
    const onCloseSpotlight = () => setSpotlightOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blog:open-terminal", onOpenTerminal);
    window.addEventListener("blog:open-search", onOpenSearch);
    window.addEventListener("z-os:close-spotlight", onCloseSpotlight);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blog:open-terminal", onOpenTerminal);
      window.removeEventListener("blog:open-search", onOpenSearch);
      window.removeEventListener("z-os:close-spotlight", onCloseSpotlight);
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
      <div className="os-shell" data-dock={showDock ? "true" : "false"}>
        {/* 第一个可聚焦元素：Tab 先到跳过链接，再进桌面图标。 */}
        <a href="#os-main" className="os-skip-link">
          跳到主内容
        </a>
        <Wallpaper />
        <main id="os-main" className="os-main">
          {children}
        </main>
        <GlobalWindows
          aiEnabled={aiEnabled}
          notes={notes}
          snippets={snippets}
          uptimeDays={uptimeDays}
        />
        {spotlightOpen && (
          <SearchPalette
            notes={searchNotes}
            snippets={searchSnippets}
            hasFriends={hasFriends}
          />
        )}
        {showDock && <MobileDock />}
        <Taskbar accountMenu={accountMenu} hasFriends={hasFriends} />
        <noscript>
          <nav className="os-noscript" aria-label="站点导航">
            <p>Personal Dev OS · 无脚本模式</p>
            {noScriptApps.map((app) => (
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
