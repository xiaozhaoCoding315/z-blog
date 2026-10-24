"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  Eye,
  FileText,
  Sparkles,
  VectorSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsData {
  db: boolean;
  posts: number;
  chunks: number;
  totalViews: number;
  chatEnabled: boolean;
  embeddingEnabled: boolean;
  aiEnabled: boolean;
  topPosts: { slug: string; title: string | null; count: number }[];
}

export function StatsBoard() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && d && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { label: "文章", value: data?.posts, icon: FileText },
    { label: "向量分块", value: data?.chunks, icon: VectorSquare },
    { label: "累计阅读", value: data?.totalViews, icon: Eye },
  ];

  return (
    <div className="space-y-10">
      {/* 概览卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass card-hover rounded-xl p-5">
            <card.icon className="mb-3 size-5 text-primary" />
            <p className="font-heading text-3xl font-extrabold tracking-tight">
              {card.value ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 热门文章 */}
        <div className="glass rounded-xl p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-semibold">
            <Activity className="size-4 text-primary" /> 热门文章 TOP 5
          </h2>
          {!data ? (
            <p className="py-8 text-center text-xs text-muted-foreground">加载中…</p>
          ) : data.topPosts.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              还没有阅读数据——去打开几篇文章吧
            </p>
          ) : (
            <ol className="space-y-3">
              {data.topPosts.map((post, i) => {
                const max = data.topPosts[0].count || 1;
                return (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group block text-sm"
                    >
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="truncate group-hover:text-primary">
                          <span className="mr-2 font-mono text-xs text-muted-foreground">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {post.title ?? post.slug}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {post.count} 次
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] transition-all"
                          style={{ width: `${Math.max(6, (post.count / max) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* 系统状态 */}
        <div className="glass rounded-xl p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-semibold">
            <Database className="size-4 text-primary" /> 系统状态
          </h2>
          <ul className="space-y-3 text-sm">
            {[
              {
                name: "数据库（PostgreSQL）",
                ok: data?.db,
                desc: "浏览量 / 文章向量",
              },
              {
                name: "AI 问答（GLM）",
                ok: data?.chatEnabled,
                desc: "右下角助手与自动摘要",
              },
              {
                name: "向量检索（百炼）",
                ok: data?.embeddingEnabled,
                desc: "⌘K 语义搜索 / 相关推荐",
              },
            ].map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                    item.ok
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                      : "border-border/70 text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      item.ok ? "animate-pulse bg-emerald-400" : "bg-muted-foreground/50"
                    )}
                  />
                  {item.ok === undefined ? "检测中" : item.ok ? "在线" : "未启用"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
            状态基于服务器环境变量与数据库连通性实时检测，「未启用」表示未配置对应服务，不影响博客浏览。
          </p>
        </div>
      </div>
    </div>
  );
}
