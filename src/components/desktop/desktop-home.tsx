"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import {
  desktopTileApps,
  findAppById,
  type AppDefinition,
} from "@/config/apps";
import { siteConfig } from "@/config/site";
import { useDesktopRuntime } from "./desktop-runtime";
import { AppIcon } from "./icons";
import { Window } from "./window";

type IconStyle = CSSProperties & { "--i": number };

interface DesktopHomeProps {
  status: string;
  /** 服务端渲染好的窗口内容；键是应用 id（终端/助理由 GlobalWindows 挂载）。 */
  windowContent: Record<string, ReactNode>;
  statusWidget?: ReactNode;
  stickyNote?: ReactNode;
  deskObjects?: ReactNode;
}

const HINT_KEY = "z-os:hint";
const MOBILE_QUERY = "(max-width: 767px)";
const GRID_COLUMNS = 3;

function isMobileViewport() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * 桌面主屏：图标网格 + 窗口层。
 *
 * 窗口内容由首页服务端渲染后作为 ReactNode 传进来，客户端只负责
 * 焦点/选择、开窗与键盘导航；窗口本身的拖拽与层级仍由 Window 处理。
 * 终端与助理不在 windowContent 里——它们由 GlobalWindows 在
 * `.os-main` 之外挂载（Task 4/5），这里不渲染第二层窗框。
 */
export function DesktopHome({
  status,
  windowContent,
  statusWidget,
  stickyNote,
  deskObjects,
}: DesktopHomeProps) {
  const { windows } = useDesktopRuntime();
  const router = useRouter();
  const { store, boundsRef, hydrated, openApp } = windows;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hintSeen, setHintSeen] = useState(false);
  const iconRefs = useRef<(HTMLElement | null)[]>([]);
  const pointerTypeRef = useRef<string>("mouse");

  const openCount = Object.keys(store.windows).length;
  const hintVisible = !hintSeen && openCount === 0;

  // 打开任一窗口后提示永久消失；关闭所有窗口也不回来。
  // setState 放进微任务，避免在 effect 体内同步更新触发级联渲染。
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(HINT_KEY) === "1";
    } catch {
      // 隐私模式下读不到：本次会话仍然显示提示
    }
    if (openCount > 0) {
      seen = true;
      try {
        window.localStorage.setItem(HINT_KEY, "1");
      } catch {
        // 写不进去也不阻塞开窗
      }
    }
    if (seen) queueMicrotask(() => setHintSeen(true));
  }, [openCount]);

  // ?open=id：等 useWindowManager 先 hydrate 完 saved rect，再开窗并清掉参数。
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("open");
    if (!id) return;
    openApp(id);
    params.delete("open");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
  }, [hydrated, openApp]);

  const openAppFromDesktop = useCallback(
    (app: AppDefinition) => {
      setSelectedId(null);
      if (app.kind === "route") {
        if (app.path) router.push(app.path);
        return;
      }
      // 移动端没有窗口：有真实路由的窗口型应用跳到路由页，无路由的不响应。
      if (isMobileViewport()) {
        if (app.path) router.push(app.path);
        return;
      }
      openApp(app.id);
    },
    [openApp, router]
  );

  const onWindowIconClick = (
    app: AppDefinition,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    // 键盘 Enter/Space 的 click detail 为 0；触屏单击直接打开。
    if (
      event.detail === 0 ||
      pointerTypeRef.current === "touch" ||
      isMobileViewport()
    ) {
      openAppFromDesktop(app);
      return;
    }
    setSelectedId(app.id);
  };

  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const delta =
      event.key === "ArrowLeft"
        ? -1
        : event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp"
            ? -GRID_COLUMNS
            : event.key === "ArrowDown"
              ? GRID_COLUMNS
              : 0;
    if (delta === 0) return;

    const target = event.target as HTMLElement;
    const rawIndex = target.closest<HTMLElement>("[data-app-index]")?.dataset
      .appIndex;
    if (rawIndex === undefined) return;
    const index = Number(rawIndex);
    if (!Number.isInteger(index)) return;

    event.preventDefault();
    const next = Math.max(
      0,
      Math.min(desktopTileApps.length - 1, index + delta)
    );
    iconRefs.current[next]?.focus();
  };

  const onDesktopClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (
      (event.target as HTMLElement).closest(
        ".os-icon, .os-window, .os-sticky-note, .os-status-widget, .os-desk-objects"
      )
    ) {
      return;
    }
    setSelectedId(null);
  };

  const openWindows = Object.values(store.windows).filter(
    (state) =>
      !state.minimized &&
      Object.prototype.hasOwnProperty.call(windowContent, state.id)
  );

  return (
    <div className="os-desktop" onClick={onDesktopClick}>
      <header className="os-identity">
        <h1 className="os-identity-name">{siteConfig.name}</h1>
        <p className="os-identity-status">{status}</p>
      </header>

      <nav
        className="os-icon-grid"
        aria-label="应用"
        onKeyDown={onGridKeyDown}
      >
        {desktopTileApps.map((app, index) => {
          const icon = (
            <>
              <span className="os-icon-tile">
                <AppIcon name={app.icon} className="size-6" />
              </span>
              <span className="os-icon-label">{app.title}</span>
            </>
          );
          const style = { "--i": index } as IconStyle;

          if (app.kind === "route" && app.path) {
            return (
              <Link
                key={app.id}
                href={app.path}
                className="os-icon"
                title={app.description}
                style={style}
                data-app-index={index}
                ref={(node) => {
                  iconRefs.current[index] = node;
                }}
              >
                {icon}
              </Link>
            );
          }

          return (
            <button
              key={app.id}
              type="button"
              className="os-icon"
              title={app.description}
              style={style}
              data-app-index={index}
              data-selected={selectedId === app.id ? "true" : undefined}
              ref={(node) => {
                iconRefs.current[index] = node;
              }}
              onPointerDown={(event) => {
                pointerTypeRef.current = event.pointerType;
              }}
              onClick={(event) => onWindowIconClick(app, event)}
              onDoubleClick={() => {
                if (pointerTypeRef.current !== "touch") {
                  openAppFromDesktop(app);
                }
              }}
            >
              {icon}
            </button>
          );
        })}
      </nav>

      {stickyNote && <div className="os-sticky-note">{stickyNote}</div>}
      {statusWidget && <div className="os-status-widget">{statusWidget}</div>}
      {deskObjects && <div className="os-desk-objects">{deskObjects}</div>}

      <div ref={boundsRef} className="os-window-layer">
        {openWindows.map((state) => {
          const app = findAppById(state.id);
          if (!app) return null;
          return (
            <Window key={state.id} id={state.id} app={app}>
              {windowContent[state.id]}
            </Window>
          );
        })}
      </div>

      {hintVisible && (
        <p className="os-desktop-hint">
          <span>按 ` 打开终端</span>
          <span aria-hidden>·</span>
          <span>⌘K 搜索</span>
          <span aria-hidden>·</span>
          <span>双击图标打开</span>
        </p>
      )}
    </div>
  );
}

/**
 * 「更多」窗口里的设置入口。
 *
 * 窗口内容由服务端渲染，这个按钮是其中唯一的客户端岛：
 * 它只向任务栏广播打开系统菜单的事件，不把函数带过 RSC 边界。
 */
export function OpenSettingsButton() {
  const { openSettings } = useDesktopRuntime();

  return (
    <button type="button" className="os-pane-link" onClick={openSettings}>
      <span>系统设置</span>
      <span aria-hidden>≡</span>
    </button>
  );
}
