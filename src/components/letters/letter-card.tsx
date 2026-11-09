import type { LetterView } from "@/lib/letters-server";

/**
 * 一条信箱留言：面板底、一行读数（日期 · 昵称 · 状态灯）、正文、可选的推荐歌。
 * 不做倾斜、不做纸条质感——这是观测台语言里的读数面板，不是拍立得。
 *
 * `pending` 只可能是当前用户自己的留言；公开访客拿到的条目永远是已通过。
 */
export function LetterCard({ letter }: { letter: LetterView }) {
  const song = letter.songTitle
    ? letter.songArtist
      ? `${letter.songTitle} — ${letter.songArtist}`
      : letter.songTitle
    : letter.songArtist;

  return (
    <article className="border border-rule bg-panel p-5">
      <header className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
        <span className="tabular-nums">{letter.date}</span>
        <span aria-hidden>·</span>
        <span className="min-w-0 truncate text-foreground">{letter.name}</span>
        <span
          role="img"
          aria-label={letter.pending ? "待审" : "已通过"}
          className={`ml-auto size-2 shrink-0 rounded-full ${
            letter.pending ? "bg-wait" : "bg-ok"
          }`}
        />
      </header>

      <p className="mt-3 whitespace-pre-line break-words text-[14px] leading-relaxed">
        {letter.body}
      </p>

      {song && (
        <p className="mt-3 break-words font-mono text-[11px] text-muted-foreground">
          <span aria-hidden>♪</span>{" "}
          {letter.songUrl ? (
            <a
              href={letter.songUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="link-underline"
            >
              {song}
            </a>
          ) : (
            song
          )}
        </p>
      )}
    </article>
  );
}
