import Link from "next/link";
import { getChangelog } from "@/config/changelog";
import { siteConfig } from "@/config/site";
import { OpenSettingsButton } from "./desktop-home";

/**
 * 「更多」文件夹窗口：更新日志、友链（仅非空）、订阅与站点入口。
 *
 * 服务端组件：更新日志直接读静态配置，不查库也不新增请求。
 * 设置入口复用 desktop-home 里的客户端岛（只广播 z-os:open-settings）。
 */
export function MoreWindow({ hasFriends }: { hasFriends: boolean }) {
  const recent = getChangelog().slice(0, 5);

  return (
    <div className="os-window-pane os-more-window">
      <section aria-label="更新日志">
        <p className="os-pane-label">更新日志 · 最近 5 条</p>
        <ul className="os-more-list">
          {recent.map((entry) => (
            <li key={`${entry.date}-${entry.title}`}>
              <Link href="/journal" className="os-pane-link">
                <span className="os-more-title">{entry.title}</span>
                <span className="os-more-date">{entry.date}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="os-more-links" aria-label="站点入口">
        {hasFriends && (
          <Link href="/friends" className="os-pane-link">
            <span>友链</span>
            <span aria-hidden>→</span>
          </Link>
        )}
        <a href="/feed.xml" className="os-pane-link">
          <span>RSS</span>
          <span aria-hidden>↗</span>
        </a>
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer noopener"
          className="os-pane-link"
        >
          <span>GitHub</span>
          <span aria-hidden>↗</span>
        </a>
        <Link href="/about" className="os-pane-link">
          <span>关于本机</span>
          <span aria-hidden>→</span>
        </Link>
        <OpenSettingsButton />
      </section>
    </div>
  );
}
