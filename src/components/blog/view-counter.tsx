"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

/**
 * 文章页浏览量：同一浏览器对同一文章只计数一次（localStorage 去重）。
 */
export function ViewCounter({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const key = `viewed:${slug}`;
    let counted = false;
    try {
      counted = localStorage.getItem(key) === "1";
    } catch {
      /* 隐私模式下 localStorage 不可用 */
    }

    const url = `/api/views/${slug}`;
    const request = counted
      ? fetch(url).then((r) => (r.ok ? r.json() : null))
      : fetch(url, { method: "POST" }).then((r) => (r.ok ? r.json() : null));

    request
      .then((d) => {
        if (d && typeof d.count === "number") {
          setCount(d.count);
          if (!counted) {
            try {
              localStorage.setItem(key, "1");
            } catch {
              /* 忽略 */
            }
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  if (count === null) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Eye className="size-3.5" />
      {count} 次阅读
    </span>
  );
}
