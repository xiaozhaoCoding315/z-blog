import type { Moment } from "@/lib/life";
import { MomentMeta } from "./moment-meta";

/**
 * 图文：照片是主角，正文是图注。
 * 照片在暗底上会显灰，所以永不降饱和、不加滤镜、不加圆角投影，只给 1px 边；
 * hover 只抬 2px 并把边染成 --data，不加深阴影（层级不靠阴影）。
 * 没有照片时画一块占位——阶段 1 的假数据没有真实图片。
 */
export function MomentPhoto({
  moment,
  linked = true,
}: {
  moment: Moment;
  linked?: boolean;
}) {
  const images = moment.images ?? [];
  return (
    <article className="max-w-[38rem]">
      <MomentMeta moment={moment} linked={linked} />

      {images.length === 0 ? (
        <div className="mt-3 flex aspect-[4/3] items-center justify-center border border-rule bg-panel-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            照片
          </span>
        </div>
      ) : (
        <div className={images.length > 1 ? "mt-3 grid grid-cols-2 gap-2" : "mt-3"}>
          {images.map((src) => (
            <div
              key={src}
              className="border border-rule transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-data motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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

      <p className="mt-4 max-w-[34rem] whitespace-pre-line font-heading text-[16px] leading-[1.7]">
        {moment.body}
      </p>
    </article>
  );
}
