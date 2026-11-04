import type { Metadata } from "next";
import { listInterviewQuestions } from "@/lib/interview-core";
import { InterviewBrowser } from "@/components/interview/interview-browser";
import { DailyQuestion } from "@/components/interview/daily-question";
import { LoginNotice } from "@/components/interview/login-notice";
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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          面试题库
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          八股文 · 场景设计 · 深挖追问。先想再看答案。
        </p>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          {items.length} 道题 · {categories} 个分类
        </p>
      </header>

      <LoginNotice />

      <Reveal>
        <DailyQuestion items={items} />
      </Reveal>

      <Reveal>
        <InterviewBrowser items={items} />
      </Reveal>
    </div>
  );
}
