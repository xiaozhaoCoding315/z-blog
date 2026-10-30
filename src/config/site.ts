/**
 * 站点全局配置——改这里即可全站生效。
 * 站点名等可被 .env 中的 NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_SITE_URL 覆盖。
 */
import { friends } from "@/config/portfolio";

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Z·Blog",
  title: process.env.NEXT_PUBLIC_SITE_NAME ?? "Z·Blog",
  description:
    "一个热爱编程的程序员的技术博客：学习笔记、项目实践与踩坑复盘。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // 站点建立日期：全站「运行天数」的唯一数据源（首页 / 页脚 / 终端 neofetch 均读这里）
  // 2026-07-02 起算，至今约 120 天
  startedAt: process.env.NEXT_PUBLIC_SITE_START_DATE ?? "2026-07-02",
  author: {
    name: "Z",
    avatar: "/images/avatar.png",
    bio: "热爱编程的程序员。喜欢从零造轮子，把想法一个个变成能跑起来的东西，再把过程写下来。",
    email: "mailto:me@example.com",
  },
  links: {
    github: "https://github.com/xiaozhaoCoding315",
    // rss 会在 /feed.xml 自动生成
  },
  nav: [
    { title: "首页", href: "/" },
    { title: "博客", href: "/blog" },
    { title: "面试", href: "/interview" },
    { title: "归档", href: "/archives" },
    { title: "项目", href: "/projects" },
    { title: "开发日志", href: "/changelog" },
    { title: "留言板", href: "/guestbook" },
    // 友链在 portfolio.ts 的 friends 为空时自动隐藏（见 navbar 的过滤逻辑），
    // 加了第一条真实友链就会自己出现，不用回来改这里。
    { title: "友链", href: "/friends" },
    { title: "关于", href: "/about" },
  ],
  footerNav: [
    { title: "统计", href: "/stats" },
    { title: "开发日志", href: "/changelog" },
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

/**
 * 导航项里「有内容才有意义」的入口：内容为空时从菜单里隐藏，
 * 免得把一个空页面摆在主导航上。
 *
 * 判断数据源是 portfolio.ts —— 加第一条真实友链后，导航自动恢复，
 * 不需要回来改 site.ts。
 */
const EMPTY_SECTION_HREFS = new Set<string>(
  friends.length === 0 ? ["/friends"] : []
);

function visibleNav<T extends { href: string }>(items: readonly T[]): T[] {
  return EMPTY_SECTION_HREFS.size === 0
    ? [...items]
    : items.filter((item) => !EMPTY_SECTION_HREFS.has(item.href));
}

export const navItems = visibleNav(siteConfig.nav);
export const footerNavItems = visibleNav(siteConfig.footerNav);
/** 全部导航（含被隐藏项），供 footer 等需要完整列表的地方按需取用 */
export const allNavItems = visibleNav([...siteConfig.nav, ...siteConfig.footerNav]);
