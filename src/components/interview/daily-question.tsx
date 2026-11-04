"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { InterviewItem } from "@/components/interview/interview-browser";

const emptySubscribe = () => () => {};

/**
 * 每日一题：按「当年第几天」轮换。
 *
 * 日期在客户端计算（SSR 渲染 null），但用 useSyncExternalStore 而不是
 * setState-in-effect —— 后者会在挂载后立刻触发一次额外渲染。
 */
export function DailyQuestion({ items }: { items: InterviewItem[] }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted || items.length === 0) return null;

  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const today = items[dayOfYear % items.length];
  if (!today) return null;
  const dateStr = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      href={`/interview/${today.slug}`}
      className="group mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-y border-border py-4 transition-colors hover:border-primary/60"
    >
      <div className="min-w-0">
        <p className="mb-1 font-mono text-[11px] text-primary">
          每日一题 · {dateStr}
        </p>
        <p className="font-heading text-[17px] font-semibold leading-snug transition-colors group-hover:text-primary">
          {today.question}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground">
          <span>{today.category}</span>
          <span>{today.difficulty}</span>
          <span className="opacity-70">点开先自己答一遍</span>
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-primary/60 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
