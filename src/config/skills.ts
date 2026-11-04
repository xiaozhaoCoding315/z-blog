export interface SkillGroup {
  title: string;
  summary: string;
  skills: {
    name: string;
    level: 0 | 1 | 2 | 3 | 4;
    items?: string[];
  }[];
}

export const skillGroups: SkillGroup[] = [
  {
    title: "系统设计与后端",
    summary: "从领域模型到数据库、缓存、消息和一致性方案，能把需求拆成可上线的服务。",
    skills: [
      {
        name: "Java / Spring",
        level: 4,
        items: ["Spring Boot", "MyBatis-Plus", "Sa-Token", "权限模型", "异步任务"],
      },
      {
        name: "数据与存储",
        level: 4,
        items: ["PostgreSQL", "索引优化", "事务与隔离级别", "pgvector", "冷备份"],
      },
      {
        name: "高并发",
        level: 3,
        items: ["缓存设计", "限流降级", "消息队列", "分布式锁", "一致性方案"],
      },
    ],
  },
  {
    title: "前端与全栈",
    summary: "熟悉现代 Web 工程链路，能把服务端数据、交互状态和性能预算放进同一个设计里。",
    skills: [
      {
        name: "React / Next.js",
        level: 4,
        items: ["App Router", "RSC", "Cache Components", "TypeScript", "服务端数据流"],
      },
      {
        name: "界面工程",
        level: 3,
        items: ["TailwindCSS", "设计系统", "响应式", "可访问性", "首屏性能"],
      },
    ],
  },
  {
    title: "AI 应用与基础设施",
    summary: "关注 LLM 应用的召回、成本、安全和可观测性，不只是把模型接到界面上。",
    skills: [
      {
        name: "RAG / 向量检索",
        level: 4,
        items: ["文本切分", "pgvector / HNSW", "混合搜索", "召回调优", "引用溯源"],
      },
      {
        name: "工程化",
        level: 3,
        items: ["AI SDK", "工具调用", "RAG 问答", "限流与审计", "Docker Compose"],
      },
    ],
  },
];

export const workPrinciples = [
  "先明确成功标准，再写代码；测试、日志和验收结果要能解释为什么是对的。",
  "优先减少系统复杂度，避免为了展示技术引入难以维护的方案。",
  "把真实运行数据当作判断依据：延迟、成功率、内存、模型 token 和用户反馈都要可观察。",
  "先让最小闭环跑起来，再逐步扩展能力，避免一次性实现大量未经验证的分支。",
];
