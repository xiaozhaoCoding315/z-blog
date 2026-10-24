/**
 * 项目展示与友链数据——直接编辑这里即可更新页面。
 */

export interface Project {
  name: string;
  description: string;
  stack: string[];
  link?: string;
  repo?: string;
  status: "进行中" | "已完成" | "维护中";
}

export const projects: Project[] = [
  {
    name: "本博客",
    description:
      "你正在看的这个站点：Next.js 全栈 + MDX 内容系统 + pgvector 语义搜索/RAG 问答 + Docker 一键部署。",
    stack: ["Next.js", "PostgreSQL", "pgvector", "AI SDK", "Docker"],
    status: "维护中",
  },
  {
    name: "AI 作业批改系统",
    description:
      "前后端分离的智能批改平台：教师发布作业、AI 辅助评分、实时批注反馈。包含 WebSocket 实时通信与完整的 RBAC 权限体系。",
    stack: ["Spring Boot", "MyBatis-Plus", "Sa-Token", "WebSocket", "Vue 3"],
    status: "已完成",
  },
  {
    name: "气象数据时间序列分析",
    description:
      "对气象观测数据做清洗、平稳性检验与 ARIMA 建模预测，输出完整的分析报告与可视化图表。",
    stack: ["Python", "Pandas", "Statsmodels", "Matplotlib"],
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
