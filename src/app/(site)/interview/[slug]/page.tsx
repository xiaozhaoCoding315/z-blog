import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getInterviewQuestion,
  listInterviewQuestions,
} from "@/lib/interview-core";
import { RenderMDX } from "@/lib/mdx";
import { AnswerCard, FollowUpPanel, MasteryBar } from "@/components/interview/interview-detail";

export function generateStaticParams() {
  return listInterviewQuestions().map((q) => ({ slug: q.slug }));
}

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const question = getInterviewQuestion(slug);
  if (!question) return {};
  return {
    title: question.question,
    description: `${question.category} · ${question.difficulty} · ${question.tags.join("/")}`,
  };
}

export default async function InterviewQuestionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const question = getInterviewQuestion(slug);
  if (!question) notFound();

  const siblings = listInterviewQuestions();
  const index = siblings.findIndex((q) => q.slug === slug);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/interview"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" /> 返回题库
      </Link>

      {/* 题干 */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded border border-border/70 px-1.5 py-px">
            {question.category}
          </span>
          <span>{question.difficulty}</span>
          {question.companies.length > 0 && (
            <span className="text-muted-foreground/70">
              · {question.companies.join(" / ")} 常考
            </span>
          )}
        </div>
        <h1 className="mt-3 font-heading text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">
          {question.question}
        </h1>
      </div>

      <AnswerCard>
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
          <RenderMDX source={question.answer} />
        </div>
      </AnswerCard>

      <MasteryBar slug={slug} />
      <FollowUpPanel slug={slug} />

      {/* 上一题/下一题 */}
      <nav className="mt-14 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/interview/${prev.slug}`}
            className="glass card-hover group rounded-lg p-4"
          >
            <span className="text-xs text-muted-foreground">上一题</span>
            <p className="mt-1 line-clamp-2 text-sm font-medium group-hover:text-primary">
              {prev.question}
            </p>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/interview/${next.slug}`}
            className="glass card-hover group rounded-lg p-4 sm:text-right"
          >
            <span className="text-xs text-muted-foreground">下一题</span>
            <p className="mt-1 line-clamp-2 text-sm font-medium group-hover:text-primary">
              {next.question}
            </p>
          </Link>
        )}
      </nav>
    </div>
  );
}
