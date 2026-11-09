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
 * 当前打开的模态层，后打开的在栈顶。
 *
 * 多层同时打开时（Spotlight 盖住系统菜单、灯箱盖住页面）只有栈顶的
 * 焦点限制生效：否则先注册的底层会先吃掉 Esc，或者把焦点抢回自己里面。
 */
const activeTraps: HTMLElement[] = [];

function isTopTrap(container: HTMLElement) {
  return activeTraps[activeTraps.length - 1] === container;
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

    activeTraps.push(container);

    const focusFirst = () => {
      // 子组件已经把焦点送进面板（终端输入框 / 助理输入框）时不要抢：
      // 动态 chunk 命中缓存后，子 effect 会先于父 effect 执行。
      const active = document.activeElement;
      if (active instanceof Node && active !== container && container.contains(active)) {
        return;
      }
      const items = focusableIn(container);
      (items[0] ?? container).focus();
    };
    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopTrap(container)) return;

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
      // 容器自身（tabIndex=-1）被聚焦时也当成首项：Tab 去第一项，
      // Shift+Tab 去最后一项，否则浏览器默认行为会先跑出面板再被 focusin 拉回。
      const onContainer = current === container;

      if (event.shiftKey) {
        if (onContainer || !inside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (onContainer || !inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // 焦点被 Tab 以外的路径（地址栏、浏览器 UI、其他浮层）带走时拉回来。
    // 只有栈顶的模态层负责收拢焦点，避免多层同时打开时互相抢。
    const onFocusIn = (event: FocusEvent) => {
      if (!isTopTrap(container)) return;
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
      const index = activeTraps.lastIndexOf(container);
      // 只有被移除的是栈顶模态层时才归还焦点：下层在更上层还开着时
      // 卸载，不该把焦点从上层抢走。
      const wasTop = index !== -1 && index === activeTraps.length - 1;
      if (index !== -1) activeTraps.splice(index, 1);
      if (wasTop && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [active, ref]);
}
