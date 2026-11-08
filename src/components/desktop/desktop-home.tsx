import Link from "next/link";
import type { CSSProperties } from "react";
import { desktopTileApps } from "@/config/apps";
import { siteConfig } from "@/config/site";
import { AppIcon } from "./icons";

type IconStyle = CSSProperties & { "--i": number };

/**
 * 阶段 1 的桌面主屏。
 *
 * 只有已经能打开的应用才出现在这里：没有死图标，没有「敬请期待」。
 * 阶段 2 接窗口系统后，这个组件会变成客户端的窗口宿主；
 * 现在它是服务端组件，桌面首屏不为此多加载 JS。
 */
export function DesktopHome({ status }: { status: string }) {
  return (
    <div className="os-desktop">
      <header className="os-identity">
        <h1 className="os-identity-name">{siteConfig.name}</h1>
        <p className="os-identity-status">{status}</p>
      </header>

      <nav className="os-icon-grid" aria-label="应用">
        {desktopTileApps.map((app, index) => (
          <Link
            key={app.id}
            href={app.path}
            className="os-icon"
            title={app.description}
            style={{ "--i": index } as IconStyle}
          >
            <span className="os-icon-tile">
              <AppIcon name={app.icon} className="size-6" />
            </span>
            <span className="os-icon-label">{app.title}</span>
          </Link>
        ))}
      </nav>

      <p className="os-desktop-hint">
        <span>单击图标打开</span>
        <span aria-hidden>·</span>
        <span>任务栏 ≡ 切换预设</span>
      </p>
    </div>
  );
}
