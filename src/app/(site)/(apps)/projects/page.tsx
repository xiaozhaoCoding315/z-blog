import type { Metadata } from "next";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { projects } from "@/config/portfolio";

export const metadata: Metadata = {
  title: "项目",
  description: "项目看板：进行中、维护中与已完成的工作。",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          项目
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {projects.length} 个 · 造过的轮子，踩过的坑
        </p>
      </header>

      <KanbanBoard projects={projects} variant="page" />
    </div>
  );
}
