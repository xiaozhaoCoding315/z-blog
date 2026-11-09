import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { DeskObjects } from "@/components/desktop/desk-objects";
import {
  DesktopHome,
  OpenSettingsButton,
} from "@/components/desktop/desktop-home";
import { StatusWidget } from "@/components/desktop/status-widget";
import { StickyNote } from "@/components/desktop/sticky-note";
import { GalleryView } from "@/components/gallery/gallery-view";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { SnippetBrowser } from "@/components/snippets/snippet-browser";
import { getChangelogStats } from "@/config/changelog";
import { now as portfolioNow, friends, projects } from "@/config/portfolio";
import { siteConfig } from "@/config/site";
import { snippets } from "@/config/snippets";
import { collectGalleryImages, type GalleryImage } from "@/lib/gallery";
import { getGithubActivity } from "@/lib/github-server";
import { getMoments, type MomentsResult } from "@/lib/moments-server";
import { getPinnedMoment, getStatusSentence } from "@/lib/settings-server";
import {
  highlightSnippets,
  type HighlightedSnippet,
} from "@/lib/snippets-server";
import { getWeather } from "@/lib/weather-server";

/**
 * 桌面主屏要读站长的状态句与生活流，所以停在请求期。
 * 没有这行，构建时数据库缺席会把默认状态句烤进静态壳。
 */
export const instant = false;

/**
 * 生活流窗口：最近 12 条的紧凑版。
 * Phase 3 会换成带筛选的版本，这里先复用同一个 Moment 与主脊线。
 */
