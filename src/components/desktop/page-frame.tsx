"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  findAppByPath,
  isAccountPagePath,
  isFullPagePath,
  primaryApps,
} from "@/config/apps";
import { siteConfig } from "@/config/site";
import { IcpNotice } from "@/components/site/icp-notice";
import { formatClock, useClockSeconds } from "@/components/desktop/clock-store";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { AppFrame } from "./app-frame";

/**
 * 每种内容用一套自己的骨架，而不是七个页面共用「纸卡 + 巨大等宽标题」。
 *
 * - editorial：笔记 / 生活 / 关于 / 开发日志。纸面、衬线标题、62ch 正文。
 * - workstation：项目 / 终端 / 片段。深色工作台、等宽、档案编号。
 * - letter：留言板 / 友链。信纸、横线、称呼与落款。
 * - media：歌单 / 相册 / 书架。封面直接铺在桌面上，不套卡片。
 */
const LAYOUT_BY_APP: Record<string, "editorial" | "workstation" | "letter" | "media"> = {
  notes: "editorial",
  life: "editorial",
  about: "editorial",
  journal: "editorial",
  projects: "workstation",
  terminal: "workstation",
  snippets: "workstation",
  letters: "letter",
  friends: "letter",
  playlist: "media",
  gallery: "media",
  shelf: "media",
};

/**
 * 第三轮的全页外壳：七个主入口与它们的子页面回到自然文档流，
 * 旧页面继续使用原来的桌面应用窗框。
 */
export function PageFrame({
  children,
  accountEntry,
}: {
  children: ReactNode;
  accountEntry?: ReactNode;
}) {
  const pathname = usePathname();
  const fullPage = isFullPagePath(pathname);
  const ms = useClockSeconds();

  // 全页模式由文档根节点滚动；路由变化后明确回到顶部。
  useEffect(() => {
    if (!fullPage) return;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [fullPage, pathname]);

  if (!fullPage) {
    return (
      <>
        <ScrollProgress />
        <AppFrame>{children}</AppFrame>
      </>
    );
  }

  const app = findAppByPath(pathname);
  const accountPath = isAccountPagePath(pathname);
  const pageTheme = accountPath ? "profile" : app?.id ?? "default";
  const pageTitle = accountPath
    ? pathname === "/login"
      ? "登录 / 注册"
      : pathname === "/profile"
        ? "我的资料"
        : "个人主页"
    : app?.title ?? pathname;
  const appIndex = app ? primaryApps.findIndex((item) => item.id === app.id) : -1;
  const layout = app ? (LAYOUT_BY_APP[app.id] ?? "editorial") : "editorial";
  const tideLabel =
    appIndex >= 0
      ? `潮汐 · ${String(appIndex + 1).padStart(2, "0")} / ${app?.title}`
      : `潮汐 · ${pageTitle}`;
  // 文字容器沿用第四轮验证过的亮色阅读主题；边缘背景由页面主题单独铺陈。
  return (
    <div
      className="fullpage-shell"
      data-page-theme={pageTheme}
      data-layout={layout}
      data-readable-theme={pathname.startsWith("/notes/") ? "true" : "false"}
    >
      <ScrollProgress />
      <header className="fullpage-topbar">
        <Link href="/" className="fullpage-brand">
          <span className="fullpage-brand-mark" aria-hidden="true">
            Z
          </span>
          <span>{siteConfig.author.name}</span>
          <span className="fullpage-brand-path">{pageTitle}</span>
        </Link>
        <nav className="fullpage-nav" aria-label="主要入口">
          {primaryApps.map((item) => (
            <Link
              key={item.id}
              href={item.path ?? "/"}
              className="fullpage-nav-link"
              aria-current={
                item.path &&
                (pathname === item.path ||
                  pathname.startsWith(`${item.path}/`))
                  ? "page"
                  : undefined
              }
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="fullpage-account">{accountEntry}</div>
        <Link href="/" className="fullpage-home-link">
          首页
        </Link>
      </header>
      <div className="fullpage-tide-clock" aria-label="北京时间潮汐栏">
        <time
          dateTime={ms ? new Date(ms).toISOString() : undefined}
          suppressHydrationWarning
        >
          北京时间 {formatClock(ms)}
        </time>
        <span>{tideLabel}</span>
      </div>
      <main
        key={pathname}
        id="fullpage-main"
        className="fullpage-main route-enter"
      >
        {children}
      </main>
      <footer className="fullpage-footer">
        <span>{siteConfig.author.name} · {siteConfig.weather.city}</span>
        {/* 备案号必须是页脚里独立的可见元素；「七个入口」留在最后一个，
            移动端的 `span:last-child` 规则只隐藏它，不会连备案号一起藏掉。 */}
        <IcpNotice />
        <span>七个入口</span>
      </footer>
    </div>
  );
}
