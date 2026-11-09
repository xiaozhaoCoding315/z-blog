import type { Project } from "@/config/portfolio";

/**
 * 项目看板的纯逻辑：状态映射、分组与本地排序。
 *
 * 看板只在浏览器里改「列 + 顺序」，项目本身仍以 `config/portfolio.ts`
 * 为唯一数据源；localStorage 里的覆盖值不可信，读取时逐条校验。
 */

export type KanbanColumnId = "backlog" | "doing" | "done";

export interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
}

export const KANBAN_COLUMNS: readonly KanbanColumn[] = [
  { id: "backlog", title: "待启动" },
  { id: "doing", title: "进行中" },
  { id: "done", title: "已完成" },
];

export const KANBAN_STORAGE_KEY = "z-os:kanban";

export interface KanbanPlacement {
  column: KanbanColumnId;
  order: number;
}

/** 只存项目名 → 列/序号，不复制项目内容 */
export type KanbanOrder = Record<string, KanbanPlacement>;

export type KanbanBoard = Record<KanbanColumnId, Project[]>;

export function isKanbanColumnId(value: unknown): value is KanbanColumnId {
  return value === "backlog" || value === "doing" || value === "done";
}

/** 进行中与维护中都算「在做」；未知状态进待启动，不丢项目。 */
export function columnOf(status: string): KanbanColumnId {
  if (status === "进行中" || status === "维护中") return "doing";
  if (status === "已完成") return "done";
  return "backlog";
}

export function groupProjects(projects: readonly Project[]): KanbanBoard {
  const board: KanbanBoard = { backlog: [], doing: [], done: [] };
  for (const project of projects) {
    board[columnOf(project.status)].push(project);
  }
  return board;
}

/**
 * 应用本地覆盖：没有覆盖的卡片按配置顺序排；同一列内序号相同再按
 * 配置顺序兜底，保证渲染结果稳定。
 */
export function applyKanbanOrder(
  projects: readonly Project[],
  order: KanbanOrder
): KanbanBoard {
  const board: KanbanBoard = { backlog: [], doing: [], done: [] };
  const placed = projects.map((project, index) => {
    const local = order[project.name];
    return {
      project,
      column: local?.column ?? columnOf(project.status),
      order: local?.order ?? index,
      index,
    };
  });

  for (const column of KANBAN_COLUMNS) {
    board[column.id] = placed
      .filter((item) => item.column === column.id)
      .sort((a, b) => a.order - b.order || a.index - b.index)
      .map((item) => item.project);
  }
  return board;
}

/**
 * 把项目移到目标列的指定位置，并给该列重新编号。
 * 返回新的 localStorage 覆盖值；未知项目名原样返回。
 */
export function moveKanbanProject(
  order: KanbanOrder,
  projects: readonly Project[],
  name: string,
  column: KanbanColumnId,
  index?: number
): KanbanOrder {
  const project = projects.find((item) => item.name === name);
  if (!project) return order;

  const board = applyKanbanOrder(projects, order);
  const next: KanbanBoard = {
    backlog: board.backlog.filter((item) => item.name !== name),
    doing: board.doing.filter((item) => item.name !== name),
    done: board.done.filter((item) => item.name !== name),
  };

  const target = next[column];
  const dropIndex =
    index === undefined || !Number.isInteger(index)
      ? target.length
      : Math.max(0, Math.min(index, target.length));
  target.splice(dropIndex, 0, project);

  const result: KanbanOrder = { ...order };
  delete result[name];
  // 该列重新编号：拖拽后每一张卡的相对位置都确定下来。
  target.forEach((item, position) => {
    result[item.name] = { column, order: position };
  });
  return result;
}

function readSafely(): string | null {
  try {
    return window.localStorage.getItem(KANBAN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 仅客户端使用；服务端渲染 / 测试环境返回空覆盖。 */
export function readKanbanOrder(): KanbanOrder {
  if (typeof window === "undefined") return {};
  const raw = readSafely();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const order: KanbanOrder = {};
    for (const [name, value] of Object.entries(parsed)) {
      if (!name || !value || typeof value !== "object") continue;
      const placement = value as Record<string, unknown>;
      if (!isKanbanColumnId(placement.column)) continue;
      const position = placement.order;
      if (
        typeof position !== "number" ||
        !Number.isInteger(position) ||
        position < 0
      ) {
        continue;
      }
      order[name] = { column: placement.column, order: position };
    }
    return order;
  } catch {
    return {};
  }
}

/** 仅客户端使用；隐私模式写不进去时静默降级到本次会话内存。 */
export function writeKanbanOrder(order: KanbanOrder): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // localStorage 不可用：看板仍以当前 React state 工作
  }
}

/* ---------- useSyncExternalStore 用的外部存储 ---------- */

const EMPTY_ORDER: KanbanOrder = {};
const listeners = new Set<() => void>();
let snapshot: KanbanOrder | null = null;

function notify() {
  for (const listener of listeners) listener();
}

/** 订阅本地看板顺序；跨标签页修改通过 storage 事件同步。 */
export function subscribeKanbanOrder(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KANBAN_STORAGE_KEY) return;
    snapshot = null;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** 快照必须稳定：只有存储或本地写入改变时才生成新对象。 */
export function getKanbanOrderSnapshot(): KanbanOrder {
  if (typeof window === "undefined") return EMPTY_ORDER;
  snapshot ??= readKanbanOrder();
  return snapshot;
}

/** 服务端 / 首帧统一渲染配置顺序，水合后再应用本地覆盖。 */
export function getKanbanOrderServerSnapshot(): KanbanOrder {
  return EMPTY_ORDER;
}

/** 写入并通知订阅者（看板组件本身不再持有 order state）。 */
export function setKanbanOrder(order: KanbanOrder): void {
  snapshot = order;
  writeKanbanOrder(order);
  notify();
}
