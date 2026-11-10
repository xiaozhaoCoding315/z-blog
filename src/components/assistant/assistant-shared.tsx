"use client";

import type { ReactNode } from "react";
import type { UIMessage } from "ai";

export interface ChatSource {
  id: number;
  slug: string;
  title: string;
  heading?: string | null;
  href?: string;
}

export function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("");
}

/**
 * 引用来源来自服务端随流下发的 `data-sources` 数据部件。
 * AI SDK v7 把它放在 message.parts 里；同时兼容旧版顶层的 message.data。
 */
export function messageSources(message: UIMessage): ChatSource[] {
  for (const part of message.parts) {
    if (part.type !== "data-sources") continue;
    if (Array.isArray(part.data)) return part.data as ChatSource[];
  }

  const legacy = (message as UIMessage & { data?: unknown }).data;
  if (!Array.isArray(legacy)) return [];
  const dataPart = legacy.find(
    (item) => (item as { type?: string })?.type === "data-sources"
  ) as { data?: unknown } | undefined;
  return Array.isArray(dataPart?.data) ? (dataPart.data as ChatSource[]) : [];
}

/** 把回答里的 `[1]` 片段变成可点击的引用按钮；无对应来源时按原文显示。 */
export function renderMessageText(
  text: string,
  sources: ChatSource[],
  onOpen: (source: ChatSource) => void
): ReactNode {
  return text.split(/(\[\d+\])/g).map((segment, index) => {
    const match = /^\[(\d+)\]$/.exec(segment);
    if (!match) return <span key={index}>{segment}</span>;
    const source = sources.find((item) => item.id === Number(match[1]));
    if (!source) return <span key={index}>{segment}</span>;
    return (
      <button
        key={index}
        type="button"
        className="os-assistant-ref"
        title={`引用：${source.title}`}
        onClick={() => onOpen(source)}
      >
        {segment}
      </button>
    );
  });
}
