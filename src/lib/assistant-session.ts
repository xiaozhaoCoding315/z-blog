import type { UIMessage } from "ai";

/**
 * 全站共用的对话快照。
 *
 * 只保留界面真正会渲染的两种部件（正文、站内来源），把 localStorage
 * 当成不可信输入重新校验：损坏的 JSON 直接丢，越权链接与超长历史也会被裁掉。
 * 这样萌宠面板、助手页和桌面窗口读到的永远是同一份可安全渲染的消息。
 */
export const ASSISTANT_SESSION_KEY = "z-os:xiaoyuan-chat:v1";
export const ASSISTANT_SESSION_LIMIT = 80;
const SOURCE_LIMIT = 12;

export interface StoredSource {
  id: number;
  slug: string;
  title: string;
  heading?: string | null;
  href?: string;
}

export type StoredPart =
  | { type: "text"; text: string }
  | { type: "data-sources"; data: StoredSource[] };

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  parts: StoredPart[];
}

export interface AssistantSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function storedSource(value: unknown): StoredSource | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  const slug = typeof value.slug === "string" ? value.slug : "";
  const title = typeof value.title === "string" ? value.title : "";
  const href = typeof value.href === "string" ? value.href : "";
  if (!slug && !title && !href) return null;

  const source: StoredSource = {
    id,
    slug,
    title: title || slug || href,
  };
  if (typeof value.heading === "string" && value.heading) {
    source.heading = value.heading;
  } else if (value.heading === null) {
    source.heading = null;
  }
  // 只接受站内绝对路径；`javascript:` 与协议相对地址一律丢弃。
  if (href.startsWith("/") && !href.startsWith("//")) source.href = href;
  return source;
}

function storedPart(value: unknown): StoredPart | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "text") {
    return typeof value.text === "string" ? { type: "text", text: value.text } : null;
  }
  if (value.type === "data-sources") {
    if (!Array.isArray(value.data)) return null;
    const data = value.data
      .map(storedSource)
      .filter((item): item is StoredSource => item !== null)
      .slice(0, SOURCE_LIMIT);
    return data.length > 0 ? { type: "data-sources", data } : null;
  }
  return null;
}

function storedMessage(value: unknown): StoredMessage | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const role = value.role;
  if (typeof id !== "string" || !id) return null;
  if (role !== "user" && role !== "assistant") return null;
  if (!Array.isArray(value.parts)) return null;

  const parts = value.parts
    .map(storedPart)
    .filter((part): part is StoredPart => part !== null);
  return parts.length > 0 ? { id, role, parts } : null;
}

export function normalizeAssistantMessages(messages: UIMessage[]): StoredMessage[] {
  const seen = new Set<string>();
  const normalized: StoredMessage[] = [];
  for (const message of messages) {
    const stored = storedMessage(message);
    if (!stored || seen.has(stored.id)) continue;
    seen.add(stored.id);
    normalized.push(stored);
  }
  return normalized.slice(-ASSISTANT_SESSION_LIMIT);
}

export function parseAssistantSession(raw: string | null): UIMessage[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeAssistantMessages(parsed as UIMessage[]) as UIMessage[];
  } catch {
    return [];
  }
}

export function serializeAssistantSession(messages: UIMessage[]): string {
  return JSON.stringify(normalizeAssistantMessages(messages));
}

export function readAssistantSession(
  storage: AssistantSessionStorage
): UIMessage[] {
  try {
    return parseAssistantSession(storage.getItem(ASSISTANT_SESSION_KEY));
  } catch {
    return [];
  }
}

/** 写入失败（隐私模式/配额满）时退到最近 12 条，仍失败就静默放弃。 */
export function writeAssistantSession(
  storage: AssistantSessionStorage,
  messages: UIMessage[]
): boolean {
  try {
    storage.setItem(ASSISTANT_SESSION_KEY, serializeAssistantSession(messages));
    return true;
  } catch {
    try {
      storage.setItem(
        ASSISTANT_SESSION_KEY,
        serializeAssistantSession(messages.slice(-12))
      );
      return true;
    } catch {
      return false;
    }
  }
}