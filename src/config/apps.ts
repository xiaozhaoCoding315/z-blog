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

export interface AppDefinition {
  id: string;
  title: string;
  path: string | null;
  icon: IconKey;
  desktop: boolean;
  launcher: boolean;
  phase: 1 | 2 | 3 | 4;
  description: string;
}

export type LinkedApp = AppDefinition & { path: string };

/**
 * 桌面和启动器的唯一数据源。
 *
 * 阶段 1 只渲染 `path !== null` 的图标；终端、更多、助理在阶段 2
 * 有了窗口之后再把 path 留空、由窗口系统接管。这样阶段 1 不会出现
 * 点不开的图标。
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
  },
  {
    id: "more",
    title: "更多",
    path: null,
    icon: "more",
    desktop: true,
    launcher: false,
    phase: 4,
    description: "友链、更新日志与站点信息",
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
  },
  {
    id: "friends",
    title: "友链",
    path: "/friends",
    icon: "friends",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "互相认识的人",
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
  },
  {
    id: "settings",
    title: "系统设置",
    path: null,
    icon: "settings",
    desktop: false,
    launcher: false,
    phase: 4,
    description: "预设、桌面物件与布局",
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
  },
];

export const desktopApps = apps.filter((app) => app.desktop);

export const desktopTileApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.desktop && app.path !== null
);

export const launcherApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.launcher && app.path !== null
);

export const publicApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.path !== null && app.launcher
);

export function findAppByPath(pathname: string): AppDefinition | undefined {
  return apps.find(
    (app) =>
      app.path !== null &&
      (pathname === app.path || pathname.startsWith(`${app.path}/`))
  );
}
