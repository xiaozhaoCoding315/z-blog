"use client";

import { useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site";

/** 客户端独有值（SSR 用 fallback），避免 setState-in-effect */
function useClientOnly<T>(getSnapshot: () => T, getServerSnapshot: () => T): T {
  const subscribe = () => () => {};
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 运行天数：客户端计算，避免构建时固化 */
export function UpTimeDays({ className }: { className?: string }) {
  const start = new Date(siteConfig.startedAt).getTime();
  const days = useClientOnly(
    () =>
      Number.isNaN(start)
        ? "—"
        : String(Math.max(1, Math.ceil((Date.now() - start) / 86400000))),
    () => "—"
  );
  return <span className={className}>{days}</span>;
}

export function CurrentYear() {
  const year = useClientOnly(
    () => String(new Date().getFullYear()),
    () => siteConfig.startedAt.slice(0, 4)
  );
  return <>{year}</>;
}
