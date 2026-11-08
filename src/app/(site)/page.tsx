import { Fragment } from "react";
import { connection } from "next/server";
import { siteConfig } from "@/config/site";
import { now as portfolioNow } from "@/config/portfolio";
import { countThisMonth, groupByMonth } from "@/lib/life";
import { getObservation } from "@/lib/observation";
import { getMoments } from "@/lib/moments-server";
import { getWeather } from "@/lib/weather-server";
import { getGithubActivity } from "@/lib/github-server";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { NowPanel } from "@/components/life/now-panel";
import { ObservBar } from "@/components/site/observ-bar";
import { LocalClock } from "@/components/site/local-clock";

/**
 * 生活流要读数据库，首页不再是纯静态页（设计文档 §6.3 已接受这一点）。
 *
 * `await connection()` 让预渲染停在这一行：本地构建时没有 DATABASE_URL，
 * 否则 `use cache` 读库会把「没有数据」烤进静态壳，线上永远空着。
 *
 * `instant = false` 是配套的一步：预渲染停得太早，页面产不出静态壳，
 * 而 Cache Components 会校验每页必须有非空静态壳。这个导出只关掉那条校验，
 * 不影响运行时行为。
 */
export const instant = false;

/**
 * 首页 = 观测台主屏。
 *
 * 左栏是生活流（一条主脊线贯穿），右栏是「此刻」。
 * 全站只有一个客户端常驻组件：页头的本地时钟。其余读数都在服务端算好。
 */
export default async function HomePage() {
  await connection();

  const [observation, weather, activity, life] = await Promise.all([
    getObservation(),
    getWeather(),
    getGithubActivity(),
    getMoments(),
  ]);

  const currentYear = observation.year;
  const groups = groupByMonth(life.moments, currentYear);
  /** 手机窄带只放在全站首条动态之后，不是每个月各放一条 */
  const firstGroupKey = groups[0]?.key;
  const momentsCount = life.available ? life.moments.length : null;
  const thisMonth = life.available
    ? countThisMonth(life.moments, observation.year, observation.month)
    : null;

  const readings = [
    {
      label: "Days",
      value: observation.days ?? "",
      unit: "建站",
      available: observation.days !== null,
    },
    {
      label: "Moments",
      value: momentsCount === null ? "" : String(momentsCount),
      unit: "条",
      available: momentsCount !== null,
    },
    {
      label: "Month",
      value: thisMonth === null ? "" : String(thisMonth),
      unit: "本月",
      available: thisMonth !== null,
    },
    {
      label: "Commits",
      // 事件接口按页截断时 total90 只是下限，读数前加「≥」，不冒充精确值
      value:
        observation.commits90 === null
          ? ""
          : `${activity.truncated ? "≥" : ""}${observation.commits90}`,
      unit: "90 天",
      available: observation.commits90 !== null,
    },
    {
      label: "Weather",
      value: weather ? `${weather.temperature}°` : "",
      unit: weather?.label ?? observation.city,
      available: weather !== null,
    },
  ];

  const nowPanel = (
    <NowPanel
      weather={weather}
      listening={portfolioNow.listening}
      reading={portfolioNow.reading}
      letters={[
        { id: "l1", name: "阿远", body: "路过，祝好。", date: "11.05" },
        { id: "l2", name: "小满", body: "这首歌我也在循环。", date: "11.02" },
        { id: "l3", name: "老陈", body: "旧书店叫什么名字？", date: "10.30" },
      ]}
      updatedAt={portfolioNow.updatedAt}
      activity={activity}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <header className="flex items-baseline justify-between gap-4 border-b border-rule py-5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h1 className="font-heading text-[15px] font-bold tracking-tight">
            {siteConfig.name}
          </h1>
          <span aria-hidden className="font-mono text-[11px] text-muted-foreground">
            ·
          </span>
          <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {siteConfig.status}
          </p>
        </div>
        <LocalClock />
      </header>

      <ObservBar readings={readings} />

      <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <div className="relative min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>

          {!life.available ? (
            <div className="border border-rule bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
                Not Available
              </p>
              <h2 className="mt-3 font-heading text-[19px] font-bold">
                生活流暂时读不到
              </h2>
              <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
                这一栏的内容存在数据库里，现在连不上。页面其余部分照常显示，不拿空列表冒充「还没发过」。
              </p>
            </div>
          ) : groups.length === 0 ? (
            <div className="border border-rule bg-panel p-6">
              <h2 className="font-heading text-[19px] font-bold">还没有第一条</h2>
              <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
                数据库是通的，只是这条时间线还空着。
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="mt-8 first:mt-0">
                <MonthTick label={group.label} count={group.moments.length} />
                <ul className="mt-6 flex flex-col gap-10">
                  {group.moments.map((moment, index) => (
                    <Fragment key={moment.id}>
                      <li className="relative">
                        <span
                          aria-hidden
                          className={`absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full sm:-left-8 ${NODE_CLASS[moment.kind]}`}
                        />
                        <Moment moment={moment} />
                      </li>
                      {index === 0 && group.key === firstGroupKey && (
                        <li className="lg:hidden">
                          <details className="border-y border-rule py-3">
                            <summary className="flex cursor-pointer items-baseline gap-2 font-mono text-[11px] text-muted-foreground">
                              <span className="shrink-0 uppercase tracking-[0.14em]">此刻</span>
                              <span className="shrink-0 tabular-nums">
                                {weather
                                  ? `${observation.city} ${weather.temperature}° ${weather.label}`
                                  : observation.city}
                              </span>
                              <span aria-hidden className="shrink-0">·</span>
                              <span aria-hidden className="shrink-0">♪</span>
                              <span className="min-w-0 truncate">{portfolioNow.listening}</span>
                            </summary>
                            <div className="mt-4">{nowPanel}</div>
                          </details>
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside
          aria-label="此刻"
          className="hidden lg:sticky lg:top-6 lg:block lg:self-start"
        >
          {nowPanel}
        </aside>
      </div>
    </div>
  );
}
