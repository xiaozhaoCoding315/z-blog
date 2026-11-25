"use client";

import type { ChatStatus, UIMessage } from "ai";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  groupMessageSources,
  messageSources,
  messageText,
  renderMessageText,
  type ChatSource,
} from "@/components/assistant/assistant-shared";

const NOTE_MAX = 2000;

export interface ChatThreadProps {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  onOpenSource: (source: ChatSource) => void;
  /** 空会话时显示的内容（问候语 + 建议问题）。 */
  empty?: ReactNode;
  /** 紧凑模式：右下角浮窗。字号、间距与来源标签都收一档。 */
  dense?: boolean;
  /** 是否显示每条回答的复制按钮。 */
  copyable?: boolean;
  className?: string;
}

/**
 * 三处对话共用的线程视图。
 *
 * 旧版三套界面各自排版：浮窗每条消息重复「你 / 小元同学」的作者标签，
 * 全页把回答塞进卡片，桌面窗口又是终端行。两人对话里作者标签是纯噪音，
 * 所以这里只在**助手第一次开口**时出现一次署名，之后靠位置和底色区分：
 * 提问右对齐、着色；回答左对齐、不套气泡（长回答不浪费宽度）。
 */
export function ChatThread({
  messages,
  status,
  error,
  onOpenSource,
  empty,
  dense = false,
  copyable = false,
  className,
}: ChatThreadProps) {
  const threadRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 流式输出与错误出现时贴底。用户在往上翻旧消息时不强行拉回。
  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    const nearBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 120;
    if (nearBottom || status === "submitted") node.scrollTop = node.scrollHeight;
  }, [messages, status, error]);

  const busy = status === "submitted" || status === "streaming";
  const lastId = messages[messages.length - 1]?.id;
  // 署名只在助手第一次开口时出现一次，之后靠对齐与底色区分是谁在说。
  const firstAnswerId = messages.find(
    (message) =>
      message.role === "assistant" &&
      (messageText(message) || messageSources(message).length > 0)
  )?.id;

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // 剪贴板被拒时保持静默：文本仍可手动选中。
    }
  };

  return (
    <div
      ref={threadRef}
      className={`xy-chat${dense ? " is-dense" : ""}${className ? ` ${className}` : ""}`}
      role="log"
      aria-label="小元同学的对话"
    >
      {messages.length === 0 && empty}

      {messages.map((message) => {
        const text = messageText(message);
        if (message.role === "user") {
          if (!text) return null;
          return (
            <div key={message.id} className="xy-chat-user">
              <p>{text}</p>
            </div>
          );
        }
        if (message.role !== "assistant") return null;
        const sources = messageSources(message);
        if (!text && sources.length === 0) return null;
        const groups = groupMessageSources(sources);
        const streaming = status === "streaming" && message.id === lastId;
        const first = message.id === firstAnswerId;

        return (
          <article
            key={message.id}
            className="xy-chat-answer"
            data-streaming={streaming ? "true" : "false"}
          >
            {first && (
              <p className="xy-chat-sign">
                <span className="xy-chat-seal" aria-hidden="true">
                  元
                </span>
                小元同学
              </p>
            )}
            <div className="xy-chat-text">
              {renderMessageText(text, sources, onOpenSource)}
              {streaming && <span className="xy-chat-caret" aria-hidden="true" />}
            </div>
            {(groups.length > 0 || (copyable && text)) && (
              <div className="xy-chat-foot">
                {groups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className="xy-chat-source"
                    title={`打开：${group.title}`}
                    onClick={() => onOpenSource(group.source)}
                  >
                    {group.title}
                    {group.heading ? <small>{group.heading}</small> : null}
                  </button>
                ))}
                {copyable && text && (
                  <button
                    type="button"
                    className="xy-chat-copy"
                    onClick={() => copy(message.id, text)}
                  >
                    {copied === message.id ? "已复制" : "复制"}
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}

      {busy && (
        <p className="xy-chat-status" role="status">
          <span className="xy-chat-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {status === "submitted" ? "正在翻站内笔记…" : "正在写…"}
        </p>
      )}

      {error && (
        <div className="xy-chat-error" role="alert">
          <span>{error.message || "请求失败，请稍后重试"}</span>
        </div>
      )}
    </div>
  );
}

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
  dense?: boolean;
  /** 输入框下方的提示文案；为空则不渲染提示行。 */
  hint?: ReactNode;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * 单行胶囊输入。发送键与输入框同排，计数与提示退到下方一行，
 * 不再像旧版那样把「Enter 发送 / Shift+Enter 换行 / 0000/2000 / 清空」
 * 四个信息挤在同一行抢注意力。
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  disabled = false,
  dense = false,
  hint,
  placeholder = "问小元同学…",
  autoFocus = false,
}: ChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus();
  }, [autoFocus, disabled]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // 中文输入法候选阶段的 Enter 是选词，不是发送。
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      className={`xy-composer${dense ? " is-dense" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="xy-composer-row">
        <textarea
          ref={inputRef}
          rows={1}
          maxLength={NOTE_MAX}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="问小元同学"
          data-assistant-composer
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {busy ? (
          <button type="button" className="xy-composer-send is-stop" onClick={onStop}>
            停止
          </button>
        ) : (
          <button
            type="submit"
            className="xy-composer-send"
            disabled={disabled || !value.trim()}
            aria-label="发送"
          >
            发送
          </button>
        )}
      </div>
      {(hint || value.length > NOTE_MAX * 0.8) && (
        <div className="xy-composer-meta">
          <span>{hint}</span>
          {value.length > NOTE_MAX * 0.8 && (
            <span className="xy-composer-count">
              {value.length} / {NOTE_MAX}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
