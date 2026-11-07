import Link from "next/link";

export interface NowSong {
  title: string;
  artist: string;
}

export interface NowShelf {
  type: string;
  title: string;
  meta: string;
}

export interface NowLetter {
  id: string;
  name: string;
  body: string;
  date: string;
}

/**
 * 右栏「此刻」：这个人现在的生活切片。
 * 三块内容，多了就成了侧边栏广告。
 */
export function NowCard({
  song,
  shelf,
  letters,
  compact = false,
}: {
  song: NowSong;
  shelf: NowShelf;
  letters: NowLetter[];
  /** 手机端：只留一行正在听，高度不超过 120px */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="paper-sheet flex items-center gap-4 p-4">
        <span aria-hidden className="font-mono text-[14px] text-stamp">
          ♪
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-[15px] font-bold leading-snug">
            {song.title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {song.artist} · 正在听
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="paper-sheet p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          此刻
        </h2>
        <p className="mt-3 font-heading text-[17px] font-bold leading-snug">
          {song.title}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{song.artist}</p>
        <p className="mt-4 font-mono text-[11px] text-stamp">♪ 正在听</p>
      </section>

      <section className="paper-sheet p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          在读
        </h2>
        <p className="mt-3 font-heading text-[15px] font-bold leading-snug">
          {shelf.title}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{shelf.meta}</p>
      </section>

      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          最近的信
        </h2>
        <ul className="mt-3 space-y-3">
          {letters.map((letter) => (
            <li
              key={letter.id}
              className="border-b border-rule pb-3 last:border-0"
            >
              <p className="text-[13px] leading-relaxed">{letter.body}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {letter.name} · {letter.date}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/letters"
          className="link-underline mt-4 inline-block text-[12px] text-stamp"
        >
          写一封
        </Link>
      </section>
    </div>
  );
}
