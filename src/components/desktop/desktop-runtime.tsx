"use client";

import { createContext, useContext } from "react";
import type { useWindowManager } from "./use-window-manager";
import type { useDesktopSettings } from "./use-desktop-settings";

type WindowManager = ReturnType<typeof useWindowManager>;
type Settings = ReturnType<typeof useDesktopSettings>;

/**
 * 桌面运行时：窗口状态 + 预设设置 + 全局入口。
 *
 * 直接在 DesktopShell 里用 `DesktopRuntimeContext.Provider` 提供，
 * 不再包一层带函数字段的自定义 Provider；Window / Taskbar / Launcher
 * 都从这里取动作，避免把回调函数作为 props 跨客户端边界传递。
 */
export interface DesktopRuntime {
  windows: WindowManager;
  settings: Settings;
  openSpotlight: () => void;
  openSettings: () => void;
  openTerminal: () => void;
  openAssistant: () => void;
}

export const DesktopRuntimeContext = createContext<DesktopRuntime | null>(null);

export function useDesktopRuntime() {
  const runtime = useContext(DesktopRuntimeContext);
  if (!runtime) {
    throw new Error("useDesktopRuntime must be used inside DesktopShell");
  }
  return runtime;
}
