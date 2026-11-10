"use client";

import dynamic from "next/dynamic";
import type { AssistantPrompt } from "./assistant-page-view";

// AI SDK 只随完整助理页进入客户端 chunk，首页与其余应用不受影响。
const AssistantPageViewLazy = dynamic(
  () =>
    import("@/components/assistant/assistant-page-view").then(
      (mod) => mod.AssistantPageView
    ),
  { ssr: false }
);

export interface StandaloneAssistantProps {
  chatEnabled: boolean;
  retrievalEnabled: boolean;
  modelId: string;
  prompts: AssistantPrompt[];
  initialQuestion?: string | null;
}

export function StandaloneAssistant(props: StandaloneAssistantProps) {
  return (
    <>
      <AssistantPageViewLazy {...props} />
      <noscript>
        <p className="assistant-empty-code">NOT AVAILABLE</p>
        <p>AI 对话需要 JavaScript；关闭脚本时可以继续浏览笔记与项目。</p>
      </noscript>
    </>
  );
}
