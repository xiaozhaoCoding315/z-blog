export const ICON_KEYS = [
  "terminal",
  "life",
  "gallery",
  "projects",
  "snippets",
  "about",
  "notes",
  "shelf",
  "playlist",
  "letters",
  "more",
  "assistant",
  "journal",
  "friends",
  "settings",
  "write",
  "admin",
  "login",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export type AppKind = "window" | "route";

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WindowConfig {
  defaultRect: WindowRect;
  minWidth: number;
  minHeight: number;
}

export interface AppDefinition {
  id: string;
  title: string;
  path: string | null;
  icon: IconKey;
  desktop: boolean;
  launcher: boolean;
  phase: 1 | 2 | 3 | 4;
  description: string;
  kind: AppKind;
  window?: WindowConfig;
  keywords: string[];
}

export type LinkedApp = AppDefinition & { path: string };

/**
 * 桌面和启动器的唯一数据源。
 *
 * 窗口型应用由窗口系统接管，路由型应用直接跳转；`path` 为空的窗口型
 * 应用只在桌面/启动器里出现（终端、更多、助理、设置）。
 */
export const apps: AppDefinition[] = [
  {
    id: "terminal",
    title: "终端",
    path: null,
    icon: "terminal",
    desktop: true,
    launcher: true,
    phase: 2,
    description: "在桌面里直接敲命令",
    kind: "window",
    window: {
      defaultRect: { x: 320, y: 120, w: 760, h: 440 },
      minWidth: 420,
      minHeight: 280,
    },
    keywords: ["terminal", "终端", "命令行", "shell", "zsh", "cli"],
  },
  {
    id: "life",
    title: "每日日志",
    path: "/life",
    icon: "life",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "一条按时间走的生活流",
    kind: "window",
    window: {
      defaultRect: { x: 24, y: 32, w: 520, h: 620 },
      minWidth: 420,
      minHeight: 360,
    },
    keywords: ["life", "日志", "每日日志", "动态", "生活", "moment", "moments", "记录"],
  },
  {
    id: "gallery",
    title: "生活胶囊",
    path: "/gallery",
    icon: "gallery",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "带照片的瞬间",
    kind: "window",
    window: {
      defaultRect: { x: 560, y: 48, w: 640, h: 560 },
      minWidth: 420,
      minHeight: 320,
    },
    keywords: ["gallery", "相册", "生活胶囊", "照片", "图片", "photo", "photos"],
  },
  {
    id: "projects",
    title: "项目看板",
    path: "/projects",
    icon: "projects",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "正在做、维护中和已完成",
    kind: "window",
    window: {
      defaultRect: { x: 180, y: 72, w: 880, h: 560 },
      minWidth: 560,
      minHeight: 360,
    },
    keywords: ["projects", "项目", "项目看板", "看板", "kanban", "作品"],
  },
  {
    id: "snippets",
    title: "代码片段",
    path: "/snippets",
    icon: "snippets",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "这个站里真正用过的代码",
    kind: "window",
    window: {
      defaultRect: { x: 320, y: 96, w: 760, h: 520 },
      minWidth: 520,
      minHeight: 360,
    },
    keywords: ["snippets", "片段", "代码片段", "代码", "snippet", "code"],
  },
  {
    id: "about",
    title: "关于本机",
    path: "/about",
    icon: "about",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "站长、站点与运行时间",
    kind: "window",
    window: {
      defaultRect: { x: 720, y: 96, w: 520, h: 600 },
      minWidth: 400,
      minHeight: 360,
    },
    keywords: ["about", "关于", "关于本机", "站长", "站点", "信息"],
  },
  {
    id: "notes",
    title: "笔记",
    path: "/notes",
    icon: "notes",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "长文与拆解",
    kind: "route",
    keywords: ["notes", "笔记", "文章", "长文", "blog", "posts"],
  },
  {
    id: "shelf",
    title: "书架",
    path: "/shelf",
    icon: "shelf",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "书、影、音",
    kind: "route",
    keywords: ["shelf", "书架", "书", "影", "音", "读书", "电影", "book", "books"],
  },
  {
    id: "playlist",
    title: "歌单",
    path: "/playlist",
    icon: "playlist",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "此刻循环与访客推荐",
    kind: "route",
    keywords: ["playlist", "歌单", "音乐", "歌曲", "music", "songs"],
  },
  {
    id: "letters",
    title: "信箱",
    path: "/letters",
    icon: "letters",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "公开留言与回信",
    kind: "route",
    keywords: ["letters", "信箱", "留言", "回信", "message", "messages"],
  },
  {
    id: "more",
    title: "更多",
    path: null,
    icon: "more",
    desktop: true,
    launcher: true,
    phase: 4,
    description: "友链、更新日志与站点信息",
    kind: "window",
    window: {
      defaultRect: { x: 240, y: 160, w: 400, h: 320 },
      minWidth: 320,
      minHeight: 240,
    },
    keywords: ["more", "更多", "友链", "更新日志", "关于", "rss"],
  },
  {
    id: "assistant",
    title: "助理",
    path: null,
    icon: "assistant",
    desktop: true,
    launcher: true,
    phase: 2,
    description: "站内问答，回答带引用",
    kind: "window",
    window: {
      defaultRect: { x: 360, y: 120, w: 720, h: 520 },
      minWidth: 420,
      minHeight: 320,
    },
    keywords: ["assistant", "助理", "问答", "提问", "ai", "chat"],
  },
  {
    id: "journal",
    title: "开发日志",
    path: "/journal",
    icon: "journal",
    desktop: false,
    launcher: true,
    phase: 1,
    description: "这个站每次改了什么",
    kind: "route",
    keywords: ["journal", "开发日志", "更新日志", "changelog", "日志"],
  },
  {
    id: "friends",
    title: "友链",
    path: "/friends",
    icon: "friends",
    desktop: false,
    launcher: true,
    phase: 1,
    description: "互相认识的人",
    kind: "route",
    keywords: ["friends", "友链", "朋友", "links"],
  },
  {
    id: "style",
    title: "样式走廊",
    path: "/style",
    icon: "settings",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "开发环境的视觉样张",
    kind: "route",
    keywords: ["style", "样式", "样式走廊", "设计", "样张", "tokens"],
  },
  {
    id: "settings",
    title: "系统设置",
    path: null,
    icon: "settings",
    desktop: false,
    launcher: true,
    phase: 4,
    description: "预设、桌面物件与布局",
    kind: "route",
    keywords: ["settings", "设置", "系统设置", "主题", "预设", "桌面"],
  },
  {
    id: "write",
    title: "写一条",
    path: "/write",
    icon: "write",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "发布一条生活动态",
    kind: "route",
    keywords: ["write", "写一条", "发布", "动态", "moment", "new"],
  },
  {
    id: "admin",
    title: "管理",
    path: "/admin",
    icon: "admin",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "状态句、留言与内容审核",
    kind: "route",
    keywords: ["admin", "管理", "后台", "审核", "状态句"],
  },
  {
    id: "login",
    title: "登录",
    path: "/login",
    icon: "login",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "邮箱验证码登录",
    kind: "route",
    keywords: ["login", "登录", "账号", "邮箱", "auth"],
  },
];

export const desktopTileApps: AppDefinition[] = apps.filter((app) => app.desktop);

export const launcherApps: AppDefinition[] = apps.filter((app) => app.launcher);

export const publicApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.path !== null && app.launcher
);

export function findAppById(id: string): AppDefinition | undefined {
  return apps.find((app) => app.id === id);
}

export function findAppByPath(pathname: string): AppDefinition | undefined {
  return apps.find(
    (app) =>
      app.path !== null &&
      (pathname === app.path || pathname.startsWith(`${app.path}/`))
  );
}
