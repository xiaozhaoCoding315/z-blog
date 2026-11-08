export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
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

/** 打开窗口时的最终 rect：优先用上次保存的位置，再按当前视口 clamp。 */
export function preferredRect(
  saved: Rect | undefined,
  fallback: Rect,
  bounds: DesktopBounds,
  minWidth: number,
  minHeight: number
): Rect {
  return clampRect(saved ?? fallback, bounds, minWidth, minHeight);
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
      return { ...state, windows, saved };
    }
    case "focus": {
      const current = state.windows[action.id];
      if (!current || current.z === state.zCounter) return state;
      return { ...state, zCounter: z, windows: { ...state.windows, [action.id]: { ...current, z } } };
    }
    case "minimize": {
      const current = state.windows[action.id];
      if (!current) return state;
      return { ...state, windows: { ...state.windows, [action.id]: { ...current, minimized: true } } };
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
