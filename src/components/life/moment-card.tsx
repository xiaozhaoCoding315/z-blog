import type { Moment, MomentKind } from "@/lib/life";
import { MomentMeta } from "./moment-meta";
import { MomentTags } from "./moment-tags";

const KIND_LABEL: Record<MomentKind, string> = {
  text: "短记",
  photo: "照片",
  song: "正在听",
  shelf: "书架",
  quote: "摘录",
  link: "链接",
};

/**
 * 读数卡：只有歌、书影音、摘录、链接才配住进一个面板。
 * 面板底 + 左上角类型标签，不用边框强调——脊线上的节点已经说了类型。
 */
export function MomentCard({
  moment,
  linked = true,
}: {
  moment: Moment;
  linked?: boolean;
}) {
  const card = moment.card;
  if (!card) return null;

  return (
    <article className="max-w-[38rem]">
      <MomentMeta moment={moment} linked={linked} />
      <div className="mt-3 border border-rule bg-panel p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {KIND_LABEL[moment.kind]}
        </p>
        <h3 className="mt-2 font-heading text-[17px] font-bold leading-snug">
          {card.href ? (
            <a
              href={card.href}
              className="link-underline"
              rel="noreferrer noopener"
              target="_blank"
            >
              {card.title}
            </a>
          ) : (
            card.title
          )}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{card.meta}</p>
        {card.note && (
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {card.note}
          </p>
        )}
        {moment.body && (
          <p className="mt-3 whitespace-pre-line font-heading text-[16px] leading-[1.7]">
            {moment.body}
          </p>
        )}
      </div>
      <MomentTags tags={moment.tags ?? []} />
    </article>
  );
}
