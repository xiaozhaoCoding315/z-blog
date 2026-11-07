import { notFound } from "next/navigation";
import { Postmark } from "@/components/site/postmark";
import { Moment } from "@/components/life/moment";
import { MonthDivider } from "@/components/life/month-divider";
import { NowCard } from "@/components/life/now-card";

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
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          邮戳
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-8">
          <Postmark date="11.03" label="南京西路" size="sm" />
          <Postmark date="11.03" label="南京西路" />
          <Postmark date="十一月" label="二〇二六" size="lg" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          信笺与齿孔
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="paper-sheet p-5">
            <p className="text-sm leading-relaxed">
              一张信笺：2px 圆角，1px 格线，纸色比页面底浅一档。
            </p>
          </div>
          <div className="perforated flex aspect-[4/3] items-center justify-center bg-secondary">
            <span className="font-mono text-[11px] text-muted-foreground">
              照片
            </span>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          动态的三种形态
        </h2>
        <div className="mt-6 flex flex-col gap-10">
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
          <Moment
            moment={{
              id: "s2",
              kind: "photo",
              publishedAt: "2026-11-03T16:20:00+08:00",
              body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
              place: "南京西路",
            }}
          />
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
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          月份分隔与此刻卡
        </h2>
        <div className="mt-6 grid gap-10 sm:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <MonthDivider label="十一月" />
            <p className="text-sm text-muted-foreground">
              这一条只是为了让分隔条有东西可分隔。
            </p>
          </div>
          <NowCard
            song={{ title: "Merry Christmas Mr. Lawrence", artist: "坂本龍一" }}
            shelf={{ type: "书", title: "《城市与狗》", meta: "巴尔加斯·略萨" }}
            letters={[
              { id: "l1", name: "阿远", body: "路过，祝好。", date: "11.05" },
              { id: "l2", name: "小满", body: "这首歌我也在循环。", date: "11.02" },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
