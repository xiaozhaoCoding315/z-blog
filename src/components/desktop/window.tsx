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
  /** 标题栏文案；不传时用 app.title（终端用 `zsh — guest@z-os`） */
  title?: string;
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
 * 打开窗口前的焦点。
 *
 * 必须在首次渲染时读取：终端输入框等内容在子组件 effect 里 autofocus，
 * 父组件的 effect 等到那时再读，拿到的已经是窗口内部元素，关闭窗口后
 * 它随窗口卸载，焦点就只能走兜底。body/documentElement 不算触发元素。
 */
function openerFocus(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (active === document.body || active === document.documentElement) {
    return null;
  }
  return active;
}

/**
 * 关闭窗口时能否把焦点还给打开者。
 *
 * 终端/助理最小化后仍挂载，只是 `visibility: hidden`——这种元素
 * isConnected 为 true、getClientRects 也仍有布局盒，但 focus() 不生效。
 * 用 checkVisibility() 同时排除 display:none 与 visibility:hidden；
 * 老浏览器没有该方法时退回布局盒检查。
 */
function canRestoreFocus(node: HTMLElement | null): node is HTMLElement {
  if (!node?.isConnected) return false;
  if (typeof node.checkVisibility === "function") {
    // visibilityProperty 默认不检查（默认只看 display/content-visibility）；
    // 最小化窗口正是靠 visibility:hidden 隐藏的，显式打开这一项。
    return node.checkVisibility({ visibilityProperty: true });
  }
  return node.getClientRects().length > 0;
}

/**
 * ≤767px 的终端/助理窗口是铺满视口的覆盖层：不拖拽、不缩放、不最大化。
 * 与 desktop-home / use-window-manager 的断点保持一致。
 */
function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

/**
 * 桌面窗口框。
 *
 * 状态和动作全部从 `useDesktopRuntime()` 读取：本组件不接收任何函数 props，
 * 因此可以安全地由服务端组件渲染 children 后交给客户端窗口层。
 * 拖拽/缩放期间只写 transform / width / height（不入 React state），
 * 松手后再 clamp 并提交一次 reducer action。
 */
export function Window({ id, app, title, children }: WindowProps) {
  const { windows } = useDesktopRuntime();
  const state = windows.store.windows[id];
  // 最小化窗口的 z 可能仍等于 zCounter（焦点已回落到可见窗口），
  // 但它不再是聚焦窗口，避免同时出现两个 data-focused="true"。
  const focused = !!state && !state.minimized && state.z === windows.store.zCounter;
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const titlebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<PointerInteraction | null>(null);
  const resizeRef = useRef<PointerInteraction | null>(null);
  const wasMinimizedRef = useRef(state?.minimized ?? false);
  // useRef 只用首次渲染的值；之后的重渲染不会覆盖打开者。
  const previousFocusRef = useRef<HTMLElement | null>(openerFocus());

  const minWidth = app.window?.minWidth ?? 0;
  const minHeight = app.window?.minHeight ?? 0;
  // §5.4：终端/助理是模态 dialog，其余桌面窗口是 region。
  const isDialog = app.id === "terminal" || app.id === "assistant";

  // 窗口打开时把焦点送进标题栏（tabIndex=-1），关闭时归还给打开它的元素。
  // 只在挂载/卸载时执行：windows.focus(id) 和窗口内的 pointerdown 都不能
  // 抢走输入框焦点，否则在终端里打字时任何一个操作都会把焦点拉回标题栏。
  useEffect(() => {
    const previous = previousFocusRef.current;
    titlebarRef.current?.focus({ preventScroll: true });

    return () => {
      // 终端/助理最小化时仍挂载但不可见；不可见的节点不能归还焦点。
      if (canRestoreFocus(previous)) {
        previous.focus({ preventScroll: true });
        return;
      }
      // 从任务栏打开的窗口项会随窗口关闭一起消失；退回到任务栏入口或桌面图标。
      const fallback =
        document.querySelector<HTMLElement>(".os-taskbar-menu-button") ??
        document.querySelector<HTMLElement>(".os-launcher-button") ??
        document.querySelector<HTMLElement>(".os-icon-grid .os-icon");
      fallback?.focus({ preventScroll: true });
    };
  }, []);

  // 最小化后从任务栏恢复：窗口没有重新挂载，这里补一次标题栏聚焦。
  // 其它 windows.focus(id)（点窗口内部、点任务栏切换）不会触发。
  useEffect(() => {
    const minimized = !!state?.minimized;
    if (wasMinimizedRef.current && !minimized) {
      titlebarRef.current?.focus({ preventScroll: true });
    }
    wasMinimizedRef.current = minimized;
  }, [state?.minimized]);

  // Esc 关闭聚焦窗口；面板/模态打开时把 Esc 留给它们。
  // 需要自己处理 Esc 的输入表面（如终端输入框）在本地 stopPropagation。
  useEffect(() => {
    if (!focused || state?.minimized) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        document.querySelector(
          ".os-launcher, .os-system-menu, [aria-modal='true']:not(.os-window)"
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
    if (event.button !== 0 || state.maximized || isMobileViewport()) return;
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
    if (isMobileViewport()) return;
    windows.toggleMaximize(id);
  };

  const onResizePointerDown = (
    event: ReactPointerEvent<HTMLSpanElement>
  ) => {
    if (event.button !== 0 || state.maximized || isMobileViewport()) return;
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
      role={isDialog ? "dialog" : "region"}
      aria-modal={isDialog ? true : undefined}
      aria-labelledby={titleId}
      data-focused={focused ? "true" : "false"}
      data-maximized={state.maximized ? "true" : "false"}
      data-minimized={state.minimized ? "true" : "false"}
      onPointerDown={() => windows.focus(id)}
    >
      <div
        ref={titlebarRef}
        className="os-window-titlebar"
        tabIndex={-1}
        onPointerDown={onTitleBarPointerDown}
        onPointerMove={onTitleBarPointerMove}
        onPointerUp={(event) => endDrag(event, true)}
        onPointerCancel={(event) => endDrag(event, false)}
        onDoubleClick={onTitleBarDoubleClick}
      >
        <AppIcon name={app.icon} className="os-window-icon" />
        <span id={titleId} className="os-window-title">
          {title ?? app.title}
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
