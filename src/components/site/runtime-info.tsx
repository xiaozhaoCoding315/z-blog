"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

/** 运行天数：客户端计算，避免构建时固化 */
export function UpTimeDays({ className }: { className?: string }) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const start = new Date(siteConfig.startedAt).getTime();
    if (!Number.isNaN(start)) {
      setDays(Math.max(1, Math.ceil((Date.now() - start) / 86400000)));
    }
  }, []);

  return <span className={className}>{days ?? "—"}</span>;
}

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year ?? siteConfig.startedAt.slice(0, 4)}</>;
}
