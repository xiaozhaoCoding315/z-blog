"use client";

import dynamic from "next/dynamic";
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
  const windows = useWindowManager();
  const settings = useDesktopSettings();
  const { openApp } = windows;
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  const openTerminal = useCallback(() => openApp("terminal"), [openApp]);
  const openAssistant = useCallback(() => openApp("assistant"), [openApp]);
  const openSpotlight = useCallback(() => setSpotlightOpen(true), []);
  // Phase 2 没有独立设置面板：让任务栏把系统菜单打开；Phase 4 再换成完整面板。
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
      <div className="os-shell">
        <Wallpaper />
        <main className="os-main">{children}</main>
        <GlobalWindows
          aiEnabled={aiEnabled}
          notes={notes}
          snippets={snippets}
          uptimeDays={uptimeDays}
        />
        {spotlightOpen && (
          <SearchPalette notes={searchNotes} snippets={searchSnippets} />
        )}
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
