"use client";

import type { ChatStatus, UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAssistantChat } from "@/components/assistant/assistant-provider";
import {
  ChatComposer,
  ChatThread,
} from "@/components/assistant/chat-thread";
import type { ChatSource } from "@/components/assistant/assistant-shared";
import { AssistantMusicField } from "@/components/assistant/assistant-music-field";

export interface AssistantPrompt {
  text: string;
  note: string;
}

interface AssistantPageViewProps {
  chatEnabled: boolean;
  retrievalEnabled: boolean;
  modelId: string;
  prompts: AssistantPrompt[];
  initialQuestion?: string | null;
}

const RETRIEVAL_QUERY_LENGTH = 15;
const CONTINUATION_START =
  /^(那|这|它|还有|继续|再|那么|所以|然后|呢|为什么|怎么)/;

/** 界面只根据真实请求状态判断上下文，不伪造「已命中几篇」。 */
function contextLabel(status: ChatStatus, messages: UIMessage[]) {
  if (status === "submitted") return "检索中";
  if (status === "streaming") return "生成中";
  if (messages.length > 0) return "已完成";
  return "等待提问";
}

function needsContext(question: string) {
  return question.length <= RETRIEVAL_QUERY_LENGTH || CONTINUATION_START.test(question);
}

/** 环境变量里是 API 用的 slug（agnes-3.0-flash），界面显示产品名 Agnes-3.0-Flash。 */
function formatModelLabel(id: string) {
  return id
    .split(/[_-]/)
    .map((part) => {
      if (part.toLowerCase() === "glm") return "GLM";
      if (part.toLowerCase() === "agnes") return "Agnes";
      if (/^\d+(\.\d+)?$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("-");
}

/**
 * 助手全页：保留「控制台」这个身份（页头、核心环、上行链路读数），
 * 但对话本身交给 ChatThread / ChatComposer 这套共享内核。
 *
 * 之前这里是另一套排版：回答套卡片、每条消息带作者标签、输入框塞了
 * 四组说明。三处对话各写一遍，改一处就得改三处，长得也不一样。
 */
export function AssistantPageView({
  chatEnabled,
  retrievalEnabled,
  modelId,
  prompts,
  initialQuestion,
}: AssistantPageViewProps) {
  const router = useRouter();
  const {
    messages,
    send,
    status,
    busy,
    error,
    stop,
    clear,
    clearError,
    regenerate,
  } = useAssistantChat();
  const [input, setInput] = useState("");
  const [urlQuestion] = useState(
    () =>
      initialQuestion ??
      (typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("q"))
  );
  const queryHandled = useRef(false);

  // /assistant?q=... 与首页链接查询只消费一次，随后清掉 URL 避免刷新重复发问。
  useEffect(() => {
    const question = urlQuestion?.trim();
    if (!question || !chatEnabled || queryHandled.current) return;
    queryHandled.current = true;
    const timer = window.setTimeout(() => {
      send(question);
      window.history.replaceState(null, "", "/assistant");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chatEnabled, send, urlQuestion]);

  const submit = (text: string) => {
    if (!chatEnabled) return;
    if (send(text)) setInput("");
  };

  const openSource = (source: ChatSource) => {
    router.push(source.href?.trim() || `/notes/${source.slug}`);
  };

  const clearConversation = () => {
    clear();
    setInput("");
  };

  const retry = () => {
    clearError();
    regenerate();
  };

  // 追问时界面明确提示会衔接上一轮，而不是暗示模型能读心。
  const followUp = messages.length > 0 && needsContext(input.trim());
  const modelLabel = formatModelLabel(modelId);

  return (
    <div className="assistant-page" data-status={status} data-busy={busy ? "true" : "false"}>
      <section className="assistant-hero" aria-labelledby="assistant-title" data-reveal>
        <AssistantMusicField />
        <div className="assistant-flow" aria-hidden="true">
          <span className="assistant-flow-line" />
          <span className="assistant-flow-line" />
          <span className="assistant-flow-line" />
          <span className="assistant-flow-scan" />
        </div>
        <div className="assistant-hero-inner">
          <p className="assistant-eyebrow">
            <span className="assistant-eyebrow-beacon" aria-hidden="true" />
            XIAOYUAN / NEURAL CONSOLE
          </p>
          <h1 id="assistant-title">
            <span className="assistant-seal" aria-hidden="true">
              元
            </span>
            小元同学
            <span className="assistant-h1-tag" aria-hidden="true">SYS·01</span>
          </h1>
          <p>
            赵小元留在站里的问答同学。回答来自这个仓库的笔记、真实流式接口与可点击引用；
            检索不可用时如实降级，不把模型猜测伪装成站内资料。
          </p>
          <div className="assistant-runtime" role="status" aria-live="polite">
            <span>
              <i data-state={chatEnabled ? "ready" : "offline"} aria-hidden="true" />
              CHAT {chatEnabled ? "READY" : "NOT AVAILABLE"}
            </span>
            <span>
              <i data-state={retrievalEnabled ? "ready" : "offline"} aria-hidden="true" />
              RAG {retrievalEnabled ? "READY" : "NOT AVAILABLE"}
            </span>
            <span>MODEL {modelLabel}</span>
            <span>STATE {contextLabel(status, messages)}</span>
          </div>
        </div>
        <aside className="assistant-core" aria-hidden="true">
          <span className="assistant-core-ring is-outer" />
          <span className="assistant-core-ring is-mid" />
          <span className="assistant-core-ring is-inner" />
          <span className="assistant-core-node" />
          <span className="assistant-core-readout">CORE / {busy ? "UPLINK" : "ONLINE"}</span>
        </aside>
      </section>

      <section className="assistant-workspace" aria-label="问答工作区" data-reveal>
        <header className="assistant-workspace-bar">
          <span>SESSION / XIAOYUAN-01</span>
          <span className="assistant-workspace-link" data-state={busy ? "active" : "idle"}>
            <i aria-hidden="true" />
            {busy ? "UPLINK ACTIVE" : "UPLINK IDLE"}
          </span>
        </header>

        <div className="assistant-transcript">
          {!chatEnabled ? (
            <div className="assistant-empty">
              <p className="assistant-empty-code">503 / NOT AVAILABLE</p>
              <h2>AI 接口尚未配置</h2>
              <p>服务端需要 AI_API_KEY 才能响应。这里是真实错误状态，不会用演示对话填充。</p>
            </div>
          ) : (
            <ChatThread
              messages={messages}
              status={status}
              error={error}
              onOpenSource={openSource}
              copyable
              empty={
                <div className="assistant-empty">
                  <p className="assistant-empty-code">READY / {modelLabel}</p>
                  <h2>我是小元同学，从一个具体的问题开始</h2>
                  <p>下面几个入口来自仓库里真实存在的笔记与项目主题。</p>
                  <div className="assistant-prompts">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt.text}
                        type="button"
                        className="assistant-prompt"
                        onClick={() => submit(prompt.text)}
                        data-spotlight
                      >
                        <span className="assistant-prompt-text">{prompt.text}</span>
                        <span className="assistant-prompt-note">{prompt.note}</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              }
            />
          )}
        </div>

        {chatEnabled && (
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={() => submit(input)}
            onStop={stop}
            busy={busy}
            autoFocus
            hint={
              <>
                {followUp ? "追问会衔接上一轮" : "Enter 发送 · Shift+Enter 换行"}
                <span className="assistant-composer-links">
                  {error && (
                    <button type="button" onClick={retry}>
                      重新生成
                    </button>
                  )}
                  {messages.length > 0 && (
                    <button type="button" onClick={clearConversation}>
                      清空
                    </button>
                  )}
                  <Link href="/notes">看全部笔记</Link>
                </span>
              </>
            }
          />
        )}
      </section>
    </div>
  );
}
