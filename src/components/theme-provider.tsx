"use client";

import { useLayoutEffect, type ReactNode } from "react";
import {
  applyDesktopSettings,
  getDesktopSettings,
  useDesktopSettings,
} from "@/components/desktop/use-desktop-settings";

/**
 * 首屏恢复是 root layout 里的内联脚本干的。
 * 这里只负责两件事：
 * 1. 客户端状态变化时重新套用（切换预设）；
 * 2. 开发环境 StrictMode 清掉 html 属性后，用真实存储值再套一次。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useDesktopSettings();

  useLayoutEffect(() => {
    applyDesktopSettings(getDesktopSettings());
  }, [settings.preset, settings.objects]);

  return <>{children}</>;
}
