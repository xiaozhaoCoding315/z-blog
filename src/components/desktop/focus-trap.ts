"use client";

import { useEffect, useRef, type RefObject } from "react";

/** 可见、可聚焦且有原生语义的元素；隐藏节点由 getClientRects 过滤掉。 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableIn(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.getClientRects().length > 0
  );
}

/**
 * 模态面板的焦点限制。
 *
 * active 时记录打开前的焦点，把焦点送进面板第一项；focusin 跑出面板就拉回，
 * Tab / Shift+Tab 在首尾循环，Esc 关闭并把焦点还给触发元素。
 *
 * keydown 用捕获阶段：Esc 在到达 window 上的窗口/任务栏监听器之前就被消费，
 * 避免关菜单时顺带关掉底下的窗口（仅 stopPropagation 拦不住同一目标上的监听器）。
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void
) {
  // 最新回调放进 ref，避免父组件每次渲染换函数时重跑整个焦点限制。
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusFirst = () => {
      const items = focusableIn(container);
      (items[0] ?? container).focus();
    };
    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusableIn(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && container.contains(current);

      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // 焦点被 Tab 以外的路径（地址栏、浏览器 UI、其他浮层）带走时拉回来。
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && container.contains(event.target)) {
        return;
      }
      focusFirst();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active, ref]);
}
