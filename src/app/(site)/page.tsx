import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { mockMoments } from "@/config/mock-moments";
import { groupByMonth } from "@/lib/life";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";

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
        <div className="relative min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>

          {groups.map((group) => (
            <section key={group.key} className="mt-8 first:mt-0">
              <MonthTick label={group.label} count={group.moments.length} />
              <ul className="mt-6 flex flex-col gap-10">
                {group.moments.map((moment) => (
                  <li key={moment.id} className="relative">
                    {/* 脊线在容器的 padding 里（x=0），li 在内容区；负偏移把节点拉回脊线上 */}
                    <span
                      aria-hidden
                      className={`absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full sm:-left-8 ${NODE_CLASS[moment.kind]}`}
                    />
                    <Moment moment={moment} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
          {/* 此刻面板在 Task 4 补上 */}
        </aside>
      </div>
    </div>
  );
}
