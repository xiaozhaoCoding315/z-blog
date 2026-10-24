"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

/**
 * 只读浏览量徽章（列表卡片用，不计数）。
 * 数据库不可用时静默降级为不显示。
 */
export function ViewBadge({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/views/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.count === "number") setCount(d.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (count === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Eye className="size-3.5" />
      {count}
    </span>
  );
}
