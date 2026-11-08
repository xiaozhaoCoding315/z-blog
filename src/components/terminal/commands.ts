/**
 * 终端命令层：纯函数，不碰 React / DOM，方便 node --test 直接覆盖。
 *
 * 命令只做导航与彩蛋，不是真 shell；所有数值（应用数、笔记数、运行天数、
 * AI 是否配置）都来自调用方传入的真实上下文，不在模块里写死。
 */
import type { DesktopPreset } from "../desktop/use-desktop-settings";

export type TerminalEffect =
  | { type: "clear" }
  | { type: "close" }
  | { type: "open"; appId: string }
  | { type: "ask"; question: string }
  | { type: "theme"; preset: DesktopPreset }
  | { type: "coffee" };

export interface TerminalApp {
  id: string;
  title: string;
  path: string | null;
  kind: "window" | "route";
}

export interface TerminalNote {
  slug: string;
  title: string;
}

export interface TerminalSnippet {
  id: string;
  title: string;
  language: string;
}

export interface TerminalContext {
  apps: TerminalApp[];
  /** 桌面图标数量（neofetch 的 Apps 行；`apps` 命令仍列完整注册表） */
  desktopAppCount: number;
  notes: TerminalNote[];
  snippets: TerminalSnippet[];
  theme: DesktopPreset;
  /** 站点运行天数；起始日期非法时为 null，终端显示占位符 */
  uptimeDays: number | null;
  aiEnabled: boolean;
}

export interface TerminalResult {
  lines: string[];
  effect?: TerminalEffect;
}

export const THEME_LABELS: Record<DesktopPreset, string> = {
  night: "夜班",
  paper: "稿纸",
  blueprint: "蓝图",
};

const THEME_PRESETS: DesktopPreset[] = ["night", "paper", "blueprint"];

const COMMANDS = [
  "help",
  "ls",
  "apps",
  "posts",
  "snippets",
  "open",
  "ask",
  "theme",
  "wallpaper",
  "whoami",
  "date",
  "uptime",
  "neofetch",
  "coffee",
  "clear",
  "exit",
];

const HELP_LINES = [
  "Z·OS 终端命令",
  "",
  "浏览",
  "  help                       显示这份分组帮助",
  "  ls                         应用、笔记与片段数量",
  "  apps                       应用 id / 名称 / 路由",
  "  posts                      笔记 slug / 标题",
  "  snippets                   代码片段 id / 标题",
  "  open <app|slug|snippet>    打开应用、笔记或片段",
  "",
  "桌面",
  "  theme night|paper|blueprint   切换桌面预设",
  "  wallpaper <preset>            同 theme",
  "  ask <问题>                    打开助理并提问",
  "  coffee                        一杯 ASCII 咖啡",
  "",
  "会话",
  "  whoami / date / uptime / neofetch",
  "  clear                      清屏",
  "  exit / :q                  关闭终端",
];

const COFFEE_LINES = [
  "      ( (",
  "       ) )",
  "    ........",
  "    |      |]",
  "    \\      /",
  "     `----'",
  "",
  "咖啡在桌上，热气在壁纸里。",
];

