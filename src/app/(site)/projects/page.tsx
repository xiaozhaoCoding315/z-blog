import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { projects } from "@/config/portfolio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "项目",
  description: "我做过的一些项目：全栈应用、AI 系统、数据分析。",
};

const statusStyle: Record<string, string> = {
  进行中: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  已完成: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  维护中: "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          项目
        </h1>
        <p className="mt-2 text-muted-foreground">
          造过的轮子，踩过的坑，都在这里
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card
            key={project.name}
            className="card-hover glass overflow-hidden"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${statusStyle[project.status]}`}
                >
                  {project.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.stack.map((tech) => (
                  <Badge
                    key={tech}
                    variant="secondary"
                    className="rounded-full font-normal text-muted-foreground"
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex gap-3 text-xs">
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <GithubIcon className="size-3.5" /> 源码
                  </a>
                )}
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" /> 访问
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
