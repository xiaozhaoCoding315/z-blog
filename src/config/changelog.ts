/**
 * 开发日志（Changelog）数据源。
 *
 * 这是「这个站点一直在长」的最直接证据：每一条都对应仓库里真实发生的一次迭代。
 * 新增记录时只往上加，不复写历史——日志本身就是时间线。
 *
 * type 决定标签配色：feat 新功能 / fix 修复 / perf 性能 / docs 文档 / chore 杂项
 */

export type ChangeType = "feat" | "fix" | "perf" | "docs" | "chore" | "refactor";

export interface ChangeEntry {
  /** YYYY-MM-DD */
  date: string;
  type: ChangeType;
  title: string;
  /** 一句话说明为什么要做这件事，比做了什么更有信息量 */
  detail?: string;
  items?: string[];
  tags?: string[];
}

export const changeTypeMeta: Record<
  ChangeType,
  { label: string; className: string; dot: string }
> = {
  feat: {
    label: "新功能",
    className: "border-primary/40 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  fix: {
    label: "修复",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-400",
    dot: "bg-rose-400",
  },
  perf: {
    label: "性能",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  docs: {
    label: "文档",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    dot: "bg-sky-400",
  },
  refactor: {
    label: "重构",
    className: "border-violet-500/40 bg-violet-500/10 text-violet-400",
    dot: "bg-violet-400",
  },
  chore: {
    label: "工程",
    className: "border-border/70 bg-secondary/50 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

/** 按日期倒序维护（页面会再排一次序，这里保持可读） */
export const changelog: ChangeEntry[] = [
  {
    date: "2026-10-30",
    type: "feat",
    title: "首页与文章页整体改版，新增开发日志",
    detail:
      "站点满 120 天，把散落在各处的信息收拢成一套统一的信息架构：首页强调「这个站是怎么长出来的」，文章页补上元信息栏与阅读辅助。",
    items: [
      "首页重构：real-time 站点指标、技术栈分组、迭代时间线",
      "新增 /changelog 开发日志页与活跃度热力图",
      "文章页新增元信息栏、分享按钮、回到顶部",
      "修复 /api/stats 被构建期缓存导致看板数据永远为 0",
    ],
    tags: ["UI", "Next.js", "信息架构"],
  },
  {
    date: "2026-10-28",
    type: "feat",
    title: "面试题库扩容到 200 题 / 13 个分类",
    detail:
      "从最初的 99 题扩到 200 题，并补上「每日一题」卡片——把题库从「查」变成「刷」。",
    items: [
      "Agent / LLM 应用方向单独成类，共 22 题",
      "掌握度改为浏览器本地持久化，不依赖登录",
      "按分类、难度、是否掌握三维筛选",
    ],
    tags: ["面试", "内容"],
  },
  {
    date: "2026-10-26",
    type: "feat",
    title: "AI 面试官：让模型基于参考答案追问",
    detail:
      "答题页接入流式对话，模型拿到该题参考答案后扮演面试官，先点评再深挖。",
    tags: ["AI", "RAG", "面试"],
  },
  {
    date: "2026-10-25",
    type: "chore",
    title: "上线：Docker Compose 一键部署到阿里云 ECS",
    detail:
      "2C2G 的机器上不能直接 `next build`——内存会被打爆。改成在本地构建镜像、上传、导入、滚动更新，服务器只负责跑。",
    items: [
      "多阶段构建 + standalone 产物，最终镜像约 74MB",
      "入口脚本：等就绪 → 建表 → 增量同步 → 启动",
      "2G swap + 日志轮转，避免 OOM 与磁盘写满",
    ],
    tags: ["Docker", "部署", "Linux"],
  },
  {
    date: "2026-10-24",
    type: "feat",
    title: "工程化加固：限频、安全头、错误边界",
    detail:
      "公网可访问的 AI 接口必须有成本护栏，页面也要有兜底。",
    items: [
      "AI 接口按 IP 分档限频（10 分钟 / 每日上限）",
      "全局安全响应头 + 品牌 favicon + 自定义错误页",
      "限频状态挂到 globalThis，避免多模块副本各记一份",
    ],
    tags: ["安全", "稳定性"],
  },
  {
    date: "2026-10-23",
    type: "feat",
    title: "语义搜索与相关推荐",
    detail:
      "把文章切成块、向量化，检索时按余弦相似度排序——搜「上线」也能找到讲「部署」的文章。",
    items: [
      "pgvector + HNSW 索引，毫秒级召回",
      "⌘K 面板：本地关键词过滤与向量检索合并展示",
      "摘要向量预计算，文章页推荐零运行时开销",
    ],
    tags: ["AI", "检索", "PostgreSQL"],
  },
  {
    date: "2026-10-22",
    type: "feat",
    title: "RAG 问答助手：回答带 [1][2] 引用",
    detail:
      "检索到的分块作为上下文流式生成，引用编号可点击回到原文锚点——不让人去猜答案从哪来。",
    tags: ["AI", "RAG"],
  },
  {
    date: "2026-10-21",
    type: "perf",
    title: "内容同步引擎：SHA-256 增量同步",
    detail:
      "容器每次重启都全量跑一遍向量化既慢又费钱，改成按内容哈希跳过未变更的文章，秒级完成。",
    tags: ["性能", "工程化"],
  },
  {
    date: "2026-10-20",
    type: "feat",
    title: "内容系统落地：MDX + Git 管理文章",
    detail:
      "没有后台、没有数据库表单：一篇 .mdx 文件就是一条记录，git push 就是发布，历史版本天然可回溯。",
    tags: ["内容", "MDX"],
  },
  {
    date: "2026-10-18",
    type: "feat",
    title: "终端彩蛋：按 ` 唤起一个假 shell",
    detail:
      "技术站的趣味性不该靠贴纸，而该藏在细节里：支持导航、查文章、切主题、neofetch。",
    tags: ["彩蛋", "交互"],
  },
  {
    date: "2026-10-15",
    type: "feat",
    title: "站点骨架：深色科技风主题与动效体系",
    detail:
      "先定视觉语言再写内容：OKLCH 配色、玻璃拟态、渐变光晕、滚动显现，全部沉淀成可复用工具类。",
    tags: ["设计", "CSS"],
  },
  {
    date: "2026-07-02",
    type: "chore",
    title: "Day 0：初始化仓库",
    detail:
      "决定不用现成博客框架，从零搭一个能当作品集用的站——于是有了这条时间线的开头。",
    tags: ["起点"],
  },
];

/** 按日期倒序，同一天按数组顺序 */
export function getChangelog(): ChangeEntry[] {
  return [...changelog].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** 迭代统计：条目数、涉及天数、最近一次更新时间 */
export function getChangelogStats() {
  const entries = getChangelog();
  const days = new Set(entries.map((e) => e.date));
  return {
    entries: entries.length,
    activeDays: days.size,
    lastUpdated: entries[0]?.date ?? null,
    firstUpdated: entries[entries.length - 1]?.date ?? null,
  };
}
