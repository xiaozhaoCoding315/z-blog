import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { listInterviewQuestions } from "@/lib/interview-core";
import { InterviewBrowser } from "@/components/interview/interview-browser";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "面试题库",
  description:
    "Java 后端 + Agent 方向大型面试题库：八股文与场景设计题，分类刷题、掌握度追踪、AI 面试官追问。",
};

export default function InterviewPage() {
  const items = listInterviewQuestions().map((q) => ({
    slug: q.slug,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    tags: q.tags,
  }));
  const categories = new Set(items.map((i) => i.category)).size;

  // 每日一题：按"当年第几天"轮换，全站同一天看到同一题
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const today = items[dayOfYear % items.length];
  const todayStr = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              面试题库
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              八股文 · 场景设计 · 深挖追问 —— 先想再看答案，让 AI 面试官拷打你的每一个回答
            </p>
          </div>
          <dl className="flex gap-6">
            <div className="text-center">
              <dd className="text-gradient font-heading text-3xl font-extrabold">
                {items.length}
              </dd>
              <dt className="mt-0.5 text-[11px] text-muted-foreground">道题</dt>
            </div>
            <div className="text-center">
              <dd className="text-gradient font-heading text-3xl font-extrabold">
                {categories}
              </dd>
              <dt className="mt-0.5 text-[11px] text-muted-foreground">个分类</dt>
            </div>
            <div className="text-center">
              <dd className="text-gradient font-heading text-3xl font-extrabold">
                ∞
              </dd>
              <dt className="mt-0.5 text-[11px] text-muted-foreground">次追问</dt>
            </div>
          </dl>
        </div>
      </header>

      {/* 每日一题 */}
      {today && (
        <Reveal>
          <Link
            href={`/interview/${today.slug}`}
            className="group relative mb-10 block overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card/60 to-transparent p-6 transition-colors hover:border-primary/50"
          >
            <div className="glow-orb -right-10 -top-10 size-40" style={{ background: "var(--glow-1)" }} />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="size-3.5" />
                  每日一题 · {todayStr}
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
        </Reveal>
      )}

      <Reveal>
        <InterviewBrowser items={items} />
      </Reveal>
    </div>
  );
}
