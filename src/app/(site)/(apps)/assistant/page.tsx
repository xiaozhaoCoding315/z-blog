import type { Metadata } from "next";
import { StandaloneAssistant } from "@/components/assistant/standalone-assistant";
import { getAllNotes } from "@/content";
import {
  aiEnabled,
  chatEnabled,
  chatModelId,
  embeddingEnabled,
} from "@/lib/ai";

export const metadata: Metadata = {
  title: "小元同学",
  description: "小元同学：基于站内笔记的流式问答，回答带真实来源。",
};

/** searchParams 在 Next 16 是 Promise；这一页仍保留真实请求期边界。 */
export const instant = false;

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = await searchParams;
  const raw = query.q;
  const initialQuestion =
    typeof raw === "string" ? raw.slice(0, 500) : Array.isArray(raw) ? "" : null;
  const notes = getAllNotes().slice(0, 3);
  const prompts = notes.map((note) => ({
    text: `《${note.meta.title}》里主要讲了什么？`,
    note: `来自真实笔记 · ${note.meta.date}`,
  }));

  return (
    <StandaloneAssistant
      chatEnabled={chatEnabled}
      retrievalEnabled={aiEnabled && embeddingEnabled}
      modelId={chatModelId}
      prompts={prompts}
      initialQuestion={initialQuestion}
    />
  );
}
