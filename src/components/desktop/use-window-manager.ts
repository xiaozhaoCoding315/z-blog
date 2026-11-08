"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { findAppById } from "@/config/apps";
import {
  DEFAULT_BOUNDS,
  WINDOW_STORAGE_KEY,
  initialWindowStore,
  preferredRect,
  windowReducer,
  type DesktopBounds,
  type Rect,
} from "./window-state";

/**
 * 窗口系统的唯一状态源。
 *
 * 开合状态不持久化，只保存每个应用最后一次的位置/尺寸；刷新后窗口不会
 * 自己冒出来，但下次打开会回到离开时的位置。`boundsRef` 挂在桌面窗口层上，
 * 拖拽/缩放的 clamp 都以它的实际尺寸为准。
 */
export function useWindowManager() {
  const router = useRouter();
  const pathname = usePathname();
  const [store, dispatch] = useReducer(windowReducer, initialWindowStore);
  const boundsRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<DesktopBounds>(DEFAULT_BOUNDS);

  // 只恢复位置/尺寸；开合状态不恢复
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(WINDOW_STORAGE_KEY) ?? "{}"
      );
      if (saved && typeof saved === "object") {
        dispatch({ type: "hydrate", saved });
      }
    } catch {
      // 存储损坏或不可用时按空布局启动
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(store.saved));
    } catch {
      // 隐私模式写不进去：本次会话仍然保留内存中的位置
    }
  }, [store.saved]);

  useEffect(() => {
    const node = boundsRef.current;
    if (!node) return;
    const update = () =>
      setBounds({ width: node.clientWidth, height: node.clientHeight });
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const openApp = useCallback(
    (id: string) => {
      const app = findAppById(id);
      if (!app) return;
      if (app.kind === "route") {
        if (app.path) router.push(app.path);
        return;
      }
      if (pathname !== "/") {
        router.push(app.path ?? `/?open=${id}`);
        return;
      }
      const config = app.window;
      if (!config) return;
      const rect = preferredRect(
        store.saved[id],
        config.defaultRect,
        bounds,
        config.minWidth,
        config.minHeight
      );
      dispatch({ type: "open", id, rect });
    },
    [bounds, pathname, router, store.saved]
  );

  const close = useCallback(
    (id: string) => dispatch({ type: "close", id }),
    []
  );
  const focus = useCallback(
    (id: string) => dispatch({ type: "focus", id }),
    []
  );
  const minimize = useCallback(
    (id: string) => dispatch({ type: "minimize", id }),
    []
  );
  const restore = useCallback(
    (id: string) => dispatch({ type: "restore", id }),
    []
  );
  const toggleMaximize = useCallback(
    (id: string) => dispatch({ type: "toggleMaximize", id }),
    []
  );
  const move = useCallback(
    (id: string, rect: Rect) => dispatch({ type: "move", id, rect }),
    []
  );
  const resize = useCallback(
    (id: string, rect: Rect) => dispatch({ type: "resize", id, rect }),
    []
  );
  const resetLayout = useCallback(() => {
    dispatch({ type: "reset" });
    try {
      localStorage.removeItem(WINDOW_STORAGE_KEY);
    } catch {
      // 同写入：存储不可用时只重置内存
    }
  }, []);

  return {
    store,
    boundsRef,
    bounds,
    openApp,
    close,
    focus,
    minimize,
    restore,
    toggleMaximize,
    move,
    resize,
    resetLayout,
  };
}