/** 首次打开终端时逐字打出的欢迎语，总时长控制在 600ms 内。 */
export const WELCOME_LINES = [
  "zsh — guest@z-os",
  "输入 help 查看命令，open <应用|slug> 打开窗口。",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(now: Date) {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `周${weekdays[now.getDay()]}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  ].join(" ");
}

function formatUptime(days: number | null) {
  return days === null ? "建站 —（起始日期未配置）" : `建站 ${days} 天`;
}

function neofetchLines(ctx: TerminalContext) {
  return [
    "guest@z-os",
    "----------",
    "OS: Z·OS",
    "Host: 杭州",
    `Uptime: ${formatUptime(ctx.uptimeDays)}`,
    "Stack: Next.js 16 / React 19 / PostgreSQL",
    `Apps: ${ctx.desktopAppCount}`,
    `Notes: ${ctx.notes.length}`,
    `Theme: ${THEME_LABELS[ctx.theme]} (${ctx.theme})`,
    `AI: ${ctx.aiEnabled ? "已配置" : "未配置"}`,
    "Shell: zsh (simulated)",
  ];
}

function openTarget(target: string, ctx: TerminalContext): TerminalResult {
  if (!target) {
    return {
      lines: [
        "open: 用法：open <app|note-slug|snippet-id>",
        "提示：输入 apps、posts 或 snippets 查看可打开的目标。",
      ],
    };
  }

  // settings 是 Phase 2 的系统菜单入口，不在窗口注册表里；即使调用方
  // 过滤掉 settings，也要能显式打开它（由 TerminalWindow 调 openSettings）。
  if (target === "settings") {
    return {
      lines: ["打开 系统设置 (settings)。"],
      effect: { type: "open", appId: "settings" },
    };
  }

  const app = ctx.apps.find((candidate) => candidate.id === target);
  if (app) {
    return {
      lines: [`打开 ${app.title} (${app.id})。`],
      effect: { type: "open", appId: app.id },
    };
  }

  const note = ctx.notes.find((candidate) => candidate.slug === target);
  if (note) {
    return {
      lines: [`打开笔记「${note.title}」。`],
      effect: { type: "open", appId: note.slug },
    };
  }

  const snippet = ctx.snippets.find((candidate) => candidate.id === target);
  if (snippet) {
    return {
      lines: [`打开片段「${snippet.title}」。`],
      effect: { type: "open", appId: snippet.id },
    };
  }

  return {
    lines: [
      `open: 找不到「${target}」。`,
      "提示：输入 apps、posts 或 snippets 查看可打开的目标。",
    ],
  };
}

function themeTarget(command: string, target: string, ctx: TerminalContext) {
  if (!target) {
    return {
      lines: [
        `当前预设：${THEME_LABELS[ctx.theme]} (${ctx.theme})。`,
        `用法：${command} night|paper|blueprint`,
      ],
    };
  }
  const preset = target.toLowerCase() as DesktopPreset;
  if (!THEME_PRESETS.includes(preset)) {
    return {
      lines: [
        `${command}: 未知预设「${target}」。可选：night、paper、blueprint。`,
      ],
    };
  }
  return {
    lines: [`预设切换为 ${THEME_LABELS[preset]} (${preset})。`],
    effect: { type: "theme" as const, preset },
  };
}

/** 命令输出逐行归类：错误与提示用不同颜色，其余按普通输出渲染。 */
export function lineKind(line: string): "error" | "hint" | "output" {
  if (line.startsWith("提示：")) return "hint";
  if (
    /^(zsh|open|theme|wallpaper|ask|rm|vim|sudo):/.test(line)
  ) {
    return "error";
  }
  return "output";
}

/**
 * Tab 补全候选：命令 + 应用 id + 笔记 slug + 片段 id。
 * 前缀大小写不敏感，结果去重排序，方便终端决定「唯一则补全、多个则列出」。
 */
export function completeCommand(prefix: string, ctx: TerminalContext): string[] {
  const needle = prefix.trim().toLowerCase();
  const pool = new Set<string>(COMMANDS);
  for (const app of ctx.apps) pool.add(app.id);
  for (const note of ctx.notes) pool.add(note.slug);
  for (const snippet of ctx.snippets) pool.add(snippet.id);
  return [...pool]
    .filter((candidate) => candidate.toLowerCase().startsWith(needle))
    .sort();
}

export function runCommand(input: string, ctx: TerminalContext): TerminalResult {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [] };

  const [name, ...rest] = trimmed.split(/\s+/);
  const command = name.toLowerCase();
  const arg = rest.join(" ").trim();

  switch (command) {
    case "help":
      return { lines: [...HELP_LINES] };

    case "ls":
      return {
        lines: [
          `apps/      ${ctx.apps.length}`,
          `notes/     ${ctx.notes.length}`,
          `snippets/  ${ctx.snippets.length}`,
        ],
      };

    case "apps":
      if (ctx.apps.length === 0) return { lines: ["还没有注册任何应用。"] };
      return {
        lines: ctx.apps.map(
          (app) =>
            `${app.id.padEnd(10)} ${app.title}${app.path ? `  ${app.path}` : ""}`
        ),
      };

    case "posts":
      if (ctx.notes.length === 0) return { lines: ["还没有笔记。"] };
      return {
        lines: ctx.notes.map((note) => `${note.slug}  ${note.title}`),
      };

    case "snippets":
      if (ctx.snippets.length === 0) {
        return { lines: ["还没有代码片段（阶段 3 接入）。"] };
      }
      return {
        lines: ctx.snippets.map(
          (snippet) =>
            `${snippet.id}  ${snippet.title}  [${snippet.language}]`
        ),
      };

    case "open":
      return openTarget(arg, ctx);

    case "ask":
      if (!arg) return { lines: ["ask: 用法：ask <问题>"] };
      return {
        lines: [`正在打开助理：${arg}`],
        effect: { type: "ask", question: arg },
      };

    case "theme":
    case "wallpaper":
      return themeTarget(command, arg, ctx);

    case "whoami":
      return { lines: ["guest"] };

    case "date":
      return { lines: [formatDate(new Date())] };

    case "uptime":
      return { lines: [formatUptime(ctx.uptimeDays)] };

    case "neofetch":
      return { lines: neofetchLines(ctx) };

    case "coffee":
      return {
        lines: [...COFFEE_LINES],
        effect: { type: "coffee" },
      };

    case "sudo":
      return {
        lines: ["sudo: 这个访客桌面只读，不需要 root。"],
      };

    case "rm":
      return {
        lines: ["rm: 拒绝执行：桌面是只读的，什么都没删。"],
      };

    case "vim":
      return {
        lines: ["vim: 没有安装。这里是模拟 shell，输入 :q 可以退出。"],
      };

    case "clear":
      return { lines: [], effect: { type: "clear" } };

    case "exit":
      return { lines: [], effect: { type: "close" } };

    default:
      if (command === ":q") {
        return { lines: [], effect: { type: "close" } };
      }
      return {
        lines: [
          `zsh: command not found: ${name}`,
          "提示：输入 help 查看可用命令。",
        ],
      };
  }
}
