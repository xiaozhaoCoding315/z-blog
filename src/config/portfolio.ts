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
    description:
      "一个真实运行的个人技术工作站：MDX 内容主编、pgvector 语义搜索、RAG 问答助手，Docker 一键部署。",
    stack: ["Next.js", "PostgreSQL", "pgvector", "AI SDK", "Docker"],
    repo: "https://github.com/xiaozhaoCoding315/z-blog",
    status: "维护中",
  },
  {
    name: "AI 作业批改系统",
    role: "后端架构与实时交互",
    context: "教师需要低延迟答疑，学生需要即时反馈，作业数据需要可追溯并满足权限隔离。",
    description:
      "前后端分离的智能批改平台：教师发布作业、AI 辅助评分、实时批注反馈，具备完整 RBAC 权限体系。",
    stack: ["Spring Boot", "MyBatis-Plus", "Sa-Token", "WebSocket", "Vue 3"],
    repo: "https://github.com/xiaozhaoCoding315/AI_TeachPlatform",
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
