"use client";

import { createContext, useContext } from "react";

/**
 * 启动器和系统菜单通过它收起任务栏面板。
 * 由 Taskbar 在客户端提供，避免把回调函数当成跨边界的 props 传下去。
 */
export const TaskbarPanelsContext = createContext<(() => void) | null>(null);

export function useTaskbarPanels() {
  const close = useContext(TaskbarPanelsContext);
  if (!close) {
    throw new Error("useTaskbarPanels 必须在 Taskbar 内使用");
  }
  return close;
}
