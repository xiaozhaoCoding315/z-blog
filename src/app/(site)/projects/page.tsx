import type { Metadata } from "next";
import { projects } from "@/config/portfolio";
import { GithubIcon } from "@/components/icons/github";

export const metadata: Metadata = {
  title: "项目",
  description: "我做过的一些项目：工程 Agent、全栈应用与数据分析。",
};

const STATUS_NOTE: Record<string, string> = {
  进行中: "进行中",
  已完成: "已完成",
  维护中: "维护中",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          项目
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {projects.length} 个 · 造过的轮子，踩过的坑
        </p>
      </header>

      <div className="space-y-10">
        {projects.map((project) => (
          <article key={project.name} className="border-t border-border pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="font-heading text-xl font-bold tracking-[-0.01em]">
                {project.name}
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {STATUS_NOTE[project.status]}
              </span>
            </div>

            {project.tagline && (
              <p className="mt-1 text-sm text-primary">{project.tagline}</p>
            )}

            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
              {project.description}
            </p>

            {project.context && (
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground/80">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em]">
                  背景
                </span>
                {"  "}
                {project.context}
              </p>
            )}

            {project.highlights && project.highlights.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {project.highlights.map((item) => (
                  <li
                    key={item}
                    className="grid grid-cols-[1rem_minmax(0,1fr)] text-[13px] leading-6 text-muted-foreground"
                  >
                    <span className="text-primary" aria-hidden>
                      —
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {project.outcomes && project.outcomes.length > 0 && (
              <div className="mt-4">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  结果
                </h3>
                <ul className="mt-1.5 space-y-1 text-[13px] leading-6">
                  {project.outcomes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-4 flex flex-wrap items-center gap-x-4 font-mono text-[11px] text-muted-foreground">
              {project.stack.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </p>

            {(project.repo || project.link) && (
              <p className="mt-3 flex gap-4 text-[13px]">
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline inline-flex items-center gap-1.5"
                  >
                    <GithubIcon className="size-3.5" /> 源码
                  </a>
                )}
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline"
                  >
                    访问 →
                  </a>
                )}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
