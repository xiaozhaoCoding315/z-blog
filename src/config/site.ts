/**
 * 站点全局配置——改这里即可全站生效。
 * 站点名等可被 .env 中的 NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_SITE_URL 覆盖。
 */

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Z·Blog",
  title: process.env.NEXT_PUBLIC_SITE_NAME ?? "Z·Blog",
  description:
    "一个热爱编程的程序员的技术博客：学习笔记、项目实践与踩坑复盘。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // 站点建立日期，用于首页「运行天数」统计
  startedAt: process.env.NEXT_PUBLIC_SITE_START_DATE ?? "2026-10-25",
  author: {
    name: "Z",
    avatar: "/images/avatar.png",
    bio: "热爱编程的程序员。喜欢从零造轮子，把想法一个个变成能跑起来的东西，再把过程写下来。",
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
    { title: "统计", href: "/stats" },
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
