import { formatPostmark, type Moment } from "@/lib/life";
import { Postmark } from "@/components/site/postmark";

/**
 * 纯文字短记：没有边框，只占左栏一半宽。
 * 生活流里最轻的一种形态，不能让一句话住进一张卡片。
 */
export function MomentText({ moment }: { moment: Moment }) {
  const place = moment.place ?? moment.weather ?? "日常";
  return (
    <article className="max-w-[34rem]">
      <div className="mb-3 flex items-end gap-3">
        <Postmark
          date={formatPostmark(moment.publishedAt)}
          label={place}
          size="sm"
        />
        <p className="pb-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <time dateTime={moment.publishedAt}>
            {formatPostmark(moment.publishedAt)}
          </time>
          {moment.weather && <span> · {moment.weather}</span>}
          {moment.place && <span> · {moment.place}</span>}
          {moment.mood && <span> · {moment.mood}</span>}
        </p>
      </div>
      <p className="whitespace-pre-line text-[16px] leading-[1.85]">
        {moment.body}
      </p>
    </article>
  );
}
