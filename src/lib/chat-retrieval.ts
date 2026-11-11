import type { UIMessage } from "ai";

export interface RetrievedChunk {
  [key: string]: unknown;
  post_slug: string;
  title: string;
  heading: string | null;
  content: string;
  similarity: number;
}

/** 指代类开头：这类追问单独拿去向量化会失去指代对象。 */
const CONTINUATION_START =
  /^(那|这|它|他|她|还有|以及|继续|再|那么|所以|然后|呢|为什么|怎么)/;

function textOf(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

/**
 * 多轮问答的检索 query。
 *
 * 短问题或指代式追问会带上上一轮问题与最近一条回答要点，
 * 让「那部署呢」这类问题仍能命中前一轮对应的站内资料。
 */
export function buildRetrievalQuery(messages: UIMessage[]): string {
  const userTexts = messages
    .filter((message) => message.role === "user")
    .map(textOf)
    .filter(Boolean);
  const question = userTexts.at(-1) ?? "";
  if (!question) return "";

  const previous = userTexts.at(-2);
  const needsContext =
    question.length <= 15 || CONTINUATION_START.test(question.trim());
  if (!needsContext || !previous) return question;

  const lastIndex = messages.length - 1;
  let answer = "";
  for (let index = lastIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") continue;
    answer = textOf(message).replace(/\[\d+\]/g, "").slice(0, 240);
    break;
  }

  return [
    previous,
    answer ? `已回答要点：${answer}` : null,
    `当前问题：${question}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 一篇文章可能命中多个小节。引用来源按文章归并，避免来源列表里出现
 * 标题完全相同的两行；上下文与来源使用同一份归并结果，[n] 编号仍然对齐。
 */
export function mergeChunksByPost(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const merged: RetrievedChunk[] = [];
  const indexBySlug = new Map<string, number>();

  for (const chunk of chunks) {
    const index = indexBySlug.get(chunk.post_slug);
    if (index === undefined) {
      indexBySlug.set(chunk.post_slug, merged.length);
      merged.push({ ...chunk });
      continue;
    }

    const target = merged[index];
    const heading = target.heading ?? chunk.heading;
    const content =
      heading && chunk.heading === heading
        ? stripHeadingLine(chunk.content, heading)
        : chunk.content;

    target.heading = heading;
    target.content = `${target.content}\n\n${content}`.trim();
    target.similarity = Math.max(target.similarity, chunk.similarity);
  }

  return merged;
}

/** 归并同标题小节时去掉重复的 `## 标题` 行，正文只保留一份。 */
function stripHeadingLine(content: string, heading: string): string {
  const prefix = `## ${heading}`;
  if (!content.startsWith(prefix)) return content;
  return content.slice(prefix.length).replace(/^\s*\n/, "").trim();
}
