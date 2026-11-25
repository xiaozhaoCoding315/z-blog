"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type { AppDefinition, IconKey } from "@/config/apps";
import { primaryApps } from "@/config/apps";
import { siteConfig } from "@/config/site";
import { IcpNotice } from "@/components/site/icp-notice";
import type { FriendLink } from "@/lib/friends-core";
import { AppIcon } from "@/components/desktop/icons";
import { Clock } from "@/components/desktop/clock";
import { formatClock, useClockSeconds } from "@/components/desktop/clock-store";
import { ScrollProgress } from "@/components/motion/scroll-progress";

export interface HomeNote {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
}

interface PersonalHomeProps {
  status: string;
  notes: HomeNote[];
  friends: FriendLink[];
  friendsAvailable: boolean;
  recentNotes: ReactNode;
  statusWidget: ReactNode;
  accountEntry?: ReactNode;
}

type WeatherStyle = CSSProperties & { "--rain-index": number };

const SECTIONS = ["entries", "about", "writing", "letters", "friends"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  entries: "入口",
  about: "关于",
  writing: "笔记",
  letters: "留言",
  friends: "友链",
};

const MAIN_ENTRIES = primaryApps.slice(0, 4);
const SIDE_ENTRIES = primaryApps.slice(4);

/**
 * 入口的内容色只做分类标记：同一列里四种色调彼此可区分，
 * 色值全部来自 globals.css 的 --tone-*，不在组件里写死。
 */
const ENTRY_TONES: Record<string, "teal" | "blue" | "violet" | "amber"> = {
  terminal: "teal",
  projects: "blue",
  about: "amber",
  playlist: "violet",
  notes: "teal",
  assistant: "violet",
  letters: "amber",
};

