"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDesktopRuntime } from "@/components/desktop/desktop-runtime";
import { useAssistantChat } from "@/components/assistant/assistant-provider";
import { ChatComposer, ChatThread } from "@/components/assistant/chat-thread";
import type { ChatSource } from "@/components/assistant/assistant-shared";

/** 小元同学的 3 个真实建议问题；不做示例占位。 */
const SUGGESTIONS = [
  "你最近在做什么项目？",
  "推荐几条关于前端的日志",
  "解释一下 RAG",
];

/**
 * 桌面窗口里的小元同学。
 *
 * 线程与输入框来自共享内核（chat-thread），这里只负责窗口自身的事：
 * 关闭走 `runtime.windows.close("assistant")`，以及终端 `ask` 的一次性投递。
 * `initialQuestion` 来自终端 `ask`：外壳暂存问题，这里发送一次后广播
 * `z-os:ask-consumed`，外壳随即清空暂存。
 */
export function AssistantWindow({
  aiEnabled,
  initialQuestion,
}: {
  aiEnabled: boolean;
  initialQuestion: string | null;
}) {
  const router = useRouter();
  const { windows } = useDesktopRuntime();
  const { messages, send, status, busy, error, stop, clear } = useAssistantChat();
  const [input, setInput] = useState("");
  const questionSeenRef = useRef(false);

  // 终端 `ask` 带来的问题只发送一次。用「见过非空问题」标记挡住 StrictMode
  // 的双重 effect；外壳清空暂存（prop 回到 null）后复位，重复提问仍能生效。
  //
  // 发送延后到下一个宏任务：StrictMode 会在挂载后立刻模拟卸载，useChat 的
  // cleanup 调用 chat.stop()；若在 effect 里同步 sendMessage，请求会在用户
  // 消息尚未写入 chat state 前被 abort（表现为 ask 打开窗口但什么都没发）。
  useEffect(() => {
    if (initialQuestion === null) {
      questionSeenRef.current = false;
      return;
    }
    const question = initialQuestion.trim();
    if (!question || questionSeenRef.current) return;
    questionSeenRef.current = true;
    window.setTimeout(() => {
      if (aiEnabled) send(question);
      window.dispatchEvent(new Event("z-os:ask-consumed"));
    }, 0);
  }, [aiEnabled, initialQuestion, send]);

  const openSource = (source: ChatSource) => {
    windows.close("assistant");
    const href = source.href?.trim();
    router.push(href || `/notes/${source.slug}`);
  };

  const submit = (text: string) => {
    if (!aiEnabled) return;
    if (send(text)) setInput("");
  };

  if (!aiEnabled) {
    return (
      <div className="os-assistant">
        <p className="os-assistant-offline">AI 未配置：在 .env 填 AI_API_KEY</p>
      </div>
    );
  }

  return (
    <div className="os-assistant">
      <ChatThread
        messages={messages}
        status={status}
        error={error}
        onOpenSource={openSource}
        empty={
          <div className="xy-chat-suggestions">
            <p>问问小元同学：</p>
            {SUGGESTIONS.map((question) => (
              <button key={question} type="button" onClick={() => submit(question)}>
                {question}
              </button>
            ))}
          </div>
        }
      />
      <ChatComposer
        value={input}
        onChange={setInput}
        onSubmit={() => submit(input)}
        onStop={stop}
        busy={busy}
        autoFocus
        hint={
          messages.length > 0 ? (
            <button type="button" onClick={clear}>
              清空对话
            </button>
          ) : (
            "Enter 发送 · Shift+Enter 换行"
          )
        }
      />
    </div>
  );
}
