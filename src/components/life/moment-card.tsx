import { formatPostmark, type Moment, type MomentKind } from "@/lib/life";
import { Postmark } from "@/components/site/postmark";

const KIND_LABEL: Record<MomentKind, string> = {
  text: "短记",
  photo: "照片",
  song: "正在听",
  shelf: "书架",
  quote: "摘录",
  link: "链接",
};

/**
 * 卡片：只有歌单、书架、摘录、链接才配住进一个盒子。
 * 邮戳贴在右上角，压住纸边。
 */
export function MomentCard({ moment }: { moment: Moment }) {
  const card = moment.card;
  if (!card) return null;

  return (
    <article className="relative max-w-[38rem]">
      <div className="paper-sheet p-6 pr-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {KIND_LABEL[moment.kind]}
        </p>
        <h3 className="mt-3 font-heading text-[18px] font-bold leading-snug">
          {card.href ? (
            <a href={card.href} className="link-underline" rel="noreferrer noopener" target="_blank">
              {card.title}
            </a>
          ) : (
            card.title
          )}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{card.meta}</p>
        {card.note && (
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            {card.note}
          </p>
        )}
        {moment.body && (
          <p className="mt-3 text-[15px] leading-[1.8]">{moment.body}</p>
        )}
      </div>
      <Postmark
        className="absolute! right-4 top-4"
        date={formatPostmark(moment.publishedAt)}
        label={moment.place ?? KIND_LABEL[moment.kind]}
        size="sm"
      />
    </article>
  );
}
