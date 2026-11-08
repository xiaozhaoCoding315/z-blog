import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getShelfItems } from "@/lib/shelf-server";
import { ShelfRow } from "@/components/shelf/shelf-row";

export const metadata: Metadata = { title: "书架" };

// 读数据库与查询参数，每次请求现算
export const instant = false;

const TABS = [
  { type: "book", label: "书" },
  { type: "film", label: "影" },
  { type: "music", label: "音" },
] as const;

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await connection();
  const { type } = await searchParams;
  const activeTab = TABS.find((tab) => tab.type === type) ?? TABS[0];
  const active = activeTab.type;
  const shelf = await getShelfItems();
  const items = shelf.items.filter((item) => item.type === active);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">书架</h1>
        {shelf.available && (
          <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            {items.length} 条
          </p>
        )}
      </header>

      <nav aria-label="书架分类" className="mt-8 flex border-b border-rule">
        {TABS.map((tab) => {
          const current = tab.type === active;
          return (
            <Link
              key={tab.type}
              href={`/shelf?type=${tab.type}`}
              aria-current={current ? "page" : undefined}
              className={
                current
                  ? "relative px-3 py-2 font-mono text-[11px] text-data after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-data"
                  : "px-3 py-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {!shelf.available ? (
        <div className="mt-8 border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[19px] font-bold">
            书架暂时读不到
          </h2>
          <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
            数据库现在连不上。已收录的书影音没有丢，过一会儿再刷新。
          </p>
        </div>
      ) : items.length === 0 ? (
        <p className="mt-8 border-y border-rule py-8 text-[14px] leading-relaxed text-muted-foreground">
          这一类还空着。
        </p>
      ) : (
        <div className="mt-6 border-t border-rule">
          {items.map((item) => (
            <ShelfRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
