import type { Metadata } from "next";
import { listInterviewQuestions } from "@/lib/interview-core";
import { InterviewBrowser } from "@/components/interview/interview-browser";
import { DailyQuestion } from "@/components/interview/daily-question";
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

      <Reveal>
        <DailyQuestion items={items} />
      </Reveal>

      <Reveal>
        <InterviewBrowser items={items} />
      </Reveal>
    </div>
  );
}
