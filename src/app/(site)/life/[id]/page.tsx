import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMomentById, getMomentNeighbors } from "@/lib/moments-server";
import { formatDay } from "@/lib/life";
import { Moment, NODE_CLASS } from "@/components/life/moment";

// 读数据库，每次请求现算
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { moment } = await getMomentById(id);
  if (!moment) return { title: "动态" };
  const excerpt = moment.body.slice(0, 60) || moment.card?.title || "一条动态";
  return {
    title: `${formatDay(moment.publishedAt)} · ${excerpt}`,
    description: excerpt,
    openGraph: {
      title: excerpt,
      description: excerpt,
      type: "article",
      publishedTime: moment.publishedAt,
    },
  };
}

export default async function MomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [result, neighbors] = await Promise.all([
    getMomentById(id),
    getMomentNeighbors(id),
  ]);

  if (!result.available) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h1 className="mt-3 font-heading text-[19px] font-bold">
            这条动态暂时读不到
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            数据库现在连不上。链接本身是对的，过一会儿再刷新。
          </p>
        </div>
      </div>
    );
  }

  const moment = result.moment;
  if (!moment) notFound();

  const tags = [
    moment.mood ? { label: "MOOD", value: moment.mood } : null,
    moment.weather ? { label: "WEATHER", value: moment.weather } : null,
    moment.place ? { label: "PLACE", value: moment.place } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← 生活
      </Link>

      <article className="mt-6">
        <div className="flex items-baseline gap-3 border-b border-rule pb-4">
          <span
            aria-hidden
            className={`size-2 rounded-full ${NODE_CLASS[moment.kind]}`}
          />
          <h1 className="font-mono text-[13px] tabular-nums text-muted-foreground">
            <time dateTime={moment.publishedAt}>
              {formatDay(moment.publishedAt)}
            </time>
          </h1>
        </div>

        {tags.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <div key={t.label} className="bg-panel-2 px-2 py-1">
                <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t.label}
                </dt>
                <dd className="mt-0.5 font-mono text-[11px]">{t.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-8">
          <Moment moment={moment} linked={false} />
        </div>
      </article>

      <nav className="mt-12 flex items-center justify-between border-t border-rule pt-4 font-mono text-[11px]">
        {neighbors.prev ? (
          <Link
            href={`/life/${neighbors.prev.id}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ← 上一条
          </Link>
        ) : (
          <span className="text-muted-foreground">这是最早的一条</span>
        )}
        {neighbors.next ? (
          <Link
            href={`/life/${neighbors.next.id}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            下一条 →
          </Link>
        ) : (
          <span className="text-muted-foreground">这是最新的一条</span>
        )}
      </nav>
    </div>
  );
}
