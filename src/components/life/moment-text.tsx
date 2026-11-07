import type { Moment } from "@/lib/life";
import { MomentMeta } from "./moment-meta";

/**
 * 纯文字短记：没有边框，只占左栏一半宽。
 * 生活流里最轻的一种形态，不能让一句话住进一个面板。
 * 正文用宋体——硬界面里唯一的长文是软的，这个反差是故意的。
 */
export function MomentText({ moment }: { moment: Moment }) {
  return (
    <article className="max-w-[34rem]">
      <MomentMeta moment={moment} />
      <p className="mt-2 whitespace-pre-line font-heading text-[16px] leading-[1.7]">
        {moment.body}
      </p>
    </article>
  );
}
