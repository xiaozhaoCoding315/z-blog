import { Fragment } from "react";
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { mockMoments, mockNow } from "@/config/mock-moments";
import { groupByMonth } from "@/lib/life";
import { Moment } from "@/components/life/moment";
import { MonthDivider } from "@/components/life/month-divider";
import { NowCard } from "@/components/life/now-card";

/**
 * 当前年份。Cache Components 下预渲染期直接读时间是错误，
 * 按仓库既有做法（见 lib/uptime-server.ts）把值包进 `use cache`：
 * 在缓存填充时确定，按小时级重算。
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
 * 首页 = 生活流。
 * 左栏是时间，右栏是「此刻」——访客先看到这个人在过什么生活，
 * 而不是最新一篇文章。
 *
 * 「此刻」在桌面是右栏，在手机是首条动态下面的一条横向卡：
 * 同一个组件渲染两次，用 lg 断点二选一显示，避免两套内容不同步。
 */
export default async function HomePage() {
  const currentYear = await getCurrentYear();
  const groups = groupByMonth(mockMoments, currentYear);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <header className="border-b border-rule py-10 sm:py-14">
        <h1 className="font-heading text-[28px] font-bold tracking-tight sm:text-[32px]">
          {siteConfig.name}
        </h1>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground">
          {siteConfig.status}
        </p>
      </header>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <div className="min-w-0">
          {groups.map((group, groupIndex) => (
            <section key={group.key} className="mt-10 first:mt-0">
              <MonthDivider label={group.label} />
              <div className="flex flex-col gap-12">
                {group.moments.map((moment, momentIndex) => (
                  <Fragment key={moment.id}>
                    <Moment moment={moment} />
                    {groupIndex === 0 && momentIndex === 0 && (
                      <div className="lg:hidden">
                        <NowCard {...mockNow} compact />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
          <NowCard {...mockNow} />
        </aside>
      </div>
    </div>
  );
}
