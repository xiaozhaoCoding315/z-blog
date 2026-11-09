"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppDefinition } from "@/config/apps";
import { useDesktopRuntime } from "./desktop-runtime";
import { AppIcon } from "./icons";
import { useTaskbarPanels } from "./taskbar-panels";

/**
 * 启动器：所有应用（含有路由与无路由的窗口型应用）。
 *
 * 点击行为从运行时上下文取，不接收 onOpen 回调：
 * 设置 → 打开系统菜单；窗口型 → 开窗；路由型 → 跳转。
 * 移动端没有窗口，窗口型应用有真实路由时直接进入应用页。
 */
export function Launcher({ apps }: { apps: AppDefinition[] }) {
  const closePanels = useTaskbarPanels();
  const { windows, openSettings } = useDesktopRuntime();
  const router = useRouter();

  const open = (app: AppDefinition) => {
    closePanels();
    if (app.id === "settings") {
      openSettings();
      return;
    }
    if (app.kind === "route") {
      if (app.path) router.push(app.path);
      return;
    }
    // 移动端分流在 openApp：有路径的进全屏路由，终端/助理开全屏覆盖，
    // 其余无路径窗口（更多）不响应。
    windows.openApp(app.id);
  };

  return (
    <div className="os-launcher" role="dialog" aria-label="全部应用">
      <div className="os-launcher-head">
        <span>应用</span>
        <span className="tabular-nums">{apps.length} 个</span>
      </div>
      <div className="os-launcher-grid">
        {apps.map((app) => {
          const content = (
            <>
              <AppIcon name={app.icon} className="size-5" />
              <span>{app.title}</span>
            </>
          );

          if (app.kind === "route" && app.path) {
            return (
              <Link
                key={app.id}
                href={app.path}
                onClick={closePanels}
                className="os-launcher-app"
                title={app.description}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => open(app)}
              className="os-launcher-app"
              title={app.description}
            >
              {content}
            </button>
          );
        })}
      </div>
      <div className="os-launcher-foot">
        <button
          type="button"
          onClick={() => {
            closePanels();
            openSettings();
          }}
        >
          系统设置
        </button>
        <span aria-hidden>·</span>
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
