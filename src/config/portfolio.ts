/**
 * 项目展示与友链数据——直接编辑这里即可更新页面。
 */

export interface Project {
  name: string;
  tagline?: string;
  description: string;
  /** 主打项目：卡片跨双列，展示亮点列表 */
  featured?: boolean;
  highlights?: string[];
  stack: string[];
  link?: string;
  repo?: string;
  status: "进行中" | "已完成" | "维护中";
  role?: string;
  context?: string;
  /** 为什么做这个项目，一句话 */
  why?: string;
  /** 做完或在做时最真实的感受 */
  feeling?: string;
  outcomes?: string[];
  screenshot?: string;
}

export const projects: Project[] = [
  {
    name: "Nova Agent",
    tagline: "面向开发流程的可验证 Agent",
    featured: true,
    description:
      "可自托管的开发者 AI 工作台。每条结论都附证据（文件:行号 真实性校验），改动先算清影响面，bug 在 Docker 沙箱中先复现再修复；失败测试、最小补丁、复跑结果与 diff 全程可见，经人工批准后写入仓库。",
    role: "架构设计与全栈实现",
    context: "面向真实开发流程的桌面级 Agent，需要在文件系统、终端、Git 和多模型之间保持状态一致。",
    why: "想让 Agent 的每条结论都能被验证，而不是听起来对。",
    feeling: "最满意的不是它能改代码，是失败时知道为什么失败。",
    highlights: [
      "证据化回答：引用的 文件:行号 逐条校验，标记「沙箱实测」",
      "红-绿修复闭环：失败测试复现 bug → 最小补丁 → 全量复跑 → 人工批准",
      "变更影响雷达：依赖图分析「改这里会影响什么」+ 建议测试",
      "多栈沙箱验证：Python / Node 在真实容器里跑测试，读退出码自我纠错",
      "多用户 BYOK：每人自带模型 Key，五维限额 + 审计日志",
      "夜间队列：睡前排队任务，早上带着证据审阅",
    ],
    outcomes: [
      "文件、终端、Git 三类核心操作形成可审计证据链",
      "失败-补丁-复跑的回滚闭环",
      "多语言沙箱中的编译与运行验证",
    ],
    stack: [
      "FastAPI",
      "React",
      "PostgreSQL",
      "Qdrant",
      "Docker 沙箱",
      "GLM / DeepSeek / DashScope",
    ],
    link: "http://60.205.0.224:8000",
    repo: "https://github.com/xiaozhaoCoding315/Nova-Agent",
    status: "进行中",
  },
  {
    name: "本博客",
    role: "全栈工程师与站点维护者",
    context: "从静态博客演进为可交互技术内容平台，同时保持构建速度、运行稳定性和 SEO 可维护性。",
    why: "想有一个自己的地方记录生活和学习，而不是被平台的时间线推着走。",
    feeling: "从技术博客改成个人空间后，发布压力小了，反而更愿意写。",
    description:
      "一个真实运行的个人技术工作站：MDX 内容主编、pgvector 语义搜索、RAG 问答助手，Docker 一键部署。",
    stack: ["Next.js", "PostgreSQL", "pgvector", "AI SDK", "Docker"],
    repo: "https://github.com/xiaozhaoCoding315/z-blog",
    status: "维护中",
  },
  {
    name: "TripCraft",
    tagline: "多智能体协作的旅行规划助手",
    role: "Agent 编排、检索与容错设计",
    context:
      "一次旅行规划要同时权衡天气、交通、住宿、景点四类信息，单次 LLM 生成既容易漏项，也无法在数据缺失时优雅降级。",
    why: "一次旅行要同时权衡天气、交通、住宿、景点，单次生成总会漏。",
    feeling: "评审 Agent 驳回重跑的那几轮，比我手动改行程更接近真实决策。",
    description:
      "多智能体旅行规划系统：四个信息采集 Agent 并行跑，结果交给行程编排与评审 Agent，评审不通过就带着意见重跑，最多三轮；规划过程通过 WebSocket 实时推给前端，并在地图上画出路线。",
    highlights: [
      "并行 → 编排 → 评审的 Agent 流水线，评审不通过就带着意见重试（上限 3 轮）",
      "Hybrid RAG 三路召回：向量、BM25、结构化城市过滤，RRF（k=60）融合",
      "降级链 hybrid → dense-only → sparse-only → fallback，检索挂掉也不空手而归",
      "Harness 容错：超时、指数退避、熔断器状态机、分级降级，工具调用有显式结果 Schema",
      "三层记忆：Redis 短期会话 + PostgreSQL 长期语义（recency×frequency×confidence 衰减）+ 请求级上下文",
      "50 条 golden query 做检索评估，Recall / MRR / NDCG / HitRate + RAGAS",
    ],
    outcomes: [
      "单一数据源失败不再导致整次规划失败，最差退化为带说明的降级结果",
      "检索质量有量化基线，调参不再靠感觉",
    ],
    stack: [
      "React 18",
      "FastAPI",
      "LangGraph",
      "Qdrant",
      "PostgreSQL",
      "Redis",
      "高德 JSAPI",
    ],
    repo: "https://github.com/xiaozhaoCoding315/TripCraft",
    status: "已完成",
  },
];

export interface FriendLink {
  name: string;
  url: string;
  description: string;
  avatar?: string;
}

/**
 * 友链列表 —— 只放真实的、你确实在看的站点。
 *
 * 刻意留空：占位数据（example.com 之类）挂在生产站点上只会减分。
 * 加到第一条真实友链时，页面的空状态会自动换成卡片列表，导航项也会跟着出现。
 */
export const friends: FriendLink[] = [];

/** Now 页面数据：我最近在做什么（nownownow.com 运动，改这里即可） */
export const now = {
  updatedAt: "2026-10-30",
  learning: ["Agent 工程化（多智能体协作与验证）", "向量检索与 RAG 调优"],
  building: [
    "Nova Agent —— 可验证的工程 Agent（见项目页）",
    "这个博客（不断加新玩具）",
  ],
  reading: ["《Designing Data-Intensive Applications》", "各类技术博客与论文"],
  listening: "Lo-fi / 后摇，写代码专用 BGM",
};
