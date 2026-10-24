"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * frontmatter 缺少 description 时的兜底：
 * 展示同步阶段由 AI 生成的摘要。
 */
export function SummaryFallback({ slug }: { slug: string }) {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/summary?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.summary) setSummary(d.summary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!summary) return null;
  return (
    <p className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        <span className="mr-1.5 font-medium text-primary">AI 摘要</span>
        {summary}
      </span>
    </p>
  );
}
