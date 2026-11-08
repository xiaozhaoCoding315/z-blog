"use client";

import Link from "next/link";
import type { LinkedApp } from "@/config/apps";
import { AppIcon } from "./icons";
import { useTaskbarPanels } from "./taskbar-panels";

export function Launcher({ apps }: { apps: LinkedApp[] }) {
  const closePanels = useTaskbarPanels();

  return (
    <div className="os-launcher" role="dialog" aria-label="全部应用">
      <div className="os-launcher-head">
        <span>应用</span>
        <span>{apps.length} 个</span>
      </div>
      <div className="os-launcher-grid">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.path}
            onClick={closePanels}
            className="os-launcher-app"
            title={app.description}
          >
            <AppIcon name={app.icon} className="size-5" />
            <span>{app.title}</span>
          </Link>
        ))}
      </div>
      <div className="os-launcher-foot">
        <Link href="/about" onClick={closePanels}>
          关于本机
        </Link>
        <span aria-hidden>·</span>
        <Link href="/journal" onClick={closePanels}>
          开发日志
        </Link>
        <span aria-hidden>·</span>
        <a href="/feed.xml">RSS</a>
      </div>
    </div>
  );
}
