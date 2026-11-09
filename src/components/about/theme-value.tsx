"use client";

import {
  useDesktopSettings,
  type DesktopPreset,
} from "@/components/desktop/use-desktop-settings";

const PRESET_LABELS: Record<DesktopPreset, string> = {
  night: "夜班",
  paper: "稿纸",
  blueprint: "蓝图",
};

/**
 * 档案里的 Theme 读数。
 *
 * 预设存在 localStorage，服务端读不到；`useSyncExternalStore` 的
 * server snapshot 固定返回默认值 night，所以 SSR / 禁 JS 时显示「夜班」，
 * 水合后再更新为客户端已选的预设。旁边的「客户端可切换」是必要的标注：
 * 这一行不是服务端观测值，别让读者误以为它描述的是全站主题。
 */
export function ThemeValue() {
  const { preset } = useDesktopSettings();

  return (
    <>
      {PRESET_LABELS[preset]}{" "}
      <span className="os-about-hint">客户端可切换</span>
    </>
  );
}
