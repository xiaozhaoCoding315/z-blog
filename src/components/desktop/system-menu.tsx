"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
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

  return (
    <div
      ref={panelRef}
      className="os-system-menu"
      role="dialog"
      aria-label="系统菜单"
      tabIndex={-1}
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
        <Link href="/about" onClick={closePanels}>
          关于本机
        </Link>
        <Link href="/journal" onClick={closePanels}>
          开发日志
        </Link>
        {hasFriends && (
          <Link href="/friends" onClick={closePanels}>
            友链
          </Link>
        )}
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
