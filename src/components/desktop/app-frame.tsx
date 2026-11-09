"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { findAppByPath } from "@/config/apps";

const ScrollRootContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

/** 页面里的阅读进度与目录用它找真正的滚动容器；移动端返回 null（页面滚动）。 */
export function useScrollRoot() {
  return useContext(ScrollRootContext);
}

function useDesktopViewport() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const app = findAppByPath(pathname);
  const scrollRef = useRef<HTMLDivElement>(null);
  const desktop = useDesktopViewport();
  // pathname 变化时用派生值归零，不在 effect 里同步 setState（React Compiler 规则）
  const [chrome, setChrome] = useState({
    path: pathname,
    expanded: false,
    focusMode: false,
  });
  const expanded = chrome.path === pathname && chrome.expanded;
  const focusMode = chrome.path === pathname && chrome.focusMode;
  const titleId = useId();
  const canFocus = /^\/notes\/[^/]+$/.test(pathname);

  // 窗口内部滚动，Next 默认的 window 滚动复位够不到；进应用时手动回到顶部。
  // 必须用 instant：CSS 的 scroll-behavior: smooth 会让 behavior: "auto" 也走平滑动画，
  // 新页面会从上一页的偏移量慢慢滚上来。
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    scrollRef.current
      ?.closest<HTMLElement>(".os-main")
      ?.scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!focusMode) return;
    const root = document.documentElement;
    root.dataset.focusMode = "true";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setChrome((current) => ({
          ...current,
          path: pathname,
          focusMode: false,
        }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      delete root.dataset.focusMode;
    };
  }, [focusMode, pathname]);

  return (
    <ScrollRootContext.Provider value={desktop ? scrollRef : null}>
      <section
        className="os-app-frame"
        data-expanded={expanded ? "true" : "false"}
        data-focus={focusMode ? "true" : "false"}
        role="region"
        aria-labelledby={titleId}
      >
        <div className="os-app-window">
          <header className="os-titlebar">
            <Link href="/" className="os-titlebar-back" aria-label="最小化到桌面">
              ‹ 桌面
            </Link>
            <span id={titleId} className="os-titlebar-title">
              {app?.title ?? "Z·OS"}
            </span>
            <span className="os-titlebar-path">{pathname}</span>
            <div className="os-titlebar-controls">
              {canFocus && (
                <button
                  type="button"
                  className="os-titlebar-control"
                  aria-label="专注阅读"
                  aria-pressed={focusMode}
                  onClick={() =>
                    setChrome((current) => ({
                      path: pathname,
                      expanded:
                        current.path === pathname ? current.expanded : false,
                      focusMode: !(
                        current.path === pathname && current.focusMode
                      ),
                    }))
                  }
                >
                  ◱
                </button>
              )}
              <Link href="/" className="os-titlebar-control" aria-label="最小化">
                —
              </Link>
              <button
                type="button"
                className="os-titlebar-control"
                aria-label={expanded ? "还原窗口" : "最大化"}
                onClick={() =>
                  setChrome((current) => ({
                    path: pathname,
                    expanded: !(
                      current.path === pathname && current.expanded
                    ),
                    focusMode:
                      current.path === pathname ? current.focusMode : false,
                  }))
                }
              >
                □
              </button>
              <Link
                href="/"
                className="os-titlebar-control is-close"
                aria-label="关闭"
              >
                ×
              </Link>
            </div>
          </header>

          <div className="os-mobile-appbar">
            <Link href="/">‹ 桌面</Link>
            <span>{app?.title ?? "Z·OS"}</span>
          </div>

          <div ref={scrollRef} className="os-app-content">
            {children}
          </div>
        </div>
      </section>
    </ScrollRootContext.Provider>
  );
}
