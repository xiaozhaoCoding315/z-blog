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
}

export const projects: Project[] = [
  {
    name: "Nova Agent",
    tagline: "可验证的工程 Agent",
    featured: true,
    description:
      "可自托管的开发者 AI 工作台。不止于聊天：每条结论都附证据（文件:行号 真实性校验，幻觉引用会被标出），改动先算清影响面，bug 在 Docker 沙箱里先复现再修复——生成的失败测试（红）、最小补丁、复跑结果（绿）与 diff 全程可见，经我批准后才写入仓库。",
    highlights: [
      "证据化回答：引用的 文件:行号 逐条校验，标记「沙箱实测」",
      "红-绿修复闭环：失败测试复现 bug → 最小补丁 → 全量复跑 → 人工批准",
      "变更影响雷达：依赖图分析「改这里会影响什么」+ 建议测试",
      "多栈沙箱验证：Python / Node 在真实容器里跑测试，读退出码自我纠错",
      "多用户 BYOK：每人自带模型 Key，五维限额 + 审计日志",
      "夜间队列：睡前排队任务，早上带着证据审阅",
    ],
    stack: [
      "FastAPI",
      "React",
      "PostgreSQL",
      "Qdrant",
      "Docker 沙箱",
      "GLM / DeepSeek / DashScope",
    ],
    status: "进行中",
  },
  {
    name: "本博客",
    description:
      "你正在看的这个站点：Next.js 全栈 + MDX 内容系统 + 向量语义搜索 + AI 问答助手 + Docker 一键部署。",
    stack: ["Next.js", "PostgreSQL", "pgvector", "AI SDK", "Docker"],
    status: "维护中",
  },
  {
    name: "AI 作业批改系统",
    description:
      "前后端分离的智能批改平台：教师发布作业、AI 辅助评分、实时批注反馈，含完整 RBAC 权限体系。",
    stack: ["Spring Boot", "MyBatis-Plus", "Sa-Token", "WebSocket", "Vue 3"],
    status: "已完成",
  },
];

export interface FriendLink {
  name: string;
  url: string;
  description: string;
  avatar?: string;
}

export const friends: FriendLink[] = [
  {
    name: "示例友链",
    url: "https://example.com",
    description: "把这里换成你朋友的博客（编辑 src/config/portfolio.ts）",
  },
];
