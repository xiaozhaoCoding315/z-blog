/**
 * 站点全局配置——改这里即可全站生效。
 * 站点名等可被 .env 中的 NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_SITE_URL 覆盖。
 */

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
   * 状态句的缺省值。数据库里有 site_settings.status_sentence 时以数据库为准；
   * 桌面主屏与 /life 都读 getStatusSentence()。
   */
  status: "在杭州，最近在学做饭",
  // 站点建立日期：全站「运行天数」的唯一数据源（终端 neofetch / 关于页均读这里）
  // 2026-07-02 起算，至今约 120 天
  startedAt: process.env.NEXT_PUBLIC_SITE_START_DATE ?? "2026-07-02",
  author: {
    name: "赵小元",
    bio: "全栈工程师，习惯从需求、架构、实现到上线完整走一遍。擅长把复杂系统拆成可验证的小步骤，并在代码、数据和反馈中持续修正。",
    // 邮箱留空 = 不显示「邮箱」入口。别填示例地址：点开是死链接，比没有更糟。
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  },
  links: {
    github: "https://github.com/xiaozhaoCoding315",
    // rss 会在 /feed.xml 自动生成
  },
  /** 观测条的天气读数：城市写死，坐标由城市决定；不采集访客位置 */
  weather: {
    city: "杭州",
    latitude: 30.2741,
    longitude: 120.1551,
  },
  footer: {
    icp: "", // 备案号（有域名备案后填写）
    beianUrl: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
