"use client";

import Link from "next/link";
import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { siteConfig } from "@/config/site";
import {
  useDesktopSettings,
  type DesktopPreset,
} from "./use-desktop-settings";
import { useDesktopRuntime } from "./desktop-runtime";
import { useFocusTrap } from "./focus-trap";
import { useTaskbarPanels } from "./taskbar-panels";

const PRESETS: { id: DesktopPreset; label: string }[] = [
  { id: "night", label: "夜班" },
  { id: "paper", label: "稿纸" },
  { id: "blueprint", label: "蓝图" },
];

/**
 * 系统菜单 = 设置面板。
 *
 * 面板用 dialog + useFocusTrap：Tab 循环、Esc 关闭并归还焦点。
 * 重置布局会清空窗口与 z-os:windows，然后广播 2 秒 toast；toast 宿主在
 * Taskbar，因此菜单卸载不会吞掉提示。
 */
export function SystemMenu({
  accountMenu,
  hasFriends,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
}) {
  const closePanels = useTaskbarPanels();
  const { preset, setPreset, objects, setObjects } = useDesktopSettings();
  const { windows, openTerminal } = useDesktopRuntime();
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, true, closePanels);

  // 账号区由服务端渲染，链接不带 onClick；在捕获阶段统一处理链接和提交按钮，
  // 让 Next 的客户端导航（不触发 popstate）与退出登录表单也能收起菜单。
  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('a[href], button[type="submit"]')) {
      closePanels();
    }
  };

  const resetLayout = () => {
    windows.resetLayout();
    closePanels();
    window.dispatchEvent(
      new CustomEvent("z-os:toast", {
        detail: { message: "已重置，窗口已关闭" },
      })
    );
  };

  return (
    <div
      ref={panelRef}
      className="os-system-menu"
      role="dialog"
      aria-modal="true"
      aria-label="系统菜单"
      tabIndex={-1}
      onClickCapture={handleClickCapture}
    >
      <section>
        <p className="os-menu-label">桌面</p>
        <div className="os-menu-presets">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={preset === item.id}
              onClick={() => setPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="os-menu-link os-menu-switch"
          aria-pressed={objects}
          onClick={() => setObjects(!objects)}
        >
          <span>桌面物件</span>
          <span aria-hidden>{objects ? "开" : "关"}</span>
        </button>
      </section>

      <section>
        <p className="os-menu-label">系统</p>
        <button
          type="button"
          className="os-menu-link"
          onClick={() => {
            closePanels();
            openTerminal();
          }}
        >
          打开终端
        </button>
        <button
          type="button"
          className="os-menu-link"
          onClick={resetLayout}
        >
          重置窗口布局
        </button>
        <Link href="/about">关于本机</Link>
        <Link href="/journal">开发日志</Link>
        {hasFriends && <Link href="/friends">友链</Link>}
        <a href="/feed.xml">RSS</a>
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer noopener"
        >
          GitHub ↗
        </a>
      </section>

      <section>
        <p className="os-menu-label">账号</p>
        {accountMenu}
      </section>
    </div>
  );
}
