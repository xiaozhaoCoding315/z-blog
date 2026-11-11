"use client";

import type { ChatStatus, UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useAssistantChat } from "@/components/assistant/assistant-provider";
import {
  groupMessageSources,
  messageSources,
  messageText,
  renderMessageText,
  type ChatSource,
} from "@/components/assistant/assistant-shared";
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
  const [copied, setCopied] = useState<string | null>(null);
  const [urlQuestion] = useState(
    () =>
      initialQuestion ??
      (typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("q"))
  );
  const queryHandled = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = outputRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, status, error]);

  useEffect(() => {
    if (chatEnabled) inputRef.current?.focus();
  }, [chatEnabled]);

  // /assistant?q=... 与首页链接查询只消费一次，随后清掉 URL 避免刷新重复发问。
  // 初始 state 直接从 window.location 读取，避免 effect 内同步 setState。
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

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit(input);
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

  const copyAnswer = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // 剪贴板权限被拒时保持静默：用户可以手动选中文本。
    }
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
        <div className="assistant-transcript" ref={outputRef} role="log" aria-label="小元同学的对话">
          {!chatEnabled && (
            <div className="assistant-empty">
              <p className="assistant-empty-code">503 / NOT AVAILABLE</p>
              <h2>AI 接口尚未配置</h2>
              <p>服务端需要 AI_API_KEY 才能响应。这里是真实错误状态，不会用演示对话填充。</p>
            </div>
          )}

          {chatEnabled && messages.length === 0 && (
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
          )}

          {messages.map((message) => {
            const text = messageText(message);
            if (message.role === "user") {
              if (!text) return null;
              return (
                <article
                  key={message.id}
                  className="assistant-message is-user assistant-message-enter"
                >
                  <header><span>你</span><span>QUERY</span></header>
                  <p>{text}</p>
                </article>
              );
            }
            if (message.role !== "assistant") return null;
            const sources = messageSources(message);
            if (!text && sources.length === 0) return null;
            const sourceGroups = groupMessageSources(sources);
            const isStreaming =
              status === "streaming" &&
              message.id === messages[messages.length - 1]?.id;
            return (
              <article
                  key={message.id}
                  className="assistant-message is-answer assistant-message-enter"
                  data-streaming={isStreaming ? "true" : "false"}
                >
                <header>
                  <span className="assistant-message-author">
                    <span className="assistant-seal is-small" aria-hidden="true">
                      元
                    </span>
                    小元同学
                  </span>
                  <span className="assistant-message-actions">
                    <span className="assistant-message-tag">
                      {isStreaming ? "STREAMING" : "RESPONSE"}
                    </span>
                    <span className="assistant-message-metrics" aria-hidden="true">
                      {text.length} CHARS
                    </span>
                    <button
                      type="button"
                      className="assistant-copy"
                      onClick={() => copyAnswer(message.id, text)}
                    >
                      {copied === message.id ? "已复制" : "复制"}
                    </button>
                  </span>
                </header>
                <div className="assistant-answer-text">
                  {renderMessageText(text, sources, openSource)}
                  {isStreaming && (
                    <span className="assistant-stream-caret" aria-hidden="true" />
                  )}
                </div>
                {sourceGroups.length > 0 && (
                  <footer className="assistant-source-list">
                    <span>SOURCES / {sourceGroups.length}</span>
                    {sourceGroups.map((group) => (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => openSource(group.source)}
                      >
                        {group.ids.map((id) => `[${id}]`).join("")}{" "}
                        {group.title}
                        {group.heading ? ` · ${group.heading}` : ""}
                      </button>
                    ))}
                  </footer>
                )}
              </article>
            );
          })}

          {chatEnabled && busy && (
            <div className="assistant-stream" role="status" data-phase={status}>
              <span className="assistant-stream-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              {status === "submitted" ? "检索上下文 / 建立连接" : "流式生成中"}
              <span className="assistant-stream-route" aria-hidden="true">
                SSE · LIVE
              </span>
            </div>
          )}

          {chatEnabled && error && (
            <div className="assistant-error" role="alert">
              <p>请求失败：{error.message || "请稍后重试"}</p>
              <button type="button" onClick={retry}>重新生成</button>
            </div>
          )}
        </div>

        <form
          className="assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
        >
          <label htmlFor="assistant-input">
            问小元同学
            <span className="assistant-composer-pill">
              <span className="assistant-thinking-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {busy ? "小元同学思考中" : "小元同学待命"}
            </span>
          </label>
          <span className="assistant-composer-channel" aria-hidden="true">
            CH-01 / SSE
          </span>
          <div className="assistant-composer-row">
            <span className="assistant-composer-prompt" aria-hidden="true">&gt;</span>
            <textarea
              id="assistant-input"
              ref={inputRef}
              data-assistant-composer
              rows={2}
              maxLength={2000}
              value={input}
              disabled={!chatEnabled}
              placeholder={chatEnabled ? "问小元同学：站内笔记、项目或技术问题…" : "NOT AVAILABLE"}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
            />
            {busy ? (
              <button type="button" onClick={() => stop()}>停止</button>
            ) : (
              <button type="submit" disabled={!chatEnabled || !input.trim()}>发送</button>
            )}
          </div>
          <div className="assistant-composer-meta">
            <span>Enter 发送 · Shift+Enter 换行</span>
            <span>{followUp ? "追问将衔接上一轮上下文" : "来源编号可直接打开原文"}</span>
            <span className="assistant-composer-counter" aria-hidden="true">
              {String(input.length).padStart(3, "0")} / 2000
            </span>
            <span className="assistant-composer-actions">
              {messages.length > 0 && (
                <button type="button" onClick={clearConversation}>清空</button>
              )}
              <Link href="/notes">看全部笔记</Link>
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
