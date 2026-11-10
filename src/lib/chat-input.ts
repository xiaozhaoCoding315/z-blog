import type { UIMessage } from "ai";

/**
 * 公网聊天入口的输入闸门。
 *
 * 限频只能挡住请求次数，挡不住单个请求塞进几十万字；这里在进入向量化和
 * 模型调用之前就把消息数量、正文总量和问题长度收住，避免一次请求烧掉额度。
 */

export const MAX_CHAT_BODY_CHARS = 100_000;
export const MAX_CHAT_MESSAGES = 40;
export const MAX_CHAT_TEXT_CHARS = 24_000;
export const MAX_CHAT_QUESTION_CHARS = 4_000;
const MAX_PARTS_PER_MESSAGE = 50;

export type ChatPayloadResult =
  | { ok: true; messages: UIMessage[]; question: string }
  | { ok: false; status: 400 | 413; error: string };

export function parseChatPayload(raw: string): ChatPayloadResult {
  if (raw.length > MAX_CHAT_BODY_CHARS) {
    return { ok: false, status: 413, error: "这次请求太大了，请精简后再试" };
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: "请求格式不是合法 JSON" };
  }

  if (!isRecord(body) || !Array.isArray(body.messages)) {
    return { ok: false, status: 400, error: "缺少 messages 数组" };
  }
  if (body.messages.length === 0) {
    return { ok: false, status: 400, error: "请先写一个问题" };
  }
  if (body.messages.length > MAX_CHAT_MESSAGES) {
    return { ok: false, status: 400, error: "对话太长了，请开一轮新对话" };
  }

  let totalText = 0;
  for (const message of body.messages) {
    if (!isRecord(message)) {
      return { ok: false, status: 400, error: "消息格式不正确" };
    }
    if (
      message.role !== "user" &&
      message.role !== "assistant" &&
      message.role !== "system"
    ) {
      return { ok: false, status: 400, error: "消息角色不正确" };
    }
    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      return { ok: false, status: 400, error: "消息内容为空" };
    }
    if (message.parts.length > MAX_PARTS_PER_MESSAGE) {
      return { ok: false, status: 400, error: "单条消息的内容块太多" };
    }
    for (const part of message.parts) {
      if (!isRecord(part) || typeof part.type !== "string") {
        return { ok: false, status: 400, error: "消息内容块格式不正确" };
      }
      if (part.type !== "text") continue;
      if (typeof part.text !== "string") {
        return { ok: false, status: 400, error: "文本内容格式不正确" };
      }
      totalText += part.text.length;
      if (totalText > MAX_CHAT_TEXT_CHARS) {
        return { ok: false, status: 413, error: "对话正文太长了，请精简后再试" };
      }
    }
  }

  const messages = body.messages as UIMessage[];
  const question = getLastUserText(messages);
  if (!question) {
    return { ok: false, status: 400, error: "请先写一个问题" };
  }
  if (question.length > MAX_CHAT_QUESTION_CHARS) {
    return { ok: false, status: 413, error: "问题太长了，请精简后再试" };
  }

  return { ok: true, messages, question };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

export function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = messageText(message);
    if (text) return text;
  }
  return "";
}