function LifeWindowContent({ life }: { life: MomentsResult }) {
  if (!life.available) {
    return (
      <div className="os-window-pane">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
          Not Available
        </p>
        <h2 className="font-heading text-[17px] font-bold">生活流暂时读不到</h2>
        <p className="text-[13px] leading-6 text-muted-foreground">
          这一栏的内容存在数据库里，现在连不上。不拿空列表冒充「还没发过」。
        </p>
        <Link href="/life" className="os-pane-link">
          <span>去完整日志页</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  if (life.moments.length === 0) {
    return (
      <div className="os-window-pane">
        <h2 className="font-heading text-[17px] font-bold">还没有第一条</h2>
        <p className="text-[13px] leading-6 text-muted-foreground">
          数据库是通的，只是这条时间线还空着。
        </p>
        <Link href="/life" className="os-pane-link">
          <span>去完整日志页</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="os-window-pane">
      <div className="relative pl-6">
        <div aria-hidden className="life-spine">
          <span className="life-spine-fill" />
        </div>
        <ul className="flex flex-col gap-7">
          {life.moments.slice(0, 12).map((moment) => (
            <li key={moment.id} className="relative">
              <span
                aria-hidden
                className={`absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full ${NODE_CLASS[moment.kind]}`}
              />
              <Moment moment={moment} />
            </li>
          ))}
        </ul>
      </div>
      <Link href="/life" className="os-pane-link">
        <span>全部日志</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

/**
 * 生活胶囊窗口：最近 24 张真实照片，灯箱铺满整个窗口（含标题栏）。
 * 读不到库时不拿空相册冒充「还没发过」。
 */
function GalleryWindowContent({
  life,
  images,
}: {
  life: MomentsResult;
  images: GalleryImage[];
}) {
  if (!life.available) {
    return (
      <div className="os-window-pane">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
          Not Available
        </p>
        <h2 className="font-heading text-[17px] font-bold">
          生活胶囊暂时读不到
        </h2>
        <p className="text-[13px] leading-6 text-muted-foreground">
          照片和动态存在数据库里，现在连不上。不拿空相册冒充「还没发过」。
        </p>
        <Link href="/gallery" className="os-pane-link">
          <span>打开完整相册</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <GalleryView images={images} variant="window" />
      <div className="px-4 pb-4">
        <Link href="/gallery" className="os-pane-link">
          <span>全部照片</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

/** 项目窗口：与 /projects 共用看板，仅容器尺寸不同。 */
function ProjectsWindowContent() {
  return <KanbanBoard projects={projects} variant="window" />;
}

/** 代码片段窗口：与 /snippets 共用浏览器，两栏布局。 */
function SnippetsWindowContent({
  highlighted,
}: {
  highlighted: HighlightedSnippet[];
}) {
  return (
    <SnippetBrowser
      snippets={snippets}
      highlighted={highlighted}
      variant="window"
    />
  );
}

/** 关于本机：Phase 2 的紧凑档案卡，数据全部来自站点配置。 */
function AboutWindowContent() {
  return (
    <div className="os-window-pane">
      <div className="flex items-center gap-4">
        <Image
          src={siteConfig.author.avatar}
          alt={siteConfig.author.name}
          width={52}
          height={52}
          unoptimized
          className="shrink-0"
        />
        <div>
          <h2 className="font-heading text-[17px] font-bold">
            {siteConfig.author.name}
          </h2>
          <p className="font-mono text-[10px] text-muted-foreground">
            全栈 · AI 应用
          </p>
        </div>
      </div>
      <p className="text-[13px] leading-6 text-muted-foreground">
        {siteConfig.author.bio}
      </p>
      <p className="font-mono text-[10px] text-muted-foreground">
        建站于 {siteConfig.startedAt}
      </p>
      <Link href="/about" className="os-pane-link">
        <span>关于本机</span>
        <span aria-hidden>→</span>
      </Link>
      <a
        href={siteConfig.links.github}
        target="_blank"
        rel="noreferrer noopener"
        className="os-pane-link"
      >
        <span>GitHub</span>
        <span aria-hidden>↗</span>
      </a>
      {siteConfig.author.email && (
        <a href={`mailto:${siteConfig.author.email}`} className="os-pane-link">
          <span>邮箱</span>
          <span aria-hidden>↗</span>
        </a>
      )}
    </div>
  );
}

function MoreWindowContent({ hasFriends }: { hasFriends: boolean }) {
  return (
    <div className="os-window-pane">
      <p className="os-pane-label">更多</p>
      <Link href="/journal" className="os-pane-link">
        <span>更新日志</span>
        <span className="text-muted-foreground">
          {getChangelogStats().entries} 次迭代
        </span>
      </Link>
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
      <OpenSettingsButton />
    </div>
  );
}

export default async function HomePage() {
  await connection();
  const [status, life, pinned, weather, activity, highlightedSnippets] =
    await Promise.all([
      getStatusSentence(),
      getMoments(),
      getPinnedMoment(),
      getWeather(),
      getGithubActivity(),
      highlightSnippets(),
    ]);

  const galleryImages = life.available
    ? collectGalleryImages(life.moments)
    : [];
  // 首页窗口只铺最近 24 张；完整相册在 /gallery。
  const windowGallery = galleryImages.slice(0, 24);
  const photo = galleryImages[0] ? { src: galleryImages[0].src } : null;
  const commits14 = activity.days
    .slice(-14)
    .reduce((sum, day) => sum + day.count, 0);

  // 终端/助理不在这里：它们由 DesktopShell 的 GlobalWindows 挂载（Task 4/5）。
  const windowContent: Record<string, ReactNode> = {
    life: <LifeWindowContent life={life} />,
    gallery: <GalleryWindowContent life={life} images={windowGallery} />,
    projects: <ProjectsWindowContent />,
    snippets: (
      <SnippetsWindowContent highlighted={highlightedSnippets} />
    ),
    about: <AboutWindowContent />,
    more: <MoreWindowContent hasFriends={friends.length > 0} />,
  };

  return (
    <DesktopHome
      status={status}
      windowContent={windowContent}
      statusWidget={
        <StatusWidget
          weather={weather}
          listening={portfolioNow.listening}
          reading={portfolioNow.reading}
          activity={activity}
          commits14={commits14}
          updatedAt={portfolioNow.updatedAt}
        />
      }
      deskObjects={<DeskObjects photo={photo} />}
      {...(pinned ? { stickyNote: <StickyNote moment={pinned} /> } : {})}
    />
  );
}
