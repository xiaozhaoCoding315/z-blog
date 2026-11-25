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
  /** 是否进入主导航；旧路由可保留但值为 false。 */
  public: boolean;
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
 * 第二轮改版收束为七个主入口；隐藏项仍保留注册表、窗口几何与真实路由，
 * 因此终端 `open`、旧永久链接、RSS/sitemap 与 308 重定向不会失效。
 */
export const apps: AppDefinition[] = [
  {
    id: "terminal",
    title: "终端",
    path: "/terminal",
    icon: "terminal",
    desktop: false,
    launcher: true,
    public: true,
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
    desktop: false,
    launcher: false,
    public: false,
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
    desktop: false,
    launcher: false,
    public: false,
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
    title: "项目",
    path: "/projects",
    icon: "projects",
    desktop: false,
    launcher: true,
    public: true,
    phase: 3,
    description: "三份档案：为什么做、做到哪一步",
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
    desktop: false,
    launcher: false,
    public: false,
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
    title: "关于",
    path: "/about",
    icon: "about",
    desktop: false,
    launcher: true,
    public: true,
    phase: 3,
    description: "站长、能力与这个站点",
    kind: "window",
    window: {
      defaultRect: { x: 720, y: 96, w: 520, h: 600 },
      minWidth: 400,
      minHeight: 360,
    },
    keywords: ["about", "关于", "站长", "站点", "信息"],
  },
  {
    id: "notes",
    title: "笔记",
    path: "/notes",
    icon: "notes",
    desktop: false,
    launcher: true,
    public: true,
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
    desktop: false,
    launcher: false,
    public: false,
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
    desktop: false,
    launcher: true,
    public: true,
    phase: 1,
    description: "此刻循环与访客推荐",
    kind: "route",
    keywords: ["playlist", "歌单", "音乐", "歌曲", "music", "songs"],
  },
  {
    id: "letters",
    title: "留言板",
    path: "/letters",
    icon: "letters",
    desktop: false,
    launcher: true,
    public: true,
    phase: 1,
    description: "公开留言与回信",
    kind: "route",
    keywords: ["letters", "留言板", "留言", "回信", "message", "messages"],
  },
  {
    id: "more",
    title: "更多",
    path: null,
    icon: "more",
    desktop: false,
    launcher: false,
    public: false,
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
    title: "小元同学",
    path: "/assistant",
    icon: "assistant",
    desktop: false,
    launcher: true,
    public: true,
    phase: 2,
    description: "站内同学，回答带引用",
    kind: "window",
    window: {
      defaultRect: { x: 360, y: 120, w: 720, h: 520 },
      minWidth: 420,
      minHeight: 320,
    },
    keywords: ["assistant", "小元同学", "小元", "助理", "问答", "提问", "ai", "chat"],
  },
  {
    id: "journal",
    title: "开发日志",
    path: "/journal",
    icon: "journal",
    desktop: false,
    launcher: false,
    public: false,
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
    launcher: false,
    public: false,
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
    public: false,
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
    public: false,
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
    public: false,
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
    public: false,
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
    public: false,
    phase: 1,
    description: "邮箱验证码登录",
    kind: "route",
    keywords: ["login", "登录", "账号", "邮箱", "auth"],
  },
];

/** 七个主入口是首页卡片与公开导航的唯一数据源，顺序即展示顺序。 */
export const PRIMARY_APP_IDS = [
  "terminal",
  "projects",
  "about",
  "playlist",
  "notes",
  "assistant",
  "letters",
] as const;

export const primaryApps: AppDefinition[] = PRIMARY_APP_IDS.map((id) => {
  const app = apps.find((candidate) => candidate.id === id);
  if (!app) throw new Error(`Missing primary app: ${id}`);
  return app;
});

/** 首页能承载的窗口 id：七个主入口，外加常驻全局窗口终端与助理。 */
export function isPrimaryAppId(id: string): boolean {
  return (
    PRIMARY_APP_IDS.some((appId) => appId === id) ||
    id === "terminal" ||
    id === "assistant"
  );
}

/** 账号页也走文档流外壳：登录/资料页不应被关在旧桌面窗框里。 */
export function isAccountPagePath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/profile" ||
    pathname.startsWith("/u/")
  );
}

/** 七个主入口及其子页面使用新的文档流外壳；旧页面仍用桌面应用窗框。 */
export function isFullPagePath(pathname: string): boolean {
  return (
    isAccountPagePath(pathname) ||
    pathname === "/friends" || pathname.startsWith("/friends/") ||
    primaryApps.some(
      (app) =>
        app.path !== null &&
        (pathname === app.path || pathname.startsWith(`${app.path}/`))
    )
  );
}

/** 旧图标网格已退役；保留空导出让既有引用仍能编译。 */
export const desktopTileApps: AppDefinition[] = apps.filter((app) => app.desktop);

const launcherExtras: AppDefinition[] = apps.filter(
  (app) => app.launcher && !PRIMARY_APP_IDS.some((id) => id === app.id)
);

/** 启动器按主入口顺序展示，系统设置是最后一个工具项。 */
export const launcherApps: AppDefinition[] = [...primaryApps, ...launcherExtras];

export const publicApps: LinkedApp[] = primaryApps.filter(
  (app): app is LinkedApp => app.path !== null && app.public
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
