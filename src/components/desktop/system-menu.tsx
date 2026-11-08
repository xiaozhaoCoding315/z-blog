"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { siteConfig } from "@/config/site";
import {
  useDesktopSettings,
  type DesktopPreset,
} from "./use-desktop-settings";
import { useTaskbarPanels } from "./taskbar-panels";

const PRESETS: { id: DesktopPreset; label: string }[] = [
  { id: "night", label: "夜班" },
  { id: "paper", label: "稿纸" },
  { id: "blueprint", label: "蓝图" },
];

export function SystemMenu({
  accountMenu,
  hasFriends,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
}) {
  const closePanels = useTaskbarPanels();
  const { preset, setPreset } = useDesktopSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanels();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanels]);

  // 账号区由服务端渲染，链接不带 onClick；在捕获阶段统一处理链接和提交按钮，
  // 让 Next 的客户端导航（不触发 popstate）与退出登录表单也能收起菜单。
  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('a[href], button[type="submit"]')) {
      closePanels();
    }
  };

  return (
    <div
      ref={panelRef}
      className="os-system-menu"
      role="dialog"
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
      </section>

      <section>
        <p className="os-menu-label">系统</p>
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
