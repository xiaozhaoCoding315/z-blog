import type { Metadata } from "next";
import { listInterviewQuestions } from "@/lib/interview-core";
import { InterviewBrowser } from "@/components/interview/interview-browser";
import { Reveal } from "@/components/site/reveal";

export const metadata: Metadata = {
  title: "面试",
  description: "Java 后端 + Agent 方向面试题库：分类刷题、掌握度追踪与 AI 面试官追问。",
};

export default function InterviewPage() {
  const items = listInterviewQuestions().map((q) => ({
    slug: q.slug,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    tags: q.tags,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          面试题库
        </h1>
        <p className="mt-2 text-muted-foreground">
          Java 后端 · Agent / LLM 应用 · 共 {items.length} 题 —— 先想再看答案，让 AI 面试官帮你深挖
        </p>
      </header>

      <Reveal>
        <InterviewBrowser items={items} />
      </Reveal>
    </div>
  );
}
