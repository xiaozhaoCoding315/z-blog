"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useDesktopRuntime } from "@/components/desktop/desktop-runtime";

interface ChatSource {
  id: number;
  slug: string;
  title: string;
  href?: string;
}

/** 站内助理的 3 个真实建议问题；不做示例占位。 */
const SUGGESTIONS = [
  "你最近在做什么项目？",
  "推荐几条关于前端的日志",
  "解释一下 RAG",
];

function messageText(message: UIMessage): string {
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
function messageSources(message: UIMessage): ChatSource[] {
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

/** 把回答里的 `[1]` 片段变成可点击的琥珀链接；无对应来源时按原文显示。 */
function renderMessageText(
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

/**
 * 终端式助理窗口。
 *
 * 关闭通过 `runtime.windows.close("assistant")`（Window 自己也有标题栏按钮），
 * 不接收 onClose 函数 prop。`initialQuestion` 来自终端 `ask`：外壳暂存问题，
 * 这里发送一次后广播 `z-os:ask-consumed`，外壳随即清空暂存。
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
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    error,
    stop,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const questionSeenRef = useRef(false);

  const busy = status === "submitted" || status === "streaming";

  // 流式输出与错误出现时自动滚到底部。
  useEffect(() => {
    const node = outputRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, status, error]);

  useEffect(() => {
    if (aiEnabled) inputRef.current?.focus();
  }, [aiEnabled]);

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
      if (aiEnabled) sendMessage({ text: question });
      window.dispatchEvent(new Event("z-os:ask-consumed"));
    }, 0);
  }, [aiEnabled, initialQuestion, sendMessage]);

  const openSource = (source: ChatSource) => {
    windows.close("assistant");
    const href = source.href?.trim();
    router.push(href || `/notes/${source.slug}`);
  };

  const submit = (text: string) => {
    const question = text.trim();
    if (!question || !aiEnabled || busy) return;
    setInput("");
    sendMessage({ text: question });
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // 中文输入法候选阶段的 Enter 是选词，不是发送。
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit(input);
  };

  return (
    <div className="os-assistant">
      <div
        ref={outputRef}
        className="os-assistant-output"
        role="log"
        aria-label="助理对话"
      >
        {!aiEnabled && (
          <p className="os-assistant-line os-assistant-offline">
            AI 未配置：在 .env 填 AI_API_KEY
          </p>
        )}

        {aiEnabled &&
          messages.length === 0 &&
          initialQuestion === null && (
            <div className="os-assistant-suggestions">
              <p className="os-assistant-suggestion-label">试试问：</p>
              {SUGGESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="os-assistant-suggestion"
                  onClick={() => submit(question)}
                >
                  · {question}
                </button>
              ))}
            </div>
          )}

        {aiEnabled &&
          messages.map((message) => {
            const text = messageText(message);

            if (message.role === "user") {
              if (!text) return null;
              return (
                <div
                  key={message.id}
                  className="os-assistant-line os-assistant-user"
                >
                  <span className="os-assistant-prompt" aria-hidden="true">
                    &gt;
                  </span>
                  <span>{text}</span>
                </div>
              );
            }

            if (message.role !== "assistant") return null;
            const sources = messageSources(message);
            if (!text && sources.length === 0) return null;
            return (
              <div key={message.id} className="os-assistant-reply">
                <div className="os-assistant-line">
                  <span className="os-assistant-bullet" aria-hidden="true">
                    ·
                  </span>
                  <span className="os-assistant-text">
                    {renderMessageText(text, sources, openSource)}
                  </span>
                </div>
                {sources.length > 0 && (
                  <div className="os-assistant-sources">
                    {sources.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        className="os-assistant-source"
                        title={`打开：${source.title}`}
                        onClick={() => openSource(source)}
                      >
                        [{source.id}] {source.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {aiEnabled && busy && (
          <div className="os-assistant-line os-assistant-busy">
            · 正在生成…
          </div>
        )}

        {aiEnabled && error && (
          <div className="os-assistant-line os-assistant-error">
            ! 请求失败：{error.message || "请稍后重试"}
          </div>
        )}
      </div>

      {aiEnabled && (
        <form
          className="os-assistant-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
        >
          <div className="os-assistant-input-row">
            <span className="os-assistant-prompt" aria-hidden="true">
              &gt;
            </span>
            <textarea
              ref={inputRef}
              className="os-assistant-input"
              rows={1}
              value={input}
              placeholder="问点什么，Enter 发送…"
              autoComplete="off"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
            />
            {busy ? (
              <button
                type="button"
                className="os-assistant-action"
                onClick={() => stop()}
              >
                停止
              </button>
            ) : (
              <button
                type="submit"
                className="os-assistant-action"
                disabled={!input.trim()}
              >
                发送
              </button>
            )}
          </div>
          <div className="os-assistant-form-meta">
            <span>Enter 发送 · Shift+Enter 换行</span>
            {messages.length > 0 && (
              <button
                type="button"
                className="os-assistant-action"
                onClick={() => {
                  // 先停掉在途请求，否则下一个 chunk 会把刚清掉的助理消息
                  // 重新插回 transcript；错误行也一并清掉。
                  stop();
                  setMessages([]);
                  clearError();
                }}
              >
                清空
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
