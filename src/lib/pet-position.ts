/**
 * 小元同学拖拽位置的纯逻辑。
 *
 * 位置存在 localStorage，读出来时当成不可信输入重新校验；窗口变化或屏幕
 * 变小时再夹回视口内，避免萌宠被拖到一个再也点不到的地方。
 */

export const PET_POSITION_KEY = "z-os:pet-position:v1";

/** 萌宠离视口边缘至少留出的距离，拖到贴边也不会被裁掉阴影。 */
export const PET_POSITION_MARGIN = 8;

export interface PetPosition {
  x: number;
  y: number;
}

export interface PetViewport {
  width: number;
  height: number;
}

export interface PetSize {
  width: number;
  height: number;
}

export interface PetPositionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 以左上角为基准，把位置夹在视口内；视口窄于萌宠时至少保留左上边距。 */
export function clampPetPosition(
  position: PetPosition,
  viewport: PetViewport,
  size: PetSize
): PetPosition {
  const margin = PET_POSITION_MARGIN;
  const maxX = Math.max(margin, viewport.width - size.width - margin);
  const maxY = Math.max(margin, viewport.height - size.height - margin);
  const x = finite(position.x) ? position.x : margin;
  const y = finite(position.y) ? position.y : margin;
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  };
}

export function readPetPosition(
  storage: PetPositionStorage
): PetPosition | null {
  try {
    const raw = storage.getItem(PET_POSITION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const value = parsed as Record<string, unknown>;
    if (!finite(value.x) || !finite(value.y)) return null;
    return { x: value.x, y: value.y };
  } catch {
    return null;
  }
}

export function writePetPosition(
  storage: PetPositionStorage,
  position: PetPosition
): boolean {
  try {
    storage.setItem(
      PET_POSITION_KEY,
      JSON.stringify({ x: position.x, y: position.y })
    );
    return true;
  } catch {
    return false;
  }
}