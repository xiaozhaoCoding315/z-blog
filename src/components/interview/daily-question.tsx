"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import type { InterviewItem } from "@/components/interview/interview-browser";

/** 每日一题：按"当年第几天"轮换，浏览器端计算（SSR 不渲染，避免构建期时间固化） */
export function DailyQuestion({ items }: { items: InterviewItem[] }) {
  const [today, setToday] = useState<InterviewItem | null>(null);
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    );
    setToday(items[dayOfYear % items.length] ?? null);
    setDateStr(now.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }));
  }, [items]);

  if (!today) return null;

  return (
    <Link
      href={`/interview/${today.slug}`}
      className="group relative mb-10 block overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card/60 to-transparent p-6 transition-colors hover:border-primary/50"
    >
      <div
        className="glow-orb -right-10 -top-10 size-40"
        style={{ background: "var(--glow-1)" }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            每日一题 · {dateStr}
          </p>
          <p className="truncate text-lg font-semibold transition-colors group-hover:text-primary sm:text-xl">
            {today.question}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded border border-border/70 px-1.5 py-px">{today.category}</span>
            <span>{today.difficulty}</span>
            <span className="opacity-70">· 点开先自己答一遍，再看参考答案</span>
          </p>
        </div>
        <ChevronRight className="size-6 shrink-0 text-primary/60 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
