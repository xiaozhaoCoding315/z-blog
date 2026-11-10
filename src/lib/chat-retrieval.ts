import type { UIMessage } from "ai";

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
