import Link from "next/link";
import type { Weather } from "@/lib/weather-server";
import type { GithubActivity } from "@/lib/github-server";
import { ActivityStrip } from "./activity-strip";

export interface NowLetter {
  id: string;
  name: string;
  body: string;
  date: string;
}

/**
 * 右栏「此刻」：这个人现在的生活切片。
 *
 * 在听 / 在读来自 portfolio.ts 的 now，是站长手填的，
 * 所以旁边永远标着「手动 · 更新于」——不许伪装成抓取。
 */
export function NowPanel({
  weather,
  listening,
  reading,
  letters,
  updatedAt,
  activity,
}: {
  weather: Weather | null;
  /** portfolio.now.listening，一句话，不是「曲名 / 艺人」两段 */
  listening: string;
  /** portfolio.now.reading，按数组顺序显示 */
  reading: string[];
  letters: NowLetter[];
  updatedAt: string;
  activity: GithubActivity;
}) {
  return (
    <div className="divide-y divide-rule border-y border-rule">
      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Weather
        </h2>
        <p className="mt-2 font-mono text-[15px] tabular-nums">
          {weather ? (
            <>
              {weather.temperature}° <span className="text-muted-foreground">{weather.label}</span>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">NOT AVAILABLE</span>
          )}
        </p>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Listening
        </h2>
        <p className="mt-2 font-heading text-[15px] font-bold leading-snug">
          {listening}
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          手动 · 更新于 {updatedAt.slice(5).replace("-", ".")}
        </p>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Reading
        </h2>
        <ul className="mt-2 space-y-1">
          {reading.map((item) => (
            <li key={item} className="font-heading text-[15px] leading-snug">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          手动 · 更新于 {updatedAt.slice(5).replace("-", ".")}
        </p>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Commits · 90D
        </h2>
        <div className="mt-2">
          <ActivityStrip days={activity.days} total={activity.total90} />
        </div>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Letters
        </h2>
        <ul className="mt-2 space-y-3">
          {letters.map((letter) => (
            <li key={letter.id} className="border-b border-rule pb-3 last:border-0 last:pb-0">
              <p className="text-[13px] leading-relaxed">{letter.body}</p>
              <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                {letter.name} · {letter.date}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/letters"
          className="mt-4 inline-block border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:bg-data hover:text-background"
        >
          写一封
        </Link>
      </section>
    </div>
  );
}
