import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type CSSProperties } from "react";
import { PersonalHome, type HomeNote } from "@/components/home/personal-home";
import { StatusWidget } from "@/components/desktop/status-widget";
import { AccountEntry } from "@/components/site/account-entry";
import { now as portfolioNow } from "@/config/portfolio";
import { siteConfig } from "@/config/site";
import { getAllNotes } from "@/content";
import { getGithubActivity } from "@/lib/github-server";
import { getFriends } from "@/lib/friends-server";
import { getWeather } from "@/lib/weather-server";

/**
 * 首页仍停在请求期：天气/GitHub 读数不能被构建机的空状态烤进静态壳。
 * 首屏、七个入口与真实笔记先交付，数据洞各自流式补齐。
 */
export const instant = false;

function ReadingFallback({ label }: { label: string }) {
  return (
    <div className="os-window-pane" aria-live="polite">
      <p className="os-pane-label">读取中</p>
      <p className="text-[13px] leading-6 text-muted-foreground">{label}…</p>
    </div>
  );
}

async function StatusWidgetSlot() {
  const [weather, activity] = await Promise.all([
    getWeather(),
    getGithubActivity(),
  ]);
  const commits14 = activity.days
    .slice(-14)
    .reduce((sum, day) => sum + day.count, 0);

  return (
    <StatusWidget
      weather={weather}
      listening={portfolioNow.listening}
      reading={portfolioNow.reading}
      activity={activity}
      commits14={commits14}
      updatedAt={portfolioNow.updatedAt}
    />
  );
}

/** 最近笔记来自内容层，不编示例；一篇都没有时如实留白。 */
function RecentNotes({ notes }: { notes: HomeNote[] }) {
  if (notes.length === 0) {
    return (
      <p className="home-notes-empty">还没有发布笔记。</p>
    );
  }

  return (
    <div className="home-notes-grid">
      {notes.map((note, index) => (
        <Link
          key={note.slug}
          href={`/notes/${note.slug}`}
          className="home-note-card"
          style={{ "--i": index } as CSSProperties}
        >
          <span className="home-note-visual" aria-hidden="true">
            <span className="home-note-visual-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="home-note-visual-lines" />
          </span>
          <span className="home-note-content">
            <time dateTime={note.date}>{note.date.replaceAll("-", ".")}</time>
            <h3>{note.title}</h3>
            <p>{note.description || "点开读正文。"}</p>
            <span className="home-note-tags">
              {note.tags.slice(0, 2).map((tag) => `#${tag}`).join(" ") || "未分类"}
            </span>
            <span className="home-note-more" aria-hidden="true">
              阅读全文 →
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  await connection();

  const friendsResult = await getFriends();
  const notes: HomeNote[] = getAllNotes().slice(0, 3).map((note) => ({
    slug: note.slug,
    title: note.meta.title,
    date: note.meta.date,
    description: note.meta.description ?? "",
    tags: note.meta.tags ?? [],
  }));

  return (
    <PersonalHome
      status={siteConfig.status}
      notes={notes}
      friends={friendsResult.friends}
      friendsAvailable={friendsResult.available}
      recentNotes={<RecentNotes notes={notes} />}
      statusWidget={
        <Suspense fallback={<ReadingFallback label="实时状态" />}>
          <StatusWidgetSlot />
        </Suspense>
      }
      accountEntry={
        <Suspense
          fallback={
            <a href="/login" className="account-auth-login">
              登录
            </a>
          }
        >
          <AccountEntry />
        </Suspense>
      }
    />
  );
}
