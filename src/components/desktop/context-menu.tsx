"use client";

import { useRouter } from "next/navigation";
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useDesktopSettings, type DesktopPreset } from "./use-desktop-settings";
import { useFocusTrap } from "./focus-trap";

const PRESETS: { id: DesktopPreset; label: string }[] = [
  { id: "night", label: "夜班" },
  { id: "paper", label: "稿纸" },
  { id: "blueprint", label: "蓝图" },
];

const VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpenApps: () => void;
  onOpenTerminal: () => void;
}

/**
 * 桌面空白处的右键菜单。
 *
 * 只由 DesktopHome 在桌面背景的 contextmenu 上挂载；窗口、图标、物件自己
 * 的右键不会被劫持。菜单用 fixed 定位，坐标按视口 clamp，靠近屏幕边缘时
 * 向右/向上翻。
 */
export function ContextMenu({
  x,
  y,
  onClose,
  onOpenApps,
  onOpenTerminal,
}: ContextMenuProps) {
  const router = useRouter();
  const { preset, setPreset } = useDesktopSettings();
  const menuRef = useRef<HTMLDivElement>(null);
  // 初始用事件坐标；useLayoutEffect 在首次绘制前按真实尺寸 clamp，
  // 因此不会看到菜单从屏幕外跳回来，也避免渲染期读 window。
  const [position, setPosition] = useState({ left: x, top: y });

  useFocusTrap(menuRef, true, onClose);

  useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    // 微任务里更新 state：仍是绘制前，又避开「effect 体内同步 setState」。
    queueMicrotask(() =>
      setPosition({
        left: clamp(
          x,
          VIEWPORT_MARGIN,
          window.innerWidth - rect.width - VIEWPORT_MARGIN
        ),
        top: clamp(
          y,
          VIEWPORT_MARGIN,
          window.innerHeight - rect.height - VIEWPORT_MARGIN
        ),
      })
    );
  }, [x, y]);

  // 点击面板外部关闭。用 pointerdown 而不是 click：右键菜单打开后紧接着的
  // 左键按下就该收起，不必等到 click 完成。
  useLayoutEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  const choose = (action: () => void) => {
    action();
    onClose();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []
    ).filter((node) => !node.hasAttribute("disabled"));
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next =
      index === -1
        ? 0
        : (index + step + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div
      ref={menuRef}
      className="os-context-menu"
      role="menu"
      aria-label="桌面菜单"
      tabIndex={-1}
      style={position}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="os-menu-label" aria-hidden="true">
        桌面预设
      </p>
      <div role="group" aria-label="桌面预设">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitemradio"
            aria-checked={preset === item.id}
            onClick={() => choose(() => setPreset(item.id))}
          >
            <span>{item.label}</span>
            <span aria-hidden className="os-context-check">
              {preset === item.id ? "✓" : ""}
            </span>
          </button>
        ))}
      </div>

      <div className="os-context-separator" role="separator" />

      <button
        type="button"
        role="menuitem"
        onClick={() => choose(onOpenTerminal)}
      >
        <span>打开终端</span>
        <span aria-hidden>›</span>
      </button>
      <button type="button" role="menuitem" onClick={() => choose(onOpenApps)}>
        <span>全部应用</span>
        <span aria-hidden>›</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => choose(() => router.push("/about"))}
      >
        <span>关于本机</span>
        <span aria-hidden>›</span>
      </button>
    </div>
  );
}
