"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Snippet } from "@/config/snippets";

type CopyState = "idle" | "copied" | "failed";

const COPY_RESET_MS = 1500;

/**
 * 片段浏览器：左侧列表 / 右侧代码。
 *
 * `?s=id` 是选中的唯一来源，切换时 `router.replace` 只改查询参数、
 * 保留其他参数。高亮 HTML 由服务端生成；缺失或失败时回退到纯文本
 * `<pre><code>`，不把空面板当成功。
 */
export function SnippetBrowser({
  snippets,
  highlighted,
  variant = "page",
}: {
  snippets: Snippet[];
  highlighted: { id: string; html: string }[];
  variant?: "page" | "window";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copyFeedback, setCopyFeedback] = useState<{
    id: string;
    state: CopyState;
  } | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const htmlById = useMemo(
    () => new Map(highlighted.map((item) => [item.id, item.html])),
    [highlighted]
  );

  const requested = searchParams.get("s");
  const selected =
    snippets.find((snippet) => snippet.id === requested) ??
    snippets[0] ??
    null;

  // 卸载时清掉计时器；切换片段不需要 effect：反馈按 id 归属当前片段。
  useEffect(
    () => () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
        copyTimer.current = null;
      }
    },
    []
  );

  const copyState: CopyState =
    copyFeedback?.id === selected?.id ? copyFeedback.state : "idle";

  if (!selected) {
    return (
      <p className="os-snippets-empty">
        还没有片段。等这里真正跑过的代码值得被记住时再放上来。
      </p>
    );
  }

  const selectSnippet = (id: string) => {
    if (id === selected.id) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("s", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 标签页的键盘约定：方向键切换并聚焦下一项，Home/End 跳首尾。
  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = snippets.findIndex(
      (snippet) => snippet.id === selected.id
    );
    const count = snippets.length;
    let next: number;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = (current + 1) % count;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = (current - 1 + count) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    } else {
      return;
    }
    event.preventDefault();
    const target = snippets[next];
    selectSnippet(target.id);
    document.getElementById(`snippet-tab-${target.id}`)?.focus();
  };

  const copy = async () => {
    const id = selected.id;
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(selected.code);
      setCopyFeedback({ id, state: "copied" });
    } catch {
      setCopyFeedback({ id, state: "failed" });
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      setCopyFeedback((current) => (current?.id === id ? null : current));
    }, COPY_RESET_MS);
  };

  const html = htmlById.get(selected.id);
  const copyLabel =
    copyState === "copied"
      ? "已复制"
      : copyState === "failed"
        ? "复制失败"
        : "复制";

  return (
    <div className="os-snippets" data-variant={variant}>
      <div
        className="os-snippets-list"
        role="tablist"
        aria-label="代码片段"
        aria-orientation={variant === "window" ? "vertical" : "horizontal"}
        onKeyDown={onListKeyDown}
      >
        {snippets.map((snippet) => {
          const active = snippet.id === selected.id;
          return (
            <button
              key={snippet.id}
              type="button"
              role="tab"
              id={`snippet-tab-${snippet.id}`}
              aria-selected={active}
              aria-controls="os-snippet-panel"
              tabIndex={active ? 0 : -1}
              className="os-snippet-tab"
              data-active={active ? "true" : undefined}
              onClick={() => selectSnippet(snippet.id)}
            >
              <span className="os-snippet-tab-title">{snippet.title}</span>
              <span className="os-snippet-tab-meta">
                <span>{snippet.language}</span>
                <span className="os-snippet-tab-tags">
                  {snippet.tags.map((tag) => `#${tag}`).join(" ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <section
        className="os-snippet-panel"
        id="os-snippet-panel"
        role="tabpanel"
        aria-labelledby={`snippet-tab-${selected.id}`}
      >
        <header className="os-snippet-head">
          <div className="os-snippet-heading">
            <p className="os-pane-label">
              {selected.language} · {selected.source}
            </p>
            <h2>{selected.title}</h2>
            <p className="os-snippet-description">
              {selected.description}
            </p>
          </div>
          <button
            type="button"
            className="os-snippet-copy"
            data-state={copyState}
            onClick={copy}
          >
            {copyLabel}
          </button>
        </header>

        <div className="os-snippet-code">
          {html ? (
            // html 由服务端的 Shiki 对本仓库静态配置生成，不含用户输入。
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre>
              <code>{selected.code}</code>
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
