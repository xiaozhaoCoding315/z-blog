"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/config/site";

/**
 * 终端彩蛋：任意页面按 `（反引号）唤起一个仿终端，
 * 支持导航、查文章、切主题与若干彩蛋命令。
 */

interface Line {
  kind: "input" | "output" | "error" | "hint";
  text: string;
}

export function TerminalPalette({
  posts,
}: {
  posts: { slug: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const print = useCallback((kind: Line["kind"], text: string) => {
    setLines((prev) => [...prev.slice(-80), { kind, text }]);
  }, []);

  const openTerminal = useCallback(() => {
    setOpen(true);
    // 首次打开时注入欢迎语（函数式更新避免 effect 中同步 setState）
    setLines((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              kind: "hint",
              text: `${siteConfig.name} shell v1.0 —— 按 \` 收起，输入 help 查看命令`,
            },
          ]
    );
  }, []);

  // ` 键唤起 / Esc 关闭；输入框聚焦时不响应 `
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "`" && !typing) {
        e.preventDefault();
        if (!open) openTerminal();
        else setOpen(false);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpenEvent() {
      openTerminal();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blog:open-terminal", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blog:open-terminal", onOpenEvent);
    };
  }, [open, openTerminal]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function navigate(href: string, label: string) {
    print("output", `→ 正在前往 ${label} …`);
    setOpen(false);
    router.push(href);
  }

  function exec(raw: string) {
    const cmdline = raw.trim();
    if (!cmdline) return;
    print("input", cmdline);
    setHistory((h) => [...h, cmdline]);
    setHistoryIndex(-1);

    const [cmd, ...args] = cmdline.split(/\s+/);
    const arg = args.join(" ");

    switch (cmd.toLowerCase()) {
      case "help":
        print(
          "hint",
          [
            "可用命令：",
            "  home / blog / projects / stats / friends / about   站内导航",
            "  posts                                              列出全部文章",
            "  open <slug 或序号>                                  打开一篇文章",
            "  search                                             打开搜索（⌘K）",
            "  ai                                                 唤起 AI 助手",
            "  theme [dark|light]                                 切换主题",
            "  whoami / uptime / ls / date / echo / neofetch / clear / exit   杂项",
          ].join("\n")
        );
        break;
      case "home":
        navigate("/", "首页");
        break;
      case "blog":
        navigate("/blog", "博客");
        break;
      case "projects":
        navigate("/projects", "项目");
        break;
      case "stats":
        navigate("/stats", "统计");
        break;
      case "friends":
        navigate("/friends", "友链");
        break;
      case "about":
        navigate("/about", "关于");
        break;
      case "posts":
      case "ls":
        print(
          "hint",
          posts
            .map((p, i) => `  ${String(i + 1).padStart(2)}  ${p.slug}.mdx  —  ${p.title}`)
            .join("\n") + "\n（open <序号或 slug> 打开文章）"
        );
        break;
      case "open": {
        if (!arg) {
          print("error", "用法：open <slug 或序号>");
          break;
        }
        const byIndex = posts[Number(arg) - 1];
        const target =
          byIndex ?? posts.find((p) => p.slug === arg || p.slug.includes(arg));
        if (target) navigate(`/blog/${target.slug}`, target.title);
        else print("error", `没有找到文章：${arg}`);
        break;
      }
      case "search":
        setOpen(false);
        window.dispatchEvent(new CustomEvent("blog:open-search"));
        break;
      case "ai":
        setOpen(false);
        window.dispatchEvent(new CustomEvent("blog:open-chat"));
        break;
      case "theme": {
        const next =
          arg === "dark" || arg === "light"
            ? arg
            : resolvedTheme === "dark"
              ? "light"
              : "dark";
        setTheme(next);
        print("output", `主题已切换为 ${next}`);
        break;
      }
      case "whoami":
        print("output", `guest@${siteConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, "")} —— 但你显然是来认识 ${siteConfig.author.name} 的`);
        break;
      case "uptime": {
        const start = new Date(siteConfig.startedAt).getTime();
        const days = Number.isNaN(start)
          ? "?"
          : Math.max(1, Math.ceil((Date.now() - start) / 86400000));
        print("output", `up ${days} days, 已写下 ${posts.length} 篇文章`);
        break;
      }
      case "clear":
        setLines([]);
        break;
      case "exit":
      case "quit":
        setOpen(false);
        break;
      case "sudo":
        print("error", "permission denied：此操作需要博主的批准 😄");
        break;
      case "rm":
        print(
          arg.includes("-rf") && (arg.includes("/") || arg.includes("*"))
            ? "error"
            : "output",
          arg.includes("-rf") && (arg.includes("/") || arg.includes("*"))
            ? "nice try —— 这里可是生产环境 🛡️"
            : "rm：本站不提供删除功能（Git 才是版本的主人）"
        );
        break;
      case "vim":
      case "vi":
      case "nano":
        print("output", "检测到上古编辑器，已为你重定向到 VS Code 💻");
        break;
      case "ping":
        print("output", "pong 🏓");
        break;
      case "hello":
      case "hi":
        print("output", `你好！我是 ${siteConfig.author.name} 的终端。输入 help 看看我能做什么。`);
        break;
      case "date":
        print("output", new Date().toLocaleString("zh-CN", { hour12: false }));
        break;
      case "echo":
        print("output", arg || "");
        break;
      case "neofetch": {
        const start = new Date(siteConfig.startedAt).getTime();
        const days = Number.isNaN(start)
          ? "?"
          : Math.max(1, Math.ceil((Date.now() - start) / 86400000));
        print(
          "hint",
          [
            `      ▄▄▄▄▄▄▄     guest@${siteConfig.name}`,
            `    ▄█████████▄   ─────────────────────`,
            `   ███████████    OS: Z·BlogOS (web)`,
            `   ███████████    Host: 阿里云 ECS`,
            `    ▀█████████▀   Kernel: Next.js 16`,
            `      ▀▀▀▀▀▀▀     Shell: zsh (fake)`,
            `                   Uptime: ${days} days`,
            `                   Posts: ${posts.length} 篇`,
            `                   Theme: ${resolvedTheme ?? "dark"}`,
            `                   AI: 已接入（问它试试）`,
          ].join("\n")
        );
        break;
      }
      default:
        print("error", `command not found: ${cmd}（输入 help 查看可用命令）`);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      exec(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(history[next] ?? "");
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%", opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0.4 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          className="glass fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-3xl overflow-hidden rounded-t-2xl border-x border-t font-mono text-[13px] shadow-2xl"
        >
          {/* 标题栏 */}
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
            <span className="size-3 rounded-full bg-red-400/80" />
            <span className="size-3 rounded-full bg-amber-400/80" />
            <span className="size-3 rounded-full bg-emerald-400/80" />
            <span className="ml-2 text-xs text-muted-foreground">
              {siteConfig.name} — zsh
            </span>
            <button
              aria-label="关闭终端"
              onClick={() => setOpen(false)}
              className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              esc ✕
            </button>
          </div>

          {/* 输出区 */}
          <div
            ref={scrollRef}
            className="h-64 overflow-y-auto bg-black/40 px-4 py-3 leading-relaxed"
            onClick={() => inputRef.current?.focus()}
          >
            {lines.map((line, i) => (
              <pre
                key={i}
                className={
                  line.kind === "error"
                    ? "whitespace-pre-wrap text-red-400"
                    : line.kind === "hint"
                      ? "whitespace-pre-wrap text-muted-foreground"
                      : "whitespace-pre-wrap text-foreground/90"
                }
              >
                {line.kind === "input" ? (
                  <>
                    <span className="text-emerald-400">➜</span>{" "}
                    <span className="text-sky-400">~</span> {line.text}
                  </>
                ) : (
                  line.text
                )}
              </pre>
            ))}

            {/* 输入行 */}
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400">➜</span>
              <span className="text-sky-400">~</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                className="flex-1 bg-transparent text-foreground caret-emerald-400 outline-none"
                spellCheck={false}
                autoComplete="off"
                aria-label="终端命令输入"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