function TideClock({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  const ms = useClockSeconds();
  return (
    <div className={className} aria-label="北京时间潮汐栏">
      <time
        dateTime={ms ? new Date(ms).toISOString() : undefined}
        suppressHydrationWarning
      >
        北京时间 {formatClock(ms)}
      </time>
      <span>{label}</span>
    </div>
  );
}

/**
 * LeiBox 调研后的首页：中央窄文本 → 真实内容窄台 → 深青绿水位线 →
 * 浅色长内容。七入口是无边框索引，不是统一卡片；水位线只读真实时钟与路由。
 */
export function PersonalHome({
  status,
  notes,
  friends,
  friendsAvailable,
  recentNotes,
  statusWidget,
  accountEntry,
}: PersonalHomeProps) {
  const [section, setSection] = useState<Section>("entries");

  // 只有点击页内下滚提示时做一次平滑；滚轮与键盘仍走浏览器原生即时滚动。
  // 系统开了「减少动效」就改成瞬时跳转，和全站其他动效保持同一条规则。
  const smoothScrollToApps = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("home-apps");
    if (!target) return;
    event.preventDefault();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ?open=id 是旧窗口深链：统一改写成全页路由，不制造幽灵窗口。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("open");
    if (!id) return;
    params.delete("open");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    );
    const app = primaryApps.find((candidate) => candidate.id === id);
    if (app?.path) window.location.assign(app.path);
  }, []);

  useEffect(() => {
    const targets = SECTIONS.map((name) => ({
      name,
      element: document.getElementById(`home-${name}`),
    })).filter((item): item is { name: Section; element: HTMLElement } =>
      Boolean(item.element)
    );
    const measure = () => {
      const line = window.innerHeight * 0.42;
      let current: Section = "entries";
      for (const item of targets) {
        if (item.element.getBoundingClientRect().top <= line) current = item.name;
      }
      setSection(current);
    };
    // 每帧最多算一次：滚动事件比屏幕刷新还密，直接 setState 会把主线程拖住。
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    measure();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const chooseSection = (next: Section) => {
    setSection(next);
    setTimeout(() => setSection(next), 150);
  };

  const renderEntry = (app: AppDefinition, index: number) => (
    <Link
      key={app.id}
      href={app.path ?? "/"}
      className="home-entry-line"
      data-home-index={index}
      data-tone={ENTRY_TONES[app.id] ?? "teal"}
      data-current={section === "entries" ? "true" : "false"}
      data-reveal
      data-spotlight
      style={{ "--reveal-delay": `${index * 45}ms` } as CSSProperties}
    >
      <span className="home-entry-icon" aria-hidden="true">
        <AppIcon name={app.icon as IconKey} />
      </span>
      <span className="home-entry-copy">
        <span className="home-entry-name">{app.title}</span>
        <span className="home-entry-description">{app.description}</span>
      </span>
      <span className="home-entry-rule" aria-hidden="true" />
    </Link>
  );

  return (
    <div className="personal-home">
      <ScrollProgress />
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-weather" aria-hidden="true">
          <div className="home-weather-glow" />
          <div className="home-weather-orb" />
          <div className="home-weather-cloud-a" />
          <div className="home-weather-cloud-b" />
          <div className="home-weather-ring" />
          <div className="home-weather-tide-a" />
          <div className="home-weather-tide-b" />
          <div className="home-weather-tide-flow home-tide-flow" />
          <div className="home-weather-rain">
            {Array.from({ length: 28 }, (_, index) => (
              <span
                key={index}
                style={{ "--rain-index": index } as WeatherStyle}
              />
            ))}
          </div>
        </div>

        <header className="home-hero-nav">
          <Link href="/" className="home-brand">
            <span className="home-brand-mark">Z</span>
            {siteConfig.author.name}
          </Link>
          <nav aria-label="首页快捷导航">
            {primaryApps.slice(0, 5).map((app) => (
              <Link key={app.id} href={app.path ?? "/"}>
                {app.title}
              </Link>
            ))}
          </nav>
          <span className="home-nav-account">{accountEntry}</span>
          <span className="home-nav-clock">
            <Clock withSeconds />
          </span>
        </header>

        <div className="home-hero-inner">
          <p className="home-eyebrow" data-reveal>
            个人开发者工作台
          </p>
          <h1 id="home-title" className="home-title" data-reveal>
            你好，我是{siteConfig.author.name}
          </h1>
          <div className="home-intro-card" data-reveal data-spotlight>
            <p>{siteConfig.author.bio}</p>
            <p className="home-status">
              <span className="home-status-dot" aria-hidden="true" />
              {status}
            </p>
          </div>
          <div className="home-hero-meta" data-reveal>
            <span>{siteConfig.weather.city}</span>
            <span aria-hidden="true">·</span>
            <span>{primaryApps.length} 个主要入口</span>
            <span aria-hidden="true">·</span>
            <span>{notes.length} 篇笔记</span>
          </div>
        </div>

        <div className="home-stage">
          <div className="home-stage-column" data-reveal data-spotlight>
            <span className="home-stage-label">正在做的事</span>
            <p>把需求、架构、实现到上线完整走一遍</p>
          </div>
          <div className="home-stage-column" data-reveal data-spotlight>
            <span className="home-stage-label">最近一篇</span>
            {notes[0] ? (
              <Link href={`/notes/${notes[0].slug}`}>
                {notes[0].title}
                <small>{notes[0].date.replaceAll("-", ".")}</small>
              </Link>
            ) : (
              <p>还没有发布笔记</p>
            )}
          </div>
          <div
            className="home-stage-column home-stage-status"
            aria-label="站点读数"
            data-reveal
          >
            {statusWidget}
          </div>
        </div>

        <a
          className="home-scroll-cue"
          href="#home-apps"
          onClick={smoothScrollToApps}
        >
          <span>向下滚动</span>
          <span className="home-scroll-line" aria-hidden="true" />
          <span className="home-scroll-dot" aria-hidden="true" />
        </a>
        <div className="home-wave" aria-hidden="true" />
        <div className="home-tide-line home-tide-breathe" aria-hidden="true">
          <span />
        </div>
        <TideClock className="home-tide-clock" label="潮汐 · 首页" />
      </section>

      <div className="home-ticker" aria-hidden="true">
        <div className="home-ticker-track">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>
              {[
                "PERSONAL DEV OS",
                "小元同学在线",
                "笔记 / 留言 / 歌单",
                "七个入口",
                "慢慢更新",
                "夜间模式默认",
              ].map((label) => (
                <span key={label}>
                  <i />
                  {label}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <main className="home-body" id="home-apps">
        <section
          className="home-section home-entries"
          id="home-entries"
          data-tone="teal"
          aria-labelledby="home-apps-title"
        >
          <header className="home-section-head" data-reveal>
            <div>
              <p className="home-eyebrow dark-eyebrow">从这里开始</p>
              <h2 id="home-apps-title">七个完整页面</h2>
            </div>
          </header>

          <div className="home-entry-index">
            <nav className="home-entry-main" aria-label="主要入口">
              {MAIN_ENTRIES.map(renderEntry)}
            </nav>
            <nav className="home-entry-side" aria-label="其他入口">
              {SIDE_ENTRIES.map((app, index) =>
                renderEntry(app, MAIN_ENTRIES.length + index)
              )}
            </nav>
          </div>
        </section>

        <section
          className="home-section home-about"
          id="home-about"
          data-tone="amber"
          aria-labelledby="home-about-title"
          onMouseEnter={() => chooseSection("about")}
        >
          <header className="home-section-head" data-reveal>
            <div>
              <p className="home-eyebrow dark-eyebrow">关于</p>
              <h2 id="home-about-title">写在代码与生活之间</h2>
            </div>
          </header>
          <div className="home-about-note" data-reveal data-spotlight>
            <p>
              我是{siteConfig.author.name}，现在在{siteConfig.weather.city}。
              平时把需求、架构、实现到上线走一遍，也把读过的、做过的和想听的歌留在这里。
            </p>
            <Link href="/about" className="home-text-link">
              查看完整档案
            </Link>
          </div>
        </section>

        <section
          className="home-section home-writing"
          id="home-writing"
          data-tone="teal"
          aria-labelledby="home-writing-title"
          onMouseEnter={() => chooseSection("writing")}
        >
          <header className="home-section-head" data-reveal>
            <div>
              <p className="home-eyebrow dark-eyebrow">最近在写</p>
              <h2 id="home-writing-title">最近发布的笔记</h2>
            </div>
            <Link href="/notes" className="home-text-link">
              全部笔记
            </Link>
          </header>
          <div className="home-writing-frame" data-reveal data-spotlight>
            {recentNotes}
          </div>
        </section>

        <section
          className="home-section home-letter"
          id="home-letters"
          data-tone="amber"
          aria-labelledby="home-letter-title"
          onMouseEnter={() => chooseSection("letters")}
        >
          <div className="home-letter-note" data-reveal data-spotlight>
            <div>
              <p className="home-eyebrow">留言板</p>
              <h2 id="home-letter-title">留一句话，或者推荐一首歌</h2>
              <p>留言会先经过审核。</p>
            </div>
            <Link href="/letters" className="home-letter-link">
              去留言
            </Link>
          </div>
        </section>

        <section
          className="home-section home-friends"
          id="home-friends"
          data-tone="blue"
          aria-labelledby="home-friends-title"
          onMouseEnter={() => chooseSection("friends")}
        >
          <header className="home-section-head" data-reveal>
            <div>
              <p className="home-eyebrow dark-eyebrow">FRIENDS</p>
              <h2 id="home-friends-title">友链</h2>
              <p>平时会打开的站点。</p>
            </div>
            <Link href="/friends" className="home-text-link">
              全部友链
            </Link>
          </header>
          <div className="home-friends-frame" data-reveal data-spotlight>
            {!friendsAvailable ? (
              <div className="home-friends-empty">
                <p>友链暂时读不到，过一会儿再刷新。</p>
              </div>
            ) : friends.length > 0 ? (
              <div className="home-friends-chips">
                {friends.map((friend) => (
                  <a
                    key={`${friend.name}-${friend.url}`}
                    className="home-friend-chip"
                    href={friend.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {friend.name}
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="home-friends-empty">
                <p>还没有添加友链。</p>
              </div>
            )}
          </div>
        </section>

        <nav className="home-section-index" aria-label="首页章节" data-reveal>
          {SECTIONS.map((name) => (
            <a
              key={name}
              href={`#home-${name}`}
              aria-current={section === name ? "location" : undefined}
              onClick={() => chooseSection(name)}
            >
              {SECTION_LABELS[name]}
            </a>
          ))}
        </nav>

        {/* 首页把任务栏整个藏起来了（data-home），页脚也不存在——备案号必须
            在这里单独出现，否则手机上首页一个字都看不到。 */}
        <footer className="home-footer" data-reveal>
          <span>{siteConfig.author.name} · {siteConfig.weather.city}</span>
          <IcpNotice />
        </footer>
      </main>
    </div>
  );
}
