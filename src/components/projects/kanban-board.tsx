"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type DragEvent,
  type MouseEvent,
} from "react";
import type { Project } from "@/config/portfolio";
import {
  KANBAN_COLUMNS,
  applyKanbanOrder,
  getKanbanOrderServerSnapshot,
  getKanbanOrderSnapshot,
  moveKanbanProject,
  setKanbanOrder,
  subscribeKanbanOrder,
  type KanbanColumnId,
} from "@/lib/kanban";

type StatusTone = "doing" | "warn" | "done";

/** 未知 status 的徽标默认用 doing 色调；文字仍原样显示配置里的值。 */
function statusTone(status: Project["status"] | string): StatusTone {
  if (status === "维护中") return "warn";
  if (status === "已完成") return "done";
  return "doing";
}

function stop(event: MouseEvent) {
  event.stopPropagation();
}

/**
 * 项目看板：三列 + 右侧详情抽屉。
 *
 * 拖拽只写浏览器本地覆盖（`z-os:kanban`），项目内容仍来自配置；
 * 拖拽不可用时，每张卡的 ← / → 按钮可以把项目移到相邻列。
 * `/projects` 与首页项目窗口复用同一个组件，仅外层容器不同。
 */
export function KanbanBoard({
  projects,
  variant = "page",
}: {
  projects: Project[];
  variant?: "page" | "window";
}) {
  // 服务端与首帧用配置顺序，水合后再由外部存储补上本地覆盖。
  const order = useSyncExternalStore(
    subscribeKanbanOrder,
    getKanbanOrderSnapshot,
    getKanbanOrderServerSnapshot
  );
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<KanbanColumnId | null>(null);

  const board = useMemo(
    () => applyKanbanOrder(projects, order),
    [order, projects]
  );
  const selected = selectedName
    ? projects.find((project) => project.name === selectedName) ?? null
    : null;

  // Esc 关闭详情。捕获阶段先于窗口自身的 Esc 关闭逻辑，避免连窗口一起关掉。
  useEffect(() => {
    if (!selectedName) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedName(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [selectedName]);

  const move = (
    name: string,
    column: KanbanColumnId,
    index?: number
  ) => {
    setKanbanOrder(
      moveKanbanProject(order, projects, name, column, index)
    );
  };

  const reset = () => {
    setSelectedName(null);
    setKanbanOrder({});
  };

  const onDragStart = (event: DragEvent<HTMLElement>, name: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", name);
    setDraggingName(name);
  };

  const onDragEnd = () => {
    setDraggingName(null);
    setOverColumn(null);
  };

  const onDragOverColumn = (
    event: DragEvent<HTMLElement>,
    column: KanbanColumnId
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overColumn !== column) setOverColumn(column);
  };

  const onDropColumn = (
    event: DragEvent<HTMLElement>,
    column: KanbanColumnId
  ) => {
    event.preventDefault();
    const name = event.dataTransfer.getData("text/plain") || draggingName;
    setDraggingName(null);
    setOverColumn(null);
    if (name) move(name, column);
  };

  const onDropCard = (
    event: DragEvent<HTMLElement>,
    column: KanbanColumnId,
    index: number,
    targetName: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const name = event.dataTransfer.getData("text/plain") || draggingName;
    setDraggingName(null);
    setOverColumn(null);
    if (!name || name === targetName) return;

    // 拖到自己前面的卡片上：移除自己后目标索引要减一，保持「插到目标前」。
    const list = board[column];
    const fromIndex = list.findIndex((project) => project.name === name);
    const targetIndex = list.findIndex(
      (project) => project.name === targetName
    );
    const dropIndex =
      fromIndex !== -1 && fromIndex < targetIndex ? index - 1 : index;
    move(name, column, dropIndex);
  };

  const columnIndex = (column: KanbanColumnId) =>
    KANBAN_COLUMNS.findIndex((item) => item.id === column);

  return (
    <div className={`os-kanban os-kanban--${variant}`}>
      <div className="os-kanban-toolbar">
        <span className="os-pane-label">
          {projects.length} 个项目 · 拖拽排序
        </span>
        <button type="button" className="os-kanban-reset" onClick={reset}>
          重置顺序
        </button>
      </div>

      <div className="os-kanban-columns">
        {KANBAN_COLUMNS.map((column) => {
          const list = board[column.id];
          return (
            <section
              key={column.id}
              className="os-kanban-column"
              data-over={overColumn === column.id ? "true" : undefined}
              aria-label={`${column.title} ${list.length}`}
              onDragOver={(event) => onDragOverColumn(event, column.id)}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setOverColumn(null);
                }
              }}
              onDrop={(event) => onDropColumn(event, column.id)}
            >
              <header className="os-kanban-column-head">
                <h2>{column.title}</h2>
                <span className="os-kanban-count">{list.length}</span>
              </header>

              <div className="os-kanban-column-body">
                {list.map((project, index) => {
                  const previous =
                    KANBAN_COLUMNS[columnIndex(column.id) - 1]?.id;
                  const next = KANBAN_COLUMNS[columnIndex(column.id) + 1]?.id;
                  return (
                    <article
                      key={project.name}
                      className="os-kanban-card"
                      data-dragging={
                        draggingName === project.name ? "true" : undefined
                      }
                      data-selected={
                        selectedName === project.name ? "true" : undefined
                      }
                      draggable
                      onDragStart={(event) =>
                        onDragStart(event, project.name)
                      }
                      onDragEnd={onDragEnd}
                      onDragOver={(event) =>
                        onDragOverColumn(event, column.id)
                      }
                      onDrop={(event) =>
                        onDropCard(event, column.id, index, project.name)
                      }
                    >
                      <button
                        type="button"
                        className="os-kanban-card-open"
                        aria-label={`查看 ${project.name} 详情`}
                        onClick={() => setSelectedName(project.name)}
                      >
                        <h3 className="os-kanban-card-name">
                          {project.name}
                        </h3>
                        {project.tagline && (
                          <p className="os-kanban-card-tagline">
                            {project.tagline}
                          </p>
                        )}
                        <p className="os-kanban-card-stack">
                          {project.stack.slice(0, 3).join(" · ")}
                        </p>
                      </button>

                      <div className="os-kanban-card-meta">
                        <span
                          className="os-kanban-status"
                          data-tone={statusTone(project.status)}
                        >
                          {project.status}
                        </span>

                        <span className="os-kanban-card-links">
                          {project.repo && (
                            <a
                              href={project.repo}
                              target="_blank"
                              rel="noreferrer noopener"
                              onClick={stop}
                            >
                              源码 ↗
                            </a>
                          )}
                          {project.link && (
                            <a
                              href={project.link}
                              target="_blank"
                              rel="noreferrer noopener"
                              onClick={stop}
                            >
                              访问 ↗
                            </a>
                          )}
                        </span>

                        <span className="os-kanban-move">
                          <button
                            type="button"
                            aria-label={`把 ${project.name} 移到上一列`}
                            title="移到上一列"
                            disabled={!previous}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (previous) move(project.name, previous);
                            }}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            aria-label={`把 ${project.name} 移到下一列`}
                            title="移到下一列"
                            disabled={!next}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (next) move(project.name, next);
                            }}
                          >
                            →
                          </button>
                        </span>
                      </div>
                    </article>
                  );
                })}

                {list.length === 0 && (
                  <p className="os-kanban-empty">拖到这里</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selected && (
        <aside
          className="os-kanban-detail"
          role="dialog"
          aria-label={`${selected.name} 项目详情`}
        >
          <div className="os-kanban-detail-head">
            <div>
              <p className="os-pane-label">项目详情</p>
              <h2>{selected.name}</h2>
            </div>
            <button
              type="button"
              className="os-kanban-detail-close"
              aria-label="关闭详情"
              onClick={() => setSelectedName(null)}
            >
              ×
            </button>
          </div>

          <div className="os-kanban-detail-status">
            <span
              className="os-kanban-status"
              data-tone={statusTone(selected.status)}
            >
              {selected.status}
            </span>
            {selected.role && (
              <span className="os-kanban-detail-role">{selected.role}</span>
            )}
          </div>

          <p className="os-kanban-detail-description">
            {selected.description}
          </p>

          {selected.why && (
            <section>
              <h3>Why</h3>
              <p>{selected.why}</p>
            </section>
          )}
          {selected.feeling && (
            <section>
              <h3>Feeling</h3>
              <p>{selected.feeling}</p>
            </section>
          )}
          {selected.highlights && selected.highlights.length > 0 && (
            <section>
              <h3>Highlights</h3>
              <ul>
                {selected.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {selected.outcomes && selected.outcomes.length > 0 && (
            <section>
              <h3>Outcomes</h3>
              <ul>
                {selected.outcomes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3>Stack</h3>
            <p className="os-kanban-detail-stack">
              {selected.stack.join(" · ")}
            </p>
          </section>

          <section>
            <h3>链接</h3>
            <div className="os-kanban-detail-links">
              {selected.repo && (
                <a
                  href={selected.repo}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  源码 ↗
                </a>
              )}
              {selected.link && (
                <a
                  href={selected.link}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  访问 ↗
                </a>
              )}
              {!selected.repo && !selected.link && <span>暂无公开链接</span>}
            </div>
          </section>
        </aside>
      )}
    </div>
  );
}
