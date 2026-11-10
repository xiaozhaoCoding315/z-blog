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
import { AppIcon } from "@/components/desktop/icons";
import { Clock } from "@/components/desktop/clock";
import { formatClock, useClockSeconds } from "@/components/desktop/clock-store";

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
  recentNotes: ReactNode;
  statusWidget: ReactNode;
  accountEntry?: ReactNode;
}

type WeatherStyle = CSSProperties & { "--rain-index": number };

const SECTIONS = ["entries", "about", "writing", "letters"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  entries: "入口",
  about: "关于",
  writing: "笔记",
  letters: "留言",
};

const MAIN_ENTRIES = primaryApps.slice(0, 4);
const SIDE_ENTRIES = primaryApps.slice(4);

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
  recentNotes,
  statusWidget,
  accountEntry,
}: PersonalHomeProps) {
  const [section, setSection] = useState<Section>("entries");

  // 只有点击页内下滚提示时做一次平滑；滚轮与键盘仍走浏览器原生即时滚动。
  const smoothScrollToApps = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("home-apps");
    if (!target) return;
    event.preventDefault();
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
    const update = () => {
      const line = window.innerHeight * 0.42;
      let current: Section = "entries";
      for (const item of targets) {
        if (item.element.getBoundingClientRect().top <= line) current = item.name;
      }
      setSection(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
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
      data-current={section === "entries" ? "true" : "false"}
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
          <p className="home-eyebrow">个人开发者工作台</p>
          <h1 id="home-title" className="home-title">
            你好，我是{siteConfig.author.name}
          </h1>
          <div className="home-intro-card">
            <p>{siteConfig.author.bio}</p>
            <p className="home-status">
              <span className="home-status-dot" aria-hidden="true" />
              {status}
            </p>
          </div>
          <div className="home-hero-meta">
            <span>{siteConfig.weather.city}</span>
            <span aria-hidden="true">·</span>
            <span>{primaryApps.length} 个主要入口</span>
            <span aria-hidden="true">·</span>
            <span>{notes.length} 篇真实笔记</span>
          </div>
        </div>

        <div className="home-stage">
          <div className="home-stage-column">
            <span className="home-stage-label">正在做的事</span>
            <p>把需求、架构、实现到上线完整走一遍</p>
          </div>
          <div className="home-stage-column">
            <span className="home-stage-label">最近一篇</span>
            {notes[0] ? (
              <Link href={`/notes/${notes[0].slug}`}>
                {notes[0].title}
                <small>{notes[0].date.replaceAll("-", ".")}</small>
              </Link>
            ) : (
              <p>内容库里还没有已发布笔记</p>
            )}
          </div>
          <div className="home-stage-column home-stage-status" aria-label="站点读数">
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

      <main className="home-body" id="home-apps">
        <section
          className="home-section home-entries"
          id="home-entries"
          aria-labelledby="home-apps-title"
        >
          <header className="home-section-head">
            <div>
              <p className="home-eyebrow dark-eyebrow">从这里开始</p>
              <h2 id="home-apps-title">七个完整页面</h2>
              <p>按文字索引直接进入，不用再打开小窗口。</p>
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
          aria-labelledby="home-about-title"
          onMouseEnter={() => chooseSection("about")}
        >
          <header className="home-section-head">
            <div>
              <p className="home-eyebrow dark-eyebrow">关于</p>
              <h2 id="home-about-title">写在代码与生活之间</h2>
            </div>
          </header>
          <div className="home-about-note">
            <p>
              我是{siteConfig.author.name}，现在在{siteConfig.weather.city}。
              平时把需求、架构、实现到上线完整走一遍，也把读过的东西、正在做的项目和偶尔想听的歌留在站里。
            </p>
            <p>
              这里不追热点，也不替平台整理时间线。能留下来的，都是自己确实读过、做过、想过的内容。
            </p>
            <Link href="/about" className="home-text-link">
              查看完整档案
            </Link>
          </div>
        </section>

        <section
          className="home-section home-writing"
          id="home-writing"
          aria-labelledby="home-writing-title"
          onMouseEnter={() => chooseSection("writing")}
        >
          <header className="home-section-head">
            <div>
              <p className="home-eyebrow dark-eyebrow">最近在写</p>
              <h2 id="home-writing-title">来自仓库的真实笔记</h2>
              <p>标题、日期与摘要都来自内容层，没有示例文章占位。</p>
            </div>
            <Link href="/notes" className="home-text-link">
              全部笔记
            </Link>
          </header>
          <div className="home-writing-frame">{recentNotes}</div>
        </section>

        <section
          className="home-section home-letter"
          id="home-letters"
          aria-labelledby="home-letter-title"
          onMouseEnter={() => chooseSection("letters")}
        >
          <div className="home-letter-note">
            <div>
              <p className="home-eyebrow">留言板</p>
              <h2 id="home-letter-title">留一句话，或者推荐一首歌</h2>
              <p>留言会先经过审核；读不到数据库时，如实显示 NOT AVAILABLE。</p>
            </div>
            <Link href="/letters" className="home-letter-link">
              去留言
            </Link>
          </div>
        </section>

        <nav className="home-section-index" aria-label="首页章节">
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
      </main>
    </div>
  );
}
