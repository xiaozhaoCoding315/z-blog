"use client";

import { useSyncExternalStore } from "react";
import { formatDays } from "@/lib/uptime";
import { siteConfig } from "@/config/site";

const emptySubscribe = () => () => {};

/** 客户端独有值（SSR 用 fallback），避免 setState-in-effect */
function useClientOnly<T>(getSnapshot: () => T, getServerSnapshot: () => T): T {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

/**
 * 运行天数（客户端）。
 * 服务端已经能给出正确值时，优先用那个（见 lib/uptime-server.ts）；
 * 这个组件用于必须在浏览器里跟随本地时间的场景（终端命令、页脚）。
 */
export function UpTimeDays({ className }: { className?: string }) {
  const days = useClientOnly(
    () => formatDays(siteConfig.startedAt),
    () => "—"
  );
  return <span className={className}>{days}</span>;
}

export function CurrentYear({ year }: { year?: string }) {
  const current = useClientOnly(
    () => String(new Date().getFullYear()),
    () => year ?? siteConfig.startedAt.slice(0, 4)
  );
  return <>{current}</>;
}
