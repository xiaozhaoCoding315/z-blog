"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { AppDefinition } from "@/config/apps";
import { useDesktopRuntime } from "./desktop-runtime";
import { AppIcon } from "./icons";
import { clampRect, type Rect } from "./window-state";

interface WindowProps {
  id: string;
  app: AppDefinition;
  children: ReactNode;
}

interface PointerInteraction {
  pointerId: number;
  startX: number;
  startY: number;
  rect: Rect;
}

/** 标题栏/缩放柄上的按钮和链接自己不触发拖拽。 */
const INTERACTIVE = "button, a, input, textarea, select, [contenteditable='true']";

/**
 * 桌面窗口框。
 *
 * 状态和动作全部从 `useDesktopRuntime()` 读取：本组件不接收任何函数 props，
 * 因此可以安全地由服务端组件渲染 children 后交给客户端窗口层。
 * 拖拽/缩放期间只写 transform / width / height（不入 React state），
 * 松手后再 clamp 并提交一次 reducer action。
 */
export function Window({ id, app, children }: WindowProps) {
  const { windows } = useDesktopRuntime();
  const state = windows.store.windows[id];
  const focused = state?.z === windows.store.zCounter;
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PointerInteraction | null>(null);
  const resizeRef = useRef<PointerInteraction | null>(null);

  const minWidth = app.window?.minWidth ?? 0;
  const minHeight = app.window?.minHeight ?? 0;

  // Esc 关闭聚焦窗口；正在输入或面板/模态打开时把 Esc 留给它们。
  useEffect(() => {
    if (!focused || state?.minimized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE)) return;
      if (
        document.querySelector(
          ".os-launcher, .os-system-menu, [aria-modal='true']"
        )
      ) {
        return;
      }
      windows.close(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, id, state?.minimized, windows]);

  if (!state) return null;

  const commitDrag = (interaction: PointerInteraction) => {
    const rect = clampRect(
      {
        x: interaction.rect.x,
        y: interaction.rect.y,
        w: interaction.rect.w,
        h: interaction.rect.h,
      },
      windows.bounds,
      minWidth,
      minHeight
    );
    windows.move(id, rect);
  };

  const onTitleBarPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0 || state.maximized) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    const root = rootRef.current;
    if (!root) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: state.rect,
    };
    root.classList.remove("is-open");
    root.dataset.dragging = "true";
  };

  const onTitleBarPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const interaction = dragRef.current;
    const root = rootRef.current;
    if (!interaction || !root || interaction.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    root.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const endDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    commit: boolean
  ) => {
    const interaction = dragRef.current;
    const root = rootRef.current;
    if (!interaction || !root || interaction.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    delete root.dataset.dragging;
    root.style.transform = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!commit) return;
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    // 单击标题栏（含双击的第一下）不产生移动，也不必写 localStorage。
    if (dx === 0 && dy === 0) return;
    commitDrag({
      ...interaction,
      rect: {
        ...interaction.rect,
        x: interaction.rect.x + dx,
        y: interaction.rect.y + dy,
      },
    });
  };

  const onTitleBarDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    windows.toggleMaximize(id);
  };

  const onResizePointerDown = (
    event: ReactPointerEvent<HTMLSpanElement>
  ) => {
    if (event.button !== 0 || state.maximized) return;
    const root = rootRef.current;
    if (!root) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: state.rect,
    };
    root.classList.remove("is-open");
    root.dataset.resizing = "true";
  };

  const onResizePointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const interaction = resizeRef.current;
    const root = rootRef.current;
    if (!interaction || !root || interaction.pointerId !== event.pointerId) {
      return;
    }
    const width = Math.min(
      Math.max(
        interaction.rect.w + event.clientX - interaction.startX,
        minWidth
      ),
      windows.bounds.width
    );
    const height = Math.min(
      Math.max(
        interaction.rect.h + event.clientY - interaction.startY,
        minHeight
      ),
      windows.bounds.height
    );
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;
  };

  const endResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    commit: boolean
  ) => {
    const interaction = resizeRef.current;
    const root = rootRef.current;
    if (!interaction || !root || interaction.pointerId !== event.pointerId) {
      return;
    }
    resizeRef.current = null;
    delete root.dataset.resizing;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!commit) {
      root.style.width = `${state.rect.w}px`;
      root.style.height = `${state.rect.h}px`;
      return;
    }
    const rect = clampRect(
      {
        x: interaction.rect.x,
        y: interaction.rect.y,
        w: interaction.rect.w + event.clientX - interaction.startX,
        h: interaction.rect.h + event.clientY - interaction.startY,
      },
      windows.bounds,
      minWidth,
      minHeight
    );
    // 先写回最终值，避免 React 认为 width/height 没变而跳过 DOM 更新。
    root.style.width = `${rect.w}px`;
    root.style.height = `${rect.h}px`;
    windows.resize(id, rect);
  };

  const pathLabel = `~${app.path ?? `/${app.id}`}`;
  const style: CSSProperties = state.maximized
    ? { zIndex: state.z }
    : {
        left: state.rect.x,
        top: state.rect.y,
        width: state.rect.w,
        height: state.rect.h,
        minWidth,
        minHeight,
        zIndex: state.z,
      };

  return (
    <div
      ref={rootRef}
      className="os-window is-open"
      style={style}
      role="dialog"
      aria-labelledby={titleId}
      data-focused={focused ? "true" : "false"}
      data-maximized={state.maximized ? "true" : "false"}
      data-minimized={state.minimized ? "true" : "false"}
      onPointerDown={() => windows.focus(id)}
    >
      <div
        className="os-window-titlebar"
        onPointerDown={onTitleBarPointerDown}
        onPointerMove={onTitleBarPointerMove}
        onPointerUp={(event) => endDrag(event, true)}
        onPointerCancel={(event) => endDrag(event, false)}
        onDoubleClick={onTitleBarDoubleClick}
      >
        <AppIcon name={app.icon} className="os-window-icon" />
        <span id={titleId} className="os-window-title">
          {app.title}
        </span>
        <span className="os-window-path">{pathLabel}</span>
        <div className="os-window-controls">
          {app.path && (
            <Link
              href={app.path}
              target="_blank"
              rel="noreferrer"
              className="os-window-control"
              aria-label="在新页面打开"
            >
              ↗
            </Link>
          )}
          <button
            type="button"
            className="os-window-control"
            aria-label="最小化"
            onClick={() => windows.minimize(id)}
          >
            —
          </button>
          <button
            type="button"
            className="os-window-control"
            aria-label={state.maximized ? "还原窗口" : "最大化"}
            aria-pressed={state.maximized}
            onClick={() => windows.toggleMaximize(id)}
          >
            □
          </button>
          <button
            type="button"
            className="os-window-control is-close"
            aria-label="关闭"
            onClick={() => windows.close(id)}
          >
            ×
          </button>
        </div>
      </div>
      <div className="os-window-body">{children}</div>
      <span
        className="os-window-resize"
        aria-hidden="true"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={(event) => endResize(event, true)}
        onPointerCancel={(event) => endResize(event, false)}
      />
    </div>
  );
}
