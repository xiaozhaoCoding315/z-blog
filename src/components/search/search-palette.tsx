"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { apps } from "@/config/apps";
import { useDesktopRuntime } from "@/components/desktop/desktop-runtime";
import {
  filterLocalApps,
  filterLocalNotes,
  mergeNoteHits,
  type SearchableNote,
} from "./search-local";

interface SemanticItem {
  post_slug: string;
  title: string;
  heading: string | null;
  snippet: string;
}

interface SemanticState {
  /** 结果对应的查询词；与当前输入不一致时视为过期，不展示 */
  query: string;
  items: SemanticItem[];
}

const SEARCH_DEBOUNCE_MS = 200;
const EMPTY_SEMANTIC: SemanticItem[] = [];

/**
 * 注册表只保留 Spotlight 需要的字段；打开动作仍走 runtime。
 * settings 没有 path，打开的是系统菜单而不是路由。
 */
const appIndex = apps.map(({ id, title, keywords, path }) => ({
  id,
  title,
  keywords,
  path,
}));

/**
 * Spotlight 面板。
 *
 * 组件由 DesktopShell 动态导入，只在打开时加载 cmdk。关闭时不接收
 * 函数 prop，而是广播 `z-os:close-spotlight`，由外壳卸载本组件。
 * 本地过滤立即出结果，语义检索 200ms 防抖后合并；接口失败静默降级。
 */
export function SearchPalette({ notes }: { notes: SearchableNote[] }) {
  const router = useRouter();
  const runtime = useDesktopRuntime();
  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState<SemanticState>({
    query: "",
    items: [],
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    window.dispatchEvent(new Event("z-os:close-spotlight"));
  }, []);

  // 打开时记住焦点来源，卸载时归还；输入框自动聚焦。
  useEffect(() => {
    const previous = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && document.contains(previous)) {
        previous.focus();
      }
    };
  }, []);

  // Esc 关闭。使用捕获阶段，避免聚焦窗口的 Esc 处理器先关掉别的窗口。
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close]);

  // 遮罩打开期间锁住页面滚动，关闭时恢复原值。
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // 200ms 防抖调用语义搜索（只查笔记）。AI 未配置或请求失败时静默降级。
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { items: [] }))
        .then((data) => {
          setSemantic({
            query: q,
            items: Array.isArray(data.items) ? data.items : [],
          });
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSemantic({ query: q, items: [] });
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const appResults = useMemo(() => filterLocalApps(appIndex, query), [query]);
  const localNotes = useMemo(
    () => filterLocalNotes(notes, query),
    [notes, query]
  );
  const semanticItems =
    semantic.query === trimmedQuery ? semantic.items : EMPTY_SEMANTIC;
  const noteResults = useMemo(
    () => mergeNoteHits(localNotes, semanticItems, notes),
    [localNotes, semanticItems, notes]
  );
  const hasResults = appResults.length > 0 || noteResults.length > 0;

  const selectApp = (id: string) => {
    // 先关闭面板，再执行动作；Spotlight 不持有导航状态。
    close();
    if (id === "settings") {
      runtime.openSettings();
      return;
    }
    runtime.windows.openApp(id);
  };

  const selectNote = (slug: string) => {
    close();
    router.push(`/notes/${slug}`);
  };

  const askAssistant = () => {
    close();
    runtime.openAssistant();
  };

  // 焦点限制在面板内：输入框之外只有无结果时的助理按钮可聚焦。
  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((node) => node.getClientRects().length > 0);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const outside = !panel.contains(active);
    if (event.shiftKey) {
      if (active === first || outside) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (active === last || outside) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="os-spotlight-layer"
      onPointerDown={(event) => {
        // 只处理遮罩本身；面板内部的 pointerdown 不关闭。
        if (event.target === event.currentTarget) close();
      }}
    >
      <Command
        ref={panelRef}
        className="os-spotlight"
        label="搜索"
        aria-label="搜索"
        role="dialog"
        aria-modal="true"
        shouldFilter={false}
        onKeyDown={onPanelKeyDown}
      >
        <div className="os-spotlight-input-row">
          <span className="os-spotlight-prompt" aria-hidden="true">
            &gt;
          </span>
          <Command.Input
            ref={inputRef}
            className="os-spotlight-input"
            value={query}
            onValueChange={setQuery}
            placeholder="搜索应用、笔记或代码片段…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="os-spotlight-kbd">Esc</kbd>
        </div>

        <Command.List className="os-spotlight-list" label="搜索结果">
          {appResults.length > 0 && (
            <Command.Group heading="应用">
              {appResults.map((app) => (
                <Command.Item
                  key={`app:${app.id}`}
                  value={`app:${app.id}`}
                  onSelect={() => selectApp(app.id)}
                >
                  <span className="os-spotlight-item-title">{app.title}</span>
                  <span className="os-spotlight-item-meta">
                    {app.path ?? app.id}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {noteResults.length > 0 && (
            <Command.Group heading="笔记">
              {noteResults.map((note) => (
                <Command.Item
                  key={`note:${note.slug}`}
                  value={`note:${note.slug}`}
                  onSelect={() => selectNote(note.slug)}
                >
                  <span className="os-spotlight-item-title">{note.title}</span>
                  <span className="os-spotlight-item-meta">
                    {note.tags.length > 0
                      ? note.tags.map((tag) => `#${tag}`).join(" ")
                      : note.detail}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/*
           * 代码片段组：阶段 3 才引入数据模型，当前没有片段就整组不渲染，
           * 不用占位行假装有内容。
           */}
          {!hasResults && (
            <div className="os-spotlight-empty">
              <p>没有找到。试试直接问助理。</p>
              <button
                type="button"
                className="os-spotlight-ask"
                onClick={askAssistant}
              >
                打开助理
              </button>
            </div>
          )}
        </Command.List>

        <div className="os-spotlight-foot" aria-hidden="true">
          <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
          <span>{trimmedQuery ? "本地 + 站内检索" : "⌘K 搜索"}</span>
        </div>
      </Command>
    </div>,
    document.body
  );
}
