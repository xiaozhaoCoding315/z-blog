export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * `apps.ts` 里八个有窗口几何的应用（桌面图标 + 全局终端/助理）。
 * 路由型应用不进 `z-os:windows`，这里不认它们的 id。
 */
export const SAVED_RECT_APP_IDS: readonly string[] = [
  "terminal",
  "life",
  "gallery",
  "projects",
  "snippets",
  "about",
  "more",
  "assistant",
];

/**
 * localStorage 里的窗口几何是外部输入：只有注册表里已知的应用 id 和四个
 * 有限数才可信。脏值会让 clampRect 算出 NaN 并写进内联 CSS / localStorage。
 * 逐项丢弃坏数据，永远返回一个纯对象（可能是空对象）。
 */
export function sanitizeSavedRects(raw: unknown): Record<string, Rect> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const knownIds = new Set(SAVED_RECT_APP_IDS);
  const result: Record<string, Rect> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!knownIds.has(id)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const rect = value as Record<string, unknown>;
    const numbers = [rect.x, rect.y, rect.w, rect.h];
    if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n))) {
      continue;
    }
    const [x, y, w, h] = numbers as number[];
    if (w <= 0 || h <= 0) continue;
    result[id] = { x, y, w, h };
  }
  return result;
}

export interface DesktopBounds {
  width: number;
  height: number;
}

export interface WindowState {
  id: string;
  rect: Rect;
  restoreRect: Rect | null;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface WindowStore {
  windows: Record<string, WindowState>;
  saved: Record<string, Rect>;
  zCounter: number;
  /**
   * localStorage 里的位置是否已经进入 `saved`。
   * 它由 hydrate action 设置，保证读取它的组件（如首页的 `?open=`）
   * 在 saved 真正可用的同一帧才看到 `true`。
   */
  hydrated: boolean;
}

export const WINDOW_STORAGE_KEY = "z-os:windows";
export const DEFAULT_BOUNDS: DesktopBounds = { width: 1440, height: 852 };
export const initialWindowStore: WindowStore = {
  windows: {},
  saved: {},
  zCounter: 1,
  hydrated: false,
};

export function clampRect(
  rect: Rect,
  bounds: DesktopBounds,
  minWidth: number,
  minHeight: number
): Rect {
  const w = Math.min(Math.max(rect.w, minWidth), bounds.width);
  const h = Math.min(Math.max(rect.h, minHeight), bounds.height);
  const x = Math.min(Math.max(rect.x, 80 - w), bounds.width - 80);
  const y = Math.min(Math.max(rect.y, 0), bounds.height - 34);
  return { x, y, w, h };
}

/**
 * 打开窗口时的最终 rect：优先用上次保存的位置，再按当前视口 clamp。
 *
 * 与拖拽不同，初始位置必须让整个窗口落在视口内：否则窄屏下 760px 的
 * 终端会从右侧溢出，最大化/关闭按钮点不到。拖拽仍允许部分移出屏幕。
 */
export function preferredRect(
  saved: Rect | undefined,
  fallback: Rect,
  bounds: DesktopBounds,
  minWidth: number,
  minHeight: number
): Rect {
  const rect = clampRect(saved ?? fallback, bounds, minWidth, minHeight);
  return {
    ...rect,
    x: Math.max(0, Math.min(rect.x, bounds.width - rect.w)),
    y: Math.max(0, Math.min(rect.y, bounds.height - rect.h)),
  };
}

/**
 * 剩余可见窗口里最高的 z；没有可见窗口时返回 null。
 * 最小化窗口不算「可见」：关闭/最小化聚焦窗口后，焦点应落到用户还能看到的窗口上。
 */
function topVisibleZ(windows: Record<string, WindowState>): number | null {
  let top: number | null = null;
  for (const win of Object.values(windows)) {
    if (win.minimized) continue;
    if (top === null || win.z > top) top = win.z;
  }
  return top;
}

type Action =
  | { type: "open"; id: string; rect: Rect }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "restore"; id: string }
  | { type: "toggleMaximize"; id: string }
  | { type: "move"; id: string; rect: Rect }
  | { type: "resize"; id: string; rect: Rect }
  | { type: "hydrate"; saved: Record<string, Rect> }
  | { type: "reset" };

export function windowReducer(state: WindowStore, action: Action): WindowStore {
  const z = state.zCounter + 1;
  switch (action.type) {
    case "open": {
      const existing = state.windows[action.id];
      if (existing) {
        return {
          ...state,
          zCounter: z,
          windows: {
            ...state.windows,
            [action.id]: { ...existing, z, minimized: false },
          },
        };
      }
      return {
        ...state,
        zCounter: z,
        windows: {
          ...state.windows,
          [action.id]: {
            id: action.id,
            rect: action.rect,
            restoreRect: null,
            z,
            minimized: false,
            maximized: false,
          },
        },
      };
    }
    case "close": {
      const current = state.windows[action.id];
      const saved = current
        ? { ...state.saved, [action.id]: current.maximized ? current.restoreRect ?? current.rect : current.rect }
        : state.saved;
      const windows = { ...state.windows };
      delete windows[action.id];
      // 关闭的是最上层窗口时，把焦点交回剩余可见窗口里最高的那个；
      // 没有可见窗口就保留 zCounter（下一个 open 仍会递增）。
      let zCounter = state.zCounter;
      if (current && current.z === state.zCounter) {
        const next = topVisibleZ(windows);
        if (next !== null) zCounter = next;
      }
      return { ...state, windows, saved, zCounter };
    }
    case "focus": {
      const current = state.windows[action.id];
      if (!current || current.z === state.zCounter) return state;
      return { ...state, zCounter: z, windows: { ...state.windows, [action.id]: { ...current, z } } };
    }
    case "minimize": {
      const current = state.windows[action.id];
      if (!current) return state;
      const windows = {
        ...state.windows,
        [action.id]: { ...current, minimized: true },
      };
      // 最小化聚焦窗口后，焦点落到剩余可见窗口里最高的那个。
      let zCounter = state.zCounter;
      if (current.z === state.zCounter) {
        const next = topVisibleZ(windows);
        if (next !== null) zCounter = next;
      }
      return { ...state, windows, zCounter };
    }
    case "restore": {
      const current = state.windows[action.id];
      if (!current) return state;
      return { ...state, zCounter: z, windows: { ...state.windows, [action.id]: { ...current, minimized: false, z } } };
    }
    case "toggleMaximize": {
      const current = state.windows[action.id];
      if (!current) return state;
      if (current.maximized) {
        return { ...state, windows: { ...state.windows, [action.id]: { ...current, maximized: false, rect: current.restoreRect ?? current.rect, restoreRect: null } } };
      }
      return { ...state, windows: { ...state.windows, [action.id]: { ...current, maximized: true, restoreRect: current.rect } } };
    }
    case "move":
    case "resize": {
      const current = state.windows[action.id];
      if (!current || current.maximized) return state;
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...current, rect: action.rect } },
        saved: { ...state.saved, [action.id]: action.rect },
      };
    }
    case "hydrate":
      return {
        ...state,
        saved: { ...state.saved, ...action.saved },
        hydrated: true,
      };
    case "reset":
      // 重置布局只清空窗口与位置；hydrate 是一次性的启动阶段，
      // 不能因为重置又退回未水合状态。
      return { ...initialWindowStore, hydrated: state.hydrated };
    default:
      return state;
  }
}
