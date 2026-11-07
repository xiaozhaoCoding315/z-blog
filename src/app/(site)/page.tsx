import { Fragment } from "react";
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { mockMoments } from "@/config/mock-moments";
import { now as portfolioNow } from "@/config/portfolio";
import { groupByMonth } from "@/lib/life";
import { getObservation } from "@/lib/observation";
import { getWeather } from "@/lib/weather-server";
import { getGithubActivity } from "@/lib/github-server";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { NowPanel } from "@/components/life/now-panel";
import { ObservBar } from "@/components/site/observ-bar";
import { LocalClock } from "@/components/site/local-clock";

/**
 * 当前年份。Cache Components 下预渲染期直接读时间是错误，
 * 按仓库既有做法（见 lib/uptime-server.ts）把值包进 `use cache`。
 */
async function getCurrentYear() {
  "use cache";
  cacheLife("hours");
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
    }).format(new Date())
  );
}

/**
 * 首页 = 观测台主屏。
 *
 * 左栏是生活流（一条主脊线贯穿），右栏是「此刻」。
 * 全站只有一个客户端常驻组件：页头的本地时钟。其余读数都在服务端算好。
 */
export default async function HomePage() {
  const [currentYear, observation, weather, activity] = await Promise.all([
    getCurrentYear(),
    getObservation(),
    getWeather(),
    getGithubActivity(),
  ]);

  const groups = groupByMonth(mockMoments, currentYear);
  /** 手机窄带只放在全站首条动态之后，不是每个月各放一条 */
  const firstGroupKey = groups[0]?.key;

  const readings = [
    {
      label: "Days",
      value: observation.days ?? "",
      unit: "建站",
      available: observation.days !== null,
    },
    {
      label: "Moments",
      value: String(observation.moments),
      unit: "条",
      available: true,
    },
    {
      label: "Month",
      value: String(observation.thisMonth),
      unit: "本月",
      available: true,
    },
    {
      label: "Commits",
      value: observation.commits90 === null ? "" : String(observation.commits90),
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

          {groups.map((group) => (
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
          ))}
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
