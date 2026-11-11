"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatStatus, type UIMessage } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  ASSISTANT_SESSION_KEY,
  readAssistantSession,
  writeAssistantSession,
} from "@/lib/assistant-session";

interface AssistantChatValue {
  messages: UIMessage[];
  status: ChatStatus;
  busy: boolean;
  error: Error | undefined;
  /** 返回 false 表示输入为空、AI 未启用或上一轮仍在生成。 */
  send: (text: string) => boolean;
  stop: () => void;
  clear: () => void;
  regenerate: () => void;
  clearError: () => void;
}

const AssistantChatContext = createContext<AssistantChatValue | null>(null);
const CHAT_TRANSPORT = new DefaultChatTransport({ api: "/api/chat" });
const SAVE_DELAY_MS = 320;

/**
 * 小元同学唯一的对话实例。
 *
 * 之前的助手页与桌面窗口各自 useChat，换页面就各说各话；把实例提到
 * SiteLayout 之后，萌宠面板、/assistant 和终端窗口共用同一段 UIMessage[]。
 * localStorage 只是快照，真正的请求状态仍以 useChat 为准。
 */
export function AssistantChatProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    setMessages,
    regenerate,
    clearError,
  } = useChat({
    id: "xiaoyuan-global",
    transport: CHAT_TRANSPORT,
  });
  const restoredRef = useRef(false);
  const hydratedRef = useRef(false);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (enabled) {
      const stored = readAssistantSession(window.localStorage);
      if (stored.length > 0) setMessages(stored);
    }
    hydratedRef.current = true;
  }, [enabled, setMessages]);

  useEffect(() => {
    if (!enabled || !hydratedRef.current) return;
    const timer = window.setTimeout(() => {
      writeAssistantSession(window.localStorage, messages);
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, messages]);

  useEffect(() => {
    if (!enabled) return;
    // 首帧还没读完快照就离开页面时，不能用空的 messagesRef 覆盖已存对话。
    const flush = () => {
      if (!hydratedRef.current) return;
      writeAssistantSession(window.localStorage, messagesRef.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [enabled]);

  // 跨标签页同步：另一个标签写完快照后，这里只在空闲时接收，避免打断流式输出。
  useEffect(() => {
    if (!enabled) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ASSISTANT_SESSION_KEY) return;
      if (status === "submitted" || status === "streaming") return;
      setMessages(readAssistantSession(window.localStorage));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled, setMessages, status]);

  const busy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!enabled || !question) return false;
      if (status === "submitted" || status === "streaming") return false;
      sendMessage({ text: question });
      return true;
    },
    [enabled, sendMessage, status]
  );

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    clearError();
    try {
      writeAssistantSession(window.localStorage, []);
    } catch {
      // 本地快照清理失败时仍保留内存中的清空结果。
    }
  }, [clearError, setMessages, stop]);

  const value = useMemo<AssistantChatValue>(
    () => ({
      messages,
      status,
      busy,
      error,
      send,
      stop,
      clear,
      regenerate,
      clearError,
    }),
    [messages, status, busy, error, send, stop, clear, regenerate, clearError]
  );

  return (
    <AssistantChatContext.Provider value={value}>
      {children}
    </AssistantChatContext.Provider>
  );
}

export function useAssistantChat(): AssistantChatValue {
  const context = useContext(AssistantChatContext);
  if (!context) {
    throw new Error("useAssistantChat 必须在 AssistantChatProvider 内使用");
  }
  return context;
}