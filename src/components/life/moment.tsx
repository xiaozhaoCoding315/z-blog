import type { Moment as MomentData } from "@/lib/life";
import { MomentText } from "./moment-text";
import { MomentPhoto } from "./moment-photo";
import { MomentCard } from "./moment-card";

/**
 * 按 kind 选形态。有 card 字段的一律走卡片，
 * 有图片的走图文，其余走短记。
 */
export function Moment({ moment }: { moment: MomentData }) {
  if (moment.card) return <MomentCard moment={moment} />;
  if (moment.kind === "photo") return <MomentPhoto moment={moment} />;
  return <MomentText moment={moment} />;
}
