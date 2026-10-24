import type { Metadata } from "next";
import { Cpu, Database, Mail, Server, Sparkles, Terminal } from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "关于",
  description: `关于 ${siteConfig.author.name}：全栈 / AI 应用开发者。`,
};

const skills = [
  {
    icon: Terminal,
    title: "前端",
    items: ["React / Next.js", "Vue 3", "TypeScript", "TailwindCSS"],
  },
  {
    icon: Server,
    title: "后端",
    items: ["Node.js", "Spring Boot", "RESTful API", "WebSocket"],
  },
  {
    icon: Sparkles,
    title: "AI 应用",
    items: ["RAG 管线", "Vercel AI SDK", "Prompt 工程", "向量检索"],
  },
  {
    icon: Database,
    title: "数据与运维",
    items: ["PostgreSQL / pgvector", "Redis", "Docker", "Linux 服务器运维"],
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-3xl font-extrabold text-white shadow-xl shadow-primary/25">
          {siteConfig.author.name.charAt(0)}
        </span>
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            {siteConfig.author.name}
          </h1>
          <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
            {siteConfig.author.bio}
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <GithubIcon className="size-3.5" /> GitHub
            </a>
            <a
              href={siteConfig.author.email}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Mail className="size-3.5" /> 邮箱
            </a>
          </div>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="mb-5 font-heading text-xl font-bold tracking-tight">
          技能栈
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {skills.map((group) => (
            <div key={group.title} className="glass card-hover rounded-xl p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <group.icon className="size-4 text-primary" />
                {group.title}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border/70 bg-secondary/40 px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 font-heading text-xl font-bold tracking-tight">
          关于本站
        </h2>
        <div className="glass rounded-xl p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            本站是一个完全自研的全栈项目：内容用 MDX + Git 管理，
            文章页构建时静态生成；PostgreSQL + pgvector
            承载浏览量统计与向量化后的文章分块；⌘K 语义搜索与右下角的
            AI 问答助手基于 RAG 管线（Embedding 检索 + 流式生成 + 引用溯源）。
            整个站点通过 Docker Compose 一键部署。
          </p>
          <p className="mt-3 flex items-start gap-2">
            <Cpu className="mt-0.5 size-4 shrink-0 text-primary" />
            如果你对实现细节感兴趣，博客里有完整的架构拆解文章。
          </p>
        </div>
      </section>
    </div>
  );
}
