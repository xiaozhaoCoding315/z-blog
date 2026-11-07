import { formatPostmark, type Moment } from "@/lib/life";
import { Postmark } from "@/components/site/postmark";

/**
 * 图文：照片是主角，正文是图注。
 * 没有照片时画一块占位——阶段 1 的假数据没有真实图片。
 */
export function MomentPhoto({ moment }: { moment: Moment }) {
  const images = moment.images ?? [];
  return (
    <article>
      <div className="mb-3 flex items-end gap-3">
        <Postmark
          date={formatPostmark(moment.publishedAt)}
          label={moment.place ?? "照片"}
          size="sm"
        />
        <p className="pb-1 font-mono text-[11px] text-muted-foreground">
          <time dateTime={moment.publishedAt}>
            {formatPostmark(moment.publishedAt)}
          </time>
          {moment.place && <span> · {moment.place}</span>}
        </p>
      </div>

      {images.length === 0 ? (
        <div className="perforated flex aspect-[4/3] items-center justify-center bg-secondary">
          <span className="font-mono text-[11px] text-muted-foreground">
            照片
          </span>
        </div>
      ) : (
        <div
          className={
            images.length > 1 ? "grid grid-cols-2 gap-2" : undefined
          }
        >
          {images.map((src) => (
            <div
              key={src}
              className="perforated transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="block w-full"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 max-w-[34rem] whitespace-pre-line text-[16px] leading-[1.85]">
        {moment.body}
      </p>
    </article>
  );
}
