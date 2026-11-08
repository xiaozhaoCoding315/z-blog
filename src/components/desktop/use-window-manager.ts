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
 * 移动端不渲染窗口层：≤767px 时开窗入口改为跳转到应用的全屏路由。
 * 与 desktop-home 的断点保持一致。
 */
function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

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
  const [bounds, setBounds] = useState<DesktopBounds>(DEFAULT_BOUNDS);
  const observerRef = useRef<ResizeObserver | null>(null);

  /*
   * 窗口层会随路由卸载/重挂载，所以用稳定的 callback ref 而不是一次性
   * effect 读取节点：节点变化时重挂 ResizeObserver，卸载时只断开观察、
   * 保留最后一次有效 bounds。0×0 的测量（display:none / 卸载过程）忽略。
   */
  const boundsRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width <= 0 || height <= 0) return;
      setBounds({ width, height });
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  // 只恢复位置/尺寸；开合状态不恢复。hydrate action 同时把 store.hydrated
  // 置为 true，因此 Task 3 的 ?open 只会在 saved 真正可用的同一帧执行。
  // 即使存储为空/损坏也必须 dispatch：这是 hydrated 的唯一来源。
  useEffect(() => {
    let saved: Record<string, Rect> = {};
    try {
      const parsed = JSON.parse(
        localStorage.getItem(WINDOW_STORAGE_KEY) ?? "{}"
      );
      if (parsed && typeof parsed === "object") {
        saved = parsed as Record<string, Rect>;
      }
    } catch {
      // 存储损坏或不可用时按空布局启动
    }
    dispatch({ type: "hydrate", saved });
  }, []);

  useEffect(() => {
    // 水合完成前不要写：否则空 store 会先覆盖掉 localStorage 里的位置。
    if (!store.hydrated) return;
    try {
      localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(store.saved));
    } catch {
      // 隐私模式写不进去：本次会话仍然保留内存中的位置
    }
  }, [store.saved, store.hydrated]);

  const openApp = useCallback(
    (id: string) => {
      const app = findAppById(id);
      if (!app) return;
      if (app.kind === "route") {
        if (app.path) router.push(app.path);
        return;
      }
      if (isMobileViewport()) {
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
    hydrated: store.hydrated,
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
