import Link from "next/link";
import { connection } from "next/server";
import { Suspense, cache, type ReactNode } from "react";
import { AboutProfile } from "@/components/about/about-profile";
import { DeskObjects } from "@/components/desktop/desk-objects";
import { DesktopHome } from "@/components/desktop/desktop-home";
import { DesktopTagFilter } from "@/components/life/desktop-tag-filter";
import { MoreWindow } from "@/components/desktop/more-window";
import { StatusWidget } from "@/components/desktop/status-widget";
import { StickyNote } from "@/components/desktop/sticky-note";
import { GalleryView } from "@/components/gallery/gallery-view";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { SnippetBrowser } from "@/components/snippets/snippet-browser";
import { now as portfolioNow, friends, projects } from "@/config/portfolio";
import { siteConfig } from "@/config/site";
import { snippets } from "@/config/snippets";
import { collectGalleryImages, type GalleryImage } from "@/lib/gallery";
import { formatDay, momentText } from "@/lib/life";
import { collectTags, MAX_TAGS } from "@/lib/tags";
import {
  getGithubActivity,
  type GithubActivity,
} from "@/lib/github-server";
import { getMoments, type MomentsResult } from "@/lib/moments-server";
import { getPinnedMoment } from "@/lib/settings-server";
import {
  highlightSnippets,
  type HighlightedSnippet,
} from "@/lib/snippets-server";
import { getWeather } from "@/lib/weather-server";

/**
 * 桌面主屏要读生活流、钉选、天气与片段，所以停在请求期。
 * 没有这行，构建时数据库缺席会把「读不到」烤进静态壳。
 * 左上角状态句用配置文件里的默认句，不在这个请求里等数据库：
 * 它是文案而非实时读数，且客户端 DesktopHome 接口保持原样。
 */
export const instant = false;

/*
 * 同一请求内多个 Suspense 洞共享一份数据：
 * React.cache 按请求去重 getMoments / getGithubActivity / highlightSnippets，
 * 这些内层函数本身还带 use cache，跨请求仍按自己的 cacheLife 复用。
 */
const readLife = cache(() => getMoments());
const readActivity = cache(() => getGithubActivity());
const readHighlightedSnippets = cache(() => highlightSnippets());

/** 流式洞的统一占位：说清楚正在读取，不放假读数、假进程或示例。 */
function ReadingFallback({ label }: { label: string }) {
  return (
    <div className="os-window-pane" aria-live="polite">
      <p className="os-pane-label">读取中</p>
      <p className="text-[13px] leading-6 text-muted-foreground">
        {label} · 暂无数据时显示 NOT AVAILABLE
      </p>
    </div>
  );
}

/**
 * 生活流窗口：最近 12 条的紧凑版，复用同一个 Moment 与主脊线。
 * chips 是客户端即时筛选岛；它只切换服务端提供的 ReactNode 槽位，
 * 因此无 JS 时 12 条纯服务端内容仍完整可读（/life 始终是完整无 JS 入口）。
 */
