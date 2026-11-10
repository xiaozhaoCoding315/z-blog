"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  messageSources,
  messageText,
  renderMessageText,
  type ChatSource,
} from "@/components/assistant/assistant-shared";

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
function contextLabel(status: string, messages: ReturnType<typeof useChat>["messages"]) {
  if (status === "submitted") return "检索中";
  if (status === "streaming") return "生成中";
  if (messages.length > 0) return "已完成";
  return "等待提问";
}

function needsContext(question: string) {
  return question.length <= RETRIEVAL_QUERY_LENGTH || CONTINUATION_START.test(question);
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
    sendMessage,
    status,
    setMessages,
    error,
    stop,
    clearError,
    regenerate,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
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
  const busy = status === "submitted" || status === "streaming";

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
      sendMessage({ text: question });
      window.history.replaceState(null, "", "/assistant");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chatEnabled, sendMessage, urlQuestion]);

  const submit = (text: string) => {
    const question = text.trim();
    if (!question || !chatEnabled || busy) return;
    setInput("");
    sendMessage({ text: question });
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

  const clear = () => {
    stop();
    setMessages([]);
    clearError();
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

  return (
    <div className="assistant-page">
      <section className="assistant-hero" aria-labelledby="assistant-title">
        <div className="assistant-flow" aria-hidden="true">
          <span className="assistant-flow-line" />
          <span className="assistant-flow-line" />
          <span className="assistant-flow-line" />
        </div>
        <div className="assistant-hero-inner">
          <p className="assistant-eyebrow">XIAOYUAN · PERSONAL KNOWLEDGE</p>
          <h1 id="assistant-title">
            <span className="assistant-seal" aria-hidden="true">
              元
            </span>
            小元同学
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
            <span>MODEL {modelId}</span>
            <span>STATE {contextLabel(status, messages)}</span>
          </div>
        </div>
      </section>

      <section className="assistant-workspace" aria-label="问答工作区">
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
              <p className="assistant-empty-code">READY / {modelId}</p>
              <h2>我是小元同学，从一个具体的问题开始</h2>
              <p>下面几个入口来自仓库里真实存在的笔记与项目主题。</p>
              <div className="assistant-prompts">
                {prompts.map((prompt) => (
                  <button
                    key={prompt.text}
                    type="button"
                    className="assistant-prompt"
                    onClick={() => submit(prompt.text)}
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
                <article key={message.id} className="assistant-message is-user">
                  <header><span>你</span><span>QUERY</span></header>
                  <p>{text}</p>
                </article>
              );
            }
            if (message.role !== "assistant") return null;
            const sources = messageSources(message);
            if (!text && sources.length === 0) return null;
            return (
              <article key={message.id} className="assistant-message is-answer">
                <header>
                  <span className="assistant-message-author">
                    <span className="assistant-seal is-small" aria-hidden="true">
                      元
                    </span>
                    小元同学
                  </span>
                  <span className="assistant-message-actions">
                    <span>{status === "streaming" ? "STREAMING" : "RESPONSE"}</span>
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
                </div>
                {sources.length > 0 && (
                  <footer className="assistant-source-list">
                    <span>SOURCES / {sources.length}</span>
                    {sources.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => openSource(source)}
                      >
                        [{source.id}] {source.title}
                        {source.heading ? ` · ${source.heading}` : ""}
                      </button>
                    ))}
                  </footer>
                )}
              </article>
            );
          })}

          {chatEnabled && busy && (
            <div className="assistant-stream" role="status">
              <span className="assistant-stream-dot" aria-hidden="true" />
              {status === "submitted" ? "检索上下文 / 建立连接" : "流式生成中"}
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
          <label htmlFor="assistant-input">问小元同学</label>
          <div className="assistant-composer-row">
            <span aria-hidden="true">&gt;</span>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={2}
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
            <span className="assistant-composer-actions">
              {messages.length > 0 && (
                <button type="button" onClick={clear}>清空</button>
              )}
              <Link href="/notes">看全部笔记</Link>
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
