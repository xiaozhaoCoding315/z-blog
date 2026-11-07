/**
 * 站点全局配置——改这里即可全站生效。
 * 站点名等可被 .env 中的 NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_SITE_URL 覆盖。
 */
import { friends } from "@/config/portfolio";

/**
 * .env 里留空的变量是空字符串而不是 undefined，
 * `??` 接不住，会让站点名变成空白——所以这里按「有值才用」处理。
 */
function envOr(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const siteConfig = {
  name: envOr(process.env.NEXT_PUBLIC_SITE_NAME, "赵小元"),
  title: envOr(process.env.NEXT_PUBLIC_SITE_NAME, "赵小元"),
  description: "赵小元的个人空间：记录生活，收信，听歌，看书。",
  url: envOr(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  /**
   * 首页页头那句状态话，是首页唯一的自我介绍。
   * 阶段 1 先写死；阶段 3 挪进数据库，由站长在管理页改。
   */
  status: "在杭州，最近在学做饭",
  // 站点建立日期：全站「运行天数」的唯一数据源（首页 / 页脚 / 终端 neofetch 均读这里）
  // 2026-07-02 起算，至今约 120 天
  startedAt: process.env.NEXT_PUBLIC_SITE_START_DATE ?? "2026-07-02",
  author: {
    name: "Z",
    avatar: "/images/avatar.svg",
    bio: "全栈工程师，习惯从需求、架构、实现到上线完整走一遍。擅长把复杂系统拆成可验证的小步骤，并在代码、数据和反馈中持续修正。",
    // 邮箱留空 = 不显示「邮箱」入口。别填示例地址：点开是死链接，比没有更糟。
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  },
  links: {
    github: "https://github.com/xiaozhaoCoding315",
    // rss 会在 /feed.xml 自动生成
  },
  // 主导航只放四个真正会点的地方；其余沉到页脚。
  nav: [
    { title: "生活", href: "/" },
    { title: "书架", href: "/shelf" },
    { title: "歌单", href: "/playlist" },
    { title: "信箱", href: "/letters" },
  ],
  footerNav: [
    { title: "笔记", href: "/notes" },
    { title: "项目", href: "/projects" },
    { title: "日志", href: "/journal" },
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
