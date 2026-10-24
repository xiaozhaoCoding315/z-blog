/**
 * 站点全局配置——改这里即可全站生效。
 * 站点名等可被 .env 中的 NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_SITE_URL 覆盖。
 */

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Z·Blog",
  title: process.env.NEXT_PUBLIC_SITE_NAME ?? "Z·Blog",
  description:
    "一个全栈 / AI 应用开发者的个人博客：技术随笔、项目实践与 AI 玩法，配备语义搜索与 RAG 智能问答。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // 站点建立日期，用于首页「运行天数」统计
  startedAt: process.env.NEXT_PUBLIC_SITE_START_DATE ?? "2026-10-25",
  author: {
    name: "Z",
    avatar: "/images/avatar.png",
    bio: "全栈 / AI 应用开发者。热爱造轮子，正在把 AI 集成进生活的每个角落。",
    email: "mailto:me@example.com",
  },
  links: {
    github: "https://github.com/zbwyyds-666",
    // rss 会在 /feed.xml 自动生成
  },
  nav: [
    { title: "首页", href: "/" },
    { title: "博客", href: "/blog" },
    { title: "项目", href: "/projects" },
    { title: "友链", href: "/friends" },
    { title: "关于", href: "/about" },
  ],
  footer: {
    icp: "", // 备案号（有域名备案后填写）
    beianUrl: "",
  },
  /** Giscus 评论：部署后到 https://giscus.app 生成配置，填入 .env */
  giscus: {
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO ?? "",
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? "",
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? "Announcements",
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "",
    enabled:
      Boolean(process.env.NEXT_PUBLIC_GISCUS_REPO) &&
      Boolean(process.env.NEXT_PUBLIC_GISCUS_REPO_ID),
  },
} as const;

export type SiteConfig = typeof siteConfig;
