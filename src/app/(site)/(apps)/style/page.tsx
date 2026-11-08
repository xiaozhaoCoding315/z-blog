import { notFound } from "next/navigation";
import { Moment } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { ObservBar } from "@/components/site/observ-bar";
import { NotYetOpen } from "@/components/site/not-yet-open";
import { AppIcon } from "@/components/desktop/icons";
import { ICON_KEYS } from "@/config/apps";

/**
 * 样式走廊：只在开发环境存在，生产构建时直接 404。
 * 组件做完就在这里看一眼，不必等首页拼好。
 */
export default function StylePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">样式走廊</h1>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          桌面图标
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ICON_KEYS.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2 border border-rule bg-panel p-3"
            >
              <AppIcon name={name} className="size-5 text-data" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          观测条
        </h2>
        <div className="mt-6">
          <ObservBar
            readings={[
              { label: "Days", value: "128", unit: "建站", available: true },
              { label: "Moments", value: "26", unit: "条", available: true },
              { label: "Month", value: "6", unit: "本月", available: true },
              { label: "Commits", value: "", unit: "90 天", available: false },
              { label: "Weather", value: "17°", unit: "阴", available: true },
            ]}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          语义色
        </h2>
        <div className="mt-6 flex flex-wrap gap-6">
          {[
            ["完成 / 成立", "bg-ok"],
            ["读数 / 链接", "bg-data"],
            ["待审 / 进行中", "bg-wait"],
            ["告警 / 未读", "bg-alert"],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${cls}`} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          动态的三种形态与主脊线
        </h2>
        <div className="relative mt-6 min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>
          <MonthTick label="十一月" count={3} />
          <ul className="mt-6 flex flex-col gap-10">
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-muted-foreground sm:-left-8" />
              <Moment
                moment={{
                  id: "s1",
                  kind: "text",
                  publishedAt: "2026-11-05T21:40:00+08:00",
                  body: "降温了。把阳台上的薄荷搬进屋，顺手给自己煮了碗面。",
                  weather: "阴",
                  place: "杭州",
                  mood: "安静",
                }}
              />
            </li>
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-data sm:-left-8" />
              <Moment
                moment={{
                  id: "s2",
                  kind: "photo",
                  publishedAt: "2026-11-03T16:20:00+08:00",
                  body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
                  place: "南京西路",
                }}
              />
            </li>
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-ok sm:-left-8" />
              <Moment
                moment={{
                  id: "s3",
                  kind: "song",
                  publishedAt: "2026-11-01T23:10:00+08:00",
                  body: "十一月的第一首歌。",
                  card: {
                    title: "Merry Christmas Mr. Lawrence",
                    meta: "坂本龍一",
                    note: "每年入冬都会翻出来听一遍。",
                  },
                }}
              />
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          未开放面板
        </h2>
        <div className="mt-6">
          <NotYetOpen
            title="书、影、音，按时间倒序"
            description="读过的书、看过的电影、反复听的专辑，每一条一句话短评。"
            phase="阶段 4 上线"
          />
        </div>
      </section>
    </div>
  );
}
