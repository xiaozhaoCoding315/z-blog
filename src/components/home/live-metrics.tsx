"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, Layers, MessageSquare } from "lucide-react";
import { CountUp } from "@/components/home/count-up";

interface LiveStats {
  db: boolean;
  posts: number;
  chunks: number;
  totalViews: number;
  totalLikes: number;
}

/**
 * 首页实时指标条：数据来自 /api/stats。
 * 拉取失败或数据库未就绪时整块隐藏——宁可少一块，也不要展示一排 0。
 */
export function LiveMetrics() {
  const [data, setData] = useState<LiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.db) return;
        setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const items = [
    { label: "文章", value: data.posts, icon: Layers },
    { label: "累计阅读", value: data.totalViews, icon: Eye },
    { label: "点赞", value: data.totalLikes, icon: Heart },
    { label: "向量分块", value: data.chunks, icon: MessageSquare },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <div className="mt-12 w-full max-w-2xl">
      <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
        live metrics
      </p>
      <dl className="flex flex-wrap items-stretch justify-center divide-x divide-border/50 overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 basis-28 flex-col items-center gap-1 px-4 py-3.5"
          >
            <dd className="flex items-baseline gap-1 font-mono text-xl font-semibold tabular-nums tracking-tight">
              <CountUp to={item.value} />
            </dd>
            <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <item.icon className="size-3 opacity-60" />
              {item.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