async function LifeWindowContent() {
  const life = await readLife();
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

  const visible = life.moments.slice(0, 12);
  const chips = collectTags(visible).slice(0, 8);
  const items = visible.map((moment) => ({
    id: moment.id,
    tags: moment.tags ?? [],
    node: (
      <li key={moment.id} className="relative">
        <span
          aria-hidden
          className={`absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full ${NODE_CLASS[moment.kind]}`}
        />
        <Moment moment={moment} />
      </li>
    ),
  }));

  return (
    <div className="os-window-pane">
      {chips.length > 0 ? (
        <DesktopTagFilter
          tags={chips.map(({ tag, count }) => ({ tag, count }))}
          max={MAX_TAGS}
          items={items}
          emptyMessage="没有同时带这些标签的动态"
        />
      ) : (
        <div className="relative pl-6">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>
          <ul className="flex flex-col gap-7">
            {items.map((item) => item.node)}
          </ul>
        </div>
      )}
      <Link href="/life" className="os-pane-link">
        <span>全部日志</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

/**
 * 生活胶囊窗口：最近 12 张真实照片，灯箱铺满整个窗口（含标题栏）。
 * 读不到库时不拿空相册冒充「还没发过」。
 */
async function GalleryWindowContent() {
  const life = await readLife();
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

  const galleryImages = collectGalleryImages(life.moments);
  // 首页窗口只铺最近 12 张；完整相册在 /gallery。
  const images: GalleryImage[] = galleryImages.slice(0, 12);

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

/** 桌面物件：由同一份生活流算出最新真实照片；无图时是 NO PHOTO 空白相纸。 */
async function DeskObjectsSlot() {
  const life = await readLife();
  const first = life.available ? collectGalleryImages(life.moments)[0] : null;
  return <DeskObjects photo={first ? { src: first.src } : null} />;
}

/** 项目窗口：与 /projects 共用看板，仅容器尺寸不同。 */
function ProjectsWindowContent() {
  return <KanbanBoard projects={projects} variant="window" />;
}

/** 代码片段窗口：与 /snippets 共用浏览器，两栏布局。 */
async function SnippetsWindowContent() {
  const highlighted: HighlightedSnippet[] = await readHighlightedSnippets();
  return (
    <SnippetBrowser
      snippets={snippets}
      highlighted={highlighted}
      variant="window"
    />
  );
}

/**
 * 关于本机：与 /about 共用同一份档案（窗口只渲染紧凑版）。
 * activity 用共享读数，避免同一请求再取一次 GitHub。
 */
async function AboutWindowContent() {
  const activity: GithubActivity = await readActivity();
  return <AboutProfile variant="window" activity={activity} />;
}

/** 状态组件：天气、GitHub 与手动字段都读真实值，失败显示 NOT AVAILABLE。 */
async function StatusWidgetSlot() {
  const [weather, activity] = await Promise.all([
    getWeather(),
    readActivity(),
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

/** 桌面便签只认真实钉选；库里没钉或读不到就不渲染。 */
async function StickyNoteSlot() {
  const pinned = await getPinnedMoment();
  return pinned ? <StickyNote moment={pinned} /> : null;
}

/**
 * 移动端「最近日志」卡：最近一条真实动态（文字/首图），或诚实的
 * NOT AVAILABLE。桌面不渲染，避免与生活流窗口重复取数或复制其结构。
 */
async function MobileLifeCard() {
  const life: MomentsResult = await readLife();
  const latest = life.moments[0];
  const photo = latest?.images?.[0];

  return (
    <section className="os-mobile-card" aria-label="最近日志">
      <div className="os-mobile-card-head">
        <p className="os-pane-label">最近日志</p>
        <Link href="/life" className="os-mobile-card-link">
          全部日志 →
        </Link>
      </div>

      {!life.available ? (
        <>
          <p className="os-mobile-na">NOT AVAILABLE</p>
          <p className="os-mobile-card-copy">
            生活流存在数据库里，现在连不上。不拿空列表冒充「还没发过」。
          </p>
        </>
      ) : !latest ? (
        <p className="os-mobile-card-copy">
          数据库是通的，只是这条时间线还空着。
        </p>
      ) : (
        <Link href={`/life/${latest.id}`} className="os-mobile-moment">
          <time
            className="os-mobile-moment-date"
            dateTime={latest.publishedAt}
          >
            {formatDay(latest.publishedAt)}
          </time>
          <p className="os-mobile-moment-text">{momentText(latest)}</p>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="os-mobile-moment-photo"
              loading="lazy"
              decoding="async"
            />
          )}
        </Link>
      )}
    </section>
  );
}

/**
 * 首页服务端只做两件事：声明请求期，然后立即把桌面壳与图标交出去。
 * 每个数据洞各读自己需要的东西，并由独立 Suspense 边界流式补齐；
 * 各洞互不阻塞，也不会出现示例读数或全屏 loader。状态句是静态文案，
 * 留在壳里；数据库覆盖值仍由 /life 等页面的请求期读取层负责。
 */
export default async function HomePage() {
  await connection();

  const windowContent: Record<string, ReactNode> = {
    life: (
      <Suspense fallback={<ReadingFallback label="每日日志" />}>
        <LifeWindowContent />
      </Suspense>
    ),
    gallery: (
      <Suspense fallback={<ReadingFallback label="生活胶囊" />}>
        <GalleryWindowContent />
      </Suspense>
    ),
    projects: (
      <Suspense fallback={<ReadingFallback label="项目看板" />}>
        <ProjectsWindowContent />
      </Suspense>
    ),
    snippets: (
      <Suspense fallback={<ReadingFallback label="代码片段" />}>
        <SnippetsWindowContent />
      </Suspense>
    ),
    about: (
      <Suspense fallback={<ReadingFallback label="关于本机" />}>
        <AboutWindowContent />
      </Suspense>
    ),
    more: <MoreWindow hasFriends={friends.length > 0} />,
  };

  return (
    <DesktopHome
      status={siteConfig.status}
      windowContent={windowContent}
      mobileLife={
        <Suspense fallback={<ReadingFallback label="最近日志" />}>
          <MobileLifeCard />
        </Suspense>
      }
      statusWidget={
        <Suspense fallback={<ReadingFallback label="实时状态" />}>
          <StatusWidgetSlot />
        </Suspense>
      }
      deskObjects={
        <Suspense fallback={null}>
          <DeskObjectsSlot />
        </Suspense>
      }
      stickyNote={
        <Suspense fallback={null}>
          <StickyNoteSlot />
        </Suspense>
      }
    />
  );
}
