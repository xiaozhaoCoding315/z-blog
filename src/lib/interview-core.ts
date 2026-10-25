/**
 * 面试题库内容层：content/interview/*.mdx
 * 一题一文件：frontmatter 声明题干/分类/难度，正文为参考答案（MDX）。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const INTERVIEW_DIR = path.join(process.cwd(), "content", "interview");

const metaSchema = z.object({
  question: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.enum(["易", "中", "难"]).default("中"),
  tags: z.array(z.string()).default([]),
  /** 常考公司（可选） */
  companies: z.array(z.string()).default([]),
});

export interface InterviewQuestion {
  slug: string;
  question: string;
  category: string;
  difficulty: "易" | "中" | "难";
  tags: string[];
  companies: string[];
  /** 参考答案（MDX 源码） */
  answer: string;
}

export function listInterviewQuestions(): InterviewQuestion[] {
  if (!fs.existsSync(INTERVIEW_DIR)) return [];
  const byCategory = new Map<string, InterviewQuestion[]>();

  for (const file of fs.readdirSync(INTERVIEW_DIR)) {
    if (!file.endsWith(".mdx")) continue;
    const slug = path.basename(file, ".mdx");
    try {
      const { data, content } = matter(
        fs.readFileSync(path.join(INTERVIEW_DIR, file), "utf-8")
      );
      const parsed = metaSchema.safeParse(data);
      if (!parsed.success) {
        console.warn(
          `[interview] 题目 ${slug} frontmatter 不合法，已跳过：`,
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        );
        continue;
      }
      const q: InterviewQuestion = { slug, ...parsed.data, answer: content.trim() };
      const list = byCategory.get(q.category) ?? [];
      list.push(q);
      byCategory.set(q.category, list);
    } catch (err) {
      console.warn(`[interview] 题目 ${slug} 解析失败：`, err);
    }
  }

  // 分类内按固定顺序（文件名前缀数字），分类间按首次出现顺序
  return [...byCategory.values()].flat();
}

export function getInterviewQuestion(slug: string): InterviewQuestion | null {
  return listInterviewQuestions().find((q) => q.slug === slug) ?? null;
}

export function interviewCategories(): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const q of listInterviewQuestions()) {
    map.set(q.category, (map.get(q.category) ?? 0) + 1);
  }
  return [...map.entries()].map(([category, count]) => ({ category, count }));
}
